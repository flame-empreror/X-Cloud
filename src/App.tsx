import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useAppStore } from './store/index';
import { mtprotoService } from './services/mtproto';
import LoginScreenMTProto from './components/LoginScreenMTProto';
import ChannelSelect from './components/ChannelSelect';
import { FileManager } from './components/FileManager';
import PersistentSidebar from './components/PersistentSidebar';
import { TransfersPanel } from './components/TransfersPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { FileItem, TelegramChat } from './types';

export default function App() {
  const { isAuthenticated, selectedChannel, files, setFiles, activeTab, setActiveTab, setAuthenticated, setSelectedChannel } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    const init = async () => {
      try {
        if (!mtprotoService.hasCredentials()) {
          setError('Telegram API credentials not configured. Please set VITE_TELEGRAM_API_ID and VITE_TELEGRAM_API_HASH in your .env file');
          setIsLoading(false);
          return;
        }
        await mtprotoService.initialize();
        if (mtprotoService.isLoggedIn()) {
          setAuthenticated(true);
          const savedChat = localStorage.getItem('telecloud_selected_chat');
          if (savedChat) {
            try {
              const chat = JSON.parse(savedChat);
              setSelectedChannel(chat);
            } catch (e) { console.error('[App] Failed to parse saved chat:', e); }
          }
        }
      } catch (error: any) {
        setError(error.message || 'Failed to initialize');
      } finally { setIsLoading(false); }
    };
    init();
  }, []);

  const handleLoginSuccess = () => setAuthenticated(true);

  const handleChatSelect = (chat: TelegramChat) => {
    // Convert TelegramChat to TelegramChannel format for the store
    const channel = {
      id: chat.id,
      title: chat.title,
      username: chat.username,
      type: chat.type as 'channel' | 'supergroup',
    };
    setSelectedChannel(channel);
    const chatToSave = {
      ...chat,
      inputPeer: chat.inputPeer ? {
        _: chat.inputPeer._,
        accessHash: chat.inputPeer.accessHash?.toString() || '0',
        channelId: chat.inputPeer.channelId,
      } : null
    };
    localStorage.setItem('telecloud_selected_chat', JSON.stringify(chatToSave));
  };

  const handleLogout = async () => {
    try {
      await mtprotoService.logout();
      setAuthenticated(false);
      setSelectedChannel(null);
      setFiles([]);
      setError(null);
      localStorage.removeItem('telecloud_selected_chat');
    } catch (error) {
      console.error('[App] Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-base">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg flex items-center justify-center bg-elevated">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-accent" />
          </div>
          <p className="text-sm text-muted">Initializing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-base p-4">
        <div className="max-w-md w-full bg-surface border border-default rounded-lg p-6">
          <h2 className="text-xl font-bold text-primary mb-2">Error</h2>
          <p className="text-sm text-secondary mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary w-full">
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreenMTProto onLoginSuccess={handleLoginSuccess} />;
  }

  if (!selectedChannel) {
    return <ChannelSelect onChatSelect={handleChatSelect} />;
  }

  return (
    <div className="flex h-screen bg-base">
      <PersistentSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFolderClick={(path) => {
          setActiveTab('files');
          setCurrentPath(path);
        }}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'files' && (
          <FileManager
            chat={selectedChannel}
            files={files}
            setFiles={setFiles}
            onLogout={handleLogout}
            currentPath={currentPath}
            setCurrentPath={setCurrentPath}
          />
        )}
        {activeTab === 'transfers' && <TransfersPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}
