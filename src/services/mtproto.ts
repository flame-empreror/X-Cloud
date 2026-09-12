import { TelegramClient, InputMedia } from '@mtcute/web';
import { Long } from '@mtcute/core';

// Type declaration for Vite env
declare global {
  interface ImportMetaEnv {
    readonly VITE_TELEGRAM_API_ID: string;
    readonly VITE_TELEGRAM_API_HASH: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// You need to get these from https://my.telegram.org/apps
const API_ID = parseInt(import.meta.env.VITE_TELEGRAM_API_ID || '0');
const API_HASH = import.meta.env.VITE_TELEGRAM_API_HASH || '';

class MTProtoService {
  private client: TelegramClient | null = null;
  private isAuthenticated: boolean = false;

  hasCredentials(): boolean {
    return !!API_ID && !!API_HASH;
  }

  async initialize(): Promise<void> {
    if (!this.hasCredentials()) {
      throw new Error('Telegram API credentials not configured. Please set VITE_TELEGRAM_API_ID and VITE_TELEGRAM_API_HASH in your .env file');
    }

    console.log('[MTProto] Creating client with API credentials...');
    console.log('[MTProto] API_ID:', API_ID);
    console.log('[MTProto] API_HASH:', API_HASH.substring(0, 5) + '...');

    this.client = new TelegramClient({
      apiId: API_ID,
      apiHash: API_HASH,
      storage: 'telecloud-session', // Uses IndexedDB
    });

    console.log('[MTProto] Connecting to Telegram...');
    
    // Add timeout to connect
    const connectTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 15000)
    );
    
    await Promise.race([
      this.client.connect(),
      connectTimeout
    ]);
    
    console.log('[MTProto] Connected successfully');
    
    // Check if already logged in
    try {
      console.log('[MTProto] Checking if user is logged in...');
      const me = await this.client.getMe();
      this.isAuthenticated = !!me;
      console.log('[MTProto] Authenticated:', this.isAuthenticated);
      if (me) {
        console.log('[MTProto] Logged in as:', me.firstName || me.username);
      }
    } catch (error: any) {
      console.log('[MTProto] Not logged in or error checking auth:', error.message);
      this.isAuthenticated = false;
    }
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  async loginWithPhone(phoneNumber: string): Promise<{ phoneCodeHash: string }> {
    if (!this.client) throw new Error('Client not initialized');

    const result = await this.client.sendCode({
      phone: phoneNumber,
    });

    // sendCode returns SentCode which has phoneCodeHash
    if ('phoneCodeHash' in result) {
      return {
        phoneCodeHash: result.phoneCodeHash,
      };
    }

    throw new Error('Failed to send code');
  }

  async verifyPhoneCode(
    phoneNumber: string,
    code: string,
    phoneCodeHash: string
  ): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    await this.client.signIn({
      phone: phoneNumber,
      phoneCodeHash,
      phoneCode: code,
    });

    this.isAuthenticated = true;
  }

  async loginWithQR(qrCodeHandler: (url: string, expires: Date) => void): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    await this.client.start({
      qrCodeHandler,
    });

    this.isAuthenticated = true;
  }

  async getMe(): Promise<any> {
    if (!this.client) throw new Error('Client not initialized');
    return await this.client.getMe();
  }

  async getDialogs(): Promise<any[]> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      console.log('[MTProto] Fetching dialogs...');
      
      // Use iterDialogs to get all dialogs
      const dialogs: any[] = [];
      
      for await (const dialog of this.client.iterDialogs({
        limit: 100,
      })) {
        console.log('[MTProto] Got dialog:', dialog);
        
        // The dialog object has a 'peer' property that contains the actual chat/channel info
        const d = dialog as any;
        const peer = d.peer || {};
        
        console.log('[MTProto] Peer info:', {
          id: peer.id,
          title: peer.title,
          chatType: peer.chatType,
          isGroup: peer.isGroup,
        });
        
        // Determine the type based on peer properties
        let type = 'chat';
        if (peer.chatType === 'channel' || peer.chatType === 'supergroup') {
          type = peer.isGroup ? 'group' : 'channel';
        } else if (peer.isGroup) {
          type = 'group';
        }
        
        dialogs.push({
          id: peer.id,
          title: peer.title || 'Unknown',
          type: type,
          peer: peer.inputPeer || peer,
        });
      }

      console.log('[MTProto] All dialogs:', dialogs);
      return dialogs;
    } catch (error) {
      console.error('[MTProto] getDialogs error:', error);
      throw error;
    }
  }

  async getChatHistory(peer: any, limit: number = 100): Promise<any[]> {
    if (!this.client) throw new Error('Client not initialized');

    const messages = await this.client.getMessages(peer, limit);
    return messages;
  }

  async getMessages(chatId: number, limit: number = 100, inputPeer?: any): Promise<any[]> {
    if (!this.client) throw new Error('Client not initialized');

    console.log('[MTProto] getMessages called for chatId:', chatId, 'limit:', limit);
    console.log('[MTProto] inputPeer:', inputPeer);
    
    try {
      // Convert accessHash from string to Long if needed
      let accessHash = Long.fromNumber(0);
      if (inputPeer?.accessHash) {
        if (typeof inputPeer.accessHash === 'string') {
          accessHash = Long.fromString(inputPeer.accessHash);
        } else if (inputPeer.accessHash instanceof Long) {
          accessHash = inputPeer.accessHash;
        }
      }
      
      console.log('[MTProto] Using accessHash:', accessHash.toString());
      
      // Use the channelId from inputPeer if available, otherwise use Math.abs(chatId)
      const channelId = inputPeer?.channelId || Math.abs(chatId);
      
      console.log('[MTProto] Using channelId:', channelId);
      
      // Use raw API call to fetch messages with limit
      const result = await this.client.call({
        _: 'messages.getHistory',
        peer: {
          _: 'inputPeerChannel',
          channelId: channelId,
          accessHash: accessHash
        },
        offsetId: 0,
        offsetDate: 0,
        addOffset: 0,
        limit: limit,
        maxId: 0,
        minId: 0,
        hash: Long.fromNumber(0)
      });
      
      console.log('[MTProto] getHistory result type:', result._);
      
      // Extract messages from the result
      const messagesArray = (result as any).messages || [];
      
      console.log('[MTProto] Raw response type:', typeof messagesArray);
      console.log('[MTProto] Raw response is array:', Array.isArray(messagesArray));
      console.log('[MTProto] Retrieved', messagesArray.length, 'messages (including nulls)');
      
      // Filter out null/undefined values
      const validMessages = messagesArray.filter((msg: any, idx: number) => {
        const isValid = msg !== null && msg !== undefined && msg.id !== undefined;
        if (!isValid) {
          console.log(`[MTProto] Filtering out null/invalid message at index ${idx}:`, msg);
        } else {
          console.log(`[MTProto] Keeping valid message at index ${idx}:`, {
            id: msg.id,
            hasText: !!msg.text || !!msg.message,
            hasMedia: !!msg.media
          });
        }
        return isValid;
      });
      
      console.log('[MTProto] Valid messages count:', validMessages.length);
      
      // Log first few messages for debugging
      validMessages.slice(0, 3).forEach((msg: any, idx: number) => {
        console.log(`[MTProto] Message ${idx + 1}:`, {
          id: msg.id,
          text: (msg.text || msg.message)?.substring(0, 100),
          hasMedia: !!msg.media,
          mediaType: msg.media?._
        });
      });
      
      return validMessages;
    } catch (error) {
      console.error('[MTProto] Error in getMessages:', error);
      throw error;
    }
  }

  async sendMessage(peer: any, text: string): Promise<any> {
    if (!this.client) throw new Error('Client not initialized');

    return await this.client.sendText(peer, text);
  }

  async sendFile(peer: any, file: File, caption: string, onProgress?: (progress: number) => void): Promise<any> {
    if (!this.client) throw new Error('Client not initialized');

    // Track upload progress
    const totalSize = file.size;
    let uploadedSize = 0;
    const startTime = Date.now();

    // Simulate progress updates during upload
    const progressInterval = setInterval(() => {
      if (onProgress && uploadedSize < totalSize) {
        // Estimate progress based on time elapsed
        const elapsed = Date.now() - startTime;
        const estimatedProgress = Math.min(95, (elapsed / 5000) * 100); // Assume 5 second upload
        onProgress(estimatedProgress);
      }
    }, 100);

    try {
      // Use sendMedia with InputMedia
      const result = await this.client.sendMedia(peer, InputMedia.auto(file, {
        caption,
      }));

      clearInterval(progressInterval);
      if (onProgress) {
        onProgress(100);
      }

      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  async downloadMedia(message: any): Promise<Blob> {
    if (!this.client) throw new Error('Client not initialized');

    console.log('[MTProto] Starting download for message:', message.id);
    console.log('[MTProto] Full message structure:', JSON.stringify(message, (key, value) => {
      // Handle Long objects in JSON serialization
      if (value && typeof value === 'object' && 'low' in value && 'high' in value) {
        return { __type: 'Long', low: value.low, high: value.high, unsigned: value.unsigned };
      }
      // Handle Uint8Array
      if (value instanceof Uint8Array) {
        return { __type: 'Uint8Array', length: value.length };
      }
      return value;
    }, 2));
    
    const media = message.media;
    
    if (!media) {
      throw new Error('Message has no media');
    }
    
    console.log('[MTProto] Media type:', media._);
    
    // Helper function to recursively convert ALL Long objects in an object
    const convertAllLongs = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      // If it's a Long object, convert it
      if ('low' in obj && 'high' in obj && Object.keys(obj).length <= 3) {
        console.log('[MTProto] Converting Long:', { low: obj.low, high: obj.high });
        const long = Long.fromBits(obj.low, obj.high, obj.unsigned || false);
        console.log('[MTProto] Converted to Long instance:', long.toString());
        return long;
      }
      
      // If it's an array, convert each element
      if (Array.isArray(obj)) {
        return obj.map(item => convertAllLongs(item));
      }
      
      // If it's a Uint8Array, keep it as-is
      if (obj instanceof Uint8Array) {
        return obj;
      }
      
      // Otherwise, recursively convert all properties
      const result: any = {};
      for (const key in obj) {
        result[key] = convertAllLongs(obj[key]);
      }
      return result;
    };
    
    // Convert the ENTIRE message object, not just the document
    console.log('[MTProto] Converting all Long objects in message...');
    const convertedMessage = convertAllLongs(message);
    
    console.log('[MTProto] Conversion complete. Document ID type:', typeof convertedMessage.media?.document?.id);
    console.log('[MTProto] Document ID is Long:', Long.isLong(convertedMessage.media?.document?.id));
    
    try {
      // Use the client's downloadAsBuffer method with the fully converted message
      console.log('[MTProto] Starting file download with converted message...');
      
      // Download the file using the properly converted message
      const buffer = await (this.client as any).downloadAsBuffer(convertedMessage);
      
      console.log('[MTProto] File downloaded, buffer size:', buffer.length);
      
      if (!buffer || buffer.length === 0) {
        throw new Error('Received empty file data');
      }
      
      // Convert the buffer to a Blob
      const blob = new Blob([buffer as any]);
      console.log('[MTProto] Download complete, blob size:', blob.size);
      
      return blob;
    } catch (error: any) {
      console.error('[MTProto] Download failed:', error);
      console.error('[MTProto] Error details:', error.stack);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  async deleteMessage(peer: any, messageId: number): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    await this.client.call({
      _: 'messages.deleteMessages',
      id: [messageId],
      revoke: true,
    });
  }

  async logout(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.call({ _: 'auth.logOut' });
      this.isAuthenticated = false;
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}

export const mtprotoService = new MTProtoService();
