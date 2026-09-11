import { useState, useEffect } from 'react';
import { telegramService } from './services/telegram';
import LoginScreen from './components/LoginScreen';
import FileManager from './components/FileManager';
import { FileItem } from './types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we have a saved session
    const savedToken = localStorage.getItem('telegram_bot_token');
    const savedChatId = localStorage.getItem('telegram_chat_id');
    
    if (savedToken && savedChatId) {
      telegramService.setBotToken(savedToken);
      setChatId(parseInt(savedChatId));
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (botToken: string, chatIdValue: number) => {
    telegramService.setBotToken(botToken);
    localStorage.setItem('telegram_bot_token', botToken);
    localStorage.setItem('telegram_chat_id', chatIdValue.toString());
    setChatId(chatIdValue);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('telegram_bot_token');
    localStorage.removeItem('telegram_chat_id');
    setIsAuthenticated(false);
    setChatId(null);
    setFiles([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/50">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">TeleCloud</h2>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !chatId) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <FileManager
      chatId={chatId}
      files={files}
      setFiles={setFiles}
      onLogout={handleLogout}
    />
  );
}
