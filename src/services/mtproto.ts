import { TelegramClient, InputMedia } from '@mtcute/web';

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
      // Use raw API call for getDialogs
      const result = await this.client.call({
        _: 'messages.getDialogs',
        limit: 100,
        offsetDate: 0,
        offsetId: 0,
        offsetPeer: { _: 'inputPeerEmpty' as const },
        hash: { _: 'long', value: BigInt(0) } as any,
      }) as any;

      console.log('[MTProto] Raw getDialogs result:', result);

      // Handle the response structure
      if (result._ === 'messages.dialogs' || result._ === 'messages.dialogsSlice') {
        // Create a map of all chats and channels by ID
        const entityMap = new Map<number, any>();
        
        // Add chats to map
        if (result.chats) {
          result.chats.forEach((chat: any) => {
            entityMap.set(chat.id, {
              id: chat.id,
              title: chat.title || 'Unknown',
              type: chat.megagroup || chat.gigagroup ? 'group' : 'chat',
            });
          });
        }
        
        // Add channels to map
        if (result.channels) {
          result.channels.forEach((channel: any) => {
            entityMap.set(channel.id, {
              id: channel.id,
              title: channel.title || 'Unknown',
              type: 'channel',
            });
          });
        }

        console.log('[MTProto] Entity map:', Array.from(entityMap.values()));

        // Map dialogs to our format using the entity map
        const dialogs = (result.dialogs || []).map((d: any) => {
          const peerId = d.peer.channel_id || d.peer.chat_id || d.peer.user_id;
          const entity = entityMap.get(peerId);
          
          return {
            id: peerId,
            title: entity?.title || 'Unknown',
            type: entity?.type || 'chat',
            peer: d.peer,
          };
        });

        console.log('[MTProto] Mapped dialogs:', dialogs);
        return dialogs;
      }

      return [];
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

  async getMessages(chatId: number, limit: number = 100): Promise<any[]> {
    if (!this.client) throw new Error('Client not initialized');

    const messages = await this.client.getMessages(chatId, limit);
    return messages;
  }

  async sendMessage(peer: any, text: string): Promise<any> {
    if (!this.client) throw new Error('Client not initialized');

    return await this.client.sendText(peer, text);
  }

  async sendFile(peer: any, file: File, caption: string): Promise<any> {
    if (!this.client) throw new Error('Client not initialized');

    // Use sendMedia with InputMedia
    return await this.client.sendMedia(peer, InputMedia.auto(file, {
      caption,
    }));
  }

  async downloadMedia(media: any): Promise<Blob> {
    if (!this.client) throw new Error('Client not initialized');

    const buffer = await this.client.downloadAsBuffer(media);
    return new Blob([buffer as any]);
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
