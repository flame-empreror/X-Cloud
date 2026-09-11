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

  async getChat(chatId: string | number): Promise<any> {
    const response = await fetch(this.getApiUrl('getChat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return data.result;
  }

  async sendMessage(chatId: number, text: string): Promise<any> {
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
    chatId: number,
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
    onProgress?: (progress: number, speed: number) => void
  ): Promise<Blob> {
    const url = this.getFileDownloadUrl(filePath);
    const response = await fetch(url);
    
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

    return new Blob(chunks as any);
  }

  async deleteMessage(chatId: number, messageId: number): Promise<boolean> {
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
}

export const telegramService = new TelegramService();
