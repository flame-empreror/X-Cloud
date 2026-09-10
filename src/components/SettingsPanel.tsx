import { motion } from 'framer-motion';
import { Zap, Monitor, Moon, Sun, RefreshCw, Download, HardDrive, Info, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store';

export default function SettingsPanel() {
  const { settings, setSettings, selectedChannel, logout } = useAppStore();

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-white font-bold text-lg">Settings</h2>
        <p className="text-slate-500 text-sm">Configure your TeleCloud experience</p>
      </div>

      <div className="p-6 space-y-6 max-w-2xl">
        {/* Speed Boost - Experimental */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/5 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">Speed Boost</h3>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full uppercase">
                    Experimental
                  </span>
                </div>
                <p className="text-slate-500 text-sm mt-0.5">
                  Use parallel connections to boost download speed
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.speedBoost}
              onChange={(v) => setSettings({ speedBoost: v })}
            />
          </div>
          
          {settings.speedBoost && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 pt-4 border-t border-white/5"
            >
              <div className="flex items-start gap-2 text-xs text-amber-400/80">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>This feature uses multiple parallel connections to download file chunks simultaneously. 
                  It may increase bandwidth usage and could be unstable with some network configurations.
                  Works best with files larger than 20MB.</p>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Parallel Connections</label>
                  <select
                    value={settings.parallelDownloads}
                    onChange={(e) => setSettings({ parallelDownloads: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                  >
                    <option value={2}>2 connections</option>
                    <option value={3}>3 connections</option>
                    <option value={4}>4 connections</option>
                    <option value={6}>6 connections</option>
                    <option value={8}>8 connections</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Chunk Size</label>
                  <select
                    value={settings.chunkSize}
                    onChange={(e) => setSettings({ chunkSize: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                  >
                    <option value={1048576}>1 MB</option>
                    <option value={2097152}>2 MB</option>
                    <option value={5242880}>5 MB</option>
                    <option value={10485760}>10 MB</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Theme */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.02] border border-white/5 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Monitor className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">Appearance</h3>
              <p className="text-slate-500 text-sm">Choose your preferred theme</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'system', label: 'System', icon: Monitor },
            ].map((theme) => {
              const Icon = theme.icon;
              const isActive = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setSettings({ theme: theme.id as any })}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{theme.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Storage Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/[0.02] border border-white/5 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">Storage</h3>
              <p className="text-slate-500 text-sm">Your Telegram channel storage details</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Channel</span>
              <span className="text-white">{selectedChannel?.title || 'Not selected'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Storage Limit</span>
              <span className="text-green-400">Unlimited</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Max File Size</span>
              <span className="text-white">2 GB (Telegram limit)</span>
            </div>
          </div>
        </motion.div>

        {/* Auto Refresh */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/[0.02] border border-white/5 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">Auto Refresh</h3>
                <p className="text-slate-500 text-sm">Automatically refresh file list</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={settings.autoRefresh}
              onChange={(v) => setSettings({ autoRefresh: v })}
            />
          </div>
        </motion.div>

        {/* Hosting Guide */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/[0.02] border border-white/5 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium">Free Hosting Guide</h3>
              <p className="text-slate-500 text-sm">Host this app for free in minutes</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <HostingStep
              number={1}
              title="Push code to GitHub"
              description="Create a repo and push this project code"
              command="git init && git add . && git commit -m 'init' && git push"
            />
            <HostingStep
              number={2}
              title="Go to Vercel.com"
              description="Sign up free with your GitHub account"
              link="https://vercel.com"
            />
            <HostingStep
              number={3}
              title="Import your repository"
              description='Click "New Project" → Import Git Repository → Select your repo'
            />
            <HostingStep
              number={4}
              title="Configure & Deploy"
              description='Framework: Vite → Click Deploy. Done! Your app is live.'
            />
          </div>

          <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
            <p className="text-blue-400 text-xs">
              💡 <strong>Alternatives:</strong> Netlify, Cloudflare Pages, GitHub Pages — all offer free static hosting with custom domains.
            </p>
          </div>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/[0.02] border border-white/5 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
              <Info className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-white font-medium">About TeleCloud</h3>
              <p className="text-slate-500 text-sm">Version 1.0.0</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            TeleCloud uses your Telegram channel as unlimited cloud storage. 
            All files are stored as documents in your selected channel with metadata encoded in captions.
            Your data never leaves Telegram's infrastructure.
          </p>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={logout}
            className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-all font-medium"
          >
            Disconnect & Logout
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-blue-500' : 'bg-white/10'
      }`}
    >
      <motion.div
        animate={{ x: enabled ? 24 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
      />
    </button>
  );
}

function HostingStep({ number, title, description, command, link }: {
  number: number;
  title: string;
  description: string;
  command?: string;
  link?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-green-400 text-xs font-bold">{number}</span>
      </div>
      <div className="flex-1">
        <p className="text-white text-sm font-medium">{title}</p>
        <p className="text-slate-500 text-xs mt-0.5">{description}</p>
        {command && (
          <code className="mt-1 block px-2 py-1 bg-black/30 rounded text-[11px] text-green-400 font-mono overflow-x-auto">
            {command}
          </code>
        )}
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline mt-1 inline-block">
            {link} →
          </a>
        )}
      </div>
    </div>
  );
}
