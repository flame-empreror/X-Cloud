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
  inputPeer?: any; // Store the input peer for raw API calls
}

export interface TelegramChannel {
  id: number;
  title: string;
  username?: string;
  type: 'channel' | 'supergroup';
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
  status: 'pending' | 'active' | 'completed' | 'error' | 'paused' | 'cancelled';
  speed?: number;
  size: number;
  transferred: number;
  error?: string;
  path: string;
  abortController?: AbortController;
}

export interface AppSettings {
  speedBoost: boolean;
  parallelDownloads: number;
  chunkSize: number;
  theme: 'dark' | 'light' | 'system';
  autoRefresh: boolean;
}

export interface PinnedFolder {
  id: string;
  name: string;
  path: string;
  pinnedAt: number;
}

export interface AppState {
  user: TelegramUser | null;
  botToken: string;
  selectedChannel: TelegramChannel | null;
  channels: TelegramChannel[];
  currentPath: string;
  files: FileItem[];
  transfers: TransferItem[];
  settings: AppSettings;
  isLoading: boolean;
  isAuthenticated: boolean;
  viewMode: 'grid' | 'list';
  selectedFiles: string[];
  activeTab: string;
}
