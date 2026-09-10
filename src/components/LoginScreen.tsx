import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Key, LogIn, ChevronRight, Shield, Sparkles, ArrowRight, Check, Zap, HardDrive, Lock } from 'lucide-react';
import { useAppStore } from '../store';
import telegramService from '../services/telegram';

export default function LoginScreen() {
  const [step, setStep] = useState<'welcome' | 'token' | 'channels'>('welcome');
  const [botToken, setBotToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [channelInput, setChannelInput] = useState('');
  
  const { setBotToken: storeSetBotToken, setSelectedChannel, setAuthenticated, setUser } = useAppStore();

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
      
      // Bot token is valid, store it and move to next step
      storeSetBotToken(botToken.trim());
      
      setUser({
        id: botInfo.id,
        first_name: botInfo.first_name || 'Bot User',
        username: botInfo.username,
      });

      setStep('channels');
    } catch (err: any) {
      // Provide helpful error messages for common issues
      const errorMsg = err.message || '';
      if (errorMsg.includes('Unauthorized') || errorMsg.includes('401')) {
        setError('Invalid bot token. Please check your token from @BotFather and try again.');
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(errorMsg || 'Failed to connect. Please check your bot token and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChannelConnect = async () => {
    if (!channelInput.trim()) {
      setError('Please enter a channel username or ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Remove @ if present
      const cleanInput = channelInput.trim().replace('@', '');
      
      const channel = await telegramService.getChatInfo(cleanInput);
      setSelectedChannel(channel);
      setAuthenticated(true);
    } catch (err: any) {
      // Show the detailed error message from the service
      setError(err.message || 'Could not connect to channel. Please check the username/ID and ensure the bot is admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
    }}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-orb-1 rounded-full blur-3xl opacity-50"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orb-2 rounded-full blur-3xl opacity-40"
        />
        <motion.div
          animate={{
            x: [0, 60, 0],
            y: [0, -60, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orb-3 rounded-full blur-3xl opacity-30"
        />
      </div>

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-w-lg w-full"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-50 animate-glow" />
              
              <div className="relative glass rounded-3xl p-10">
                {/* Logo */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
                  className="w-24 h-24 mx-auto mb-8 relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl rotate-6 opacity-30 blur-xl" />
                  <div className="relative w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl">
                    <Cloud className="w-12 h-12 text-white" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-10"
                >
                  <h1 className="text-5xl font-bold mb-3 gradient-text">
                    TeleCloud
                  </h1>
                  <p className="text-gray-300 text-lg">
                    Unlimited cloud storage powered by Telegram
                  </p>
                </motion.div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                  {[
                    { icon: HardDrive, text: 'Unlimited Storage', color: 'from-blue-500 to-cyan-500' },
                    { icon: Zap, text: 'Lightning Fast', color: 'from-yellow-500 to-orange-500' },
                    { icon: Lock, text: 'Private & Secure', color: 'from-green-500 to-emerald-500' },
                    { icon: Sparkles, text: '100% Free', color: 'from-purple-500 to-pink-500' },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="card-primary rounded-2xl p-4 flex items-center gap-3"
                      >
                        <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center shadow-lg`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white font-semibold text-sm">{item.text}</span>
                      </motion.div>
                    );
                  })}
                </div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep('token')}
                  className="w-full group relative py-5 btn-primary text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 overflow-hidden"
                >
                  <span className="relative flex items-center gap-3">
                    Get Started <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </span>
                </motion.button>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400"
                >
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>Your data stays on your Telegram channel</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'token' && (
          <motion.div
            key="token"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-w-lg w-full"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-3xl blur-xl opacity-40" />
              
              <div className="relative glass rounded-3xl p-10">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Key className="w-8 h-8 text-white" />
                </div>

                <h2 className="text-3xl font-bold text-white text-center mb-2">
                  Connect Your Bot
                </h2>
                <p className="text-gray-300 text-center mb-8">
                  Enter your Telegram Bot token
                </p>

                {/* Steps */}
                <div className="card-primary rounded-2xl p-5 mb-6">
                  <p className="text-white font-semibold mb-3">Quick Setup:</p>
                  <div className="space-y-3">
                    {[
                      'Open Telegram → Search @BotFather',
                      'Send /newbot → Follow instructions',
                      'Add bot as admin to your channel',
                      'Copy the token → Paste below',
                    ].map((text, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                          <span className="text-white text-xs font-bold">{i + 1}</span>
                        </div>
                        <span className="text-gray-300 text-sm">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={botToken}
                    onChange={(e) => { setBotToken(e.target.value); setError(''); }}
                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v..."
                    className="w-full px-5 py-4 glass rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleTokenSubmit()}
                  />

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="card-danger rounded-xl px-4 py-3"
                      >
                        <p className="text-red-300 text-sm">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleTokenSubmit}
                    disabled={loading}
                    className="w-full py-4 btn-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" /> Connect Bot
                      </>
                    )}
                  </motion.button>

                  <button
                    onClick={() => { setStep('welcome'); setError(''); }}
                    className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'channels' && (
          <motion.div
            key="channels"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-w-lg w-full"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-3xl blur-xl opacity-40" />
              
              <div className="relative glass rounded-3xl p-10">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>

                <h2 className="text-3xl font-bold text-white text-center mb-2">
                  Select Storage Channel
                </h2>
                <p className="text-gray-300 text-center mb-6">
                  Enter your channel's username or ID
                </p>
                
                {/* Bot Connection Status */}
                <div className="card-success rounded-xl p-3 mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-green-300 text-sm font-semibold">Bot Connected</p>
                    <p className="text-gray-400 text-xs">Your bot token is valid and ready</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-xl">@</span>
                    <input
                      type="text"
                      value={channelInput}
                      onChange={(e) => { setChannelInput(e.target.value); setError(''); }}
                      placeholder="channel_username or -1001234567890"
                      className="w-full pl-12 pr-5 py-4 glass rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleChannelConnect()}
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="card-danger rounded-xl px-4 py-3"
                      >
                        <p className="text-red-300 text-sm">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleChannelConnect}
                    disabled={loading}
                    className="w-full py-4 btn-success text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" /> Connect Channel
                      </>
                    )}
                  </motion.button>

                  <button
                    onClick={() => { setStep('token'); setError(''); }}
                    className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    ← Back
                  </button>
                </div>

              <div className="mt-6 space-y-3">
                <div className="card-primary rounded-xl p-4">
                  <p className="text-gray-300 text-xs leading-relaxed mb-2">
                    <strong className="text-blue-400">💡 How to find your channel:</strong>
                  </p>
                  <ul className="text-gray-400 text-xs space-y-1.5 ml-4 list-disc">
                    <li><strong className="text-gray-300">Public channel:</strong> Use the username (without @) from your channel link</li>
                    <li><strong className="text-gray-300">Private channel:</strong> Use the numeric ID (starts with -100)</li>
                    <li><strong className="text-gray-300">Bot must be admin:</strong> Add your bot as administrator with "Post Messages" permission</li>
                  </ul>
                </div>
                
                <div className="card-warning rounded-xl p-4">
                  <p className="text-gray-300 text-xs leading-relaxed">
                    <strong className="text-amber-400">⚠️ Common issues:</strong>
                  </p>
                  <ul className="text-gray-400 text-xs space-y-1.5 ml-4 list-disc mt-2">
                    <li>Bot not added as admin to the channel</li>
                    <li>Wrong username or ID format</li>
                    <li>Bot token is incorrect or expired</li>
                  </ul>
                </div>
              </div>              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
