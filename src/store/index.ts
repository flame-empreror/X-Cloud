import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, FileItem, TransferItem, AppSettings, TelegramChannel, TelegramUser } from '../types';
import { StorageService } from '../services/storage';

interface AppActions {
  setUser: (user: TelegramUser | null) => void;
  setBotToken: (token: string) => void;
  setSelectedChannel: (channel: TelegramChannel | null) => void;
  setChannels: (channels: TelegramChannel[]) => void;
  setCurrentPath: (path: string) => void;
  setFiles: (files: FileItem[]) => void;
  addFile: (file: FileItem) => void;
  removeFile: (id: string) => void;
  addTransfer: (transfer: TransferItem) => void;
  updateTransfer: (id: string, updates: Partial<TransferItem>) => void;
  removeTransfer: (id: string) => void;
  clearCompletedTransfers: () => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  setIsLoading: (loading: boolean) => void;
  setAuthenticated: (auth: boolean) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSelectedFiles: (files: string[]) => void;
  toggleFileSelection: (id: string) => void;
  clearSelection: () => void;
  logout: () => void;
  setActiveTab: (tab: string) => void;
  activeTab: string;
  pinnedFolders: import('../types').PinnedFolder[];
  pinFolder: (path: string, name: string) => void;
  unpinFolder: (path: string) => void;
}

const defaultSettings: AppSettings = {
  speedBoost: false,
  parallelDownloads: 3,
  chunkSize: 5 * 1024 * 1024,
  theme: 'dark',
  autoRefresh: true,
};

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set) => ({
      user: null,
      botToken: '',
      selectedChannel: null,
      channels: [],
      currentPath: '/',
      files: [],
      transfers: [],
      settings: defaultSettings,
      isLoading: false,
      isAuthenticated: false,
      viewMode: 'grid',
      selectedFiles: [],
      activeTab: 'files',
      pinnedFolders: [],

      setUser: (user) => set({ user }),
      setBotToken: (botToken) => set({ botToken }),
      setSelectedChannel: (selectedChannel) => set({ selectedChannel }),
      setChannels: (channels) => set({ channels }),
      setCurrentPath: (currentPath) => set({ currentPath }),
      setFiles: (files) => {
        StorageService.saveFiles(files);
        set({ files });
      },
      addFile: (file) => set((state) => {
        const newFiles = [...state.files, file];
        StorageService.saveFiles(newFiles);
        return { files: newFiles };
      }),
      removeFile: (id) => set((state) => {
        const newFiles = state.files.filter(f => f.id !== id);
        StorageService.saveFiles(newFiles);
        return { files: newFiles };
      }),
      addTransfer: (transfer) => set((state) => ({ transfers: [transfer, ...state.transfers] })),
      updateTransfer: (id, updates) => set((state) => ({
        transfers: state.transfers.map(t => t.id === id ? { ...t, ...updates } : t),
      })),
      removeTransfer: (id) => set((state) => ({ transfers: state.transfers.filter(t => t.id !== id) })),
      clearCompletedTransfers: () => set((state) => ({
        transfers: state.transfers.filter(t => t.status !== 'completed'),
      })),
      setSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings },
      })),
      setIsLoading: (isLoading) => set({ isLoading }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setViewMode: (viewMode) => set({ viewMode }),
      setSelectedFiles: (selectedFiles) => set({ selectedFiles }),
      toggleFileSelection: (id) => set((state) => ({
        selectedFiles: state.selectedFiles.includes(id)
          ? state.selectedFiles.filter(f => f !== id)
          : [...state.selectedFiles, id],
      })),
      clearSelection: () => set({ selectedFiles: [] }),
      setActiveTab: (activeTab) => set({ activeTab }),
      pinFolder: (path, name) => set((state) => ({
        pinnedFolders: [
          ...state.pinnedFolders,
          { id: `pin-${Date.now()}`, name, path, pinnedAt: Date.now() }
        ]
      })),
      unpinFolder: (path) => set((state) => ({
        pinnedFolders: state.pinnedFolders.filter(f => f.path !== path)
      })),
      logout: () => {
        StorageService.clearFiles();
        set({
          user: null,
          botToken: '',
          selectedChannel: null,
          channels: [],
          currentPath: '/',
          files: [],
          transfers: [],
          isAuthenticated: false,
          selectedFiles: [],
          activeTab: 'files',
          pinnedFolders: [],
        });
      },
    }),
    {
      name: 'telecloud-storage',
      partialize: (state) => ({
        user: state.user,
        botToken: state.botToken,
        selectedChannel: state.selectedChannel,
        settings: state.settings,
        isAuthenticated: state.isAuthenticated,
        viewMode: state.viewMode,
      }),
    }
  )
);
