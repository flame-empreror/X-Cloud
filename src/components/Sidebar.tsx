import { motion } from 'framer-motion';
import { FolderOpen, ArrowUpFromLine, Settings, LogOut, Cloud, HardDrive } from 'lucide-react';
import { useAppStore } from '../store';
import { formatFileSize } from '../utils/fileUtils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, selectedChannel, files, transfers, logout, settings } = useAppStore();
  
  const activeTransfers = transfers.filter(t => t.status === 'active').length;
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  const navItems = [
    { id: 'files', icon: FolderOpen, label: 'Files' },
    { id: 'transfers', icon: ArrowUpFromLine, label: 'Transfers', badge: activeTransfers },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

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
      <nav className="flex-1 p-4 space-y-2">
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
              {item.badge && item.badge > 0 && (
                <span className="badge badge-accent">
                  {item.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Speed Boost Indicator */}
      {settings.speedBoost && (
        <div className="px-5 mb-4">
          <div className="card p-4 flex items-center gap-3" style={{ borderColor: 'rgba(232, 168, 56, 0.2)' }}>
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
      <div className="p-5" style={{ borderTop: '1px solid var(--border)' }}>
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
            <LogOut className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
