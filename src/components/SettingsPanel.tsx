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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Download Settings</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Configure download performance</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Quick Presets</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'normal' as const, label: 'Normal', desc: '1MB chunks, 1 connection' },
              { key: 'fast' as const, label: 'Fast', desc: '4MB chunks, 2 connections' },
              { key: 'turbo' as const, label: 'Turbo', desc: '8MB chunks, 4 connections' },
            ].map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetChange(preset.key)}
                className="card p-4 text-left"
              >
                <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{preset.label}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Speed Boost */}
        <div className="mb-6 card p-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
                <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Speed Boost</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Experimental parallel downloads</p>
              </div>
            </div>
            <button
              onClick={() => handleSettingChange('speedBoost', !settings.speedBoost)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: settings.speedBoost ? 'var(--accent)' : 'var(--bg-active)' }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                style={{
                  background: 'var(--bg-base)',
                  transform: settings.speedBoost ? 'translateX(22px)' : 'translateX(2px)'
                }}
              />
            </button>
          </div>
        </div>

        {/* Chunk Size */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Chunk Size</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Larger chunks = fewer requests</p>
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
                className={`btn ${settings.chunkSize === option.value ? 'btn-primary' : 'btn-secondary'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Parallel Connections */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Parallel Connections</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Download chunks simultaneously</p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 4, 8].map((num) => (
              <button
                key={num}
                onClick={() => handleSettingChange('parallelDownloads', num)}
                disabled={!settings.speedBoost}
                className={`btn ${settings.parallelDownloads === num ? 'btn-primary' : 'btn-secondary'} ${!settings.speedBoost ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div>{num}x</div>
                <div className="text-xs" style={{ color: settings.parallelDownloads === num ? 'var(--bg-base)' : 'var(--text-muted)' }}>
                  {num === 1 ? 'Seq' : 'Parallel'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="card p-4 mb-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong>Tips:</strong> Normal is best for small files. Use Turbo for large files on fast connections. Parallel connections use more bandwidth.
            </p>
          </div>
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
