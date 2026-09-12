// Settings management service
export interface DownloadSettings {
  chunkSize: number; // in bytes
  parallelDownloads: number; // number of concurrent chunk downloads
  speedBoost: boolean; // enable experimental speed optimizations
}

const DEFAULT_SETTINGS: DownloadSettings = {
  chunkSize: 1024 * 1024, // 1MB default
  parallelDownloads: 1, // sequential by default
  speedBoost: false,
};

const SETTINGS_KEY = 'telecloud_download_settings';

class SettingsService {
  private settings: DownloadSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): DownloadSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('[Settings] Failed to load settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('[Settings] Failed to save settings:', error);
    }
  }

  getSettings(): DownloadSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<DownloadSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    console.log('[Settings] Settings updated:', this.settings);
  }

  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    console.log('[Settings] Settings reset to defaults');
  }

  // Preset configurations
  applyPreset(preset: 'normal' | 'fast' | 'turbo'): void {
    switch (preset) {
      case 'normal':
        this.updateSettings({
          chunkSize: 1024 * 1024, // 1MB
          parallelDownloads: 1,
          speedBoost: false,
        });
        break;
      case 'fast':
        this.updateSettings({
          chunkSize: 4 * 1024 * 1024, // 4MB
          parallelDownloads: 2,
          speedBoost: true,
        });
        break;
      case 'turbo':
        this.updateSettings({
          chunkSize: 8 * 1024 * 1024, // 8MB
          parallelDownloads: 4,
          speedBoost: true,
        });
        break;
    }
  }
}

export const settingsService = new SettingsService();
