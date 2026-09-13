import { motion } from 'framer-motion';
import { Settings, Zap, Download, Palette, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store';

export function SettingsPanel() {
  const { settings, setSettings } = useAppStore();

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header className="px-6 py-5 border-b" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
            <Settings className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Configure your application preferences</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Performance Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-xl border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5" style={{ color: 'var(--warning)' }} />
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Performance</h3>
            </div>
            
            <div className="space-y-4">
              <SettingToggle
                icon={Zap}
                label="Speed Boost"
                description="Enable parallel downloads for faster transfers"
                enabled={settings.speedBoost}
                onToggle={() => setSettings({ speedBoost: !settings.speedBoost })}
              />
              
              <SettingSlider
                icon={Download}
                label="Parallel Downloads"
                description="Number of simultaneous download streams"
                value={settings.parallelDownloads}
                min={1}
                max={8}
                onChange={(v) => setSettings({ parallelDownloads: v })}
                disabled={!settings.speedBoost}
              />
              
              <SettingSlider
                icon={Download}
                label="Chunk Size"
                description="Size of each download chunk in MB"
                value={Math.round(settings.chunkSize / (1024 * 1024))}
                min={1}
                max={16}
                onChange={(v) => setSettings({ chunkSize: v * 1024 * 1024 })}
                disabled={!settings.speedBoost}
              />
            </div>
          </motion.section>

          {/* Appearance Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-xl border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Palette className="w-5 h-5" style={{ color: 'var(--accent-secondary)' }} />
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Appearance</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>Theme</label>
                <div className="flex gap-2">
                  {(['dark', 'light', 'system'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setSettings({ theme })}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium capitalize transition-all ${
                        settings.theme === theme
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* General Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 rounded-xl border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-5 h-5" style={{ color: 'var(--success)' }} />
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>General</h3>
            </div>
            
            <SettingToggle
              icon={RefreshCw}
              label="Auto Refresh"
              description="Automatically refresh file list when changes are detected"
              enabled={settings.autoRefresh}
              onToggle={() => setSettings({ autoRefresh: !settings.autoRefresh })}
            />
          </motion.section>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl"
            style={{ background: 'var(--info-muted)', border: '1px solid var(--border-default)' }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--info)' }}>Note:</strong> Some settings may require a page refresh to take effect. 
              Changes are automatically saved to your browser's local storage.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

interface SettingToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function SettingToggle({ icon: Icon, label, description, enabled, onToggle }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
          <Icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 20 : 2 }}
          transition={{ duration: 0.2 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}

interface SettingSliderProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function SettingSlider({ icon: Icon, label, description, value, min, max, onChange, disabled }: SettingSliderProps) {
  return (
    <div className={`py-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
            <Icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
          </div>
        </div>
        <span className="text-sm font-semibold px-3 py-1 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </div>
  );
}
