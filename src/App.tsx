import { useState, useEffect } from 'react';
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
    // Initialize MTProto and check if already logged in
    const init = async () => {
      try {
        console.log('[App] Initializing MTProto...');
        
        if (!mtprotoService.hasCredentials()) {
          setError('Telegram API credentials not configured. Please set VITE_TELEGRAM_API_ID and VITE_TELEGRAM_API_HASH environment variables.');
          setIsLoading(false);
          return;
        }

        await mtprotoService.initialize();
        
        if (mtprotoService.isLoggedIn()) {
          console.log('[App] User is already logged in');
          setIsAuthenticated(true);
          
          // Restore selected chat from localStorage
          const savedChat = localStorage.getItem('telecloud_selected_chat');
          if (savedChat) {
            try {
              const chat = JSON.parse(savedChat);
              
              // Restore the inputPeer with proper Long object conversion
              if (chat.inputPeer) {
                chat.inputPeer = {
                  _: chat.inputPeer._ || 'inputPeerChannel',
                  // Convert string back to Long object
                  accessHash: Long.fromString(chat.inputPeer.accessHash || '0'),
                  channelId: chat.inputPeer.channelId,
                };
              }
              
              console.log('[App] Restored selected chat:', chat);
              console.log('[App] Restored inputPeer:', chat.inputPeer);
              setSelectedChat(chat);
            } catch (e) {
              console.error('[App] Failed to parse saved chat:', e);
            }
          }
        } else {
          console.log('[App] User is not logged in');
        }
      } catch (error: any) {
        console.error('[App] Failed to initialize MTProto:', error);
        setError(error.message || 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const handleLoginSuccess = () => {
    console.log('[App] Login successful');
    setIsAuthenticated(true);
  };

  const handleChatSelect = (chat: TelegramChat) => {
    console.log('[App] Chat selected:', chat);
    console.log('[App] Chat inputPeer:', chat.inputPeer);
    setSelectedChat(chat);
    
    // Save selected chat to localStorage
    // Convert Long objects to strings for proper serialization
    const chatToSave = {
      ...chat,
      inputPeer: chat.inputPeer ? {
        _: chat.inputPeer._,
        // Convert Long object to string for JSON serialization
        accessHash: chat.inputPeer.accessHash?.toString() || '0',
        channelId: chat.inputPeer.channelId,
      } : null
    };
    
    localStorage.setItem('telecloud_selected_chat', JSON.stringify(chatToSave));
    console.log('[App] Saved chat to localStorage:', chatToSave);
  };

  const handleLogout = async () => {
    try {
      await mtprotoService.logout();
      setIsAuthenticated(false);
      setSelectedChat(null);
      setFiles([]);
      setError(null);
      // Clear saved chat from localStorage
      localStorage.removeItem('telecloud_selected_chat');
    } catch (error) {
      console.error('[App] Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/50 animate-pulse">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">TeleCloud</h2>
          <p className="text-gray-400 text-sm">Initializing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Configuration Error</h2>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreenMTProto onLoginSuccess={handleLoginSuccess} />;
  }

  if (!selectedChat) {
    return <ChannelSelect onChatSelect={handleChatSelect} />;
  }

  return (
    <FileManager
      chat={selectedChat}
      files={files}
      setFiles={setFiles}
      onLogout={handleLogout}
    />
  );
}
