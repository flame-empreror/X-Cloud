import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, X, Pin, PinOff, ArrowUpFromLine, Settings, Cloud, HardDrive, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store';
import { formatFileSize } from '../utils/fileUtils';

interface PersistentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFolderClick: (path: string) => void;
}

export default function PersistentSidebar({ activeTab, onTabChange, onFolderClick }: PersistentSidebarProps) {
  const { user, selectedChannel, files, transfers, logout, settings, pinnedFolders, pinFolder, unpinFolder } = useAppStore();
  const [showAllTransfers, setShowAllTransfers] = useState(false);
  const [showPinnedFolders, setShowPinnedFolders] = useState(true);

  const activeTransfers = transfers.filter(t => t.status === 'active');
  const previewTransfers = activeTransfers.slice(0, 3);
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  const navItems = [
    { id: 'files', icon: Folder, label: 'Files' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const handlePinToggle = (folderPath: string, folderName: string) => {
    const isPinned = pinnedFolders.some(f => f.path === folderPath);
    if (isPinned) {
      unpinFolder(folderPath);
    } else {
      pinFolder(folderPath, folderName);
    }
  };

  return (
    <div className="w-64 h-full glass flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}>
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>TeleCloud</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cloud Storage</p>
          </div>
        </div>
      </div>

      {/* Channel Info */}
      {selectedChannel && (
        <div className="px-5 pb-5">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <HardDrive className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{selectedChannel.title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatFileSize(totalSize)} stored</p>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mx-5" style={{ borderTop: '1px solid var(--border)' }} />

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${
                isActive ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
              }`}
              style={isActive ? { border: '1px solid var(--accent)' } : {}}
            >
              <Icon className="w-4 h-4" style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
              <span className="text-sm font-medium flex-1 text-left" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
        
        {/* Transfers Section - Expands when there are active transfers */}
        <div className="mt-2">
          <div className="card overflow-hidden">
            <button
              onClick={() => activeTransfers.length > 0 && setShowAllTransfers(!showAllTransfers)}
              className={`w-full flex items-center justify-between px-4 py-3 transition-all ${
                activeTransfers.length > 0 ? 'hover:bg-[var(--bg-hover)]' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <ArrowUpFromLine className="w-4 h-4" style={{ color: activeTransfers.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="text-sm font-medium" style={{ color: activeTransfers.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  Transfers
                </span>
                {activeTransfers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}>
                    {activeTransfers.length}
                  </span>
                )}
              </div>
              {activeTransfers.length > 3 && (
                showAllTransfers ? <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-muted)' }} /> : <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              )}
            </button>
            
            <AnimatePresence initial={false}>
              {activeTransfers.length > 0 && (
                <motion.div
                  key="transfers-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="px-4 pb-3 space-y-2">
                    {(showAllTransfers ? activeTransfers : previewTransfers).map((transfer) => (
                      <div key={transfer.id} className="p-2 rounded-lg group" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium truncate flex-1 mr-2" style={{ color: 'var(--text-primary)' }}>
                            {transfer.fileName}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                if (transfer.abortController) {
                                  transfer.abortController.abort();
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-500/20"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" style={{ color: 'var(--error)' }} />
                            </button>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {Math.round(transfer.progress)}%
                            </span>
                          </div>
                        </div>
                        <div className="progress-bar" style={{ height: '2px' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${transfer.progress}%` }}
                            transition={{ duration: 0.3 }}
                            className="progress-bar-fill"
                          />
                        </div>
                      </div>
                    ))}
                    
                    {activeTransfers.length > 3 && !showAllTransfers && (
                      <button
                        onClick={() => onTabChange('transfers')}
                        className="w-full mt-1 text-[10px] text-center py-1"
                        style={{ color: 'var(--accent)' }}
                      >
                        View all →
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Pinned Folders */}
      {pinnedFolders.length > 0 && (
        <div className="px-4 mb-4">
          <button
            onClick={() => setShowPinnedFolders(!showPinnedFolders)}
            className="w-full flex items-center justify-between mb-2 px-2"
          >
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Pinned Folders ({pinnedFolders.length})
              </span>
            </div>
            {showPinnedFolders ? <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-muted)' }} /> : <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />}
          </button>
          
          <AnimatePresence>
            {showPinnedFolders && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-1 overflow-hidden"
              >
                {pinnedFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => onFolderClick(folder.path)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all hover:bg-[var(--bg-hover)]"
                  >
                    <Folder className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                      {folder.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        unpinFolder(folder.path);
                      }}
                      className="p-1 rounded hover:bg-[var(--bg-active)]"
                    >
                      <PinOff className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Speed Boost Indicator */}
      {settings.speedBoost && (
        <div className="px-5 mb-4">
          <div className="card p-4 flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
              <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Speed Boost</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Active</p>
            </div>
          </div>
        </div>
      )}

      {/* User & Logout */}
      <div className="p-5 mt-auto" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: 'var(--accent)' }}>
            {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.first_name || 'User'}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Connected</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={logout}
            className="btn btn-danger p-2"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
