import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { FileItem } from '../types';
import { isImageFile, isVideoFile, isAudioFile, formatFileSize } from '../utils/fileUtils';
import { useAppStore } from '../store';
import telegramService from '../services/telegram';

interface MediaViewerProps {
  file: FileItem | null;
  onClose: () => void;
  files: FileItem[];
  onNavigate: (file: FileItem) => void;
}

export default function MediaViewer({ file, onClose, files, onNavigate }: MediaViewerProps) {
  const [loading, setLoading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const { addTransfer, updateTransfer } = useAppStore();

  useEffect(() => {
    if (file && file.telegramFileId) {
      loadMedia(file);
    }
    return () => {
      if (mediaUrl && mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
    };
  }, [file?.id]);

  const loadMedia = async (fileItem: FileItem) => {
    if (!fileItem.telegramFileId) return;
    setLoading(true);
    setZoom(1);
    setRotation(0);
    
    try {
      const fileInfo = await telegramService.getFile(fileItem.telegramFileId);
      const url = telegramService.getFileDownloadUrl(fileInfo.file_path);
      setMediaUrl(url);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!file || !file.telegramFileId) return;
    
    const transferId = `dl_${Date.now()}`;
    addTransfer({
      id: transferId,
      fileName: file.name,
      type: 'download',
      progress: 0,
      status: 'active',
      size: file.size,
      transferred: 0,
      path: file.path,
    });

    try {
      const fileInfo = await telegramService.getFile(file.telegramFileId);
      const blob = await telegramService.downloadFile(
        fileInfo.file_path,
        (progress) => updateTransfer(transferId, { progress, transferred: Math.round(file.size * progress / 100) })
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

  const navigatePrev = () => {
    if (!file) return;
    const mediaFiles = files.filter(f => isImageFile(f.extension || '') || isVideoFile(f.extension || ''));
    const idx = mediaFiles.findIndex(f => f.id === file.id);
    if (idx > 0) onNavigate(mediaFiles[idx - 1]);
  };

  const navigateNext = () => {
    if (!file) return;
    const mediaFiles = files.filter(f => isImageFile(f.extension || '') || isVideoFile(f.extension || ''));
    const idx = mediaFiles.findIndex(f => f.id === file.id);
    if (idx < mediaFiles.length - 1) onNavigate(mediaFiles[idx + 1]);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') navigatePrev();
      if (e.key === 'ArrowRight') navigateNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [file, files]);

  return (
    <AnimatePresence>
      {file && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/30">
            <div className="flex items-center gap-4">
              <h3 className="text-white font-medium truncate max-w-sm">{file.name}</h3>
              <span className="text-slate-500 text-sm hidden sm:block">{formatFileSize(file.size)}</span>
            </div>
            <div className="flex items-center gap-1">
              {isImageFile(file.extension || '') && (
                <>
                  <ToolButton onClick={() => setZoom(z => Math.min(z + 0.25, 3))} title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                  </ToolButton>
                  <ToolButton onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                  </ToolButton>
                  <ToolButton onClick={() => setRotation(r => r + 90)} title="Rotate">
                    <RotateCw className="w-4 h-4" />
                  </ToolButton>
                </>
              )}
              <ToolButton onClick={handleDownload} title="Download">
                <Download className="w-4 h-4" />
              </ToolButton>
              <div className="w-px h-6 bg-white/[0.06] mx-1" />
              <ToolButton onClick={onClose} title="Close">
                <X className="w-4 h-4" />
              </ToolButton>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-[3px] border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Loading media...</p>
              </div>
            ) : (
              <>
                {/* Navigation Arrows */}
                <button
                  onClick={navigatePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-sm rounded-full text-white transition-all z-10 border border-white/[0.06]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={navigateNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-sm rounded-full text-white transition-all z-10 border border-white/[0.06]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Image */}
                {isImageFile(file.extension || '') && mediaUrl && (
                  <motion.img
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    src={mediaUrl}
                    alt={file.name}
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease',
                    }}
                    className="max-w-[90%] max-h-[85vh] object-contain rounded-lg"
                  />
                )}

                {/* Video */}
                {isVideoFile(file.extension || '') && mediaUrl && (
                  <motion.video
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    src={mediaUrl}
                    controls
                    autoPlay
                    className="max-w-[90%] max-h-[85vh] rounded-lg"
                  />
                )}

                {/* Audio */}
                {isAudioFile(file.extension || '') && mediaUrl && (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-8"
                  >
                    <div className="w-48 h-48 bg-gradient-to-br from-green-500 to-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-green-500/20">
                      <Volume2 className="w-20 h-20 text-white/90" />
                    </div>
                    <div className="text-center">
                      <p className="text-white text-lg font-medium">{file.name}</p>
                      <p className="text-slate-500 text-sm mt-1">{formatFileSize(file.size)}</p>
                    </div>
                    <audio src={mediaUrl} controls autoPlay className="w-80" />
                  </motion.div>
                )}

                {/* Unsupported */}
                {!isImageFile(file.extension || '') && !isVideoFile(file.extension || '') && !isAudioFile(file.extension || '') && (
                  <div className="text-center">
                    <p className="text-slate-400 mb-4">Preview not available for this file type</p>
                    <button
                      onClick={handleDownload}
                      className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-400 transition-colors font-medium"
                    >
                      Download to view
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToolButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
    >
      {children}
    </button>
  );
}
