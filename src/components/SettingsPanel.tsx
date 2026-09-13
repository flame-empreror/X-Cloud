import { motion } from 'framer-motion';
import { Settings, Zap, Download, Palette, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store';

export function SettingsPanel() {
  const { settings, setSettings } = useAppStore();

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header className="px-6 py-5 border-b border-[var(--border-default)]" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shadow-[var(--accent-muted)]" style={{ background: 'var(--accent)' }}>
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Settings</h2>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Configure your preferences</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Performance */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-6 rounded-[20px] border border-[var(--border-default)]" style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Zap className="w-4.5 h-4.5" style={{ color: 'var(--warning)' }} />
              </div>
              <h3 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>Performance</h3>
            </div>

            <div className="space-y-5">
              <SettingToggle
                icon={Zap}
                label="Speed Boost"
                description="Enable parallel chunk downloads for faster transfers"
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
                description="Download chunk size in megabytes"
                value={Math.round(settings.chunkSize / (1024 * 1024))}
                min={1}
                max={16}
                onChange={(v) => setSettings({ chunkSize: v * 1024 * 1024 })}
                disabled={!settings.speedBoost}
              />
            </div>
          </motion.section>

          {/* Appearance */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="p-6 rounded-[20px] border border-[var(--border-default)]" style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                <Palette className="w-4.5 h-4.5" style={{ color: 'var(--accent-secondary)' }} />
              </div>
              <h3 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>Appearance</h3>
            </div>
            <div>
              <label className="text-sm font-bold block mb-3" style={{ color: 'var(--text-secondary)' }}>Theme</label>
              <div className="flex gap-2">
                {(['dark', 'light', 'system'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setSettings({ theme })}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-extrabold capitalize transition-all ${
                      settings.theme === theme
                        ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-muted)]'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)]'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          </motion.section>

          {/* General */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.16 }}
            className="p-6 rounded-[20px] border border-[var(--border-default)]" style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <RefreshCw className="w-4.5 h-4.5" style={{ color: 'var(--success)' }} />
              </div>
              <h3 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>General</h3>
            </div>
            <SettingToggle
              icon={RefreshCw}
              label="Auto Refresh"
              description="Automatically refresh the file list when changes are detected"
              enabled={settings.autoRefresh}
              onToggle={() => setSettings({ autoRefresh: !settings.autoRefresh })}
            />
          </motion.section>

          {/* Note */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.24 }}
            className="p-4 rounded-2xl border" style={{ background: 'rgba(56,189,248,0.05)', borderColor: 'rgba(56,189,248,0.15)' }}
          >
            <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--info)' }}>Note:</strong> Settings are saved automatically to your browser. Speed boost works best with files larger than 20MB.
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
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
          <Icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div>
          <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{label}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors duration-150 ${enabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)] border border-[var(--border-default)]'}`}
      >
        <motion.div
          animate={{ x: enabled ? 22 : 3 }}
          transition={{ duration: 0.15 }}
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
    <div className={`py-2 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
            <Icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{label}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
          </div>
        </div>
        <span className="text-sm font-extrabold px-3 py-1 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--bg-elevated)] accent-[var(--accent)]"
      />
    </div>
  );
}
