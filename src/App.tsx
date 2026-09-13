import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Menu, X } from 'lucide-react';
import { useAppStore } from './store/index';
import { mtprotoService } from './services/mtproto';
import LoginScreenMTProto from './components/LoginScreenMTProto';
import ChannelSelect from './components/ChannelSelect';
import { FileManager } from './components/FileManager';
import Sidebar from './components/Sidebar';
import TransfersPanel from './components/TransfersPanel';
import SettingsPanel from './components/SettingsPanel';
import MediaViewer from './components/MediaViewer';
import { FileItem, TelegramChat } from './types';

export default function App() {
  const { isAuthenticated, selectedChannel, files, setFiles, activeTab, setActiveTab, setAuthenticated, setSelectedChannel } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mediaFile, setMediaFile] = useState<FileItem | null>(null);

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
      setMediaFile(null);
      localStorage.removeItem('telecloud_selected_chat');
    } catch (error) {
      console.error('[App] Logout failed:', error);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="w-14 h-14 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <Cloud className="w-7 h-7" style={{ color: 'var(--accent)' }} />
          </motion.div>
          <p className="text-sm font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>Initializing TeleCloud...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full mx-4 p-8 rounded-[28px] surface-card shadow-2xl shadow-black/20">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.1)' }}>
              <svg className="w-7 h-7" style={{ color: 'var(--error)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>Setup Required</h2>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          </div>
          <button onClick={() => window.location.reload()} className="btn btn-primary w-full rounded-xl py-3 text-sm font-bold shadow-lg shadow-[rgba(99,102,241,0.25)]">Refresh Page</button>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreenMTProto onLoginSuccess={handleLoginSuccess} />;
  if (!selectedChannel) return <ChannelSelect onChatSelect={handleChatSelect} />;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 lg:hidden" style={{ background: 'rgba(10,10,17,0.65)' }} onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <motion.aside initial={false} animate={{ x: sidebarOpen ? 0 : -300 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="fixed lg:relative z-40 h-full lg:z-0" style={{ width: 300, borderRight: '1px solid var(--border-subtle)' }}>
        <div className="h-full overflow-hidden">
          <Sidebar
            activeTab={activeTab} onTabChange={setActiveTab}
            onFolderClick={(path) => { setActiveTab('files'); setCurrentPath(path); }}
            isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
          />
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="lg:hidden flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)]" style={{ background: 'var(--bg-surface)' }}>
          <button onClick={toggleSidebar} className="p-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} /> : <Menu className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />}
          </button>
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <span className="font-extrabold tracking-tight text-sm" style={{ color: 'var(--text-primary)' }}>TeleCloud</span>
          </div>
          <div style={{ width: 36 }} />
        </header>

        <div className="flex-1 overflow-hidden relative">
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
              onPreviewMedia={(file) => setMediaFile(file)}
            />
          )}
          {activeTab === 'transfers' && <TransfersPanel />}
          {activeTab === 'settings' && <SettingsPanel />}

          <AnimatePresence>
            {mediaFile && (
              <MediaViewer
                file={mediaFile}
                chatId={selectedChannel.id}
                onClose={() => setMediaFile(null)}
                files={files}
                onNavigate={(f) => setMediaFile(f)}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
