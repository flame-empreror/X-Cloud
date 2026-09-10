import { motion } from 'framer-motion';
import { Zap, Monitor, Moon, Sun, RefreshCw, HardDrive, Info, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAppStore } from '../store';

export default function SettingsPanel() {
  const { settings, setSettings, selectedChannel, logout, files } = useAppStore();

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10">
        <h2 className="text-white font-bold text-2xl">Settings</h2>
        <p className="text-gray-400 text-sm mt-1">Configure your TeleCloud experience</p>
      </div>

      <div className="p-6 space-y-4 max-w-2xl">
        {/* Speed Boost */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-warning rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold">Speed Boost</h3>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full uppercase tracking-wider border border-amber-500/30">
                    Experimental
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-0.5">Parallel connections for faster downloads</p>
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
              className="border-t border-white/10"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-300/80 text-xs leading-relaxed">
                    Uses multiple parallel connections to download file chunks simultaneously. 
                    May increase bandwidth usage. Works best with files larger than 20MB.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-300 text-xs font-semibold mb-2 block">Parallel Connections</label>
                    <select
                      value={settings.parallelDownloads}
                      onChange={(e) => setSettings({ parallelDownloads: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value={2}>2 connections</option>
                      <option value={3}>3 connections</option>
                      <option value={4}>4 connections</option>
                      <option value={6}>6 connections</option>
                      <option value={8}>8 connections</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-300 text-xs font-semibold mb-2 block">Chunk Size</label>
                    <select
                      value={settings.chunkSize}
                      onChange={(e) => setSettings({ chunkSize: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value={1048576}>1 MB</option>
                      <option value={2097152}>2 MB</option>
                      <option value={5242880}>5 MB</option>
                      <option value={10485760}>10 MB</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-primary rounded-2xl p-5"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">Appearance</h3>
              <p className="text-gray-400 text-sm mt-0.5">Choose your preferred theme</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'dark', label: 'Dark', icon: Moon, gradient: 'from-blue-500 to-purple-500' },
              { id: 'light', label: 'Light', icon: Sun, gradient: 'from-yellow-500 to-orange-500' },
              { id: 'system', label: 'System', icon: Monitor, gradient: 'from-green-500 to-teal-500' },
            ].map((theme) => {
              const Icon = theme.icon;
              const isActive = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setSettings({ theme: theme.id as any })}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                    isActive
                      ? `bg-gradient-to-r ${theme.gradient} border-transparent text-white shadow-lg`
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{theme.label}</span>
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
          className="card-success rounded-2xl p-5"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <HardDrive className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">Storage</h3>
              <p className="text-gray-400 text-sm mt-0.5">Your Telegram channel details</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <InfoRow label="Channel" value={selectedChannel?.title || 'Not selected'} />
            <InfoRow label="Storage Limit" value="Unlimited" valueColor="text-green-400" />
            <InfoRow label="Max File Size" value="2 GB (Telegram limit)" />
            <InfoRow label="Total Files" value={`${files.length} files`} />
          </div>
        </motion.div>

        {/* Auto Refresh */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-primary rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">Auto Refresh</h3>
                <p className="text-gray-400 text-sm mt-0.5">Automatically refresh file list</p>
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
          className="card-primary rounded-2xl p-5"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <ExternalLink className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">Free Hosting Guide</h3>
              <p className="text-gray-400 text-sm mt-0.5">Host this app for free in minutes</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <HostingStep number={1} title="Push code to GitHub" description="Create a repo and push this project" command="git init && git add . && git commit -m 'init' && git push" />
            <HostingStep number={2} title="Go to Vercel.com" description="Sign up free with GitHub" link="https://vercel.com" />
            <HostingStep number={3} title="Import repository" description='New Project → Import Git → Select repo' />
            <HostingStep number={4} title="Deploy" description='Framework: Vite → Click Deploy. Done!' />
          </div>

          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-blue-300 text-xs">
              💡 <strong>Alternatives:</strong> Netlify, Cloudflare Pages, GitHub Pages — all offer free static hosting.
            </p>
          </div>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-primary rounded-2xl p-5"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
              <Info className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">About TeleCloud</h3>
              <p className="text-gray-400 text-sm mt-0.5">Version 1.0.0</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            TeleCloud uses your Telegram channel as unlimited cloud storage. 
            All files are stored as documents with metadata encoded in captions.
            Your data never leaves Telegram's infrastructure.
          </p>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pt-2"
        >
          <button
            onClick={logout}
            className="w-full py-4 card-danger text-red-400 rounded-2xl hover:bg-red-500/20 transition-all font-bold"
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
      className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
        enabled ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-white/10'
      }`}
    >
      <motion.div
        animate={{ x: enabled ? 26 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-lg"
      />
    </button>
  );
}

function InfoRow({ label, value, valueColor = 'text-white' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
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
      <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg">
        <span className="text-white text-xs font-bold">{number}</span>
      </div>
      <div className="flex-1">
        <p className="text-white text-sm font-semibold">{title}</p>
        <p className="text-gray-400 text-xs mt-0.5">{description}</p>
        {command && (
          <code className="mt-1.5 block px-3 py-1.5 bg-black/30 border border-white/5 rounded-lg text-[11px] text-green-400 font-mono overflow-x-auto">
            {command}
          </code>
        )}
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline mt-1 inline-flex items-center gap-1">
            {link} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
