import { useState, useEffect, useRef } from 'react';
import { Upload, FolderPlus, Folder, Pin, PinOff, Download, FolderInput, ImageIcon, FileText, Music, Video, Play } from 'lucide-react';
import { mtprotoService } from '../services/mtproto';
import { FileItem, TransferItem, TelegramChat } from '../types';
import { formatFileSize, getFileIconComponent, isImageFile, isVideoFile, isAudioFile } from '../utils/fileUtils';
import { useAppStore } from '../store/index';

interface FileManagerProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  chat: TelegramChat;
  files: FileItem[];
  setFiles: (files: FileItem[]) => void;
  onLogout: () => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
  onPreviewMedia?: (file: FileItem) => void;
}

export function FileManager({ chat, files, setFiles, currentPath, setCurrentPath, sidebarOpen, onToggleSidebar, onPreviewMedia }: FileManagerProps) {
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
            loadedFiles.push({
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
            });
          } catch (e) { /* skip bad messages */ }
        }
      }
      setFiles(loadedFiles);
    } catch (err) { console.error('Failed to load chat history:', err); }
    finally { setIsLoadingHistory(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const transferId = `upload-${Date.now()}-${i}`;
      const abortController = new AbortController();
      addTransfer({ id: transferId, fileName: file.name, type: 'upload', progress: 0, status: 'active', size: file.size, transferred: 0, path: currentPath, abortController });
      try {
        const metadata = { name: file.name, path: currentPath, size: file.size, mimeType: file.type, extension: file.name.split('.').pop() || '', createdAt: Date.now(), isFolder: false };
        const caption = `__TCLOUD_V1__${JSON.stringify(metadata)}`;
        await mtprotoService.sendFile(chat.id, file, caption, (p) => updateTransfer(transferId, { progress: p, transferred: Math.round(file.size * p / 100) }), abortController.signal);
        updateTransfer(transferId, { status: 'completed', progress: 100 });
        await loadChatHistory();
      } catch (err: any) {
        if (err.name === 'AbortError') updateTransfer(transferId, { status: 'cancelled' });
        else { console.error('Upload failed:', err); updateTransfer(transferId, { status: 'error', error: 'Upload failed' }); }
      }
    }
    e.target.value = '';
  };

  const handleDownload = async (file: FileItem) => {
    if (!file.telegramMessageId) return;
    const transferId = `download-${Date.now()}`;
    const abortController = new AbortController();
    addTransfer({ id: transferId, fileName: file.name, type: 'download', progress: 0, status: 'active', size: file.size, transferred: 0, path: file.path, abortController });
    try {
      const messages = await mtprotoService.getMessages(chat.id, 100, chat.inputPeer);
      const message = messages.find((m: any) => m.id === file.telegramMessageId);
      if (!message || !message.media) throw new Error('Message not found');
      const blob = await mtprotoService.downloadMedia(message, (p) => updateTransfer(transferId, { progress: p, transferred: Math.round(file.size * p / 100) }), abortController.signal);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      updateTransfer(transferId, { status: 'completed', progress: 100 });
    } catch (err: any) {
      if (err.name === 'AbortError') updateTransfer(transferId, { status: 'cancelled' });
      else { console.error('Download failed:', err); updateTransfer(transferId, { status: 'error', error: 'Download failed' }); }
    }
  };

  const handlePinFolder = (folder: FileItem) => {
    const folderPath = folder.path === '/' ? `/${folder.name}` : `${folder.path}/${folder.name}`;
    const isPinned = pinnedFolders.some(f => f.path === folderPath);
    if (isPinned) unpinFolder(folderPath);
    else pinFolder(folderPath, folder.name);
  };

  const handleMove = async (destPath: string) => {
    if (!fileToMove) return;
    try {
      const messages = await mtprotoService.getMessages(chat.id, 100, chat.inputPeer);
      const message = messages.find((m: any) => m.id === fileToMove.telegramMessageId);
      if (!message) return;
      const caption = message.message || message.text || '';
      if (!caption.startsWith('__TCLOUD_V1__')) return;
      const metadata = JSON.parse(caption.substring('__TCLOUD_V1__'.length));
      metadata.path = destPath; metadata.modifiedAt = Date.now();
      await mtprotoService.editMessageCaption(chat.inputPeer, message.id, `__TCLOUD_V1__${JSON.stringify(metadata)}`);
      await loadChatHistory();
      setShowMoveDialog(false); setFileToMove(null);
    } catch (err) { console.error('Move failed:', err); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const metadata = { name: newFolderName.trim(), path: currentPath, size: 0, mimeType: 'folder', extension: '', createdAt: Date.now(), isFolder: true };
      await mtprotoService.sendMessage(chat.id, `__TCLOUD_V1__${JSON.stringify(metadata)}`);
      setFiles([...files, { id: `folder-${Date.now()}`, name: newFolderName.trim(), path: currentPath, size: 0, type: 'folder', mimeType: 'folder', extension: '', createdAt: Date.now(), modifiedAt: Date.now() }]);
      setShowNewFolderDialog(false); setNewFolderName('');
      await loadChatHistory();
    } catch (err) { console.error('Create folder failed:', err); }
  };

  const navigateToFolder = (folderName: string) => setCurrentPath(currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`);
  const navigateUp = () => { if (currentPath === '/') return; const parts = currentPath.split('/').filter(Boolean); parts.pop(); setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/')); };
  const navigateToPath = (index: number) => { if (index === -1) { setCurrentPath('/'); return; } const parts = currentPath.split('/').filter(Boolean); setCurrentPath('/' + parts.slice(0, index + 1).join('/')); };

  const currentFiles = files.filter(f => f.path === currentPath);
  const folders = currentFiles.filter(f => f.type === 'folder');
  const regularFiles = currentFiles.filter(f => f.type === 'file');
  const pathParts = currentPath.split('/').filter(Boolean);

  const filteredFolders = searchQuery ? folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())) : folders;
  const filteredFiles = searchQuery ? files.filter(f => f.type === 'file' && f.name.toLowerCase().includes(searchQuery.toLowerCase())) : regularFiles;

  const openPreview = (file: FileItem) => {
    if (isImageFile(file.extension || '') || isVideoFile(file.extension || '') || isAudioFile(file.extension || '')) {
      onPreviewMedia?.(file);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null);
    };
    if (contextMenu) { document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }
  }, [contextMenu]);

  if (isLoadingHistory) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: 'var(--bg-elevated)' }}>
            <Folder className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ background: 'var(--bg-base)' }}>
      {/* Clean header */}
      <header className="px-7 py-5 border-b border-[var(--border-subtle)]" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 className="h2 truncate mb-0.5" style={{ color: 'var(--text-primary)' }}>Files</h2>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-muted)' }}>{chat.title || 'Cloud Storage'} · {currentPath === '/' ? 'Root' : currentPath}</p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="relative hidden sm:block">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="input w-56 text-sm rounded-full pl-10 py-2.5 bg-[var(--bg-elevated)] border-[var(--border-default)] focus:border-[var(--accent)]" />
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary rounded-full px-5 py-2.5 text-xs font-extrabold shadow-md shadow-[var(--accent-glow)] tracking-wide uppercase">
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
            <button onClick={() => setShowNewFolderDialog(true)} className="btn btn-secondary rounded-full px-5 py-2.5 text-xs font-extrabold tracking-wide uppercase">
              <FolderPlus className="w-3.5 h-3.5" /> Folder
            </button>
            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 mt-4 text-xs font-semibold overflow-hidden">
          <button onClick={() => setCurrentPath('/')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap">Root</button>
          {pathParts.map((part, i) => (
            <div key={i} className="flex items-center gap-1.5 min-w-0">
              <span className="text-[var(--text-disabled)]">/</span>
              <button onClick={() => navigateToPath(i)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors truncate max-w-[140px] whitespace-nowrap">{part}</button>
            </div>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-auto px-7 py-7">
        {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <Folder className="w-9 h-9" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="h3 mb-2" style={{ color: 'var(--text-primary)' }}>{searchQuery ? 'No results' : 'Empty folder'}</h3>
            <p className="text-sm font-medium max-w-xs" style={{ color: 'var(--text-muted)' }}>{searchQuery ? 'Try another search term' : 'Upload files or create a folder to get started'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {filteredFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigateToFolder(folder.name)}
                onContextMenu={e => { e.preventDefault(); setContextMenu({ item: folder, x: e.clientX, y: e.clientY }); }}
                className="surface-card rounded-[24px] p-6 text-center hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden hover:border-[rgba(99,102,241,0.3)]"
              >
                <div className="flex items-center justify-center mb-4">
                  <div className="w-14 h-14 rounded-[20px] flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
                    <Folder className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                  </div>
                </div>
                <p className="text-sm font-extrabold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{folder.name}</p>
                <button
                  onClick={e => { e.stopPropagation(); handlePinFolder(folder); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl hover:bg-[var(--bg-hover)]"
                >
                  {pinnedFolders.some(f => f.path === (folder.path === '/' ? `/${folder.name}` : `${folder.path}/${folder.name}`)) ? <PinOff className="w-4 h-4" style={{ color: 'var(--accent)' }} /> : <Pin className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                </button>
              </button>
            ))}
            {filteredFiles.map((file) => {
              const Icon = getFileIconComponent(file.extension || '');
              const canPreview = isImageFile(file.extension || '') || isVideoFile(file.extension || '') || isAudioFile(file.extension || '');
              return (
                <button
                  key={file.id}
                  onClick={() => canPreview ? openPreview(file) : handleDownload(file)}
                  onContextMenu={e => { e.preventDefault(); setContextMenu({ item: file, x: e.clientX, y: e.clientY }); }}
                  className="surface-card rounded-[24px] p-6 text-center hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden hover:border-[rgba(99,102,241,0.25)] text-left"
                >
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-14 h-14 rounded-[20px] flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                      <Icon className="w-7 h-7" style={{ color: 'var(--accent-secondary)' }} />
                    </div>
                  </div>
                  <p className="text-sm font-extrabold truncate mb-1 leading-tight" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</p>
                  {canPreview && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-[var(--bg-hover)]">
                      <Play className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div ref={menuRef} style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }} className="surface-card rounded-2xl shadow-2xl shadow-black/50 p-1.5 z-50 min-w-[170px] border border-[var(--border-default)]">
          {contextMenu.item.type === 'folder' ? (
            <button onClick={() => { handlePinFolder(contextMenu.item); setContextMenu(null); }} className="w-full px-3.5 py-2.5 text-left text-xs font-bold rounded-xl hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
              {pinnedFolders.some(f => f.path === (contextMenu.item.path === '/' ? `/${contextMenu.item.name}` : `${contextMenu.item.path}/${contextMenu.item.name}`)) ? <><PinOff className="w-4 h-4" /> Unpin</> : <><Pin className="w-4 h-4" /> Pin to Sidebar</>}
            </button>
          ) : (
            <>
              <button onClick={() => { const canP = isImageFile(contextMenu.item.extension || '') || isVideoFile(contextMenu.item.extension || '') || isAudioFile(contextMenu.item.extension || ''); if (canP) onPreviewMedia?.(contextMenu.item); else handleDownload(contextMenu.item); setContextMenu(null); }} className="w-full px-3.5 py-2.5 text-left text-xs font-bold rounded-xl hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={() => { setFileToMove(contextMenu.item); setShowMoveDialog(true); setContextMenu(null); }} className="w-full px-3.5 py-2.5 text-left text-xs font-bold rounded-xl hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
                <FolderInput className="w-4 h-4" /> Move to...
              </button>
            </>
          )}
        </div>
      )}

      {/* New Folder */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10,10,17,0.6)' }} onClick={() => { setShowNewFolderDialog(false); setNewFolderName(''); }}>
          <div className="surface-card rounded-[28px] p-8 max-w-md w-full mx-4 shadow-2xl shadow-black/30" onClick={e => e.stopPropagation()}>
            <h3 className="h2 mb-6" style={{ color: 'var(--text-primary)' }}>New Folder</h3>
            <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name" className="input rounded-2xl py-3.5 mb-6 text-base" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => { setShowNewFolderDialog(false); setNewFolderName(''); }} className="btn btn-secondary flex-1 rounded-2xl py-3 text-sm font-extrabold">Cancel</button>
              <button onClick={handleCreateFolder} className="btn btn-primary flex-1 rounded-2xl py-3 text-sm font-extrabold shadow-lg shadow-[var(--accent-glow)]">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Move Dialog */}
      {showMoveDialog && fileToMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10,10,17,0.6)' }} onClick={() => { setShowMoveDialog(false); setFileToMove(null); }}>
          <div className="surface-card rounded-[28px] p-6 max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl shadow-black/30" onClick={e => e.stopPropagation()}>
            <h3 className="h3 mb-5" style={{ color: 'var(--text-primary)' }}>Move "{fileToMove.name}"</h3>
            <div className="space-y-1 mb-6">
              <button onClick={() => handleMove('/')} className="w-full px-4 py-3 text-left text-sm font-bold rounded-2xl hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-3" style={{ color: 'var(--text-primary)' }}><Folder className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Root (/)</button>
              {files.filter(f => f.type === 'folder').map(folder => {
                const folderPath = folder.path === '/' ? `/${folder.name}` : `${folder.path}/${folder.name}`;
                return <button key={folder.id} onClick={() => handleMove(folderPath)} className="w-full px-4 py-3 text-left text-sm font-bold rounded-2xl hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-3" style={{ color: 'var(--text-primary)' }}><Folder className="w-4 h-4" style={{ color: 'var(--accent)' }} /> {folderPath}</button>;
              })}
            </div>
            <button onClick={() => { setShowMoveDialog(false); setFileToMove(null); }} className="btn btn-secondary w-full rounded-2xl py-3 text-sm font-extrabold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
