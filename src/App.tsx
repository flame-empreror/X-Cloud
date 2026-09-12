import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { mtprotoService } from './services/mtproto';
import LoginScreenMTProto from './components/LoginScreenMTProto';
import ChannelSelect from './components/ChannelSelect';
import FileManager from './components/FileManager';
import { FileItem, TelegramChat } from './types';
import { Long } from '@mtcute/core';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedChat, setSelectedChat] = useState<TelegramChat | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center mesh-gradient relative overflow-hidden">
        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/8 rounded-full blur-[100px] animate-float" style={{ animationDelay: '1s' }} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="text-center relative z-10"
        >
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-40 animate-pulse-soft" />
            <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69-.01-.03-.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2 gradient-text">TeleCloud</h2>
          <p className="text-zinc-400 text-sm tracking-wide">Initializing secure connection...</p>
          <div className="mt-8 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-500 rounded-full"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center mesh-gradient relative overflow-hidden p-4">
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-red-500/5 rounded-full blur-[100px]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full relative z-10"
        >
          <div className="glass-strong rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Configuration Error</h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{error}</p>
            <button onClick={() => window.location.reload()} className="btn btn-primary w-full">
              Retry Connection
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreenMTProto onLoginSuccess={handleLoginSuccess} />;
  if (!selectedChat) return <ChannelSelect onChatSelect={handleChatSelect} />;

  return (
    <FileManager
      chat={selectedChat}
      files={files}
      setFiles={setFiles}
      onLogout={handleLogout}
    />
  );
}
