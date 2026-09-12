import { TelegramClient, InputMedia } from '@mtcute/web';
import { Long } from '@mtcute/core';
import { settingsService } from './settings';

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
      
      // Log ALL message IDs for verification
      console.log('[MTProto] All message IDs:', validMessages.map((m: any) => m.id));
      
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

  async downloadMedia(message: any, onProgress?: (progress: number) => void): Promise<Blob> {
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
      // Extract the document from the converted message
      const document = convertedMessage.media.document;
      
      console.log('[MTProto] Document to download:', {
        id: document.id.toString(),
        accessHash: document.accessHash.toString(),
        size: document.size,
        dcId: document.dcId,
        fileReferenceLength: document.fileReference?.length
      });
      
      // Use the raw upload.getFile API for more control
      console.log('[MTProto] Using raw upload.getFile API...');
      
      // Create the input file location
      const inputFileLocation = {
        _: 'inputDocumentFileLocation',
        id: document.id,
        accessHash: document.accessHash,
        fileReference: document.fileReference,
        thumbSize: ''
      } as any;
      
      console.log('[MTProto] Input file location created');
      
      // Get download settings
      const settings = settingsService.getSettings();
      const chunkSize = settings.chunkSize;
      const parallelDownloads = settings.speedBoost ? settings.parallelDownloads : 1;
      
      console.log(`[MTProto] Download settings: chunkSize=${chunkSize}, parallelDownloads=${parallelDownloads}`);
      
      // Calculate all chunk offsets
      const totalChunks = Math.ceil(document.size / chunkSize);
      const chunkOffsets: number[] = [];
      for (let i = 0; i < totalChunks; i++) {
        chunkOffsets.push(i * chunkSize);
      }
      
      console.log(`[MTProto] Total chunks to download: ${totalChunks}`);
      
      // Download chunks (parallel or sequential based on settings)
      const chunks: { offset: number; data: Uint8Array }[] = [];
      let downloadedBytes = 0;
      
      if (parallelDownloads > 1) {
        // Parallel download
        console.log(`[MTProto] Starting parallel download with ${parallelDownloads} concurrent downloads...`);
        
        const downloadChunk = async (offset: number): Promise<{ offset: number; data: Uint8Array } | null> => {
          try {
            if (!this.client) return null;
            
            const result = await this.client.call({
              _: 'upload.getFile',
              location: inputFileLocation,
              offset: offset,
              limit: chunkSize
            }) as any;
            
            if (result.bytes && result.bytes.length > 0) {
              return { offset, data: result.bytes };
            }
            return null;
          } catch (error) {
            console.error(`[MTProto] Failed to download chunk at offset ${offset}:`, error);
            return null;
          }
        };
        
        // Process chunks in batches
        for (let i = 0; i < chunkOffsets.length; i += parallelDownloads) {
          const batch = chunkOffsets.slice(i, i + parallelDownloads);
          console.log(`[MTProto] Downloading batch: offsets ${batch.join(', ')}`);
          
          const results = await Promise.all(batch.map(offset => downloadChunk(offset)));
          
          for (const result of results) {
            if (result) {
              chunks.push(result);
              downloadedBytes += result.data.length;
              
              // Calculate and report progress
              const progress = Math.min(100, (downloadedBytes / document.size) * 100);
              console.log(`[MTProto] Download progress: ${progress.toFixed(2)}%`);
              
              if (onProgress) {
                onProgress(progress);
              }
            }
          }
        }
      } else {
        // Sequential download
        console.log('[MTProto] Starting sequential download...');
        
        for (const offset of chunkOffsets) {
          console.log(`[MTProto] Downloading chunk at offset ${offset}...`);
          
          const result = await this.client.call({
            _: 'upload.getFile',
            location: inputFileLocation,
            offset: offset,
            limit: chunkSize
          }) as any;
          
          if (result.bytes && result.bytes.length > 0) {
            chunks.push({ offset, data: result.bytes });
            downloadedBytes += result.bytes.length;
            console.log(`[MTProto] Received chunk: ${result.bytes.length} bytes`);
            
            // Calculate and report progress
            const progress = Math.min(100, (downloadedBytes / document.size) * 100);
            console.log(`[MTProto] Download progress: ${progress.toFixed(2)}%`);
            
            if (onProgress) {
              onProgress(progress);
            }
          } else {
            break;
          }
        }
      }
      
      console.log('[MTProto] All chunks downloaded, combining...');
      
      // Sort chunks by offset to ensure correct order
      chunks.sort((a, b) => a.offset - b.offset);
      
      // Combine all chunks into a single buffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
      const buffer = new Uint8Array(totalLength);
      let position = 0;
      for (const chunk of chunks) {
        buffer.set(chunk.data, position);
        position += chunk.data.length;
      }
      
      console.log('[MTProto] File downloaded, buffer size:', buffer.length);
      
      if (buffer.length === 0) {
        throw new Error('Received empty file data');
      }
      
      // Convert the buffer to a Blob
      const blob = new Blob([buffer]);
      console.log('[MTProto] Download complete, blob size:', blob.size);
      
      // Report 100% completion
      if (onProgress) {
        onProgress(100);
      }
      
      return blob;
    } catch (error: any) {
      console.error('[MTProto] Download failed:', error);
      console.error('[MTProto] Error details:', error.stack);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  async deleteMessage(peer: any, messageId: number): Promise<boolean> {
    if (!this.client) throw new Error('Client not initialized');

    console.log('[MTProto] ========== DELETE MESSAGE START ==========');
    console.log('[MTProto] Message ID to delete:', messageId);
    console.log('[MTProto] Peer:', peer);

    try {
      // For channels, we need to use channels.deleteMessages instead of messages.deleteMessages
      // First, we need to get the channel's input channel object
      let result;
      
      // Check if peer is a channel
      // Method 1: Check if peer object has _ === 'inputPeerChannel'
      // Method 2: Check if peer ID is negative (channels have negative IDs)
      let isChannel = false;
      
      if (typeof peer === 'object' && peer !== null) {
        // If peer is an object, check its type
        if (peer._ === 'inputPeerChannel') {
          isChannel = true;
          console.log('[MTProto] Detected channel from peer._ === inputPeerChannel');
        } else if (peer.id && peer.id < 0) {
          isChannel = true;
          console.log('[MTProto] Detected channel from peer.id < 0');
        }
      } else if (typeof peer === 'number') {
        // If peer is a number, check if it's negative
        isChannel = peer < 0;
        if (isChannel) {
          console.log('[MTProto] Detected channel from peer < 0');
        }
      }
      
      console.log('[MTProto] isChannel:', isChannel);
      
      if (isChannel) {
        console.log('[MTProto] Using channels.deleteMessages');
        
        // For channels, we need the input channel object
        // The peer should be an inputPeerChannel object
        let inputChannel;
        if (typeof peer === 'object' && peer._ === 'inputPeerChannel') {
          inputChannel = {
            _: 'inputChannel',
            channelId: peer.channelId,
            accessHash: peer.accessHash
          } as any;
          console.log('[MTProto] Constructed inputChannel from inputPeerChannel');
        } else {
          // This shouldn't happen if detection is correct, but handle it anyway
          console.error('[MTProto] ERROR: isChannel is true but peer is not inputPeerChannel');
          console.error('[MTProto] Peer:', peer);
          throw new Error('Cannot delete: Invalid channel peer object');
        }
        
        result = await this.client.call({
          _: 'channels.deleteMessages',
          channel: inputChannel,
          id: [messageId]
        });
      } else {
        console.log('[MTProto] Detected regular chat, using messages.deleteMessages');
        result = await this.client.call({
          _: 'messages.deleteMessages',
          id: [messageId],
          revoke: true,
        });
      }

      console.log('[MTProto] Delete API call result:', result);
      
      if (result && typeof result === 'object') {
        console.log('[MTProto] Delete result details:', JSON.stringify(result, null, 2));
        
        // Check if deletion was successful
        if ('pts' in result || 'ptsCount' in result) {
          console.log('[MTProto] ✅ Delete appears successful');
          console.log('[MTProto] ========== DELETE MESSAGE COMPLETE ==========');
          return true;
        }
      }
      
      console.warn('[MTProto] ⚠️ Delete call completed but result is unclear');
      console.log('[MTProto] ========== DELETE MESSAGE COMPLETE ==========');
      return true;
    } catch (error: any) {
      console.error('[MTProto] ========== DELETE MESSAGE FAILED ==========');
      console.error('[MTProto] Error:', error);
      console.error('[MTProto] Error message:', error.message);
      console.error('[MTProto] Error details:', error.details);
      console.error('[MTProto] Error stack:', error.stack);
      throw error;
    }
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
