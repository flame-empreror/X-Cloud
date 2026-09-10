import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FolderPlus, Grid3X3, List, Search, MoreVertical,
  Download, Trash2, RefreshCw, Home, ChevronRight, Plus
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
            mimeType: file.type,
            extension: file.name.split('.').pop() || '',
            createdAt: Date.now(),
          })}`,
          (progress) => {
            updateTransfer(transferId, {
              progress,
              transferred: Math.round(file.size * progress / 100),
              speed: (file.size * progress / 100) / ((Date.now() / 1000) || 1),
            });
          }
        );

        const newFile: FileItem = {
          id: `${result.message_id}`,
          name: file.name,
          path: currentPath,
          size: file.size,
          type: 'file',
          mimeType: file.type,
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

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

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);

      updateTransfer(transferId, { status: 'completed', progress: 100 });
    } catch (error: any) {
      updateTransfer(transferId, { status: 'error', error: error.message });
    }
  };

  const breadcrumbs = currentPath === '/' ? ['Home'] : ['Home', ...currentPath.split('/').filter(Boolean)];

  return (
    <div className="flex-1 flex flex-col h-full" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {currentPath !== '/' && (
            <button
              onClick={navigateUp}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
              <button
                onClick={() => i === 0 ? setCurrentPath('/') : setCurrentPath('/' + breadcrumbs.slice(1, i + 1).join('/'))}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {crumb}
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50 w-48"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewFolder(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="New Folder"
          >
            <FolderPlus className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
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
            className="px-6 py-2 border-b border-white/5 overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-blue-400" />
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="Folder name..."
                className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">
                Create
              </button>
              <button onClick={() => setShowNewFolder(false)} className="px-3 py-1.5 text-slate-400 text-sm hover:text-white">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-blue-400 rounded-xl m-4"
          >
            <div className="text-center">
              <Upload className="w-12 h-12 text-blue-400 mx-auto mb-3 animate-bounce" />
              <p className="text-blue-400 font-medium">Drop files here to upload</p>
            </div>
          </motion.div>
        )}

        {displayFiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
              <Upload className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-slate-400 mb-2">
              {searchQuery ? 'No files match your search' : 'This folder is empty'}
            </p>
            <p className="text-slate-600 text-sm">
              {searchQuery ? 'Try a different search term' : 'Drag & drop files here or click to upload'}
            </p>
            {!searchQuery && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-4 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Upload Files
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
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 bg-slate-800 border border-white/10 rounded-xl shadow-2xl py-1 min-w-[160px]"
          >
            {contextMenu.file.type === 'file' && (
              <button
                onClick={() => { handleDownload(contextMenu.file); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            )}
            <button
              onClick={() => { handleDelete(contextMenu.file); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </motion.div>
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
      transition={{ delay: index * 0.02 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          onSelect();
        } else {
          onOpen();
        }
      }}
      className={`relative group p-3 rounded-xl cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-500/10 border border-blue-500/30'
          : 'bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${
          file.type === 'folder' ? 'bg-amber-500/10' : 'bg-white/5'
        }`}>
          <Icon className={`w-6 h-6 ${file.type === 'folder' ? 'text-amber-400' : iconColor}`} />
        </div>
        <p className="text-xs text-white font-medium truncate w-full">{file.name}</p>
        {file.type === 'file' && (
          <p className="text-[10px] text-slate-500 mt-0.5">{formatFileSize(file.size)}</p>
        )}
      </div>

      {/* Quick actions on hover */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
        {file.type === 'file' && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-1 bg-slate-700/80 rounded-md hover:bg-slate-600 transition-colors"
          >
            <Download className="w-3 h-3 text-white" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 bg-slate-700/80 rounded-md hover:bg-red-600 transition-colors"
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
      transition={{ delay: index * 0.02 }}
      whileHover={{ x: 2 }}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          onSelect();
        } else {
          onOpen();
        }
      }}
      className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-500/10 border border-blue-500/30'
          : 'hover:bg-white/5 border border-transparent'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
        file.type === 'folder' ? 'bg-amber-500/10' : 'bg-white/5'
      }`}>
        <Icon className={`w-5 h-5 ${file.type === 'folder' ? 'text-amber-400' : iconColor}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{file.name}</p>
      </div>

      <span className="text-xs text-slate-500 hidden sm:block">{formatFileSize(file.size)}</span>
      <span className="text-xs text-slate-500 hidden md:block">{formatDate(file.modifiedAt)}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {file.type === 'file' && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </motion.div>
  );
}
