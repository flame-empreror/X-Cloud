import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Volume2, VolumeX, Maximize, Play, Pause } from 'lucide-react';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { selectedChannel, addTransfer, updateTransfer } = useAppStore();

  useEffect(() => {
    if (file && file.telegramFileId) {
      loadMedia(file);
    }
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [file]);

  const loadMedia = async (fileItem: FileItem) => {
    if (!fileItem.telegramFileId) return;
    setLoading(true);
    
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
      a.click();
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
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <h3 className="text-white font-medium truncate max-w-md">{file.name}</h3>
              <span className="text-slate-500 text-sm">{formatFileSize(file.size)}</span>
            </div>
            <div className="flex items-center gap-2">
              {isImageFile(file.extension || '') && (
                <>
                  <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <button onClick={() => setRotation(r => r + 90)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                    <RotateCw className="w-5 h-5" />
                  </button>
                </>
              )}
              <button onClick={handleDownload} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-slate-400">Loading media...</p>
              </div>
            ) : (
              <>
                {/* Navigation Arrows */}
                <button
                  onClick={navigatePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={navigateNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Image */}
                {isImageFile(file.extension || '') && mediaUrl && (
                  <motion.img
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={mediaUrl}
                    alt={file.name}
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease',
                    }}
                    className="max-w-full max-h-full object-contain"
                  />
                )}

                {/* Video */}
                {isVideoFile(file.extension || '') && mediaUrl && (
                  <motion.video
                    key={file.id}
                    ref={videoRef}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={mediaUrl}
                    controls
                    autoPlay
                    className="max-w-full max-h-full"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                )}

                {/* Audio */}
                {isAudioFile(file.extension || '') && mediaUrl && (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <div className="w-40 h-40 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-green-500/20">
                      <Volume2 className="w-16 h-16 text-white" />
                    </div>
                    <p className="text-white text-lg font-medium">{file.name}</p>
                    <audio src={mediaUrl} controls autoPlay className="w-80" />
                  </motion.div>
                )}

                {/* Unsupported */}
                {!isImageFile(file.extension || '') && !isVideoFile(file.extension || '') && !isAudioFile(file.extension || '') && (
                  <div className="text-center">
                    <p className="text-slate-400 mb-4">Preview not available for this file type</p>
                    <button
                      onClick={handleDownload}
                      className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
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
