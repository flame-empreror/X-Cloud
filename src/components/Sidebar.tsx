import { motion } from 'framer-motion';
import {
  Cloud, FolderOpen, ArrowUpFromLine, ArrowDownToLine,
  Settings, LogOut, HardDrive, ChevronRight, Zap
} from 'lucide-react';
import { useAppStore } from '../store';
import { formatFileSize } from '../utils/fileUtils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, selectedChannel, files, transfers, logout } = useAppStore();
  
  const activeTransfers = transfers.filter(t => t.status === 'active').length;
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  const navItems = [
    { id: 'files', icon: FolderOpen, label: 'Files' },
    { id: 'transfers', icon: ArrowUpFromLine, label: 'Transfers', badge: activeTransfers },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="w-64 h-full bg-slate-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col"
    >
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">TeleCloud</h1>
            <p className="text-slate-500 text-xs">Cloud Storage</p>
          </div>
        </div>
      </div>

      {/* Channel Info */}
      {selectedChannel && (
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 px-2 py-2 bg-white/5 rounded-lg">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{selectedChannel.title}</p>
              <p className="text-slate-500 text-[10px]">{formatFileSize(totalSize)} used</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-4 h-4" />}
            </motion.button>
          );
        })}
      </nav>

      {/* Speed Boost Indicator */}
      {useAppStore.getState().settings.speedBoost && (
        <div className="mx-3 mb-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-xs font-medium">Speed Boost Active</span>
          </div>
        </div>
      )}

      {/* User & Logout */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
            {user?.first_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.first_name || 'User'}</p>
            <p className="text-slate-500 text-[10px]">Connected</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={logout}
            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.aside>
  );
}
