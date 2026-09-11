import { useState } from 'react';
import { telegramService } from '../services/telegram';

interface LoginScreenProps {
  onLogin: (botToken: string, chatId: number) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [step, setStep] = useState<'token' | 'chat'>('token');
  const [botToken, setBotToken] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTokenSubmit = async () => {
    if (!botToken.trim()) {
      setError('Please enter a bot token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      telegramService.setBotToken(botToken.trim());
      await telegramService.getMe();
      setStep('chat');
    } catch (err: any) {
      setError('Invalid bot token. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) {
      setError('Please enter a chat ID or username');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const chat = await telegramService.getChat(chatInput.trim());
      onLogin(botToken, chat.id);
    } catch (err: any) {
      setError('Could not find chat. Make sure the bot is added to the chat and you entered the correct ID or username.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/50">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">TeleCloud</h1>
            <p className="text-gray-400">
              {step === 'token' ? 'Enter your bot token' : 'Enter chat ID or username'}
            </p>
          </div>

          {step === 'token' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bot Token
                </label>
                <input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleTokenSubmit}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Next'}
              </button>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-blue-300 text-sm">
                  <strong>How to get a bot token:</strong>
                  <br />
                  1. Message @BotFather on Telegram
                  <br />
                  2. Send /newbot and follow instructions
                  <br />
                  3. Copy the token and paste it here
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Chat ID or Username
                </label>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="-1001234567890 or @username"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleChatSubmit}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>

              <button
                onClick={() => setStep('token')}
                className="w-full py-2 text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-blue-300 text-sm">
                  <strong>How to find chat ID:</strong>
                  <br />
                  1. Add your bot to the chat/group
                  <br />
                  2. Forward a message from that chat to @userinfobot
                  <br />
                  3. Copy the ID (starts with -100)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
