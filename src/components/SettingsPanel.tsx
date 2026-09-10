import { motion } from 'framer-motion';
import { Zap, Monitor, Moon, Sun, RefreshCw, HardDrive, Info, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAppStore } from '../store';

export default function SettingsPanel() {
  const { settings, setSettings, selectedChannel, logout } = useAppStore();

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <h2 className="text-white font-bold text-xl tracking-tight">Settings</h2>
        <p className="text-slate-500 text-sm mt-0.5">Configure your TeleCloud experience</p>
      </div>

      <div className="p-6 space-y-4 max-w-2xl">
        {/* Speed Boost */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold">Speed Boost</h3>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider border border-amber-500/20">
                    Experimental
                  </span>
                </div>
                <p className="text-slate-500 text-sm mt-0.5">Parallel connections for faster downloads</p>
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
              className="border-t border-white/[0.04]"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3 p-3 bg-amber-500/[0.04] border border-amber-500/10 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-400/80 text-xs leading-relaxed">
                    Uses multiple parallel connections to download file chunks simultaneously. 
                    May increase bandwidth usage. Works best with files larger than 20MB.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-xs font-medium mb-2 block">Parallel Connections</label>
                    <select
                      value={settings.parallelDownloads}
                      onChange={(e) => setSettings({ parallelDownloads: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/40 appearance-none cursor-pointer"
                    >
                      <option value={2}>2 connections</option>
                      <option value={3}>3 connections</option>
                      <option value={4}>4 connections</option>
                      <option value={6}>6 connections</option>
                      <option value={8}>8 connections</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-medium mb-2 block">Chunk Size</label>
                    <select
                      value={settings.chunkSize}
                      onChange={(e) => setSettings({ chunkSize: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/40 appearance-none cursor-pointer"
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
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-11 h-11 bg-gradient-to-br from-purple-500/15 to-violet-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center">
              <Monitor className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Appearance</h3>
              <p className="text-slate-500 text-sm mt-0.5">Choose your preferred theme</p>
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
                      ? 'bg-blue-500/10 border-blue-500/25 text-blue-400 shadow-sm shadow-blue-500/5'
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04] hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{theme.label}</span>
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
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500/15 to-cyan-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Storage</h3>
              <p className="text-slate-500 text-sm mt-0.5">Your Telegram channel details</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <InfoRow label="Channel" value={selectedChannel?.title || 'Not selected'} />
            <InfoRow label="Storage Limit" value="Unlimited" valueColor="text-green-400" />
            <InfoRow label="Max File Size" value="2 GB (Telegram limit)" />
            <InfoRow label="Total Files" value={`${useAppStore.getState().files.length} files`} />
          </div>
        </motion.div>

        {/* Auto Refresh */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-gradient-to-br from-green-500/15 to-emerald-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Auto Refresh</h3>
                <p className="text-slate-500 text-sm mt-0.5">Automatically refresh file list</p>
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
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-11 h-11 bg-gradient-to-br from-green-500/15 to-teal-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Free Hosting Guide</h3>
              <p className="text-slate-500 text-sm mt-0.5">Host this app for free in minutes</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <HostingStep number={1} title="Push code to GitHub" description="Create a repo and push this project" command="git init && git add . && git commit -m 'init' && git push" />
            <HostingStep number={2} title="Go to Vercel.com" description="Sign up free with GitHub" link="https://vercel.com" />
            <HostingStep number={3} title="Import repository" description='New Project → Import Git → Select repo' />
            <HostingStep number={4} title="Deploy" description='Framework: Vite → Click Deploy. Done!' />
          </div>

          <div className="mt-4 p-3 bg-blue-500/[0.04] border border-blue-500/10 rounded-xl">
            <p className="text-blue-400/80 text-xs">
              💡 <strong>Alternatives:</strong> Netlify, Cloudflare Pages, GitHub Pages — all offer free static hosting.
            </p>
          </div>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-11 h-11 bg-gradient-to-br from-cyan-500/15 to-blue-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center">
              <Info className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">About TeleCloud</h3>
              <p className="text-slate-500 text-sm mt-0.5">Version 1.0.0</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
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
            className="w-full py-3.5 bg-red-500/[0.06] border border-red-500/15 text-red-400 rounded-2xl hover:bg-red-500/10 hover:border-red-500/25 transition-all font-medium"
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
      className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
        enabled ? 'bg-blue-500' : 'bg-white/[0.08]'
      }`}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-md"
      />
    </button>
  );
}

function InfoRow({ label, value, valueColor = 'text-white' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/[0.03] last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
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
      <div className="w-6 h-6 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-green-400 text-[10px] font-bold">{number}</span>
      </div>
      <div className="flex-1">
        <p className="text-white text-sm font-medium">{title}</p>
        <p className="text-slate-500 text-xs mt-0.5">{description}</p>
        {command && (
          <code className="mt-1.5 block px-3 py-1.5 bg-black/30 border border-white/[0.04] rounded-lg text-[11px] text-green-400 font-mono overflow-x-auto">
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
