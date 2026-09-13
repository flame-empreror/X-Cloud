import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Menu, X } from 'lucide-react';
import { useAppStore } from './store/index';
import { mtprotoService } from './services/mtproto';
import LoginScreenMTProto from './components/LoginScreenMTProto';
import ChannelSelect from './components/ChannelSelect';
import { FileManager } from './components/FileManager';
import Sidebar from './components/Sidebar';
import { TransfersPanel } from './components/TransfersPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { FileItem, TelegramChat } from './types';

export default function App() {
  const { isAuthenticated, selectedChannel, files, setFiles, activeTab, setActiveTab, setAuthenticated, setSelectedChannel } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
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
          const user = await mtprotoService.getMe();
          if (user) {
            const rawUser = (user as any).raw || user;
            const userData = {
              id: rawUser.id,
              first_name: rawUser.first_name || rawUser.firstName || 'User',
              last_name: rawUser.last_name || rawUser.lastName,
              username: rawUser.username,
              photo_url: user.photo_url,
            };
            useAppStore.getState().setUser(userData);
          }
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

  const handleLoginSuccess = async () => {
    setAuthenticated(true);
    try {
      const user = await mtprotoService.getMe();
      if (user) {
        const rawUser = (user as any).raw || user;
        const userData = {
          id: rawUser.id,
          first_name: rawUser.first_name || rawUser.firstName || 'User',
          last_name: rawUser.last_name || rawUser.lastName,
          username: rawUser.username,
          photo_url: user.photo_url,
        };
        useAppStore.getState().setUser(userData);
      }
    } catch (error) {
      console.error('[App] Failed to fetch user info after login:', error);
    }
  };

  const handleChatSelect = (chat: TelegramChat) => {
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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-muted)' }}
          >
            <Cloud className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </motion.div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Initializing TeleCloud...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-4 p-6 rounded-2xl glass"
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'var(--error-muted)' }}>
              <svg className="w-6 h-6" style={{ color: 'var(--error)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Setup Required</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          </div>
          <button onClick={() => window.location.reload()} className="btn btn-primary w-full">
            Refresh Page
          </button>
        </motion.div>
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
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 lg:hidden"
            style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed lg:relative z-30 h-full"
        style={{ width: sidebarOpen ? 280 : 0, borderRight: '1px solid var(--border-default)' }}
      >
        <div className="h-full overflow-hidden">
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onFolderClick={(path) => {
              setActiveTab('files');
              setCurrentPath(path);
            }}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
          <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-[var(--bg-hover)]">
            {sidebarOpen ? <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} /> : <Menu className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />}
          </button>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>TeleCloud</span>
          </div>
          <div className="w-9" />
        </header>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'files' && (
            <FileManager
              chat={selectedChannel}
              files={files}
              setFiles={setFiles}
              onLogout={handleLogout}
              currentPath={currentPath}
              setCurrentPath={setCurrentPath}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={toggleSidebar}
            />
          )}
          {activeTab === 'transfers' && <TransfersPanel />}
          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </main>
    </div>
  );
}
