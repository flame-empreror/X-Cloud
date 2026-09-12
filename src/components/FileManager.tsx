import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mtprotoService } from '../services/mtproto';
import { FileItem, TransferItem, TelegramChat } from '../types';
import { formatFileSize, getFileIconComponent } from '../utils/fileUtils';
import { Upload, Download, Trash2, Folder, Grid, List, LogOut, Settings, FolderPlus, MoreVertical, Edit2, X } from 'lucide-react';
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

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, [chat.id]);

  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      console.log('[FileManager] Loading chat history for chat:', chat.id, chat.title);
      
      const messages = await mtprotoService.getMessages(chat.id, 100, chat.inputPeer);
      
      console.log('[FileManager] Retrieved', messages.length, 'messages');
      
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

  const currentFiles = files.filter(f => f.path === currentPath);
  const folders = currentFiles.filter(f => f.type === 'folder');
  const regularFiles = currentFiles.filter(f => f.type === 'file');

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
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Loading Files</h2>
          <p className="text-zinc-400 text-sm">Reading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-base font-semibold text-white">{chat.title}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <p className="text-xs text-zinc-400">{currentPath}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 hover:text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button
                onClick={() => setShowTransfers(!showTransfers)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 hover:text-white text-sm font-medium relative flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Transfers</span>
                {transfers.filter(t => t.status === 'active').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                    {transfers.filter(t => t.status === 'active').length}
                  </span>
                )}
              </button>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-[1600px] mx-auto px-6 py-3 w-full">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {currentPath !== '/' && (
              <button
                onClick={navigateUp}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 hover:text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewFolderDialog(true)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 hover:text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:inline">New Folder</span>
            </button>
            <label className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg text-white text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-all">
              <Upload className="w-4 h-4" />
              <span>Upload Files</span>
              <input
                type="file"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 hover:text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              <span className="hidden sm:inline">{viewMode === 'grid' ? 'List' : 'Grid'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transfers Panel */}
      {showTransfers && (
        <div className="max-w-[1600px] mx-auto px-6 pb-3 w-full">
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                Active Transfers
              </h3>
              <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-medium">
                {transfers.filter(t => t.status === 'active').length} active
              </span>
            </div>
            {transfers.length === 0 ? (
              <div className="text-center py-6">
                <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-xs">No active transfers</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transfers.slice(0, 5).map((transfer) => (
                  <div key={transfer.id} className="bg-zinc-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-xs font-medium truncate flex-1 mr-3">{transfer.fileName}</span>
                      <span className={`text-xs font-medium ${
                        transfer.status === 'completed' ? 'text-green-400' :
                        transfer.status === 'error' ? 'text-red-400' :
                        'text-blue-400'
                      }`}>
                        {transfer.status}
                      </span>
                    </div>
                    {transfer.status === 'active' && (
                      <div className="w-full bg-zinc-700 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${transfer.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Files */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-6 pb-6">
          {folders.length === 0 && regularFiles.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-zinc-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h3 className="text-white text-lg font-medium mb-1">No files yet</h3>
              <p className="text-zinc-500 text-sm">Upload files to get started</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => navigateToFolder(folder.name)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ item: folder, x: e.clientX, y: e.clientY });
                  }}
                  className="bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3 cursor-pointer transition-all relative group"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setContextMenu({ item: folder, x: rect.right, y: rect.bottom });
                    }}
                    className="absolute top-2 right-2 p-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                  <div className="w-10 h-10 mx-auto mb-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
                    <Folder className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-white text-xs text-center truncate">{folder.name}</p>
                </div>
              ))}
              {regularFiles.map(file => {
                const Icon = getFileIconComponent(file.extension || '');
                return (
                  <div
                    key={file.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ item: file, x: e.clientX, y: e.clientY });
                    }}
                    className="bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3 transition-all group relative"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setContextMenu({ item: file, x: rect.right, y: rect.bottom });
                      }}
                      className="absolute top-2 right-2 p-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                    <div className="w-10 h-10 mx-auto mb-2 bg-zinc-800/50 border border-zinc-700 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-white text-xs text-center truncate mb-1">{file.name}</p>
                    <p className="text-zinc-500 text-[10px] text-center">{formatFileSize(file.size)}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="w-full mt-2 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 text-[10px] flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => navigateToFolder(folder.name)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ item: folder, x: e.clientX, y: e.clientY });
                  }}
                  className="bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 cursor-pointer transition-all flex items-center gap-3 group"
                >
                  <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
                    <Folder className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{folder.name}</p>
                    <p className="text-zinc-500 text-xs">Folder</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setContextMenu({ item: folder, x: rect.left, y: rect.bottom });
                    }}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
              ))}
              {regularFiles.map(file => {
                const Icon = getFileIconComponent(file.extension || '');
                return (
                  <div
                    key={file.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ item: file, x: e.clientX, y: e.clientY });
                    }}
                    className="bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 transition-all flex items-center gap-3 group"
                  >
                    <div className="w-9 h-9 bg-zinc-800/50 border border-zinc-700 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{file.name}</p>
                      <p className="text-zinc-500 text-xs">{formatFileSize(file.size)}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                        className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 text-xs flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setContextMenu({ item: file, x: rect.left, y: rect.bottom });
                        }}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                      >
                        <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 100,
          }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 min-w-[140px]"
        >
          <button
            onClick={() => {
              setRenameItem(contextMenu.item);
              setNewName(contextMenu.item.name);
              setShowRenameDialog(true);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-white hover:bg-zinc-800 transition-colors flex items-center gap-2 text-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Rename
          </button>
          <button
            onClick={() => handleDelete(contextMenu.item)}
            className="w-full px-3 py-1.5 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 text-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-3">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 mb-3 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                } else if (e.key === 'Escape') {
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
                className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && renameItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Rename {renameItem.type === 'folder' ? 'Folder' : 'File'}
            </h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 mb-3 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Handle rename logic here
                  setShowRenameDialog(false);
                  setRenameItem(null);
                  setNewName('');
                } else if (e.key === 'Escape') {
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
                className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white text-sm transition-colors"
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
                className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
