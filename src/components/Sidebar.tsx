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
    { id: 'files', icon: FolderOpen, label: 'Files' },
    { id: 'transfers', icon: ArrowUpFromLine, label: 'Transfers', badge: activeTransfers },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-[260px] h-full bg-[#0d0d14]/90 backdrop-blur-2xl border-r border-white/[0.06] flex flex-col">
      {/* Logo */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cloud className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">TeleCloud</h1>
            <p className="text-slate-600 text-[11px] font-medium">Cloud Storage</p>
          </div>
        </div>
      </div>

      {/* Channel Info */}
      {selectedChannel && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gradient-to-r from-blue-500/[0.06] to-purple-500/[0.04] border border-white/[0.06] rounded-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 rounded-lg flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{selectedChannel.title}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{formatFileSize(totalSize)} stored</p>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mx-4 border-t border-white/[0.04]" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500/10 to-blue-500/[0.03] text-blue-400 border border-blue-500/15 shadow-sm shadow-blue-500/5'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-4 h-4 text-blue-400/50" />}
            </motion.button>
          );
        })}
      </nav>

      {/* Speed Boost Indicator */}
      {settings.speedBoost && (
        <div className="mx-4 mb-3">
          <div className="px-3 py-2.5 bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.04] border border-amber-500/15 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-amber-500/20 rounded-md flex items-center justify-center">
                <Zap className="w-3 h-3 text-amber-400" />
              </div>
              <span className="text-amber-400 text-[11px] font-semibold">Speed Boost</span>
            </div>
          </div>
        </div>
      )}

      {/* User & Logout */}
      <div className="p-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/10">
            {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.first_name || 'User'}</p>
            <p className="text-slate-600 text-[10px]">Connected</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={logout}
            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
