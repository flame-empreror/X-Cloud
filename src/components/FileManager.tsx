import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mtprotoService } from '../services/mtproto';
import { FileItem, TransferItem, TelegramChat } from '../types';
import { formatFileSize, getFileIconComponent } from '../utils/fileUtils';
import {
  Upload, Download, Trash2, Folder, Grid, List, LogOut, Settings,
  FolderPlus, MoreVertical, Edit2, X, ChevronRight, Home, HardDrive,
  Loader2, FileText, Pin, PinOff
} from 'lucide-react';
import SettingsPanel from './SettingsPanel';
import { useAppStore } from '../store';

interface FileManagerProps {
  chat: TelegramChat;
  files: FileItem[];
  setFiles: (files: FileItem[]) => void;
  onLogout: () => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
}

export default function FileManager({ chat, files, setFiles, onLogout, currentPath, setCurrentPath }: FileManagerProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
  const { pinnedFolders, pinFolder, unpinFolder, transfers, addTransfer, updateTransfer } = useAppStore();

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
      const abortController = new AbortController();
      const transfer: TransferItem = {
        id: transferId, fileName: file.name, type: 'upload',
        progress: 0, status: 'active', size: file.size, transferred: 0, path: currentPath,
        abortController,
      };
      addTransfer(transfer);
      try {
        const metadata = {
          name: file.name, path: currentPath, size: file.size,
          mimeType: file.type, extension: file.name.split('.').pop() || '', createdAt: Date.now(),
        };
        const caption = `__TCLOUD_V1__${JSON.stringify(metadata)}`;
        await mtprotoService.sendFile(chat.id, file, caption, (progress) => {
          updateTransfer(transferId, { progress, transferred: Math.round(file.size * progress / 100) });
        }, abortController.signal);
        updateTransfer(transferId, { status: 'completed', progress: 100 });
        await loadChatHistory();
      } catch (error: any) {
        if (error.name === 'AbortError') {
          updateTransfer(transferId, { status: 'cancelled' });
        } else {
          console.error('[FileManager] Upload failed:', error);
          updateTransfer(transferId, { status: 'error', error: 'Upload failed' });
        }
      }
    }
    e.target.value = '';
  };

  const handleDownload = async (file: FileItem) => {
    if (!file.telegramMessageId) return;
    const transferId = `download-${Date.now()}`;
    const abortController = new AbortController();
    const transfer: TransferItem = {
      id: transferId, fileName: file.name, type: 'download',
      progress: 0, status: 'active', size: file.size, transferred: 0, path: file.path,
      abortController,
    };
    addTransfer(transfer);
    try {
      const messages = await mtprotoService.getMessages(chat.id, 100, chat.inputPeer);
      const message = messages.find((m: any) => m.id === file.telegramMessageId);
      if (!message || !message.media) throw new Error('File not found');
      const blob = await mtprotoService.downloadMedia(message, (progress) => {
        updateTransfer(transferId, { progress, transferred: Math.round(file.size * progress / 100) });
      }, abortController.signal);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      updateTransfer(transferId, { status: 'completed', progress: 100 });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        updateTransfer(transferId, { status: 'cancelled' });
      } else {
        console.error('[FileManager] Download failed:', error);
        updateTransfer(transferId, { status: 'error', error: 'Download failed' });
      }
    }
  };

  const handleCancelTransfer = (transferId: string) => {
    const transfer = transfers.find(t => t.id === transferId);
    if (transfer) {
      // Abort the transfer if it has an abort controller
      if (transfer.abortController) {
        transfer.abortController.abort();
      }
      updateTransfer(transferId, { status: 'cancelled' });
    }
  };

  const handlePinFolder = (folder: FileItem) => {
    const folderPath = folder.path === '/' ? `/${folder.name}` : `${folder.path}/${folder.name}`;
    const isPinned = pinnedFolders.some(f => f.path === folderPath);
    if (isPinned) {
      unpinFolder(folderPath);
    } else {
      pinFolder(folderPath, folder.name);
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

  if (isLoadingHistory) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
            <HardDrive className="w-4 h-4 animate-pulse-soft" style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Loading Files</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Reading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header className="glass" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69-.01-.03-.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{chat.title}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: 'var(--success)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Connected</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className="btn btn-ghost">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button onClick={onLogout} className="btn btn-danger">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1600px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm min-w-0 flex-1">
            <button onClick={() => setCurrentPath('/')} className="btn btn-ghost p-1.5">
              <Home className="w-4 h-4" />
            </button>
            {pathParts.map((part, index) => (
              <div key={index} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <button
                  onClick={() => navigateToPath(index)}
                  className="px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {part}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentPath !== '/' && (
              <button onClick={navigateUp} className="btn btn-ghost">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            )}
            <button onClick={() => setShowNewFolderDialog(true)} className="btn btn-secondary">
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:inline">New Folder</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary">
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'}`}
                style={{ color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'}`}
                style={{ color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File Grid/List */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          {folders.length === 0 && regularFiles.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <FileText className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No files yet</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Upload files or create a folder to get started</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setShowNewFolderDialog(true)} className="btn btn-secondary">
                  <FolderPlus className="w-4 h-4" /> New Folder
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary">
                  <Upload className="w-4 h-4" /> Upload Files
                </button>
              </div>
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {folders.map((folder, index) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  onClick={() => navigateToFolder(folder.name)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ item: folder, x: e.clientX, y: e.clientY }); }}
                  className="file-item card p-3 group relative"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setContextMenu({ item: folder, x: rect.right, y: rect.bottom }); }}
                    className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg-hover)]"
                  >
                    <MoreVertical className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <div className="w-9 h-9 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(232, 168, 56, 0.2)' }}>
                    <Folder className="w-4 h-4" style={{ color: 'var(--accent)' }} />
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
                    transition={{ duration: 0.3, delay: (folders.length + index) * 0.03 }}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ item: file, x: e.clientX, y: e.clientY }); }}
                    className="file-item card p-3 group relative"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setContextMenu({ item: file, x: rect.right, y: rect.bottom }); }}
                      className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg-hover)] z-10"
                    >
                      <MoreVertical className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <div className="w-9 h-9 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div style={{ color: 'var(--accent-secondary)' }}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-xs text-center truncate font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                    <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                      className="w-full mt-2 py-1 rounded-md text-[10px] flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'var(--accent-muted)', border: '1px solid rgba(232, 168, 56, 0.2)', color: 'var(--accent)' }}
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
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
                  transition={{ duration: 0.3, delay: index * 0.02 }}
                  onClick={() => navigateToFolder(folder.name)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ item: folder, x: e.clientX, y: e.clientY }); }}
                  className="file-item card p-3 group flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(232, 168, 56, 0.2)' }}>
                    <Folder className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{folder.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Folder</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setContextMenu({ item: folder, x: rect.left, y: rect.bottom }); }}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg-hover)]"
                  >
                    <MoreVertical className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
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
                    transition={{ duration: 0.3, delay: (folders.length + index) * 0.02 }}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ item: file, x: e.clientX, y: e.clientY }); }}
                    className="file-item card p-3 group flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div style={{ color: 'var(--accent-secondary)' }}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                        className="btn btn-secondary py-1.5 text-xs"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setContextMenu({ item: file, x: rect.left, y: rect.bottom }); }}
                        className="p-1.5 rounded-md hover:bg-[var(--bg-hover)]"
                      >
                        <MoreVertical className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
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
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 100 }}
            className="context-menu"
          >
            {contextMenu.item.type === 'folder' && (
              <button
                onClick={() => { handlePinFolder(contextMenu.item); setContextMenu(null); }}
                className="context-menu-item w-full"
              >
                {pinnedFolders.some(f => f.path === (contextMenu.item.path === '/' ? `/${contextMenu.item.name}` : `${contextMenu.item.path}/${contextMenu.item.name}`)) ? (
                  <>
                    <PinOff className="w-4 h-4" /> Unpin
                  </>
                ) : (
                  <>
                    <Pin className="w-4 h-4" /> Pin to Sidebar
                  </>
                )}
              </button>
            )}
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

      {/* Settings Panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* New Folder Dialog */}
      <AnimatePresence>
        {showNewFolderDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setShowNewFolderDialog(false); setNewFolderName(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Create New Folder</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Enter a name for your new folder</p>
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

      {/* Rename Dialog */}
      <AnimatePresence>
        {showRenameDialog && renameItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setShowRenameDialog(false); setRenameItem(null); setNewName(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Rename {renameItem.type === 'folder' ? 'Folder' : 'File'}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Enter a new name</p>
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
