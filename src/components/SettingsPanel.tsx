import { useState } from 'react';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Download Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Quick Presets</h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handlePresetChange('normal')}
              className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
            >
              <div className="text-white font-semibold mb-1">Normal</div>
              <div className="text-xs text-gray-400">1MB chunks, 1 connection</div>
            </button>
            <button
              onClick={() => handlePresetChange('fast')}
              className="p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition-all"
            >
              <div className="text-white font-semibold mb-1">Fast</div>
              <div className="text-xs text-gray-400">4MB chunks, 2 connections</div>
            </button>
            <button
              onClick={() => handlePresetChange('turbo')}
              className="p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl transition-all"
            >
              <div className="text-white font-semibold mb-1">Turbo ⚡</div>
              <div className="text-xs text-gray-400">8MB chunks, 4 connections</div>
            </button>
          </div>
        </div>

        {/* Speed Boost Toggle */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                🚀 Speed Boost (Experimental)
              </h3>
              <p className="text-sm text-gray-400">
                Enable parallel downloads for faster speeds
              </p>
            </div>
            <button
              onClick={() => handleSettingChange('speedBoost', !settings.speedBoost)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.speedBoost ? 'bg-purple-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.speedBoost ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Chunk Size */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Chunk Size</h3>
          <p className="text-sm text-gray-400 mb-3">
            Larger chunks = fewer requests but more memory usage
          </p>
          <div className="grid grid-cols-4 gap-2">
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
                className={`p-3 rounded-xl border transition-all ${
                  settings.chunkSize === option.value
                    ? 'bg-blue-500/20 border-blue-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="text-sm font-semibold">{option.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Current: {formatBytes(settings.chunkSize)}
          </div>
        </div>

        {/* Parallel Downloads */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Parallel Connections</h3>
          <p className="text-sm text-gray-400 mb-3">
            Download multiple chunks simultaneously (requires Speed Boost)
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 4, 8].map((num) => (
              <button
                key={num}
                onClick={() => handleSettingChange('parallelDownloads', num)}
                disabled={!settings.speedBoost}
                className={`p-3 rounded-xl border transition-all ${
                  settings.parallelDownloads === num
                    ? 'bg-blue-500/20 border-blue-500/50 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                } ${!settings.speedBoost ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-sm font-semibold">{num}</div>
                <div className="text-xs text-gray-500">
                  {num === 1 ? 'Sequential' : 'Parallel'}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Current: {settings.parallelDownloads} connection{settings.parallelDownloads > 1 ? 's' : ''}
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <h4 className="text-white font-semibold mb-2">💡 Tips</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• <strong>Normal:</strong> Best for small files and stable connections</li>
            <li>• <strong>Fast:</strong> Good balance for most files</li>
            <li>• <strong>Turbo:</strong> Best for large files on fast connections</li>
            <li>• Parallel downloads use more bandwidth but complete faster</li>
            <li>• Larger chunks reduce API calls but use more memory</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-semibold transition-all"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
