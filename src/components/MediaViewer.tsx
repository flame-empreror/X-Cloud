import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { FileItem } from '../types';
import { isImageFile, isVideoFile, isAudioFile, formatFileSize } from '../utils/fileUtils';
import { useAppStore } from '../store';
import { mtprotoService } from '../services/mtproto';

interface MediaViewerProps {
  file: FileItem | null;
  chatId: number;
  onClose: () => void;
  files: FileItem[];
  onNavigate: (file: FileItem) => void;
}

export default function MediaViewer({ file, chatId, onClose, files, onNavigate }: MediaViewerProps) {
  const [loading, setLoading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const { addTransfer, updateTransfer } = useAppStore();

  useEffect(() => {
    if (file && file.telegramMessageId) {
      loadMedia(file);
    }
    return () => {
      if (mediaUrl && mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
    };
  }, [file?.id]);

  const loadMedia = async (fileItem: FileItem) => {
    if (!fileItem.telegramMessageId) return;
    setLoading(true);
    setZoom(1);
    setRotation(0);
    
    try {
      const messages = await mtprotoService.getMessages(chatId, 100);
      const message = messages.find((m: any) => m.id === fileItem.telegramMessageId);
      
      if (!message || !message.media) {
        throw new Error('Media not found');
      }

      const blob = await mtprotoService.downloadMedia(message.media);
      const url = URL.createObjectURL(blob);
      setMediaUrl(url);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!file || !file.telegramMessageId) return;
    
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
      const messages = await mtprotoService.getMessages(chatId, 100);
      const message = messages.find((m: any) => m.id === file.telegramMessageId);
      
      if (!message || !message.media) {
        throw new Error('File not found');
      }

      const blob = await mtprotoService.downloadMedia(message.media);
      
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
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(11, 11, 15, 0.95)', backdropFilter: 'blur(20px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-medium truncate max-w-md" style={{ color: 'var(--text-primary)' }}>{file.name}</h3>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</span>
            </div>
            <div className="flex items-center gap-2">
              {isImageFile(file.extension || '') && (
                <>
                  <button
                    onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                    className="btn btn-ghost p-2"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                    className="btn btn-ghost p-2"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRotation(r => r + 90)}
                    className="btn btn-ghost p-2"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={handleDownload}
                className="btn btn-ghost p-2"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="btn btn-ghost p-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading media...</p>
              </div>
            ) : (
              <>
                {/* Navigation Arrows */}
                <button
                  onClick={navigatePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 btn btn-secondary p-3"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={navigateNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 btn btn-secondary p-3"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Image */}
                {isImageFile(file.extension || '') && mediaUrl && (
                  <motion.img
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={mediaUrl}
                    alt={file.name}
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease',
                    }}
                    className="max-w-[90%] max-h-[85vh] object-contain"
                  />
                )}

                {/* Video */}
                {isVideoFile(file.extension || '') && mediaUrl && (
                  <motion.video
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={mediaUrl}
                    controls
                    autoPlay
                    className="max-w-[90%] max-h-[85vh]"
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
                    <div className="w-40 h-40 rounded-3xl flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
                      <Volume2 className="w-16 h-16" style={{ color: 'var(--accent)' }} />
                    </div>
                    <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                    <audio src={mediaUrl} controls autoPlay className="w-80" />
                  </motion.div>
                )}

                {/* Unsupported */}
                {!isImageFile(file.extension || '') && !isVideoFile(file.extension || '') && !isAudioFile(file.extension || '') && (
                  <div className="text-center">
                    <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Preview not available for this file type</p>
                    <button
                      onClick={handleDownload}
                      className="btn btn-primary"
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
