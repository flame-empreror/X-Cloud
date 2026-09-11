import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useAppStore } from './store';
import telegramService from './services/telegram';
import { StorageService } from './services/storage';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import FileManager from './components/FileManager';
import TransfersPanel from './components/TransfersPanel';
import SettingsPanel from './components/SettingsPanel';
import MediaViewer from './components/MediaViewer';
import { FileItem } from './types';

function App() {
  const { isAuthenticated, selectedChannel, files, botToken, activeTab, setActiveTab, setFiles, setAuthenticated } = useAppStore();
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Initialize telegram service with bot token on app load
  useEffect(() => {
    if (botToken && isAuthenticated) {
      telegramService.setBotToken(botToken);
    }
  }, [botToken, isAuthenticated]);

  // Load files from localStorage on startup
  useEffect(() => {
    if (isAuthenticated && selectedChannel && files.length === 0) {
      console.log('[App] Loading files from localStorage...');
      const savedFiles = StorageService.loadFiles();
      if (savedFiles.length > 0) {
        console.log('[App] Loaded', savedFiles.length, 'files from localStorage');
        setFiles(savedFiles);
      }
    }
  }, [isAuthenticated, selectedChannel]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  if (!isAuthenticated || !selectedChannel) {
    return <LoginScreen />;
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
    }}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-50 lg:hidden"
            >
              <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-xl">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              </svg>
            </div>
            <h1 className="text-white font-bold text-sm gradient-text">TeleCloud</h1>
          </div>
          <span className="text-gray-400 text-xs ml-auto truncate max-w-[120px]">{selectedChannel?.title}</span>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'files' && (
            <motion.div
              key="files"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <FileManager onFilePreview={setPreviewFile} />
            </motion.div>
          )}

          {activeTab === 'transfers' && (
            <motion.div
              key="transfers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TransfersPanel />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <SettingsPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Media Viewer Overlay */}
      <MediaViewer
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        files={files}
        onNavigate={setPreviewFile}
      />
    </div>
  );
}

export default App;
