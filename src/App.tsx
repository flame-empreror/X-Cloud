import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { mtprotoService } from './services/mtproto';
import LoginScreenMTProto from './components/LoginScreenMTProto';
import ChannelSelect from './components/ChannelSelect';
import FileManager from './components/FileManager';
import PersistentSidebar from './components/PersistentSidebar';
import { FileItem, TelegramChat } from './types';
import { Long } from '@mtcute/core';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedChat, setSelectedChat] = useState<TelegramChat | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('files');
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    const init = async () => {
      try {
        if (!mtprotoService.hasCredentials()) {
          setError('Telegram API credentials not configured. Set VITE_TELEGRAM_API_ID and VITE_TELEGRAM_API_HASH.');
          setIsLoading(false);
          return;
        }
        await mtprotoService.initialize();
        if (mtprotoService.isLoggedIn()) {
          setIsAuthenticated(true);
          const savedChat = localStorage.getItem('telecloud_selected_chat');
          if (savedChat) {
            try {
              const chat = JSON.parse(savedChat);
              if (chat.inputPeer) {
                chat.inputPeer = {
                  _: chat.inputPeer._ || 'inputPeerChannel',
                  accessHash: Long.fromString(chat.inputPeer.accessHash || '0'),
                  channelId: chat.inputPeer.channelId,
                };
              }
              setSelectedChat(chat);
            } catch (e) { console.error('[App] Failed to parse saved chat:', e); }
          }
        }
      } catch (error: any) {
        setError(error.message || 'Failed to initialize');
      } finally { setIsLoading(false); }
    };
    init();
  }, []);

  const handleLoginSuccess = () => setIsAuthenticated(true);

  const handleChatSelect = (chat: TelegramChat) => {
    setSelectedChat(chat);
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
      setIsAuthenticated(false);
      setSelectedChat(null);
      setFiles([]);
      setError(null);
      localStorage.removeItem('telecloud_selected_chat');
    } catch (error) { console.error('[App] Logout failed:', error); }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-10 h-10 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-4"
        >
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'rgba(248, 113, 113, 0.1)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--error)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Configuration Error</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button onClick={() => window.location.reload()} className="btn btn-primary w-full">
              Retry
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreenMTProto onLoginSuccess={handleLoginSuccess} />;
  if (!selectedChat) return <ChannelSelect onChatSelect={handleChatSelect} />;

  const handleFolderClick = (path: string) => {
    setActiveTab('files');
    setCurrentPath(path);
  };

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
      <PersistentSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFolderClick={handleFolderClick}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'files' && (
          <FileManager
            chat={selectedChat}
            files={files}
            setFiles={setFiles}
            onLogout={handleLogout}
            currentPath={currentPath}
            setCurrentPath={setCurrentPath}
          />
        )}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-auto">
            {/* Settings component will be added here */}
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Settings</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Settings panel coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
