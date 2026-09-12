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
      console.log('[FileManager] ========== DELETE START ==========');
      console.log('[FileManager] Deleting', itemType, ':', item.name);
      console.log('[FileManager] Item ID:', item.id);
      console.log('[FileManager] Telegram Message ID:', item.telegramMessageId);
      console.log('[FileManager] Chat ID:', chat.id);
      
      // Delete the message from Telegram
      console.log('[FileManager] Calling deleteMessage...');
      console.log('[FileManager] Chat inputPeer:', chat.inputPeer);
      const deleteSuccess = await mtprotoService.deleteMessage(chat.inputPeer || chat.id, item.telegramMessageId);
      console.log('[FileManager] deleteMessage returned:', deleteSuccess);
      
      if (!deleteSuccess) {
        console.error('[FileManager] ❌ Delete returned false');
        alert('Delete operation failed - message was not deleted');
        return;
      }
      
      console.log('[FileManager] ✅ Delete call succeeded');
      
      // Wait a moment for Telegram to process the deletion
      console.log('[FileManager] Waiting 2 seconds for Telegram to process...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify deletion by checking if message still exists
      console.log('[FileManager] Verifying deletion...');
      const remainingMessages = await mtprotoService.getMessages(chat.id, 100, chat.inputPeer);
      console.log('[FileManager] Remaining messages count:', remainingMessages.length);
      
      const stillExists = remainingMessages.some((m: any) => m.id === item.telegramMessageId);
      console.log('[FileManager] Message still exists?', stillExists);
      
      if (stillExists) {
        console.error('[FileManager] ❌ Message still exists after delete!');
        console.error('[FileManager] Message ID:', item.telegramMessageId);
        alert(`Delete verification failed: Message ${item.telegramMessageId} still exists in Telegram`);
        return;
      }
      
      console.log('[FileManager] ✅ Message successfully deleted from Telegram');
      console.log('[FileManager] Updating local state...');
      
      // Remove from local state
      setFiles(files.filter(f => f.id !== item.id));
      setContextMenu(null);
      
      console.log('[FileManager] ========== DELETE COMPLETE ==========');
    } catch (error) {
      console.error('[FileManager] ========== DELETE FAILED ==========');
      console.error('[FileManager] Error:', error);
      console.error('[FileManager] Error message:', error instanceof Error ? error.message : 'Unknown');
      console.error('[FileManager] Error stack:', error instanceof Error ? error.stack : 'No stack');
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
      <div className="h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--accent-primary)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
            </svg>
          </div>
          <h2 className="text-[var(--text-primary)] text-base font-semibold mb-1">Loading Files</h2>
          <p className="text-[var(--text-tertiary)] text-sm">Reading chat history...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-base)]">
      {/* Header */}
      <header className="glass border-b border-[var(--border-default)]">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--accent-primary)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.75 3.99-1.73 6.65-2.87 7.95-3.44 3.79-1.58 4.57-1.85 5.08-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[var(--text-primary)]">{chat.title}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-[var(--accent-success)] rounded-full" />
                <p className="text-xs text-[var(--text-tertiary)]">{currentPath}</p>
              </div>
            </div>
          </motion.div>

            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
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
            </motion.div>

            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <button
                onClick={() => setShowSettings(true)}
                className="h-8 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium flex items-center gap-1.5 transition-all"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button
                onClick={() => setShowTransfers(!showTransfers)}
                className="h-8 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium relative flex items-center gap-1.5 transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Transfers</span>
                {transfers.filter(t => t.status === 'active').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-primary)] rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                    {transfers.filter(t => t.status === 'active').length}
                  </span>
                )}
              </button>
              <button
                onClick={onLogout}
                className="h-8 px-3 rounded-lg bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/20 hover:bg-[var(--accent-error)]/20 text-[var(--accent-error)] text-sm font-medium flex items-center gap-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </motion.div>
          </div>
        </header>

      {/* Toolbar */}
      <div className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <div className="max-w-[1600px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentPath !== '/' && (
              <button
                onClick={navigateUp}
                className="h-7 px-2.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewFolderDialog(true)}
              className="h-7 px-2.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <FolderPlus className="w-3 h-3" />
              <span className="hidden sm:inline">New Folder</span>
            </button>
            <label className="h-7 px-3 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all">
              <Upload className="w-3 h-3" />
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
              className="h-7 px-2.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              {viewMode === 'grid' ? <List className="w-3 h-3" /> : <Grid className="w-3 h-3" />}
              <span className="hidden sm:inline">{viewMode === 'grid' ? 'List' : 'Grid'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transfers Panel */}
      {showTransfers && (
        <div className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
          <div className="max-w-[1600px] mx-auto px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[var(--text-primary)] font-medium text-xs flex items-center gap-1.5">
                <Upload className="w-3 h-3 text-[var(--accent-primary)]" />
                Active Transfers
              </h3>
              <span className="px-2 py-0.5 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-full text-[var(--accent-primary)] text-[10px] font-medium">
                {transfers.filter(t => t.status === 'active').length} active
              </span>
            </div>
            {transfers.length === 0 ? (
              <div className="text-center py-4">
                <Upload className="w-6 h-6 text-[var(--text-disabled)] mx-auto mb-1.5" />
                <p className="text-[var(--text-tertiary)] text-[11px]">No active transfers</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {transfers.slice(0, 5).map((transfer) => (
                  <div key={transfer.id} className="bg-[var(--bg-surface)] rounded-md p-2.5 border border-[var(--border-default)]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[var(--text-primary)] text-[11px] font-medium truncate flex-1 mr-2">{transfer.fileName}</span>
                      <span className={`text-[10px] font-medium ${
                        transfer.status === 'completed' ? 'text-[var(--accent-success)]' :
                        transfer.status === 'error' ? 'text-[var(--accent-error)]' :
                        'text-[var(--accent-primary)]'
                      }`}>
                        {transfer.status}
                      </span>
                    </div>
                    {transfer.status === 'active' && (
                      <div className="w-full bg-[var(--bg-hover)] rounded-full h-1">
                        <div
                          className="bg-[var(--accent-primary)] h-1 rounded-full transition-all"
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
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          {folders.length === 0 && regularFiles.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center">
                <svg className="w-7 h-7 text-[var(--text-disabled)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-1">No files yet</h3>
              <p className="text-[var(--text-tertiary)] text-xs">Upload files to get started</p>
            </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {folders.map(folder => (
              <motion.div
                key={folder.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigateToFolder(folder.name)}
                onContextMenu={(e) => handleContextMenu(e, folder)}
                className="group relative bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] hover:border-[var(--border-hover)] rounded-lg p-3 cursor-pointer transition-all"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setContextMenu({ item: folder, x: rect.right, y: rect.bottom });
                  }}
                  className="absolute top-2 right-2 p-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-3 h-3 text-[var(--text-tertiary)]" />
                </button>
                <div className="w-9 h-9 mx-auto mb-2 rounded-md bg-[var(--accent-warning)]/10 border border-[var(--accent-warning)]/20 flex items-center justify-center">
                  <Folder className="w-4 h-4 text-[var(--accent-warning)]" />
                </div>
                <p className="text-[var(--text-primary)] text-[11px] text-center truncate font-medium">{folder.name}</p>
              </motion.div>
            ))}
            {regularFiles.map((file, index) => {
              const Icon = getFileIconComponent(file.extension || '');
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  className="group relative bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] hover:border-[var(--border-hover)] rounded-lg p-3 transition-all"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setContextMenu({ item: file, x: rect.right, y: rect.bottom });
                    }}
                    className="absolute top-2 right-2 p-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)] opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <MoreVertical className="w-3 h-3 text-[var(--text-tertiary)]" />
                  </button>
                  <div className="w-9 h-9 mx-auto mb-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[var(--accent-primary)]" />
                  </div>
                  <p className="text-[var(--text-primary)] text-[11px] text-center truncate mb-0.5 font-medium">{file.name}</p>
                  <p className="text-[var(--text-tertiary)] text-[10px] text-center">{formatFileSize(file.size)}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    className="w-full mt-2 px-2 py-1 rounded-md bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[10px] font-medium flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Download className="w-2.5 h-2.5" />
                    Download
                  </button>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-0.5">
            {folders.map(folder => (
              <motion.div
                key={folder.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigateToFolder(folder.name)}
                onContextMenu={(e) => handleContextMenu(e, folder)}
                className="group bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] hover:border-[var(--border-hover)] rounded-md p-2.5 cursor-pointer transition-all flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-md bg-[var(--accent-warning)]/10 border border-[var(--accent-warning)]/20 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-4 h-4 text-[var(--accent-warning)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-xs truncate font-medium">{folder.name}</p>
                  <p className="text-[var(--text-tertiary)] text-[10px]">Folder</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setContextMenu({ item: folder, x: rect.left, y: rect.bottom });
                  }}
                  className="p-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-3 h-3 text-[var(--text-tertiary)]" />
                </button>
              </motion.div>
            ))}
            {regularFiles.map((file, index) => {
              const Icon = getFileIconComponent(file.extension || '');
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  className="group bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] hover:border-[var(--border-hover)] rounded-md p-2.5 transition-all flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[var(--accent-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-xs truncate font-medium">{file.name}</p>
                    <p className="text-[var(--text-tertiary)] text-[10px]">{formatFileSize(file.size)}</p>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="px-2 py-1 rounded-md bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[10px] font-medium flex items-center gap-1 transition-all"
                    >
                      <Download className="w-2.5 h-2.5" />
                      Download
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setContextMenu({ item: file, x: rect.left, y: rect.bottom });
                      }}
                      className="p-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-all"
                    >
                      <MoreVertical className="w-3 h-3 text-[var(--text-tertiary)]" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-4 max-w-sm w-full mx-4 shadow-xl"
          >
            <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-3">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-2.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent-primary)] mb-3 text-xs"
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
                className="flex-1 px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)] text-xs font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="flex-1 px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] rounded-md text-white text-xs font-medium transition-all"
              >
                Create Folder
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 100,
          }}
          className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md shadow-lg py-1 min-w-[140px]"
        >
          <button
            onClick={() => handleRename(contextMenu.item)}
            className="w-full px-2.5 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2 text-xs font-medium"
          >
            <Edit2 className="w-3 h-3" />
            Rename
          </button>
          <button
            onClick={() => handleDelete(contextMenu.item)}
            className="w-full px-2.5 py-1.5 text-left text-[var(--accent-error)] hover:bg-[var(--accent-error)]/10 transition-colors flex items-center gap-2 text-xs font-medium"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </motion.div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && renameItem && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-4 max-w-sm w-full mx-4 shadow-xl"
          >
            <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-3">
              Rename {renameItem.type === 'folder' ? 'Folder' : 'File'}
            </h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              className="w-full px-2.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent-primary)] mb-3 text-xs"
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
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRenameDialog(false);
                  setRenameItem(null);
                  setNewName('');
                }}
                className="flex-1 px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)] text-xs font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="flex-1 px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] rounded-md text-white text-xs font-medium transition-all"
              >
                Rename
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
