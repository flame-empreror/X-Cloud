// LocalStorage-based file persistence
// Since Telegram Bot API doesn't allow reading chat history,
// we use localStorage to persist the file/folder structure

const STORAGE_KEY = 'telecloud_files';
const LAST_UPDATE_KEY = 'telecloud_last_update';

export class StorageService {
  static saveFiles(files: any[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
      console.log('[Storage] Saved', files.length, 'files to localStorage');
    } catch (error) {
      console.error('[Storage] Failed to save files:', error);
    }
  }

  static loadFiles(): any[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        console.log('[Storage] No files found in localStorage');
        return [];
      }
      const files = JSON.parse(data);
      console.log('[Storage] Loaded', files.length, 'files from localStorage');
      return files;
    } catch (error) {
      console.error('[Storage] Failed to load files:', error);
      return [];
    }
  }

  static clearFiles(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[Storage] Cleared files from localStorage');
    } catch (error) {
      console.error('[Storage] Failed to clear files:', error);
    }
  }

  static saveLastUpdateId(updateId: number): void {
    try {
      localStorage.setItem(LAST_UPDATE_KEY, updateId.toString());
    } catch (error) {
      console.error('[Storage] Failed to save last update ID:', error);
    }
  }

  static getLastUpdateId(): number | null {
    try {
      const data = localStorage.getItem(LAST_UPDATE_KEY);
      return data ? parseInt(data, 10) : null;
    } catch (error) {
      console.error('[Storage] Failed to load last update ID:', error);
      return null;
    }
  }
}
