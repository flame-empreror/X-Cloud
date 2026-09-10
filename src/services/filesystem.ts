import { FileItem } from '../types';

const CAPTION_PREFIX = '__TCLOUD_V1__';

export class FileSystemService {
  parseMessage(message: any): FileItem | null {
    // Check if message has a document (file upload)
    if (message.document) {
      const caption = message.caption || '';
      
      // Check if caption has our metadata prefix
      if (caption.startsWith(CAPTION_PREFIX)) {
        try {
          const metadata = JSON.parse(caption.substring(CAPTION_PREFIX.length));
          
          return {
            id: message.message_id.toString(),
            name: metadata.name || message.document.file_name || 'Unknown',
            path: metadata.path || '/',
            size: metadata.size || message.document.file_size || 0,
            type: 'file',
            mimeType: metadata.mimeType || message.document.mime_type || 'application/octet-stream',
            extension: metadata.extension || this.getExtension(message.document.file_name),
            telegramMessageId: message.message_id,
            telegramFileId: message.document.file_id,
            createdAt: metadata.createdAt || message.date * 1000,
            modifiedAt: message.date * 1000,
          };
        } catch (error) {
          console.error('[Filesystem] Failed to parse file metadata:', error);
          return null;
        }
      }
    }
    
    // Check if message is a text message with folder metadata
    if (message.text && message.text.startsWith(CAPTION_PREFIX)) {
      try {
        const metadata = JSON.parse(message.text.substring(CAPTION_PREFIX.length));
        
        if (metadata.isFolder) {
          return {
            id: `folder_${message.message_id}`,
            name: metadata.name,
            path: metadata.path || '/',
            size: 0,
            type: 'folder',
            mimeType: 'folder',
            extension: '',
            telegramMessageId: message.message_id,
            createdAt: metadata.createdAt || message.date * 1000,
            modifiedAt: message.date * 1000,
          };
        }
      } catch (error) {
        console.error('[Filesystem] Failed to parse folder metadata:', error);
      }
    }
    
    return null;
  }

  getExtension(filename: string): string {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  buildFileTree(files: FileItem[]): FileItem[] {
    // Build virtual folder structure from file paths
    const folderMap = new Map<string, FileItem>();
    
    for (const file of files) {
      if (file.type === 'folder') continue;
      
      // Extract folder path from file path
      const pathParts = file.path.split('/').filter(p => p && p !== '/');
      
      // Create folder entries for each level
      let currentPath = '';
      for (const part of pathParts) {
        const parentPath = currentPath || '/';
        currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
        
        if (!folderMap.has(currentPath)) {
          folderMap.set(currentPath, {
            id: `folder_${currentPath}`,
            name: part,
            path: parentPath,
            size: 0,
            type: 'folder',
            mimeType: 'folder',
            extension: '',
            createdAt: file.createdAt,
            modifiedAt: file.modifiedAt,
          });
        }
      }
    }
    
    return [...Array.from(folderMap.values()), ...files];
  }
}

export const fileSystemService = new FileSystemService();
