import { FileItem } from '../types';
import telegramService from './telegram';

const CAPTION_PREFIX = '__TCLOUD_V1__';

interface FileMetadata {
  name: string;
  path: string;
  size: number;
  mimeType: string;
  extension: string;
  createdAt: number;
  isFolder?: boolean;
}

function encodeMetadata(metadata: FileMetadata): string {
  return `${CAPTION_PREFIX}${JSON.stringify(metadata)}`;
}

function decodeMetadata(caption: string): FileMetadata | null {
  if (!caption || !caption.startsWith(CAPTION_PREFIX)) return null;
  try {
    return JSON.parse(caption.slice(CAPTION_PREFIX.length));
  } catch {
    return null;
  }
}

export class FileSystemService {
  private chatId: number = 0;
  private fileCache: Map<string, FileItem> = new Map();
  private lastMessageId: number = 0;

  setChannel(chatId: number) {
    this.chatId = chatId;
    this.fileCache.clear();
    this.lastMessageId = 0;
  }

  async scanChannel(onProgress?: (count: number) => void): Promise<FileItem[]> {
    const files: FileItem[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const messages = await this.fetchMessages(offset, limit);
        
        if (!messages || messages.length === 0) {
          hasMore = false;
          break;
        }

        for (const msg of messages) {
          const document = msg.document;
          if (!document) continue;

          const metadata = decodeMetadata(msg.caption || '');
          if (!metadata) continue;

          const fileItem: FileItem = {
            id: `${msg.message_id}`,
            name: metadata.name,
            path: metadata.path,
            size: metadata.size,
            type: 'file',
            mimeType: metadata.mimeType,
            extension: metadata.extension,
            telegramMessageId: msg.message_id,
            telegramFileId: document.file_id,
            createdAt: metadata.createdAt,
            modifiedAt: msg.date * 1000,
          };

          files.push(fileItem);
          this.fileCache.set(fileItem.id, fileItem);
        }

        offset = messages[messages.length - 1].message_id;
        if (onProgress) onProgress(files.length);
        
        if (messages.length < limit) {
          hasMore = false;
        }
      } catch (error) {
        console.error('Error scanning channel:', error);
        hasMore = false;
      }
    }

    return files;
  }

  private async fetchMessages(offset: number, limit: number): Promise<any[]> {
    // Use getUpdates with offset to get channel messages
    // For a proper implementation, we'd use the Bot API's getChatHistory
    // But since that's not available, we use a workaround with stored message IDs
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${telegramService['botToken']}/getUpdates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offset: offset > 0 ? offset : undefined,
            limit,
            timeout: 0,
          }),
        }
      );
      const data = await response.json();
      if (!data.ok) return [];
      
      // Extract messages from updates
      const messages = data.result
        .map((u: any) => u.channel_post || u.message)
        .filter((m: any) => m && m.chat && (m.chat.id === this.chatId || m.chat.id.toString() === this.chatId.toString()));
      
      return messages;
    } catch {
      return [];
    }
  }

  async uploadFile(
    file: File,
    currentPath: string,
    onProgress?: (progress: number) => void
  ): Promise<FileItem> {
    const extension = file.name.split('.').pop() || '';
    const metadata: FileMetadata = {
      name: file.name,
      path: currentPath,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      extension,
      createdAt: Date.now(),
    };

    const caption = encodeMetadata(metadata);
    const result = await telegramService.sendDocument(this.chatId, file, caption, onProgress);

    const fileItem: FileItem = {
      id: `${result.message_id}`,
      name: file.name,
      path: currentPath,
      size: file.size,
      type: 'file',
      mimeType: file.type || 'application/octet-stream',
      extension,
      telegramMessageId: result.message_id,
      telegramFileId: result.document?.file_id,
      createdAt: metadata.createdAt,
      modifiedAt: Date.now(),
    };

    this.fileCache.set(fileItem.id, fileItem);
    return fileItem;
  }

  async downloadFile(
    fileItem: FileItem,
    onProgress?: (progress: number, speed: number) => void,
    signal?: AbortSignal
  ): Promise<Blob> {
    if (!fileItem.telegramFileId) throw new Error('No file ID available');
    
    const fileInfo = await telegramService.getFile(fileItem.telegramFileId);
    return telegramService.downloadFile(fileInfo.file_path, onProgress, signal);
  }

  async deleteFile(fileItem: FileItem): Promise<boolean> {
    if (!fileItem.telegramMessageId) return false;
    
    const success = await telegramService.deleteMessage(this.chatId, fileItem.telegramMessageId);
    if (success) {
      this.fileCache.delete(fileItem.id);
    }
    return success;
  }

  async createFolder(name: string, currentPath: string): Promise<FileItem> {
    const metadata: FileMetadata = {
      name,
      path: currentPath,
      size: 0,
      mimeType: 'folder',
      extension: '',
      createdAt: Date.now(),
      isFolder: true,
    };

    const caption = encodeMetadata(metadata);
    const result = await telegramService.sendMessage(this.chatId, caption);

    const folderItem: FileItem = {
      id: `folder_${name}_${Date.now()}`,
      name,
      path: currentPath,
      size: 0,
      type: 'folder',
      mimeType: 'folder',
      extension: '',
      telegramMessageId: result.message_id,
      createdAt: metadata.createdAt,
      modifiedAt: Date.now(),
    };

    this.fileCache.set(folderItem.id, folderItem);
    return folderItem;
  }

  getFilesInPath(files: FileItem[], path: string): FileItem[] {
    // Get direct children of the given path
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    
    const directChildren = new Set<string>();
    const folders = new Map<string, FileItem>();

    for (const file of files) {
      if (file.path === path || file.path === normalizedPath || file.path === normalizedPath.slice(0, -1)) {
        directChildren.add(file.name);
        if (file.type === 'file') {
          // File is directly in this path
        }
      } else {
        // Check if this file is in a subfolder
        const relativePath = file.path.startsWith(normalizedPath) 
          ? file.path.slice(normalizedPath.length)
          : file.path.startsWith(path + '/')
            ? file.path.slice(path.length + 1)
            : null;
        
        if (relativePath) {
          const folderName = relativePath.split('/')[0];
          if (folderName && !folders.has(folderName)) {
            folders.set(folderName, {
              id: `folder_${folderName}`,
              name: folderName,
              path: path,
              size: 0,
              type: 'folder',
              mimeType: 'folder',
              createdAt: file.createdAt,
              modifiedAt: file.modifiedAt,
            });
          }
        }
      }
    }

    const filesInPath = files.filter(f => 
      f.path === path || f.path === normalizedPath || f.path === normalizedPath.slice(0, -1)
    );

    return [...Array.from(folders.values()), ...filesInPath];
  }

  getDownloadUrl(fileId: string): string {
    return `https://api.telegram.org/file/bot${telegramService['botToken']}/${fileId}`;
  }
}

export const fileSystemService = new FileSystemService();
export default fileSystemService;
