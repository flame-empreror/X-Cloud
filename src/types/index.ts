export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  title: string;
  type: 'group' | 'supergroup' | 'channel';
  username?: string;
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'file' | 'folder';
  mimeType?: string;
  extension?: string;
  telegramMessageId?: number;
  telegramFileId?: string;
  createdAt: number;
  modifiedAt: number;
}

export interface TransferItem {
  id: string;
  fileName: string;
  type: 'upload' | 'download';
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  speed?: number;
  size: number;
  transferred: number;
  error?: string;
}

export interface AppSettings {
  speedBoost: boolean;
  parallelDownloads: number;
  theme: 'dark' | 'light' | 'system';
}
