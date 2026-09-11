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

  async initialize(): Promise<void> {
    if (!API_ID || !API_HASH) {
      throw new Error('Telegram API credentials not configured. Please set VITE_TELEGRAM_API_ID and VITE_TELEGRAM_API_HASH in your .env file');
    }

    this.client = new TelegramClient({
      apiId: API_ID,
      apiHash: API_HASH,
      storage: 'telecloud-session', // Uses IndexedDB
    });

    await this.client.connect();
    
    // Check if already logged in
    try {
      const me = await this.client.getMe();
      this.isAuthenticated = !!me;
    } catch {
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

    // Use raw API call for getDialogs
    const result = await this.client.call({
      _: 'messages.getDialogs',
      limit: 100,
      offsetDate: 0,
      offsetId: 0,
      offsetPeer: { _: 'inputPeerEmpty' as const },
      hash: { _: 'long', value: BigInt(0) } as any,
    });

    if (result._ === 'messages.dialogs' || result._ === 'messages.dialogsSlice') {
      return result.dialogs;
    }

    return [];
  }

  async getChatHistory(peer: any, limit: number = 100): Promise<any[]> {
    if (!this.client) throw new Error('Client not initialized');

    const messages = await this.client.getMessages(peer, limit);
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
