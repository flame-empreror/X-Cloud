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
    // Verify bot token is set
    if (!this.botToken) {
      throw new Error('Bot token not set. Please enter your bot token first.');
    }

    console.log('[Telegram] Getting chat info for:', chatId);
    console.log('[Telegram] Bot token:', this.botToken.substring(0, 10) + '...');

    // Use GET request with query parameter (most reliable method)
    const url = `https://api.telegram.org/bot${this.botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`;
    
    console.log('[Telegram] Request URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('[Telegram] Response:', data);

    if (!data.ok) {
      const errorMsg = data.description || 'Unknown error';
      const errorCode = data.error_code || 'unknown';
      
      console.error('[Telegram] API Error:', { errorCode, errorMsg, chatId });
      
      // Provide clear error messages
      if (errorMsg.toLowerCase().includes('chat not found')) {
        throw new Error(`Channel not found. The bot cannot access this channel.\n\nPlease verify:\n• Bot is added as administrator to the channel\n• You entered the correct identifier\n• For public channels: use username (e.g., "mychannel")\n• For private channels: use numeric ID (e.g., "-1001234567890")\n\nYou entered: "${chatId}"`);
      } else if (errorMsg.toLowerCase().includes('unauthorized')) {
        throw new Error('Invalid bot token. Please check your token from @BotFather.');
      } else if (errorMsg.toLowerCase().includes('forbidden') || errorMsg.toLowerCase().includes('bot is not a member')) {
        throw new Error('Bot does not have access to this channel. Make sure the bot is added as an administrator with "Post Messages" permission.');
      } else if (errorMsg.toLowerCase().includes('bad request')) {
        throw new Error(`Invalid channel identifier: "${chatId}". Please check the format.`);
      }
      
      throw new Error(`Telegram error: ${errorMsg}`);
    }
    
    const chat = data.result;
    console.log('[Telegram] Successfully got chat:', chat);
    
    return {
      id: chat.id,
      title: chat.title || chat.username || 'Unknown Channel',
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
