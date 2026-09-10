import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Key, LogIn, ChevronRight, Shield, Sparkles, ArrowRight, Check } from 'lucide-react';
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
      
      storeSetBotToken(botToken.trim());
      
      setUser({
        id: botInfo.id,
        first_name: botInfo.first_name || 'Bot User',
        username: botInfo.username,
      });

      setStep('channels');
    } catch (err: any) {
      setError(err.message || 'Invalid bot token. Please check and try again.');
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
      const channel = await telegramService.getChatInfo(channelInput.replace('@', ''));
      setSelectedChannel(channel);
      setAuthenticated(true);
    } catch (err: any) {
      setError('Could not connect to channel. Make sure the bot is admin and you entered the correct username/ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/[0.05] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/[0.03] rounded-full blur-[150px]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

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
              {/* Glow behind card */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-[2rem] blur-xl opacity-50" />
              
              <div className="relative bg-[#111118]/80 backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] p-10 shadow-2xl">
                {/* Logo */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-8 relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl rotate-6 opacity-20" />
                  <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
                    <Cloud className="w-10 h-10 text-white" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-10"
                >
                  <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
                    TeleCloud
                  </h1>
                  <p className="text-slate-400 text-base leading-relaxed max-w-sm mx-auto">
                    Unlimited cloud storage powered by Telegram. Free forever.
                  </p>
                </motion.div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-3 mb-10">
                  {[
                    { icon: '∞', text: 'Unlimited Storage', color: 'from-blue-500/10 to-blue-600/5' },
                    { icon: '⚡', text: 'Lightning Fast', color: 'from-amber-500/10 to-amber-600/5' },
                    { icon: '🔒', text: 'Private & Secure', color: 'from-green-500/10 to-green-600/5' },
                    { icon: '💎', text: '100% Free', color: 'from-purple-500/10 to-purple-600/5' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br ${item.color} border border-white/[0.04]`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-slate-300 text-sm font-medium">{item.text}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setStep('token')}
                  className="w-full group relative py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center gap-2">
                    Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Your data stays on your Telegram channel. Nothing is stored elsewhere.</span>
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
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-[2rem] blur-xl opacity-50" />
              
              <div className="relative bg-[#111118]/80 backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] p-10 shadow-2xl">
                <div className="w-14 h-14 mx-auto mb-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Key className="w-7 h-7 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  Connect Your Bot
                </h2>
                <p className="text-slate-400 text-center text-sm mb-8">
                  Enter your Telegram Bot token to get started
                </p>

                {/* Steps */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-6">
                  <p className="text-slate-300 text-sm font-medium mb-3">Quick Setup:</p>
                  <div className="space-y-2.5">
                    {[
                      'Open Telegram → Search @BotFather',
                      'Send /newbot → Follow instructions',
                      'Add bot as admin to your channel',
                      'Copy the token → Paste below',
                    ].map((text, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-400 text-[10px] font-bold">{i + 1}</span>
                        </div>
                        <span className="text-slate-400 text-sm">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={botToken}
                      onChange={(e) => { setBotToken(e.target.value); setError(''); }}
                      placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v..."
                      className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.05] transition-all font-mono text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleTokenSubmit()}
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-red-400 text-sm bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-2"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleTokenSubmit}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-blue-500/30 transition-all"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" /> Connect Bot
                      </>
                    )}
                  </motion.button>

                  <button
                    onClick={() => { setStep('welcome'); setError(''); }}
                    className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
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
              <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 rounded-[2rem] blur-xl opacity-50" />
              
              <div className="relative bg-[#111118]/80 backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] p-10 shadow-2xl">
                <div className="w-14 h-14 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  Select Storage Channel
                </h2>
                <p className="text-slate-400 text-center text-sm mb-8">
                  Enter your channel's username or ID to use as storage
                </p>

                {/* Channel Input */}
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">@</span>
                    <input
                      type="text"
                      value={channelInput}
                      onChange={(e) => { setChannelInput(e.target.value); setError(''); }}
                      placeholder="channel_username or -1001234567890"
                      className="w-full pl-10 pr-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-green-500/40 focus:bg-white/[0.05] transition-all text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleChannelConnect()}
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-red-400 text-sm bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-2"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleChannelConnect}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-2xl shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-green-500/30 transition-all"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" /> Connect Channel
                      </>
                    )}
                  </motion.button>

                  <button
                    onClick={() => { setStep('token'); setError(''); }}
                    className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
                  >
                    ← Back
                  </button>
                </div>

                {/* Help text */}
                <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                  <p className="text-slate-500 text-xs leading-relaxed">
                    <strong className="text-slate-400">Tip:</strong> You can find your channel's public link by going to Channel Info → Channel Type. 
                    The username is what appears after t.me/ in the link. For private channels, use the channel ID (starts with -100).
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
