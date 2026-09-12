import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Zap, Info } from 'lucide-react';
import { settingsService, DownloadSettings } from '../services/settings';

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<DownloadSettings>(settingsService.getSettings());

  const handleSettingChange = (key: keyof DownloadSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    settingsService.updateSettings({ [key]: value });
  };

  const handlePresetChange = (preset: 'normal' | 'fast' | 'turbo') => {
    settingsService.applyPreset(preset);
    setSettings(settingsService.getSettings());
  };

  const handleReset = () => {
    settingsService.resetSettings();
    setSettings(settingsService.getSettings());
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Download Settings</h2>
            <p className="text-zinc-500 text-sm mt-0.5">Configure download performance</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">Quick Presets</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'normal' as const, label: 'Normal', desc: '1MB chunks, 1 connection', badge: '' },
              { key: 'fast' as const, label: 'Fast', desc: '4MB chunks, 2 connections', badge: '' },
              { key: 'turbo' as const, label: 'Turbo', desc: '8MB chunks, 4 connections', badge: '⚡' },
            ].map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetChange(preset.key)}
                className="card p-4 text-left border"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="text-white font-semibold text-sm mb-1">{preset.label} {preset.badge}</div>
                <div className="text-zinc-500 text-xs">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Speed Boost */}
        <div className="mb-6 rounded-xl p-4 border" style={{ background: 'rgba(139, 92, 246, 0.06)', borderColor: 'rgba(139, 92, 246, 0.15)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Speed Boost</h3>
                <p className="text-zinc-500 text-xs">Experimental parallel downloads</p>
              </div>
            </div>
            <button
              onClick={() => handleSettingChange('speedBoost', !settings.speedBoost)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.speedBoost ? 'bg-purple-500' : 'bg-zinc-600'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                settings.speedBoost ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* Chunk Size */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-1">Chunk Size</h3>
          <p className="text-zinc-500 text-xs mb-3">Larger chunks = fewer requests</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 512 * 1024, label: '512 KB' },
              { value: 1024 * 1024, label: '1 MB' },
              { value: 2 * 1024 * 1024, label: '2 MB' },
              { value: 4 * 1024 * 1024, label: '4 MB' },
              { value: 8 * 1024 * 1024, label: '8 MB' },
              { value: 16 * 1024 * 1024, label: '16 MB' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleSettingChange('chunkSize', option.value)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  settings.chunkSize === option.value
                    ? 'bg-blue-500/15 border-blue-500/40 text-white'
                    : 'border-[var(--border-subtle)] text-zinc-400 hover:text-white hover:bg-[var(--surface-3)]'
                }`}
                style={{ borderColor: settings.chunkSize === option.value ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-subtle)' }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Parallel Connections */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-1">Parallel Connections</h3>
          <p className="text-zinc-500 text-xs mb-3">Download chunks simultaneously</p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 4, 8].map((num) => (
              <button
                key={num}
                onClick={() => handleSettingChange('parallelDownloads', num)}
                disabled={!settings.speedBoost}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  settings.parallelDownloads === num
                    ? 'bg-blue-500/15 border-blue-500/40 text-white'
                    : 'border-[var(--border-subtle)] text-zinc-400 hover:text-white hover:bg-[var(--surface-3)]'
                } ${!settings.speedBoost ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{ borderColor: settings.parallelDownloads === num ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-subtle)' }}
              >
                <div>{num}x</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{num === 1 ? 'Seq' : 'Parallel'}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="rounded-xl p-4 mb-6 border flex gap-3" style={{ background: 'rgba(59, 130, 246, 0.06)', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-zinc-300 text-xs leading-relaxed">
            <strong>Tips:</strong> Normal is best for small files. Use Turbo for large files on fast connections. Parallel connections use more bandwidth.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleReset} className="btn btn-secondary flex-1">Reset</button>
          <button onClick={onClose} className="btn btn-primary flex-1">Done</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
