import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FolderPlus, Grid3X3, List, Search, MoreVertical,
  Download, Trash2, Home, ChevronRight, Plus, Folder,
  FileText, Image, Film, Music, Archive, Code, File, Eye
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '../store';
import { getFileIcon, getFileIconColor, formatFileSize, formatDate, isImageFile, isVideoFile } from '../utils/fileUtils';
import { FileItem } from '../types';
import telegramService from '../services/telegram';
import { generateId } from '../utils/fileUtils';

interface FileManagerProps {
  onFilePreview: (file: FileItem) => void;
}

export default function FileManager({ onFilePreview }: FileManagerProps) {
  const {
    files, setFiles, currentPath, setCurrentPath, selectedChannel,
    viewMode, setViewMode, selectedFiles, toggleFileSelection, clearSelection,
    addTransfer, updateTransfer, addFile, removeFile, settings,
  } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ file: FileItem; x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Get files in current path
  const currentFiles = files.filter(f => {
    const matchesPath = f.path === currentPath || f.path === currentPath.replace(/\/$/, '');
    const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPath && matchesSearch;
  });

  // Get virtual folders
  const folders = getVirtualFolders(files, currentPath);
  const displayFiles = [...folders, ...currentFiles.filter(f => f.type === 'file')];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedChannel) return;
    setIsDragging(false);
    
    for (const file of acceptedFiles) {
      const transferId = generateId();
      addTransfer({
        id: transferId,
        fileName: file.name,
        type: 'upload',
        progress: 0,
        status: 'active',
        size: file.size,
        transferred: 0,
        path: currentPath,
      });

      try {
        const result = await telegramService.sendDocument(
          selectedChannel.id,
          file,
          `__TCLOUD_V1__${JSON.stringify({
            name: file.name,
            path: currentPath,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            extension: file.name.split('.').pop() || '',
            createdAt: Date.now(),
          })}`,
          (progress) => {
            updateTransfer(transferId, {
              progress,
              transferred: Math.round(file.size * progress / 100),
              speed: file.size * progress / 100 / Math.max(1, Date.now() / 1000),
            });
          }
        );

        const newFile: FileItem = {
          id: `${result.message_id}`,
          name: file.name,
          path: currentPath,
          size: file.size,
          type: 'file',
          mimeType: file.type || 'application/octet-stream',
          extension: file.name.split('.').pop() || '',
          telegramMessageId: result.message_id,
          telegramFileId: result.document?.file_id,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };

        addFile(newFile);
        updateTransfer(transferId, { status: 'completed', progress: 100 });
      } catch (error: any) {
        updateTransfer(transferId, { status: 'error', error: error.message });
      }
    }
  }, [selectedChannel, currentPath]);

  // IMPORTANT: noClick prevents the file picker from opening on click
  const { getRootProps, getInputProps, open } = useDropzone({ 
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    setCurrentPath(newPath);
    clearSelection();
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/'));
    clearSelection();
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedChannel) return;
    
    try {
      const caption = `__TCLOUD_V1__${JSON.stringify({
        name: newFolderName,
        path: currentPath,
        size: 0,
        mimeType: 'folder',
        extension: '',
        createdAt: Date.now(),
        isFolder: true,
      })}`;
      
      await telegramService.sendMessage(selectedChannel.id, caption);
      
      const folder: FileItem = {
        id: `folder_${newFolderName}_${Date.now()}`,
        name: newFolderName,
        path: currentPath,
        size: 0,
        type: 'folder',
        mimeType: 'folder',
        extension: '',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };
      
      addFile(folder);
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!selectedChannel || !file.telegramMessageId) return;
    
    try {
      await telegramService.deleteMessage(selectedChannel.id, file.telegramMessageId);
      removeFile(file.id);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
    setContextMenu(null);
  };

  const handleDownload = async (file: FileItem) => {
    if (!file.telegramFileId) return;
    
    const transferId = generateId();
    addTransfer({
      id: transferId,
      fileName: file.name,
      type: 'download',
      progress: 0,
      status: 'active',
      size: file.size,
      transferred: 0,
      path: currentPath,
    });

    try {
      const fileInfo = await telegramService.getFile(file.telegramFileId);
      const blob = await telegramService.downloadFile(
        fileInfo.file_path,
        (progress, speed) => {
          updateTransfer(transferId, {
            progress,
            speed,
            transferred: Math.round(file.size * progress / 100),
          });
        }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      updateTransfer(transferId, { status: 'completed', progress: 100 });
    } catch (error: any) {
      updateTransfer(transferId, { status: 'error', error: error.message });
    }
  };

  const breadcrumbs = currentPath === '/' ? ['Home'] : ['Home', ...currentPath.split('/').filter(Boolean)];

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Hidden file input - only triggered by the Upload button */}
      <input {...getInputProps()} />
      
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-md flex items-center justify-center border-2 border-dashed border-blue-400/50 rounded-2xl m-4"
          >
            <div className="text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              </motion.div>
              <p className="text-white font-semibold text-lg">Drop files to upload</p>
              <p className="text-blue-300/70 text-sm mt-1">Files will be uploaded to {currentPath}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {currentPath !== '/' && (
            <button
              onClick={navigateUp}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
              <button
                onClick={() => i === 0 ? setCurrentPath('/') : setCurrentPath('/' + breadcrumbs.slice(1, i + 1).join('/'))}
                className="text-sm text-slate-400 hover:text-white transition-colors px-1 py-0.5 rounded hover:bg-white/[0.04]"
              >
                {crumb}
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06] w-44 transition-all"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewFolder(true)}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
            title="New Folder"
          >
            <FolderPlus className="w-[18px] h-[18px]" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
          >
            {viewMode === 'grid' ? <List className="w-[18px] h-[18px]" /> : <Grid3X3 className="w-[18px] h-[18px]" />}
          </motion.button>

          {/* Upload Button - This is the ONLY way to open file picker */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={open}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </motion.button>
        </div>
      </div>

      {/* New Folder Input */}
      <AnimatePresence>
        {showNewFolder && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/[0.06]"
          >
            <div className="flex items-center gap-2 px-6 py-3">
              <FolderPlus className="w-4 h-4 text-blue-400" />
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setShowNewFolder(false);
                }}
                placeholder="Folder name..."
                className="flex-1 px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/40"
              />
              <button onClick={handleCreateFolder} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-400 transition-colors font-medium">
                Create
              </button>
              <button onClick={() => setShowNewFolder(false)} className="px-4 py-2 text-slate-400 text-sm hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Area - with drag handlers */}
      <div 
        className="flex-1 overflow-y-auto p-6"
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { 
          e.preventDefault();
          // Only set false if leaving the container
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
      >
        {displayFiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl flex items-center justify-center border border-white/[0.06]">
                <Upload className="w-10 h-10 text-slate-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-white font-semibold text-lg mb-1">
              {searchQuery ? 'No results found' : 'Start uploading files'}
            </h3>
            <p className="text-slate-500 text-sm max-w-xs">
              {searchQuery ? 'Try a different search term' : 'Drag & drop files here or click the Upload button'}
            </p>
            {!searchQuery && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={open}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all font-medium flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Upload Files
              </motion.button>
            )}
          </motion.div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {displayFiles.map((file, i) => (
              <FileGridItem
                key={file.id}
                file={file}
                index={i}
                isSelected={selectedFiles.includes(file.id)}
                onSelect={() => toggleFileSelection(file.id)}
                onOpen={() => file.type === 'folder' ? navigateToFolder(file.name) : onFilePreview(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ file, x: e.clientX, y: e.clientY });
                }}
                onDownload={() => handleDownload(file)}
                onDelete={() => handleDelete(file)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {/* List header */}
            <div className="flex items-center gap-3 px-4 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
              <span className="w-9" />
              <span className="flex-1">Name</span>
              <span className="hidden sm:block w-20">Size</span>
              <span className="hidden md:block w-32">Modified</span>
              <span className="w-24" />
            </div>
            {displayFiles.map((file, i) => (
              <FileListItem
                key={file.id}
                file={file}
                index={i}
                isSelected={selectedFiles.includes(file.id)}
                onSelect={() => toggleFileSelection(file.id)}
                onOpen={() => file.type === 'folder' ? navigateToFolder(file.name) : onFilePreview(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ file, x: e.clientX, y: e.clientY });
                }}
                onDownload={() => handleDownload(file)}
                onDelete={() => handleDelete(file)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -5 }}
              style={{ top: contextMenu.y, left: contextMenu.x }}
              className="fixed z-50 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-2 min-w-[180px] overflow-hidden"
            >
              {contextMenu.file.type === 'file' && (
                <button
                  onClick={() => { handleDownload(contextMenu.file); setContextMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/[0.06] transition-all"
                >
                  <Download className="w-4 h-4 text-blue-400" /> Download
                </button>
              )}
              {contextMenu.file.type === 'file' && (isImageFile(contextMenu.file.extension || '') || isVideoFile(contextMenu.file.extension || '')) && (
                <button
                  onClick={() => { onFilePreview(contextMenu.file); setContextMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/[0.06] transition-all"
                >
                  <Eye className="w-4 h-4 text-purple-400" /> Preview
                </button>
              )}
              <div className="my-1 border-t border-white/[0.06]" />
              <button
                onClick={() => { handleDelete(contextMenu.file); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper to get virtual folders from file paths
function getVirtualFolders(files: FileItem[], currentPath: string): FileItem[] {
  const normalizedPath = currentPath === '/' ? '' : currentPath;
  const folderSet = new Set<string>();
  const folders: FileItem[] = [];

  for (const file of files) {
    if (file.type === 'folder' && (file.path === currentPath || file.path === normalizedPath)) {
      if (!folderSet.has(file.name)) {
        folderSet.add(file.name);
        folders.push(file);
      }
      continue;
    }

    const filePath = file.path;
    let relativePath: string;
    
    if (currentPath === '/') {
      relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    } else {
      const prefix = currentPath.endsWith('/') ? currentPath : currentPath + '/';
      if (!filePath.startsWith(prefix)) continue;
      relativePath = filePath.slice(prefix.length);
    }

    const parts = relativePath.split('/').filter(Boolean);
    if (parts.length > 1 && !folderSet.has(parts[0])) {
      folderSet.add(parts[0]);
      folders.push({
        id: `vfolder_${parts[0]}`,
        name: parts[0],
        path: currentPath,
        size: 0,
        type: 'folder',
        mimeType: 'folder',
        createdAt: file.createdAt,
        modifiedAt: file.modifiedAt,
      });
    }
  }

  return folders;
}

// Grid Item Component
function FileGridItem({ file, index, isSelected, onSelect, onOpen, onContextMenu, onDownload, onDelete }: {
  file: FileItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const Icon = getFileIcon(file.extension || '', file.type);
  const iconColor = getFileIconColor(file.extension || '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      whileHover={{ y: -2 }}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onSelect();
        } else {
          onOpen();
        }
      }}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
      className={`relative group p-4 rounded-2xl cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-blue-500/10 border border-blue-500/30 shadow-lg shadow-blue-500/5'
          : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] hover:shadow-lg hover:shadow-black/20'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${
          file.type === 'folder' 
            ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20' 
            : 'bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06]'
        }`}>
          <Icon className={`w-7 h-7 ${file.type === 'folder' ? 'text-amber-400' : iconColor}`} />
        </div>
        <p className="text-xs text-white font-medium truncate w-full leading-tight">{file.name}</p>
        {file.type === 'file' && (
          <p className="text-[10px] text-slate-500 mt-1">{formatFileSize(file.size)}</p>
        )}
        {file.type === 'folder' && (
          <p className="text-[10px] text-slate-500 mt-1">Folder</p>
        )}
      </div>

      {/* Quick actions on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {file.type === 'file' && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-1.5 bg-slate-800/90 backdrop-blur-sm rounded-lg hover:bg-blue-500/20 transition-colors border border-white/[0.06]"
          >
            <Download className="w-3 h-3 text-white" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 bg-slate-800/90 backdrop-blur-sm rounded-lg hover:bg-red-500/20 transition-colors border border-white/[0.06]"
        >
          <Trash2 className="w-3 h-3 text-white" />
        </button>
      </div>
    </motion.div>
  );
}

// List Item Component
function FileListItem({ file, index, isSelected, onSelect, onOpen, onContextMenu, onDownload, onDelete }: {
  file: FileItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const Icon = getFileIcon(file.extension || '', file.type);
  const iconColor = getFileIconColor(file.extension || '');

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onSelect();
        } else {
          onOpen();
        }
      }}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-blue-500/10 border border-blue-500/30'
          : 'hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06]'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        file.type === 'folder' 
          ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20' 
          : 'bg-white/[0.04] border border-white/[0.06]'
      }`}>
        <Icon className={`w-5 h-5 ${file.type === 'folder' ? 'text-amber-400' : iconColor}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{file.name}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {file.type === 'folder' ? 'Folder' : formatFileSize(file.size)}
        </p>
      </div>

      <span className="text-xs text-slate-500 hidden sm:block w-20 text-right">{formatFileSize(file.size)}</span>
      <span className="text-xs text-slate-500 hidden md:block w-32 text-right">{formatDate(file.modifiedAt)}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-24 justify-end">
        {file.type === 'file' && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400 hover:text-blue-400" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
          className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </motion.div>
  );
}
