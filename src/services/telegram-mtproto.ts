import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import QRCodeStyling from 'qr-code-styling';
import BigInt from 'big-integer';

// Telegram API credentials (you need to get these from my.telegram.org)
const API_ID = 29371144; // Replace with your API ID from my.telegram.org
const API_HASH = 'b1c5e3b87a2e7c9d0f1a2b3c4d5e6f7'; // Replace with your API hash from my.telegram.org

class TelegramMTProtoService {
  private client: TelegramClient | null = null;
  private session: StringSession | null = null;
  private qrCode: QRCodeStyling | null = null;
  private qrCodeElement: HTMLElement | null = null;

  constructor() {
    this.qrCode = new QRCodeStyling({
      width: 300,
      height: 300,
      type: 'svg',
      data: '',
      dotsOptions: {
        color: '#667eea',
        type: 'rounded',
      },
      backgroundOptions: {
        color: '#ffffff',
      },
      cornersSquareOptions: {
        color: '#764ba2',
        type: 'extra-rounded',
      },
      cornersDotOptions: {
        color: '#764ba2',
        type: 'dot',
      },
    });
  }

  async initialize(): Promise<void> {
    console.log('[MTProto] Initializing...');
    
    // Check if API credentials are set
    if (!API_ID || !API_HASH || API_HASH === 'b1c5e3b87a2e7c9d0f1a2b3c4d5e6f7') {
      throw new Error('API credentials not configured. Please update API_ID and API_HASH in src/services/telegram-mtproto.ts');
    }
    
    // Load session from localStorage if exists
    const savedSession = localStorage.getItem('telegram_session');
    this.session = new StringSession(savedSession || '');
    
    this.client = new TelegramClient(this.session, API_ID, API_HASH, {
      connectionRetries: 3,
      timeout: 5000,
    });
    
    console.log('[MTProto] Client created');
  }

  async connect(): Promise<boolean> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      console.log('[MTProto] Connecting...');
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000))
      ]);
      console.log('[MTProto] Connected successfully');
      return true;
    } catch (error: any) {
      console.error('[MTProto] Failed to connect:', error.message);
      return false;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    if (!this.client) {
      console.log('[MTProto] No client, not logged in');
      return false;
    }
    
    try {
      console.log('[MTProto] Checking if logged in...');
      const me = await Promise.race([
        this.client.getMe(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
      const loggedIn = !!me;
      console.log('[MTProto] Logged in:', loggedIn);
      return loggedIn;
    } catch (error: any) {
      console.log('[MTProto] Not logged in or error:', error.message);
      return false;
    }
  }

  async getMe(): Promise<any> {
    if (!this.client) throw new Error('Client not initialized');
    return await this.client.getMe();
  }

  async startQRCodeLogin(qrElement: HTMLElement): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    this.qrCodeElement = qrElement;

    try {
      const result = await this.client.invoke(
        new Api.auth.ExportLoginToken({
          apiId: API_ID,
          apiHash: API_HASH,
          exceptIds: [],
        })
      );

      if (result.className === 'auth.LoginToken') {
        const tokenBase64 = btoa(String.fromCharCode(...result.token));
        const qrData = `tg://login?token=${tokenBase64}`;
        
        if (this.qrCode && this.qrCodeElement) {
          this.qrCode.update({ data: qrData });
          this.qrCode.append(this.qrCodeElement);
        }

        // Poll for login completion
        await this.pollForLogin(result.expires);
      }
    } catch (error) {
      console.error('QR code login failed:', error);
      throw error;
    }
  }

  private async pollForLogin(expires: number): Promise<void> {
    const checkInterval = 2000; // Check every 2 seconds
    const timeout = (expires - Math.floor(Date.now() / 1000)) * 1000;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = async () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error('QR code expired'));
          return;
        }

        try {
          const result = await this.client!.invoke(
            new Api.auth.ExportLoginToken({
              apiId: API_ID,
              apiHash: API_HASH,
              exceptIds: [],
            })
          );

          if (result.className === 'auth.LoginTokenMigrateTo') {
            // Need to migrate to another DC
            await this.client!.invoke(
              new Api.auth.ImportLoginToken({
                token: result.token,
              })
            );
          } else if (result.className === 'auth.LoginTokenSuccess') {
            // Login successful
            await this.saveSession();
            resolve();
            return;
          }

          setTimeout(check, checkInterval);
        } catch (error) {
          reject(error);
        }
      };

      check();
    });
  }

  async startPhoneLogin(phoneNumber: string): Promise<{ phoneCodeHash: string }> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      const result = await this.client.invoke(
        new Api.auth.SendCode({
          phoneNumber,
          apiId: API_ID,
          apiHash: API_HASH,
          settings: new Api.CodeSettings({
            allowFlashcall: false,
            currentNumber: false,
            allowAppHash: false,
          }),
        })
      );

      if (result.className === 'auth.SentCode') {
        return { phoneCodeHash: result.phoneCodeHash };
      }

      throw new Error('Failed to send code');
    } catch (error) {
      console.error('Phone login failed:', error);
      throw error;
    }
  }

  async verifyPhoneCode(
    phoneNumber: string,
    phoneCode: string,
    phoneCodeHash: string
  ): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      const result = await this.client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCode,
          phoneCodeHash,
        })
      );

      if (result.className === 'auth.Authorization') {
        await this.saveSession();
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Phone verification failed:', error);
      throw error;
    }
  }

  private async saveSession(): Promise<void> {
    if (!this.session) return;
    localStorage.setItem('telegram_session', this.session.save());
  }

  async logout(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.invoke(new Api.auth.LogOut());
      localStorage.removeItem('telegram_session');
      this.session = new StringSession('');
      this.client = new TelegramClient(this.session, API_ID, API_HASH, {
        connectionRetries: 5,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  async getDialogs(): Promise<any[]> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      const result = await this.client.invoke(
        new Api.messages.GetDialogs({
          offsetDate: 0,
          offsetId: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          limit: 100,
          hash: BigInt(0),
        })
      );

      if (result.className === 'messages.Dialogs') {
        return result.dialogs;
      }

      return [];
    } catch (error) {
      console.error('Failed to get dialogs:', error);
      throw error;
    }
  }

  async getChats(): Promise<any[]> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      const dialogs = await this.client.getDialogs({});
      return dialogs.map((d: any) => ({
        id: d.id,
        title: d.title || d.name || 'Unknown',
        username: d.username,
        type: d.isChannel ? 'channel' : d.isGroup ? 'group' : 'chat',
      }));
    } catch (error) {
      console.error('Failed to get chats:', error);
      throw error;
    }
  }

  async getChatHistory(
    chatId: number,
    limit: number = 100
  ): Promise<any[]> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      const entity = await this.client.getEntity(chatId);
      
      const messages = await this.client.getMessages(entity, {
        limit,
      });

      return messages;
    } catch (error) {
      console.error('Failed to get chat history:', error);
      throw error;
    }
  }

  async sendMessage(chatId: number, text: string): Promise<any> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      const entity = await this.client.getEntity(chatId);
      const result = await this.client.sendMessage(entity, { message: text });
      return result;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async sendFile(
    chatId: number,
    file: File,
    caption: string
  ): Promise<any> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      const entity = await this.client.getEntity(chatId);
      
      // Convert File to Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const result = await this.client.sendFile(entity, {
        file: file as any,
        caption: caption,
        forceDocument: true,
      });

      return result;
    } catch (error) {
      console.error('Failed to send file:', error);
      throw error;
    }
  }

  async downloadFile(messageId: number, chatId: number): Promise<Blob> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      const entity = await this.client.getEntity(chatId);
      const messages = await this.client.getMessages(entity, {
        ids: [messageId],
      });

      if (messages.length === 0) {
        throw new Error('Message not found');
      }

      const message = messages[0];
      
      if (!message.media) {
        throw new Error('Message has no media');
      }

      const buffer = await this.client.downloadMedia(message);
      
      if (!buffer) {
        throw new Error('Failed to download media');
      }

      // Convert to Blob
      if (buffer instanceof Uint8Array) {
        return new Blob([buffer as any]);
      } else if (typeof buffer === 'string') {
        // Base64 string
        const binary = atob(buffer);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes as any]);
      }
      
      // Try to convert any other type
      return new Blob([buffer as any]);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  }

  async deleteMessage(chatId: number, messageId: number): Promise<boolean> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      await this.client.invoke(
        new Api.messages.DeleteMessages({
          id: [messageId],
          revoke: true,
        })
      );

      return true;
    } catch (error) {
      console.error('Failed to delete message:', error);
      return false;
    }
  }
}

export const telegramMTProto = new TelegramMTProtoService();
