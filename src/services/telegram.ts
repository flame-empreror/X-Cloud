import { TelegramChannel, TelegramUser, FileItem, TransferItem } from '../types';

const API_BASE = 'https://api.telegram.org/bot';

class TelegramService {
  private botToken: string = '';

  setBotToken(token: string) {
    this.botToken = token;
  }

  private getApiUrl(method: string): string {
    return `${API_BASE}${this.botToken}/${method}`;
  }

  async getMe(): Promise<any> {
    const response = await fetch(this.getApiUrl('getMe'));
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return data.result;
  }

  async getUpdates(offset?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (offset) params.set('offset', offset.toString());
    params.set('timeout', '0');
    const response = await fetch(`${this.getApiUrl('getUpdates')}?${params}`);
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return data.result;
  }

  async getChatAdministrators(chatId: number): Promise<any[]> {
    const response = await fetch(this.getApiUrl('getChatAdministrators'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId }),
    });
    const data = await response.json();
    if (!data.ok) {
      // If we can't get administrators, just return empty array
      // This can happen if bot doesn't have sufficient permissions
      console.warn('Could not get chat administrators:', data.description);
      return [];
    }
    return data.result;
  }

  async getUserChannels(userId: number): Promise<TelegramChannel[]> {
    // Telegram Bot API doesn't have a direct method to list all chats
    // We'll return empty and rely on manual channel input
    // In a real implementation, you'd store channel IDs when bot joins
    return [];
  }

  async getChatInfo(chatId: string | number): Promise<TelegramChannel> {
    // First verify the bot token is valid
    try {
      await this.getMe();
    } catch (error) {
      throw new Error('Invalid bot token. Please check your token and try again.');
    }

    console.log('Attempting to get chat info for:', chatId);
    console.log('Chat ID type:', typeof chatId);

    // Try multiple approaches to get chat info
    let data: any = null;
    let lastError = '';

    // Approach 1: POST with JSON body (standard)
    try {
      const response = await fetch(this.getApiUrl('getChat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId }),
      });
      data = await response.json();
      console.log('POST response:', data);
    } catch (error: any) {
      lastError = error.message;
      console.error('POST approach failed:', error);
    }

    // Approach 2: GET with query parameter (fallback)
    if (!data || !data.ok) {
      try {
        const url = `${this.getApiUrl('getChat')}?chat_id=${encodeURIComponent(chatId)}`;
        const response = await fetch(url);
        data = await response.json();
        console.log('GET response:', data);
      } catch (error: any) {
        lastError = error.message;
        console.error('GET approach failed:', error);
      }
    }

    // If both approaches failed
    if (!data) {
      throw new Error(`Failed to connect to Telegram API: ${lastError}`);
    }

    if (!data.ok) {
      const errorMsg = data.description || 'Unknown error';
      const errorCode = data.error_code || 'unknown';
      
      console.error('Telegram API error:', { errorCode, errorMsg, chatId });
      
      // Provide detailed error messages based on error code
      if (errorCode === 400) {
        if (errorMsg.includes('chat not found')) {
          throw new Error(`Channel not found. The bot cannot see this channel. Please verify:\n1. Bot is added as administrator\n2. You entered the correct identifier\n3. For public channels: use username without @\n4. For private channels: use numeric ID (starts with -100)\n\nDebug: You entered "${chatId}"`);
        } else if (errorMsg.includes('Bad Request')) {
          throw new Error(`Invalid request. Please check the channel identifier format. You entered: "${chatId}"`);
        }
      } else if (errorCode === 401) {
        throw new Error('Unauthorized. Your bot token may be invalid or expired.');
      } else if (errorCode === 403) {
        throw new Error('Forbidden. The bot does not have permission to access this channel. Make sure the bot is an administrator.');
      } else if (errorCode === 404) {
        throw new Error(`Channel not found. The identifier "${chatId}" is not valid or the channel doesn't exist.`);
      }
      
      throw new Error(`Telegram API Error (${errorCode}): ${errorMsg}`);
    }
    
    const chat = data.result;
    console.log('Successfully got chat info:', chat);
    
    // Verify the bot has admin rights (optional check)
    if (chat.type === 'channel' || chat.type === 'supergroup') {
      try {
        const admins = await this.getChatAdministrators(chat.id);
        const botInfo = await this.getMe();
        const isBotAdmin = admins.some((admin: any) => admin.user.id === botInfo.id);
        
        if (!isBotAdmin && admins.length > 0) {
          console.warn('Bot may not be an administrator in this channel.');
        }
      } catch (adminError: any) {
        console.warn('Could not verify admin status:', adminError.message);
      }
    }
    
    return {
      id: chat.id,
      title: chat.title || chat.username || 'Unknown',
      username: chat.username,
      type: chat.type,
    };
  }

  async sendMessage(chatId: string | number, text: string): Promise<any> {
    const response = await fetch(this.getApiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return data.result;
  }

  async sendDocument(
    chatId: string | number,
    file: File,
    caption: string,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    formData.append('document', file);
    formData.append('caption', caption);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.ok) {
            resolve(data.result);
          } else {
            reject(new Error(data.description));
          }
        } catch (e) {
          reject(new Error('Failed to parse response'));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

      xhr.open('POST', this.getApiUrl('sendDocument'));
      xhr.send(formData);
    });
  }

  async getFile(fileId: string): Promise<{ file_path: string; file_size: number }> {
    const response = await fetch(this.getApiUrl('getFile'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return data.result;
  }

  getFileDownloadUrl(filePath: string): string {
    return `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
  }

  async downloadFile(
    filePath: string,
    onProgress?: (progress: number, speed: number) => void,
    signal?: AbortSignal
  ): Promise<Blob> {
    const url = this.getFileDownloadUrl(filePath);
    const response = await fetch(url, { signal });
    
    if (!response.ok) throw new Error('Download failed');

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const chunks: Uint8Array[] = [];
    let received = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      received += value.length;
      
      if (onProgress && total > 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = received / elapsed;
        onProgress((received / total) * 100, speed);
      }
    }

    return new Blob(chunks as unknown as BlobPart[]);
  }

  async getChannelMessages(
    chatId: number,
    limit: number = 100,
    offset?: number
  ): Promise<any[]> {
    const params: any = {
      chat_id: chatId,
      limit,
    };
    if (offset) params.offset = offset;

    const response = await fetch(this.getApiUrl('getUpdates'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return data.result;
  }

  async forwardMessage(chatId: number, fromChatId: number, messageId: number): Promise<any> {
    const response = await fetch(this.getApiUrl('forwardMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        from_chat_id: fromChatId,
        message_id: messageId,
      }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return data.result;
  }

  async deleteMessage(chatId: string | number, messageId: number): Promise<boolean> {
    const response = await fetch(this.getApiUrl('deleteMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });
    const data = await response.json();
    return data.ok;
  }

  async editMessageCaption(chatId: number, messageId: number, caption: string): Promise<any> {
    const response = await fetch(this.getApiUrl('editMessageCaption'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        caption,
      }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return data.result;
  }
}

export const telegramService = new TelegramService();
export default telegramService;
