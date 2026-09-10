import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Key, LogIn, Info, ChevronRight, Shield } from 'lucide-react';
import { useAppStore } from '../store';
import telegramService from '../services/telegram';

export default function LoginScreen() {
  const [step, setStep] = useState<'welcome' | 'token' | 'channels'>('welcome');
  const [botToken, setBotToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  
  const { setBotToken: storeSetBotToken, setSelectedChannel, setAuthenticated, setUser, setChannels: storeSetChannels } = useAppStore();

  const handleTokenSubmit = async () => {
    if (!botToken.trim()) {
      setError('Please enter a valid bot token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      telegramService.setBotToken(botToken.trim());
      const botInfo = await telegramService.getMe();
      
      // Store the token
      storeSetBotToken(botToken.trim());
      
      // Set a mock user from bot info
      setUser({
        id: botInfo.id,
        first_name: botInfo.first_name || 'Bot User',
        username: botInfo.username,
      });

      // Try to get channels
      const userChannels = await telegramService.getUserChannels(botInfo.id);
      
      if (userChannels.length > 0) {
        setChannels(userChannels);
        storeSetChannels(userChannels);
        setStep('channels');
      } else {
        // Even without channels, proceed - user can manually enter channel info
        setChannels([]);
        setStep('channels');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid bot token. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelSelect = (channel: any) => {
    setSelectedChannel(channel);
    setAuthenticated(true);
  };

  const handleManualChannel = () => {
    const channelInput = prompt('Enter your channel username (without @) or channel ID:');
    if (channelInput) {
      const channel = {
        id: isNaN(Number(channelInput)) ? 0 : Number(channelInput),
        title: channelInput,
        username: channelInput.replace('@', ''),
        type: 'channel' as const,
      };
      handleChannelSelect(channel);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 max-w-md w-full"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25"
              >
                <Cloud className="w-10 h-10 text-white" />
              </motion.div>

              <h1 className="text-3xl font-bold text-white text-center mb-2">
                TeleCloud
              </h1>
              <p className="text-slate-400 text-center mb-8">
                Unlimited cloud storage powered by Telegram
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: '🔒', text: 'Your data stays on your Telegram channel' },
                  { icon: '💾', text: 'Unlimited storage - no caps, no limits' },
                  { icon: '⚡', text: 'Fast uploads and downloads' },
                  { icon: '🆓', text: '100% free - no subscriptions ever' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-3 text-slate-300"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep('token')}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow flex items-center justify-center gap-2"
              >
                Get Started <ChevronRight className="w-5 h-5" />
              </motion.button>

              <div className="mt-6 flex items-start gap-2 text-xs text-slate-500">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Your bot token is stored locally in your browser and never sent to any server.</span>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'token' && (
          <motion.div
            key="token"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 max-w-md w-full"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <div className="w-14 h-14 mx-auto mb-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Key className="w-7 h-7 text-white" />
              </div>

              <h2 className="text-xl font-bold text-white text-center mb-2">
                Enter Bot Token
              </h2>
              <p className="text-slate-400 text-center text-sm mb-6">
                Create a bot via <a href="https://t.me/BotFather" target="_blank" className="text-blue-400 hover:underline">@BotFather</a> on Telegram and paste the token here.
              </p>

              <div className="bg-black/20 rounded-xl p-4 mb-4">
                <div className="text-xs text-slate-400 mb-3">
                  <strong className="text-slate-300">Setup steps:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Open Telegram and search for @BotFather</li>
                    <li>Send /newbot and follow the instructions</li>
                    <li>Add the bot as admin to your channel</li>
                    <li>Copy the bot token and paste below</li>
                  </ol>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={botToken}
                    onChange={(e) => { setBotToken(e.target.value); setError(''); }}
                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all font-mono text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleTokenSubmit()}
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm"
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTokenSubmit}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" /> Connect
                    </>
                  )}
                </motion.button>

                <button
                  onClick={() => setStep('welcome')}
                  className="w-full py-2 text-slate-400 hover:text-white text-sm transition-colors"
                >
                  ← Back
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'channels' && (
          <motion.div
            key="channels"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 max-w-md w-full"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white text-center mb-2">
                Select Storage Channel
              </h2>
              <p className="text-slate-400 text-center text-sm mb-6">
                Choose the Telegram channel to use as your cloud storage root.
              </p>

              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {channels.length > 0 ? (
                  channels.map((channel, i) => (
                    <motion.button
                      key={channel.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleChannelSelect(channel)}
                      className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 rounded-xl transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {channel.title.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{channel.title}</p>
                        {channel.username && (
                          <p className="text-slate-400 text-xs">@{channel.username}</p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </motion.button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Info className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">
                      No channels found. Make sure the bot is added as admin to your channel and has posted at least once.
                    </p>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleManualChannel}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all"
              >
                Enter Channel Manually
              </motion.button>

              <button
                onClick={() => setStep('token')}
                className="w-full py-2 mt-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                ← Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
