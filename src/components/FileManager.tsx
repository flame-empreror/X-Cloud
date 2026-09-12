import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mtprotoService } from '../services/mtproto';
import { FileItem, TransferItem, TelegramChat } from '../types';
import { formatFileSize, getFileIconComponent } from '../utils/fileUtils';
import { 
  Upload, Download, Trash2, Folder, Grid, List, LogOut, Settings, 
  FolderPlus, MoreVertical, Edit2, Search, ChevronRight, Home,
  ArrowLeft, X, HardDrive
} from 'lucide-react';
import SettingsPanel from './SettingsPanel';

interface FileManagerProps {
  chat: TelegramChat;
  files: FileItem[];
  setFiles: (files: FileItem[]) => void;
  onLogout: () => void;
}

export default function FileManager({ chat, files, setFiles, onLogout }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState('/');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [showTransfers, setShowTransfers] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ item: FileItem; x: number; y: number } | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameItem, setRenameItem] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, [chat.id]);

  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const messages = await mtprotoService.getMessages(chat.id, 100, chat.inputPeer);
      const loadedFiles: FileItem[] = [];
      
      for (const msg of messages) {
        if (!msg) continue;
        
        const caption = msg.message || msg.text || '';
        
        if (caption.startsWith('__TCLOUD_V1__')) {
          try {
            const jsonStr = caption.substring('__TCLOUD_V1__'.length);
            const metadata = JSON.parse(jsonStr);
            
            let fileId: string | undefined;
            if (msg.media && msg.media._ === 'messageMediaDocument') {
              fileId = msg.media.document?.id?.toString();
            }
            
            const fileItem: FileItem = {
              id: msg.id.toString(),
              name: metadata.name || 'Unknown',
              path: metadata.path || '/',
              size: metadata.size || 0,
              type: metadata.isFolder ? 'folder' : 'file',
              mimeType: metadata.mimeType || '',
              extension: metadata.extension || '',
              telegramMessageId: msg.id,
              telegramFileId: fileId,
              createdAt: metadata.createdAt || (msg.date ? msg.date * 1000 : Date.now()),
              modifiedAt: msg.date ? msg.date * 1000 : Date.now(),
            };
            
            loadedFiles.push(fileItem);
          } catch (e) {
            console.error('[FileManager] Failed to parse file meta:', e);
          }
        }
      }
      
      setFiles(loadedFiles);
    } catch (error) {
      console.error('[FileManager] Failed to load chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const transferId = `upload-${Date.now()}-${i}`;
      
      const transfer: TransferItem = {
        id: transferId,
        fileName: file.name,
        type: 'upload',
        progress: 0,
        status: 'active',
        size: file.size,
        transferred: 0,
        path: currentPath,
      };
      
      setTransfers(prev => [...prev, transfer]);

      try {
        const metadata = {
          name: file.name,
          path: currentPath,
          size: file.size,
          mimeType: file.type,
          extension: file.name.split('.').pop() || '',
          createdAt: Date.now(),
        };

        const caption = `__TCLOUD_V1__${JSON.stringify(metadata)}`;
        
        await mtprotoService.sendFile(chat.id, file, caption, (progress) => {
          setTransfers(prev => prev.map(t => 
            t.id === transferId ? { ...t, progress, transferred: Math.round(file.size * progress / 100) } : t
          ));
        });

        setTransfers(prev => prev.map(t => 
          t.id === transferId ? { ...t, status: 'completed', progress: 100 } : t
        ));
        
        await loadChatHistory();
      } catch (error) {
        console.error('[FileManager] Upload failed:', error);
        setTransfers(prev => prev.map(t => 
          t.id === transferId ? { ...t, status: 'error', error: 'Upload failed' } : t
        ));
      }
    }
    
    e.target.value = '';
  };

  const handleDownload = async (file: FileItem) => {
    if (!file.telegramMessageId) return;

    const transferId = `download-${Date.now()}`;
    const transfer: TransferItem = {
      id: transferId,
      fileName: file.name,
      type: 'download',
      progress: 0,
      status: 'active',
      size: file.size,
      transferred: 0,
      path: file.path,
    };

    setTransfers(prev => [...prev, transfer]);

    try {
      const messages = await mtprotoService.getMessages(chat.id, 100, chat.inputPeer);
      const message = messages.find((m: any) => m.id === file.telegramMessageId);
      
      if (!message || !message.media) {
        throw new Error('File not found');
      }

      const blob = await mtprotoService.downloadMedia(message, (progress) => {
        setTransfers(prev => prev.map(t => 
          t.id === transferId ? { ...t, progress, transferred: Math.round(file.size * progress / 100) } : t
        ));
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setTransfers(prev => prev.map(t => 
        t.id === transferId ? { ...t, status: 'completed', progress: 100 } : t
      ));
    } catch (error) {
      console.error('[FileManager] Download failed:', error);
      setTransfers(prev => prev.map(t => 
        t.id === transferId ? { ...t, status: 'error', error: 'Download failed' } : t
      ));
    }
  };

  const handleDelete = async (item: FileItem) => {
    if (!item.telegramMessageId) return;
    if (!confirm(`Delete ${item.type === 'folder' ? 'folder' : 'file'} "${item.name}"?`)) return;

    try {
      await mtprotoService.deleteMessage(chat.id, item.telegramMessageId);
      setFiles(files.filter(f => f.id !== item.id));
      setContextMenu(null);
    } catch (error) {
      console.error('[FileManager] Delete failed:', error);
      alert('Failed to delete');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const folderMetadata = {
        name: newFolderName.trim(),
        path: currentPath,
        size: 0,
        mimeType: 'folder',
        extension: '',
        createdAt: Date.now(),
        isFolder: true,
      };

      const caption = `__TCLOUD_V1__${JSON.stringify(folderMetadata)}`;
      await mtprotoService.sendMessage(chat.id, caption);

      const newFolder: FileItem = {
        id: `folder_${Date.now()}`,
        name: newFolderName.trim(),
        path: currentPath,
        size: 0,
        type: 'folder',
        mimeType: 'folder',
        extension: '',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      setFiles([...files, newFolder]);
      setShowNewFolderDialog(false);
      setNewFolderName('');
    } catch (error) {
      console.error('[FileManager] Failed to create folder:', error);
      alert('Failed to create folder');
    }
  };

  const navigateToFolder = (folderName: string) => {
    setCurrentPath(currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`);
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/'));
  };

  // Filter files based on current path and search
  const currentFiles = files.filter(f => {
    const inCurrentPath = f.path === currentPath;
    const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return inCurrentPath && matchesSearch;
  });

  const folders = currentFiles.filter(f => f.type === 'folder');
  const regularFiles = currentFiles.filter(f => f.type === 'file');

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  if (isLoadingHistory) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <HardDrive className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} />
          </div>
          <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Loading Files</h2>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Reading chat history...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header className="glass-elevated border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-glow" style={{ background: 'var(--gradient-primary)' }}>
              <HardDrive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{chat.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-green)' }} />
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{currentPath}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <button
              onClick={() => setShowSettings(true)}
              className="h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 hover-lift"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={() => setShowTransfers(!showTransfers)}
              className="h-9 px-4 rounded-lg text-sm font-medium relative flex items-center gap-2 hover-lift"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Transfers</span>
              {transfers.filter(t => t.status === 'active').length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--accent-blue)' }}>
                  {transfers.filter(t => t.status === 'active').length}
                </span>
              )}
            </button>
            <button
              onClick={onLogout}
              className="h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 hover-lift"
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)' }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </motion.div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-[1800px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {currentPath !== '/' && (
              <motion.button
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={navigateUp}
                className="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 hover-lift"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </motion.button>
            )}
            
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <Home className="w-3.5 h-3.5" />
              <ChevronRight className="w-3 h-3" />
              <span>{currentPath}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="h-8 pl-9 pr-4 rounded-lg text-xs focus-ring"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowNewFolderDialog(true)}
              className="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 hover-lift"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Folder</span>
            </motion.button>
            
            <motion.label
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="h-8 px-4 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 hover-lift"
              style={{ background: 'var(--gradient-primary)', color: 'white' }}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
              <input
                type="file"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
            </motion.label>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 hover-lift"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              {viewMode === 'grid' ? <List className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Transfers Panel */}
      <AnimatePresence>
        {showTransfers && transfers.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b overflow-hidden"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="max-w-[1800px] mx-auto px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Upload className="w-3.5 h-3.5" style={{ color: 'var(--accent-blue)' }} />
                  Active Transfers
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)' }}>
                  {transfers.filter(t => t.status === 'active').length} active
                </span>
              </div>
              <div className="space-y-2">
                {transfers.slice(0, 3).map((transfer) => (
                  <div key={transfer.id} className="rounded-lg p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium truncate flex-1 mr-3" style={{ color: 'var(--text-primary)' }}>{transfer.fileName}</span>
                      <span className="text-[10px] font-medium" style={{ 
                        color: transfer.status === 'completed' ? 'var(--accent-green)' :
                               transfer.status === 'error' ? 'var(--accent-red)' :
                               'var(--accent-blue)'
                      }}>
                        {transfer.status}
                      </span>
                    </div>
                    {transfer.status === 'active' && (
                      <div className="w-full rounded-full h-1" style={{ background: 'var(--bg-accent)' }}>
                        <motion.div
                          className="h-1 rounded-full"
                          style={{ background: 'var(--gradient-primary)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${transfer.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          {folders.length === 0 && regularFiles.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                <Folder className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No files yet</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Upload files to get started</p>
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {folders.map((folder, index) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigateToFolder(folder.name)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ item: folder, x: e.clientX, y: e.clientY });
                  }}
                  className="group relative rounded-xl p-4 cursor-pointer hover-lift"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ item: folder, x: e.clientX, y: e.clientY });
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                  >
                    <MoreVertical className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <Folder className="w-6 h-6" style={{ color: 'var(--accent-amber)' }} />
                  </div>
                  <p className="text-xs text-center truncate font-medium" style={{ color: 'var(--text-primary)' }}>{folder.name}</p>
                </motion.div>
              ))}
              {regularFiles.map((file, index) => {
                const Icon = getFileIconComponent(file.extension || '');
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (folders.length + index) * 0.05 }}
                    whileHover={{ y: -4 }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ item: file, x: e.clientX, y: e.clientY });
                    }}
                    className="group relative rounded-xl p-4 hover-lift"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu({ item: file, x: e.clientX, y: e.clientY });
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                    >
                      <MoreVertical className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                    </button>
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <Icon className="w-6 h-6 text-blue-500" />
              </div>                    <p className="text-xs text-center truncate mb-1 font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                    <p className="text-[10px] text-center" style={{ color: 'var(--text-tertiary)' }}>{formatFileSize(file.size)}</p>
                    <motion.button
                      initial={{ opacity: 0, y: 5 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="w-full mt-3 py-1.5 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)' }}
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {folders.map((folder, index) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => navigateToFolder(folder.name)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ item: folder, x: e.clientX, y: e.clientY });
                  }}
                  className="group rounded-lg p-3 cursor-pointer flex items-center gap-3 hover-lift"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <Folder className="w-4 h-4" style={{ color: 'var(--accent-amber)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate font-medium" style={{ color: 'var(--text-primary)' }}>{folder.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Folder</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ item: folder, x: e.clientX, y: e.clientY });
                    }}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                  >
                    <MoreVertical className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                </motion.div>
              ))}
              {regularFiles.map((file, index) => {
                const Icon = getFileIconComponent(file.extension || '');
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (folders.length + index) * 0.03 }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ item: file, x: e.clientX, y: e.clientY });
                    }}
                    className="group rounded-lg p-3 flex items-center gap-3 hover-lift"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                      <Icon className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{formatFileSize(file.size)}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                        className="px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1"
                        style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)' }}
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </motion.button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu({ item: file, x: e.clientX, y: e.clientY });
                        }}
                        className="p-1.5 rounded-md"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                      >
                        <MoreVertical className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 100,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
            }}
            className="rounded-lg py-1 min-w-[140px]"
          >
            <button
              onClick={() => {
                setRenameItem(contextMenu.item);
                setNewName(contextMenu.item.name);
                setShowRenameDialog(true);
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs font-medium hover:bg-white/5"
              style={{ color: 'var(--text-primary)' }}
            >
              <Edit2 className="w-3 h-3" />
              Rename
            </button>
            <button
              onClick={() => handleDelete(contextMenu.item)}
              className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs font-medium hover:bg-white/5"
              style={{ color: 'var(--accent-red)' }}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* New Folder Dialog */}
      <AnimatePresence>
        {showNewFolderDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="rounded-xl p-5 max-w-sm w-full mx-4"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Create New Folder</h3>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-3 py-2 rounded-lg text-xs mb-3 focus-ring"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') {
                    setShowNewFolderDialog(false);
                    setNewFolderName('');
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowNewFolderDialog(false);
                    setNewFolderName('');
                  }}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium hover-lift"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium hover-lift"
                  style={{ background: 'var(--gradient-primary)', color: 'white' }}
                >
                  Create Folder
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Dialog */}
      <AnimatePresence>
        {showRenameDialog && renameItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="rounded-xl p-5 max-w-sm w-full mx-4"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Rename {renameItem.type === 'folder' ? 'Folder' : 'File'}
              </h3>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name"
                className="w-full px-3 py-2 rounded-lg text-xs mb-3 focus-ring"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Handle rename logic here
                    setShowRenameDialog(false);
                    setRenameItem(null);
                    setNewName('');
                  }
                  if (e.key === 'Escape') {
                    setShowRenameDialog(false);
                    setRenameItem(null);
                    setNewName('');
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowRenameDialog(false);
                    setRenameItem(null);
                    setNewName('');
                  }}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium hover-lift"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle rename logic here
                    setShowRenameDialog(false);
                    setRenameItem(null);
                    setNewName('');
                  }}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium hover-lift"
                  style={{ background: 'var(--gradient-primary)', color: 'white' }}
                >
                  Rename
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
