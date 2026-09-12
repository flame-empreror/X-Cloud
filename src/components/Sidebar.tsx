import { motion } from 'framer-motion';
import {
  Cloud, FolderOpen, ArrowUpFromLine, Settings, LogOut, 
  HardDrive, Zap, ChevronRight
} from 'lucide-react';
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
    { id: 'files', icon: FolderOpen, label: 'Files', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'transfers', icon: ArrowUpFromLine, label: 'Transfers', badge: activeTransfers, gradient: 'from-purple-500 to-pink-500' },
    { id: 'settings', icon: Settings, label: 'Settings', gradient: 'from-green-500 to-emerald-500' },
  ];

  return (
    <div className="w-[280px] h-full glass flex flex-col border-r border-white/10">
      {/* Logo */}
      <div className="p-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-50" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
              <Cloud className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-white font-bold text-xl gradient-text">TeleCloud</h1>
            <p className="text-gray-400 text-xs font-medium">Cloud Storage</p>
          </div>
        </div>
      </div>

      {/* Channel Info */}
      {selectedChannel && (
        <div className="px-5 pb-5">
          <div className="card-primary rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <HardDrive className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{selectedChannel.title}</p>
              <p className="text-gray-400 text-xs mt-0.5">{formatFileSize(totalSize)} stored</p>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mx-5 border-t border-white/10" />

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
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-20`}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`relative w-7 h-7 rounded-xl flex items-center justify-center ${
                isActive ? `bg-gradient-to-br ${item.gradient} shadow-lg` : 'bg-white/5 group-hover:bg-white/10'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="relative text-sm font-semibold flex-1 text-left">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="relative px-2.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full min-w-[24px] text-center shadow-lg">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="relative w-4 h-4 text-white/50" />}
            </motion.button>
          );
        })}
      </nav>

      {/* Speed Boost Indicator */}
      {settings.speedBoost && (
        <div className="px-5 mb-4">
          <div className="card-warning rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-amber-300 text-xs font-bold">Speed Boost</p>
                <p className="text-gray-400 text-[10px]">Active</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User & Logout */}
      <div className="p-5 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl blur-md opacity-50" />
            <div className="relative w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
              {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.first_name || 'User'}</p>
            <p className="text-gray-400 text-xs">Connected</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={logout}
            className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
