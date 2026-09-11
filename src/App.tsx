import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useAppStore } from './store';
import { mtprotoService } from './services/mtproto';
import SetupScreen from './components/SetupScreen';
import LoginScreenMTProto from './components/LoginScreenMTProto';
import ChannelSelect from './components/ChannelSelect';
import Sidebar from './components/Sidebar';
import FileManager from './components/FileManager';
import TransfersPanel from './components/TransfersPanel';
import SettingsPanel from './components/SettingsPanel';
import MediaViewer from './components/MediaViewer';
import { FileItem } from './types';

function App() {
  const { isAuthenticated, selectedChannel, files, activeTab, setActiveTab, setFiles, setAuthenticated } = useAppStore();
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize MTProto client on app load
  useEffect(() => {
    const init = async () => {
      try {
        // Check if credentials are configured first
        if (!mtprotoService.hasCredentials()) {
          console.error('[App] API credentials not configured');
          setIsLoading(false);
          return;
        }

        console.log('[App] Initializing MTProto...');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 10000)
        );
        
        await Promise.race([
          mtprotoService.initialize(),
          timeoutPromise
        ]);
        
        console.log('[App] MTProto initialized successfully');
        
        if (mtprotoService.isLoggedIn()) {
          console.log('[App] User is already logged in');
          setAuthenticated(true);
        } else {
          console.log('[App] User is not logged in');
        }
      } catch (error: any) {
        console.error('[App] Failed to initialize MTProto:', error.message);
      } finally {
        console.log('[App] Setting isLoading to false');
        setIsLoading(false);
      }
    };
    
    init();
  }, [setAuthenticated]);

  // Load files from Telegram chat history when channel is selected
  useEffect(() => {
    const loadFiles = async () => {
      if (isAuthenticated && selectedChannel && files.length === 0) {
        try {
          console.log('[App] Loading files from Telegram chat history...');
          const messages = await mtprotoService.getChatHistory(selectedChannel.id, 100);
          
          // Parse messages to extract files
          const parsedFiles: FileItem[] = messages
            .filter((msg: any) => msg.media || (msg.text && msg.text.startsWith('__TCLOUD_V1__')))
            .map((msg: any) => {
              if (msg.text && msg.text.startsWith('__TCLOUD_V1__')) {
                // Folder
                try {
                  const meta = JSON.parse(msg.text.substring('__TCLOUD_V1__'.length));
                  return {
                    id: `folder_${msg.id}`,
                    name: meta.name,
                    path: meta.path || '/',
                    size: 0,
                    type: 'folder' as const,
                    mimeType: 'folder',
                    extension: '',
                    telegramMessageId: msg.id,
                    createdAt: msg.date * 1000,
                    modifiedAt: msg.date * 1000,
                  };
                } catch (e) {
                  return null;
                }
              } else if (msg.media) {
                // File
                const caption = msg.text || '';
                let meta = { name: 'Unknown', path: '/', size: 0, mimeType: '', extension: '', createdAt: msg.date * 1000 };
                
                if (caption.startsWith('__TCLOUD_V1__')) {
                  try {
                    meta = JSON.parse(caption.substring('__TCLOUD_V1__'.length));
                  } catch (e) {
                    console.error('Failed to parse file metadata:', e);
                  }
                }
                
                return {
                  id: `file_${msg.id}`,
                  name: meta.name || 'Unknown',
                  path: meta.path || '/',
                  size: meta.size || 0,
                  type: 'file' as const,
                  mimeType: meta.mimeType || '',
                  extension: meta.extension || '',
                  telegramMessageId: msg.id,
                  telegramFileId: msg.media.fileId || msg.media.document?.id,
                  createdAt: meta.createdAt || msg.date * 1000,
                  modifiedAt: msg.date * 1000,
                };
              }
              return null;
            })
            .filter(Boolean) as FileItem[];
          
          console.log('[App] Loaded', parsedFiles.length, 'files from Telegram');
          setFiles(parsedFiles);
        } catch (error) {
          console.error('[App] Failed to load files:', error);
        }
      }
    };
    
    loadFiles();
  }, [isAuthenticated, selectedChannel]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/50 animate-pulse">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">TeleCloud</h2>
          <p className="text-gray-400 text-sm">Initializing...</p>
        </div>
      </div>
    );
  }

  // Check if credentials are configured
  if (!mtprotoService.hasCredentials()) {
    return <SetupScreen />;
  }

  if (!isAuthenticated) {
    return <LoginScreenMTProto onLoginSuccess={() => setAuthenticated(true)} />;
  }

  if (!selectedChannel) {
    return <ChannelSelect onSelect={() => {}} />;
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
