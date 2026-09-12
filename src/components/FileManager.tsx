import { useState, useEffect, useRef } from 'react';
import { Upload, FolderPlus, Folder, Pin, PinOff, Download, FolderInput } from 'lucide-react';
import { mtprotoService } from '../services/mtproto';
import { FileItem, TransferItem, TelegramChat } from '../types';
import { formatFileSize, getFileIconComponent } from '../utils/fileUtils';
import { useAppStore } from '../store/index';

interface FileManagerProps {
  chat: TelegramChat;
  files: FileItem[];
  setFiles: (files: FileItem[]) => void;
  onLogout: () => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
}

export function FileManager({ chat, files, setFiles, currentPath, setCurrentPath }: FileManagerProps) {
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ item: FileItem; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [fileToMove, setFileToMove] = useState<FileItem | null>(null);
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

  const handleMove = async (destinationPath: string) => {
    if (!fileToMove) return;
    
    try {
      console.log('[FileManager] Moving file to:', destinationPath);
      
      // Get the message to update
      const messages = await mtprotoService.getMessages(chat.id, 100, chat.inputPeer);
      const message = messages.find((m: any) => m.id === fileToMove.telegramMessageId);
      
      if (!message) {
        console.error('[FileManager] Message not found for move');
        return;
      }

      // Extract current metadata
      const caption = message.message || message.text || '';
      if (!caption.startsWith('__TCLOUD_V1__')) {
        console.error('[FileManager] Invalid metadata format');
        return;
      }

      const jsonStr = caption.substring('__TCLOUD_V1__'.length);
      const metadata = JSON.parse(jsonStr);

      // Update the path in metadata
      metadata.path = destinationPath;
      metadata.modifiedAt = Date.now();

      // Create new caption with updated metadata
      const newCaption = `__TCLOUD_V1__${JSON.stringify(metadata)}`;

      console.log('[FileManager] Updating message caption...');
      
      // Update the message with new caption
      await mtprotoService.editMessageCaption(chat.inputPeer, message.id, newCaption);

      console.log('[FileManager] File moved successfully');

      // Reload the file list
      await loadChatHistory();

      // Close the dialog
      setShowMoveDialog(false);
      setFileToMove(null);
    } catch (error) {
      console.error('[FileManager] Failed to move file:', error);
    }
  };

  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    setCurrentPath(newPath);
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

  // Search filtering
  const filteredFolders = searchQuery
    ? folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : folders;
  
  const filteredFiles = searchQuery
    ? files.filter(f => 
        f.type === 'file' && 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : regularFiles;

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
      <div className="flex-1 flex items-center justify-center bg-base">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg flex items-center justify-center bg-elevated">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-accent" />
          </div>
          <p className="text-sm text-muted">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-base">
      {/* Header */}
      <header className="bg-surface border-b border-default px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">Files</h2>
            <p className="text-sm text-muted mt-1">Manage your cloud files</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="pl-10 pr-4 py-2 bg-elevated border border-default rounded-lg text-primary placeholder-gray-500 focus:outline-none focus:border-accent w-64"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary">
              <Upload className="w-4 h-4" /> Upload
            </button>
            <button onClick={() => setShowNewFolderDialog(true)} className="btn btn-secondary">
              <FolderPlus className="w-4 h-4" /> New Folder
            </button>
            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-surface border-b border-default px-6 py-2">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setCurrentPath('/')} className="text-muted hover:text-primary transition-colors">
            Home
          </button>
          {pathParts.map((part, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-muted">/</span>
              <button
                onClick={() => navigateToPath(index)}
                className="text-muted hover:text-primary transition-colors"
              >
                {part}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* File Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted">
              <p className="text-lg mb-2">
                {searchQuery ? 'No files found' : 'No files yet'}
              </p>
              <p className="text-sm">
                {searchQuery 
                  ? 'Try a different search term' 
                  : 'Upload files or create a folder to get started'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => navigateToFolder(folder.name)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ item: folder, x: e.clientX, y: e.clientY }); }}
                className="bg-surface border border-default rounded-lg p-4 cursor-pointer hover:bg-elevated hover:border-hover transition-colors group relative"
              >
                <div className="flex items-center justify-center mb-3">
                  <Folder className="w-12 h-12 text-accent" />
                </div>
                <p className="text-sm text-primary text-center truncate">{folder.name}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePinFolder(folder); }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {pinnedFolders.some(f => f.path === (folder.path === '/' ? `/${folder.name}` : `${folder.path}/${folder.name}`)) ? (
                    <PinOff className="w-4 h-4 text-accent" />
                  ) : (
                    <Pin className="w-4 h-4 text-muted hover:text-accent transition-colors" />
                  )}
                </button>
              </div>
            ))}
            {filteredFiles.map((file) => {
              const Icon = getFileIconComponent(file.extension || '');
              return (
                <div
                  key={file.id}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ item: file, x: e.clientX, y: e.clientY }); }}
                  className="bg-surface border border-default rounded-lg p-4 cursor-pointer hover:bg-elevated hover:border-hover transition-colors group relative"
                >
                  <div className="flex items-center justify-center mb-3">
                    <Icon className="w-12 h-12 text-accent-secondary" />
                  </div>
                  <p className="text-sm text-primary text-center truncate">{file.name}</p>
                  <p className="text-xs text-muted text-center mt-1">{formatFileSize(file.size)}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="w-4 h-4 text-muted hover:text-accent transition-colors" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }}
          className="bg-surface border border-default rounded-lg shadow-lg p-2 z-50"
        >
          {contextMenu.item.type === 'folder' && (
            <button
              onClick={() => { handlePinFolder(contextMenu.item); setContextMenu(null); }}
              className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-elevated rounded transition-colors flex items-center gap-2"
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
          {contextMenu.item.type === 'file' && (
            <>
              <button
                onClick={() => { handleDownload(contextMenu.item); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-elevated rounded transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                onClick={() => {
                  setFileToMove(contextMenu.item);
                  setShowMoveDialog(true);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-elevated rounded transition-colors flex items-center gap-2"
              >
                <FolderInput className="w-4 h-4" />
                Move to...
              </button>
            </>
          )}
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => { setShowNewFolderDialog(false); setNewFolderName(''); }}
        >
          <div 
            className="bg-surface border border-default rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-primary mb-4">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="input mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowNewFolderDialog(false); setNewFolderName(''); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newFolderName.trim()) {
                    const folder: FileItem = {
                      id: `folder-${Date.now()}`,
                      name: newFolderName.trim(),
                      path: currentPath,
                      size: 0,
                      type: 'folder',
                      mimeType: 'folder',
                      extension: '',
                      createdAt: Date.now(),
                      modifiedAt: Date.now(),
                    };
                    setFiles([...files, folder]);
                    setShowNewFolderDialog(false);
                    setNewFolderName('');
                  }
                }}
                className="btn btn-primary flex-1"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Dialog */}
      {showMoveDialog && fileToMove && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
 setShowMoveDialog(false); setFileToMove(null);
 }}
        >
          <div 
            className="bg-surface border border-default rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-primary mb-4">Move "{fileToMove.name}" to...</h3>
            <div className="space-y-2 mb-4">
              {/* Root option */}
              <button
                onClick={() => {
                  handleMove('/');
                }}
                className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-elevated rounded transition-colors flex items-center gap-2"
              >
                <Folder className="w-4 h-4" />
                Root (/)
              </button>
              {/* All folders */}
              {files.filter(f => f.type === 'folder').map((folder) => {
                const folderPath = folder.path === '/' ? `/${folder.name}` : `${folder.path}/${folder.name}`;
                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      handleMove(folderPath);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-elevated rounded transition-colors flex items-center gap-2"
                  >
                    <Folder className="w-4 h-4" />
                    {folderPath}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { setShowMoveDialog(false); setFileToMove(null); }}
              className="btn btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
