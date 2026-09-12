import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mtprotoService } from '../services/mtproto';
import { FileItem, TransferItem, TelegramChat } from '../types';
import { formatFileSize, getFileIconComponent } from '../utils/fileUtils';
import {
  Upload, Download, Trash2, Folder, Grid, List, LogOut, Settings,
  FolderPlus, MoreVertical, Edit2, X, ChevronRight, Home, HardDrive,
  Loader2, FileText
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
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadChatHistory(); }, [chat.id]);

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
          } catch (e) { /* skip */ }
        }
      }
      setFiles(loadedFiles);
    } catch (error) { console.error('[FileManager] Failed to load history:', error); }
    finally { setIsLoadingHistory(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const transferId = `upload-${Date.now()}-${i}`;
      const transfer: TransferItem = {
        id: transferId, fileName: file.name, type: 'upload',
        progress: 0, status: 'active', size: file.size, transferred: 0, path: currentPath,
      };
      setTransfers(prev => [...prev, transfer]);
      try {
        const metadata = {
          name: file.name, path: currentPath, size: file.size,
          mimeType: file.type, extension: file.name.split('.').pop() || '', createdAt: Date.now(),
        };
        const caption = `__TCLOUD_V1__${JSON.stringify(metadata)}`;
        await mtprotoService.sendFile(chat.id, file, caption, (progress) => {
          setTransfers(prev => prev.map(t =>
            t.id === transferId ? { ...t, progress, transferred: Math.round(file.size * progress / 100) } : t
          ));
        });
        setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'completed', progress: 100 } : t));
        await loadChatHistory();
      } catch (error) {
        console.error('[FileManager] Upload failed:', error);
        setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'error', error: 'Upload failed' } : t));
      }
    }
    e.target.value = '';
  };

  const handleDownload = async (file: FileItem) => {
    if (!file.telegramMessageId) return;
    const transferId = `download-${Date.now()}`;
    const transfer: TransferItem = {
      id: transferId, fileName: file.name, type: 'download',
      progress: 0, status: 'active', size: file.size, transferred: 0, path: file.path,
    };
    setTransfers(prev => [...prev, transfer]);
    try {
      const messages = await mtprotoService.getMessages(chat.id, 100, chat.inputPeer);
      const message = messages.find((m: any) => m.id === file.telegramMessageId);
      if (!message || !message.media) throw new Error('File not found');
      const blob = await mtprotoService.downloadMedia(message, (progress) => {
        setTransfers(prev => prev.map(t =>
          t.id === transferId ? { ...t, progress, transferred: Math.round(file.size * progress / 100) } : t
        ));
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'completed', progress: 100 } : t));
    } catch (error) {
      console.error('[FileManager] Download failed:', error);
      setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'error', error: 'Download failed' } : t));
    }
  };

  const handleDelete = async (item: FileItem) => {
    if (!item.telegramMessageId) return;
    if (!confirm(`Delete ${item.type === 'folder' ? 'folder' : 'file'} "${item.name}"?`)) return;
    try {
      await mtprotoService.deleteMessage(chat.id, item.telegramMessageId);
      setFiles(files.filter(f => f.id !== item.id));
      setContextMenu(null);
    } catch (error) { console.error('[FileManager] Delete failed:', error); alert('Failed to delete'); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const folderMetadata = {
        name: newFolderName.trim(), path: currentPath, size: 0,
        mimeType: 'folder', extension: '', createdAt: Date.now(), isFolder: true,
      };
      const caption = `__TCLOUD_V1__${JSON.stringify(folderMetadata)}`;
      await mtprotoService.sendMessage(chat.id, caption);
      const newFolder: FileItem = {
        id: `folder_${Date.now()}`, name: newFolderName.trim(), path: currentPath,
        size: 0, type: 'folder', mimeType: 'folder', extension: '', createdAt: Date.now(), modifiedAt: Date.now(),
      };
      setFiles([...files, newFolder]);
      setShowNewFolderDialog(false); setNewFolderName('');
    } catch (error) { console.error('[FileManager] Failed to create folder:', error); alert('Failed'); }
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

  const navigateToPath = (index: number) => {
    if (index === -1) { setCurrentPath('/'); return; }
    const parts = currentPath.split('/').filter(Boolean);
    setCurrentPath('/' + parts.slice(0, index + 1).join('/'));
  };

  const currentFiles = files.filter(f => f.path === currentPath);
  const folders = currentFiles.filter(f => f.type === 'folder');
  const regularFiles = currentFiles.filter(f => f.type === 'file');
  const pathParts = currentPath.split('/').filter(Boolean);
  const activeTransfers = transfers.filter(t => t.status === 'active');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  // ── Loading ──
  if (isLoadingHistory) {
    return (
      <div className="h-screen flex items-center justify-center mesh-gradient">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[var(--surface-3)] flex items-center justify-center">
            <HardDrive className="w-7 h-7 text-blue-400 animate-pulse-soft" />
          </div>
          <h2 className="text-white text-lg font-semibold mb-1">Loading Files</h2>
          <p className="text-zinc-500 text-sm">Reading chat history...</p>
          <div className="mt-6 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Header ── */}
      <header className="header-app">
        <div className="container-app flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69-.01-.03-.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white leading-tight">{chat.title}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-soft" />
                <p className="text-xs text-zinc-500">Connected</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className="btn btn-ghost gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button onClick={() => setShowTransfers(!showTransfers)} className="btn btn-ghost gap-2 relative">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Transfers</span>
              {activeTransfers.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                  {activeTransfers.length}
                </span>
              )}
            </button>
            <button onClick={onLogout} className="btn btn-danger gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="border-b flex items-center justify-between h-12 px-6" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm min-w-0 flex-1">
          <button onClick={() => setCurrentPath('/')} className="btn btn-ghost p-1.5 rounded-md text-zinc-400 hover:text-white">
            <Home className="w-4 h-4" />
          </button>
          {pathParts.map((part, index) => (
            <div key={index} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              <button
                onClick={() => navigateToPath(index)}
                className="px-2 py-1 rounded-md text-zinc-400 hover:text-white hover:bg-[var(--surface-3)] transition-colors text-sm"
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {currentPath !== '/' && (
            <button onClick={navigateUp} className="btn btn-ghost gap-1.5 text-xs">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          )}
          <button onClick={() => setShowNewFolderDialog(true)} className="btn btn-secondary gap-1.5 text-xs">
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">New Folder</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary gap-1.5 text-xs">
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>
          <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[var(--surface-4)] text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[var(--surface-4)] text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Transfers Panel ── */}
      <AnimatePresence>
        {showTransfers && transfers.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-b overflow-hidden"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="px-6 py-3" style={{ background: 'var(--surface-1)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-400" />
                  Transfers
                  {activeTransfers.length > 0 && (
                    <span className="badge badge-blue">{activeTransfers.length} active</span>
                  )}
                </h3>
                <button onClick={() => setShowTransfers(false)} className="btn btn-ghost p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {transfers.slice(0, 5).map((transfer) => (
                  <div key={transfer.id} className="rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-xs font-medium truncate flex-1 mr-3">{transfer.fileName}</span>
                      <span className={`badge ${
                        transfer.status === 'completed' ? 'badge-green' :
                        transfer.status === 'error' ? 'badge-red' : 'badge-blue'
                      }`}>
                        {transfer.status === 'active' ? `${Math.round(transfer.progress)}%` : transfer.status}
                      </span>
                    </div>
                    {transfer.status === 'active' && (
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${transfer.progress}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── File Grid/List ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="container-app py-6">
          {folders.length === 0 && regularFiles.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center">
                <FileText className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">No files yet</h3>
              <p className="text-zinc-500 text-sm mb-6">Upload files or create a folder to get started</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setShowNewFolderDialog(true)} className="btn btn-secondary gap-2">
                  <FolderPlus className="w-4 h-4" /> New Folder
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary gap-2">
                  <Upload className="w-4 h-4" /> Upload Files
                </button>
              </div>
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {/* Folders */}
              {folders.map((folder, index) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  onClick={() => navigateToFolder(folder.name)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ item: folder, x: e.clientX, y: e.clientY }); }}
                  className="card p-3 cursor-pointer group relative border"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border-subtle)' }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setContextMenu({ item: folder, x: rect.right, y: rect.bottom }); }}
                    className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--surface-4)]"
                  >
                    <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                  <div className="w-10 h-10 mx-auto mb-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
                    <Folder className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-white text-xs text-center truncate font-medium">{folder.name}</p>
                </motion.div>
              ))}
              {/* Files */}
              {regularFiles.map((file, index) => {
                const Icon = getFileIconComponent(file.extension || '');
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: (folders.length + index) * 0.03 }}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ item: file, x: e.clientX, y: e.clientY }); }}
                    className="card p-3 group relative cursor-pointer border"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border-subtle)' }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setContextMenu({ item: file, x: rect.right, y: rect.bottom }); }}
                      className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--surface-4)] z-10"
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                    <div className="w-10 h-10 mx-auto mb-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-white text-xs text-center truncate font-medium mb-0.5">{file.name}</p>
                    <p className="text-zinc-500 text-[10px] text-center">{formatFileSize(file.size)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                      className="w-full mt-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-md text-blue-400 text-[10px] flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {/* List - Folders */}
              {folders.map((folder, index) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.02 }}
                  onClick={() => navigateToFolder(folder.name)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ item: folder, x: e.clientX, y: e.clientY }); }}
                  className="card p-3 cursor-pointer group flex items-center gap-3 border"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Folder className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{folder.name}</p>
                    <p className="text-zinc-500 text-xs">Folder</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setContextMenu({ item: folder, x: rect.left, y: rect.bottom }); }}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--surface-4)]"
                  >
                    <MoreVertical className="w-4 h-4 text-zinc-400" />
                  </button>
                </motion.div>
              ))}
              {/* List - Files */}
              {regularFiles.map((file, index) => {
                const Icon = getFileIconComponent(file.extension || '');
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: (folders.length + index) * 0.02 }}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ item: file, x: e.clientX, y: e.clientY }); }}
                    className="card p-3 group flex items-center gap-3 border"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{file.name}</p>
                      <p className="text-zinc-500 text-xs">{formatFileSize(file.size)}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                        className="btn btn-secondary gap-1 py-1.5 text-xs"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setContextMenu({ item: file, x: rect.left, y: rect.bottom }); }}
                        className="p-1.5 rounded-md hover:bg-[var(--surface-4)]"
                      >
                        <MoreVertical className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Context Menu ── */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 100 }}
            className="context-menu"
          >
            <button
              onClick={() => { setRenameItem(contextMenu.item); setNewName(contextMenu.item.name); setShowRenameDialog(true); setContextMenu(null); }}
              className="context-menu-item w-full"
            >
              <Edit2 className="w-4 h-4" /> Rename
            </button>
            {contextMenu.item.type === 'file' && (
              <button
                onClick={() => { handleDownload(contextMenu.item); setContextMenu(null); }}
                className="context-menu-item w-full"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            )}
            <div className="context-menu-divider" />
            <button
              onClick={() => handleDelete(contextMenu.item)}
              className="context-menu-item danger w-full"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Settings Panel ── */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* ── New Folder Dialog ── */}
      <AnimatePresence>
        {showNewFolderDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setShowNewFolderDialog(false); setNewFolderName(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-white mb-1">Create New Folder</h3>
              <p className="text-zinc-500 text-sm mb-4">Enter a name for your new folder</p>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="input mb-4"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); else if (e.key === 'Escape') { setShowNewFolderDialog(false); setNewFolderName(''); } }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowNewFolderDialog(false); setNewFolderName(''); }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button onClick={handleCreateFolder} className="btn btn-primary flex-1">
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Rename Dialog ── */}
      <AnimatePresence>
        {showRenameDialog && renameItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setShowRenameDialog(false); setRenameItem(null); setNewName(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-white mb-1">
                Rename {renameItem.type === 'folder' ? 'Folder' : 'File'}
              </h3>
              <p className="text-zinc-500 text-sm mb-4">Enter a new name</p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input mb-4"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') { setShowRenameDialog(false); setRenameItem(null); setNewName(''); } else if (e.key === 'Escape') { setShowRenameDialog(false); setRenameItem(null); setNewName(''); } }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowRenameDialog(false); setRenameItem(null); setNewName(''); }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowRenameDialog(false); setRenameItem(null); setNewName(''); }}
                  className="btn btn-primary flex-1"
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
