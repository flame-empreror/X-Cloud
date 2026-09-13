import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Folder, Settings, ArrowUpFromLine, LogOut, Pin, PinOff, ChevronRight, ChevronDown, X } from 'lucide-react';
import { useAppStore } from '../store';
import { formatFileSize } from '../utils/fileUtils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFolderClick: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeTab, onTabChange, onFolderClick, isOpen, onClose }: SidebarProps) {
  const { user, selectedChannel, files, transfers, pinnedFolders, pinFolder, unpinFolder, logout } = useAppStore();
  
  const activeTransfers = transfers.filter(t => t.status === 'active');
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  const handlePinToggle = (folderPath: string, folderName: string) => {
    const isPinned = pinnedFolders.some(f => f.path === folderPath);
    if (isPinned) {
      unpinFolder(folderPath);
    } else {
      pinFolder(folderPath, folderName);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-surface)', width: '280px' }}>
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
            >
              <Cloud className="w-5 h-5" style={{ color: 'white' }} />
            </motion.div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>TeleCloud</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cloud Storage</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-hover)]">
            <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Channel Info Card */}
        {selectedChannel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-muted)' }}>
                <Folder className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{selectedChannel.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatFileSize(totalSize)} stored</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="px-4 space-y-1.5">
        <NavItem
          icon={Folder}
          label="Files"
          isActive={activeTab === 'files'}
          onClick={() => onTabChange('files')}
        />
        <NavItem
          icon={ArrowUpFromLine}
          label="Transfers"
          isActive={activeTab === 'transfers'}
          onClick={() => onTabChange('transfers')}
          badge={activeTransfers.length > 0 ? activeTransfers.length : undefined}
        />
        <NavItem
          icon={Settings}
          label="Settings"
          isActive={activeTab === 'settings'}
          onClick={() => onTabChange('settings')}
        />
      </nav>

      {/* Active Transfers Preview */}
      <AnimatePresence>
        {activeTransfers.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 mt-4 overflow-hidden"
          >
            <div className="text-xs font-semibold mb-2 px-2" style={{ color: 'var(--text-muted)' }}>
              ACTIVE TRANSFERS
            </div>
            <div className="space-y-2">
              {activeTransfers.slice(0, 3).map((transfer) => (
                <div key={transfer.id} className="p-2.5 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium truncate flex-1 mr-2" style={{ color: 'var(--text-primary)' }}>
                      {transfer.fileName}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {Math.round(transfer.progress)}%
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: '3px' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${transfer.progress}%` }}
                      transition={{ duration: 0.3 }}
                      className="progress-bar-fill"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Folders */}
      <AnimatePresence>
        {pinnedFolders.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="px-4 mt-4 overflow-hidden"
          >
            <div className="text-xs font-semibold mb-2 px-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Pin className="w-3 h-3" style={{ color: 'var(--accent)' }} />
              PINNED FOLDERS
            </div>
            <div className="space-y-1">
              {pinnedFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => onFolderClick(folder.path)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all group hover:bg-[var(--bg-hover)]"
                >
                  <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {folder.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      unpinFolder(folder.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-active)] transition-opacity"
                  >
                    <PinOff className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile & Logout */}
      <div className="mt-auto p-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
          >
            {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.first_name || 'User'}
            </p>
            {user?.username && (
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>@{user.username}</p>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={logout}
            className="p-2 rounded-lg hover:bg-[var(--error-muted)] transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" style={{ color: 'var(--error)' }} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

function NavItem({ icon: Icon, label, isActive, onClick, badge }: NavItemProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden ${
        isActive ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
      }`}
      style={isActive ? { border: '1px solid var(--accent)', borderColor: 'var(--accent)' } : {}}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
        isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
      }`} />
      <span className={`text-sm font-medium flex-1 text-left ${
        isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
      }`}>
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'var(--accent)', color: 'white' }}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}
