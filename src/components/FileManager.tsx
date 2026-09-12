import { useState, useEffect, useRef } from 'react';
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
      
      // Pass the inputPeer to getMessages for proper authentication
      const messages = await mtprotoService.getMessages(chat.id, 100, chat.inputPeer);
      
      console.log('[FileManager] Retrieved', messages.length, 'messages');
      
      const loadedFiles: FileItem[] = [];
      
      for (const msg of messages) {
        // Skip null/undefined messages
        if (!msg) {
          console.log('[FileManager] Skipping null message');
          continue;
        }
        
        console.log('[FileManager] Processing message ID:', msg.id, 'type:', msg._);
        
        // Raw API returns messages with 'message' property (not 'text')
        const caption = msg.message || msg.text || '';
        
        console.log('[FileManager] Caption:', caption.substring(0, 100));
        
        // Check if message has our metadata prefix
        if (caption.startsWith('__TCLOUD_V1__')) {
          try {
            const jsonStr = caption.substring('__TCLOUD_V1__'.length);
            console.log('[FileManager] Parsing JSON:', jsonStr);
            const metadata = JSON.parse(jsonStr);
            console.log('[FileManager] Parsed metadata:', metadata);
            
            // Extract file ID and store the entire message object for downloading
            let fileId: string | undefined;
            if (msg.media && msg.media._ === 'messageMediaDocument') {
              fileId = msg.media.document?.id?.toString();
              console.log('[FileManager] File ID:', fileId);
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
            
            console.log('[FileManager] Created file item:', fileItem);
            loadedFiles.push(fileItem);
          } catch (e) {
            console.error('[FileManager] Failed to parse file meta:', e);
            console.error('[FileManager] Caption was:', caption);
          }
        }
      }
      
      console.log('[FileManager] Total files loaded:', loadedFiles.length);
      console.log('[FileManager] Files:', loadedFiles);
      setFiles(loadedFiles);
    } catch (error) {
      console.error('[FileManager] Failed to load chat history:', error);
      console.error('[FileManager] Error stack:', error instanceof Error ? error.stack : 'No stack');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const currentFiles = files.filter(f => f.path === currentPath);
  const folders = currentFiles.filter(f => f.type === 'folder');
  const regularFiles = currentFiles.filter(f => f.type === 'file');

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
      setShowTransfers(true);

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

        const result = await mtprotoService.sendFile(chat.id, file, caption, (progress) => {
          setTransfers(prev => prev.map(t => 
            t.id === transferId 
              ? { ...t, progress, transferred: Math.round(file.size * progress / 100) }
              : t
          ));
        });

        const newFile: FileItem = {
          id: result.id.toString(),
          name: file.name,
          path: currentPath,
          size: file.size,
          type: 'file',
          mimeType: file.type,
          extension: file.name.split('.').pop() || '',
          telegramMessageId: result.id,
          telegramFileId: result.media?.document?.id?.toString(),
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };

        setFiles([...files, newFile]);
        
        setTransfers(prev => prev.map(t => 
          t.id === transferId ? { ...t, status: 'completed', progress: 100 } : t
        ));
      } catch (error: any) {
        console.error('[FileManager] Upload failed:', error);
        setTransfers(prev => prev.map(t => 
          t.id === transferId ? { ...t, status: 'error', error: error.message } : t
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
    setShowTransfers(true);

    try {
      console.log('[FileManager] Starting download for file:', file.name);
      console.log('[FileManager] Message ID:', file.telegramMessageId);
      
      // Always fetch the message fresh from Telegram to get proper Long objects
      // Stored message objects have serialized Long objects that cause LOCATION_INVALID
      console.log('[FileManager] Fetching fresh message from Telegram');
      const messages = await mtprotoService.getMessages(chat.id, 100, chat.inputPeer);
      const message = messages.find((m: any) => m.id === file.telegramMessageId);
      
      if (!message || !message.media) {
        throw new Error('File not found in chat history');
      }

      console.log('[FileManager] Found message, starting download');
      const blob = await mtprotoService.downloadMedia(message, (progress) => {
        console.log('[FileManager] Download progress:', progress);
        setTransfers(prev => prev.map(t => 
          t.id === transferId ? { 
            ...t, 
            progress: progress,
            transferred: Math.round(file.size * progress / 100)
          } : t
        ));
      });
      
      console.log('[FileManager] Download complete, creating download link');
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
    } catch (error: any) {
      console.error('[FileManager] Download failed:', error);
      setTransfers(prev => prev.map(t => 
        t.id === transferId ? { ...t, status: 'error', error: error.message } : t
      ));
    }
  };

  const handleDelete = async (item: FileItem) => {
    if (!item.telegramMessageId) {
      alert('Cannot delete: No message ID found');
      return;
    }

    const itemType = item.type === 'folder' ? 'folder' : 'file';
    if (!confirm(`Delete ${itemType} "${item.name}"?`)) return;

    try {
      console.log('[FileManager] Deleting', itemType, ':', item.name, 'Message ID:', item.telegramMessageId);
      
      // Delete the message from Telegram
      await mtprotoService.deleteMessage(chat.id, item.telegramMessageId);
      
      console.log('[FileManager] Delete successful, updating local state');
      // Remove from local state
      setFiles(files.filter(f => f.id !== item.id));
      setContextMenu(null);
    } catch (error) {
      console.error('[FileManager] Delete failed:', error);
      alert(`Failed to delete ${itemType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ item, x: e.clientX, y: e.clientY });
  };

  const handleRename = (item: FileItem) => {
    setRenameItem(item);
    setNewName(item.name);
    setShowRenameDialog(true);
    setContextMenu(null);
  };

  const handleRenameSubmit = async () => {
    if (!renameItem || !newName.trim()) {
      alert('Please enter a name');
      return;
    }

    if (newName.trim() === renameItem.name) {
      setShowRenameDialog(false);
      setRenameItem(null);
      setNewName('');
      return;
    }

    try {
      console.log('[FileManager] Renaming:', renameItem.name, 'to', newName);
      
      if (renameItem.type === 'folder') {
        // For folders: Delete old message, then create new one
        if (!renameItem.telegramMessageId) {
          alert('Cannot rename: No message ID found');
          return;
        }

        console.log('[FileManager] Deleting old folder message:', renameItem.telegramMessageId);
        
        // Delete the old folder message
        await mtprotoService.deleteMessage(chat.id, renameItem.telegramMessageId);
        
        // Create updated metadata
        const updatedMetadata = {
          name: newName.trim(),
          path: renameItem.path,
          size: renameItem.size,
          mimeType: renameItem.mimeType,
          extension: renameItem.extension,
          createdAt: renameItem.createdAt,
          isFolder: true,
        };

        // Send new folder message with updated metadata
        const caption = `__TCLOUD_V1__${JSON.stringify(updatedMetadata)}`;
        console.log('[FileManager] Creating new folder message with new name');
        const newMessage = await mtprotoService.sendMessage(chat.id, caption);
        
        // Update local state with new message ID
        const updatedFiles = files.map(f => {
          if (f.id === renameItem.id) {
            return {
              ...f,
              name: newName.trim(),
              telegramMessageId: newMessage.id,
              modifiedAt: Date.now(),
            };
          }
          return f;
        });

        setFiles(updatedFiles);
      } else {
        // For files, we need to re-upload with new name (Telegram doesn't support renaming files)
        alert('File renaming requires re-uploading. For now, only folder renaming is fully supported.');
        return;
      }

      setShowRenameDialog(false);
      setRenameItem(null);
      setNewName('');
      console.log('[FileManager] Rename successful');
    } catch (error) {
      console.error('[FileManager] Rename failed:', error);
      alert('Failed to rename: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

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

  const navigateToFolder = (folderName: string) => {
    setCurrentPath(currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`);
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/'));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    try {
      console.log('[FileManager] Creating folder:', newFolderName);
      
      // Create folder metadata
      const folderMetadata = {
        name: newFolderName.trim(),
        path: currentPath,
        size: 0,
        mimeType: 'folder',
        extension: '',
        createdAt: Date.now(),
        isFolder: true,
      };

      // Send folder metadata as a message
      const caption = `__TCLOUD_V1__${JSON.stringify(folderMetadata)}`;
      await mtprotoService.sendMessage(chat.id, caption);

      // Add folder to files list
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
      console.log('[FileManager] Folder created successfully');
    } catch (error) {
      console.error('[FileManager] Failed to create folder:', error);
      alert('Failed to create folder');
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/50 animate-pulse">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Loading Files...</h2>
          <p className="text-gray-400 text-sm">Reading chat history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{chat.title}</h1>
                <p className="text-xs text-gray-400">{currentPath}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm transition-all flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={() => setShowTransfers(!showTransfers)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm transition-all relative"
              >
                Transfers
                {transfers.filter(t => t.status === 'active').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-xs flex items-center justify-center">
                    {transfers.filter(t => t.status === 'active').length}
                  </span>
                )}
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 text-sm transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {currentPath !== '/' && (
              <button
                onClick={navigateUp}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm transition-all"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewFolderDialog(true)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm transition-all flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
            <label className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg hover:shadow-blue-500/50 rounded-xl text-white text-sm font-semibold cursor-pointer transition-all flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <input
                type="file"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
              Upload Files
            </label>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm transition-all flex items-center gap-2"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              {viewMode === 'grid' ? 'List' : 'Grid'}
            </button>
          </div>
        </div>
      </div>

      {/* Transfers Panel */}
      {showTransfers && (
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-3">Transfers</h3>
            {transfers.length === 0 ? (
              <p className="text-gray-400 text-sm">No transfers</p>
            ) : (
              <div className="space-y-2">
                {transfers.slice(0, 5).map(transfer => (
                  <div key={transfer.id} className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm truncate">{transfer.fileName}</span>
                      <span className={`text-xs ${
                        transfer.status === 'completed' ? 'text-green-400' :
                        transfer.status === 'error' ? 'text-red-400' :
                        'text-blue-400'
                      }`}>
                        {transfer.status}
                      </span>
                    </div>
                    {transfer.status === 'active' && (
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
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
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {folders.length === 0 && regularFiles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-gray-400">No files yet</p>
            <p className="text-gray-500 text-sm mt-1">Upload files to get started</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => navigateToFolder(folder.name)}
                onContextMenu={(e) => handleContextMenu(e, folder)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 cursor-pointer transition-all relative group"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setContextMenu({ item: folder, x: rect.right, y: rect.bottom });
                  }}
                  className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-white" />
                </button>
                <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
                  <Folder className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-white text-sm text-center truncate">{folder.name}</p>
              </div>
            ))}
            {regularFiles.map(file => {
              const Icon = getFileIconComponent(file.extension || '');
              return (
                <div
                  key={file.id}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-all group relative"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setContextMenu({ item: file, x: rect.right, y: rect.bottom });
                    }}
                    className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <MoreVertical className="w-4 h-4 text-white" />
                  </button>
                  <div className="w-12 h-12 mx-auto mb-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-white text-sm text-center truncate mb-1">{file.name}</p>
                  <p className="text-gray-500 text-xs text-center">{formatFileSize(file.size)}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    className="w-full mt-2 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 text-xs flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => navigateToFolder(folder.name)}
                onContextMenu={(e) => handleContextMenu(e, folder)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 cursor-pointer transition-all flex items-center gap-3 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
                  <Folder className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{folder.name}</p>
                  <p className="text-gray-500 text-xs">Folder</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setContextMenu({ item: folder, x: rect.left, y: rect.bottom });
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
            {regularFiles.map(file => {
              const Icon = getFileIconComponent(file.extension || '');
              return (
                <div
                  key={file.id}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{file.name}</p>
                    <p className="text-gray-500 text-xs">{formatFileSize(file.size)}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 text-xs flex items-center gap-1"
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
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 mb-4"
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
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-semibold transition-all"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

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
          className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-2 min-w-[160px]"
        >
          <button
            onClick={() => handleRename(contextMenu.item)}
            className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
          >
            <Edit2 className="w-4 h-4" />
            Rename
          </button>
          <button
            onClick={() => handleDelete(contextMenu.item)}
            className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && renameItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              Rename {renameItem.type === 'folder' ? 'Folder' : 'File'}
            </h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                } else if (e.key === 'Escape') {
                  setShowRenameDialog(false);
                  setRenameItem(null);
                  setNewName('');
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRenameDialog(false);
                  setRenameItem(null);
                  setNewName('');
                }}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-semibold transition-all"
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
