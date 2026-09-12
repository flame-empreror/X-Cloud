import { create } from 'zustand';

interface AppState {
  activeTab: 'files' | 'transfers' | 'settings';
  setActiveTab: (tab: 'files' | 'transfers' | 'settings') => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'files',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
