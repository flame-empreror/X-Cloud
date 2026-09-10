import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAppStore } from './store';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import FileManager from './components/FileManager';
import TransfersPanel from './components/TransfersPanel';
import SettingsPanel from './components/SettingsPanel';
import MediaViewer from './components/MediaViewer';
import { FileItem } from './types';

function App() {
  const { isAuthenticated, selectedChannel, files } = useAppStore();
  const [activeTab, setActiveTab] = useState('files');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && selectedChannel) {
      // User is already logged in
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
    <div className="h-screen w-screen flex overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 z-50 lg:hidden"
            >
              <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-white font-semibold">TeleCloud</h1>
          <span className="text-slate-500 text-xs ml-auto">{selectedChannel?.title}</span>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'files' && (
            <motion.div
              key="files"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
