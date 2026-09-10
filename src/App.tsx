import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  if (!isAuthenticated || !selectedChannel) {
    return <LoginScreen />;
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#0a0a0f]">
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
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#0d0d14]/80 backdrop-blur-xl">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              </svg>
            </div>
            <h1 className="text-white font-bold text-sm">TeleCloud</h1>
          </div>
          <span className="text-slate-500 text-xs ml-auto truncate max-w-[120px]">{selectedChannel?.title}</span>
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
