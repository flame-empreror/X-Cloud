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
    if (file && file.telegramMessageId) loadMedia(file);
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
      if (!message || !message.media) throw new Error('Media not found');
      const blob = await mtprotoService.downloadMedia(message);
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
      id: transferId, fileName: file.name, type: 'download',
      progress: 0, status: 'active', size: file.size, transferred: 0, path: file.path,
    });
    try {
      const messages = await mtprotoService.getMessages(chatId, 100);
      const message = messages.find((m: any) => m.id === file.telegramMessageId);
      if (!message || !message.media) throw new Error('File not found');
      const blob = await mtprotoService.downloadMedia(message);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(10, 10, 12, 0.92)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]" style={{ background: 'var(--bg-surface)' }}>
            <div className="flex items-center gap-4 min-w-0">
              <h3 className="text-sm font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</h3>
              <span className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</span>
            </div>
            <div className="flex items-center gap-1">
              {isImageFile(file.extension || '') && (
                <>
                  <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} className="p-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-colors" title="Zoom in">
                    <ZoomIn className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-colors" title="Zoom out">
                    <ZoomOut className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button onClick={() => setRotation(r => r + 90)} className="p-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-colors" title="Rotate">
                    <RotateCw className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </>
              )}
              <button onClick={handleDownload} className="p-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-colors" title="Download">
                <Download className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-colors" title="Close">
                <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading media...</p>
              </div>
            ) : (
              <>
                <button onClick={navigatePrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl hover:bg-[var(--bg-hover)] transition-colors z-10" style={{ background: 'rgba(17,17,26,0.7)' }}>
                  <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                </button>
                <button onClick={navigateNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl hover:bg-[var(--bg-hover)] transition-colors z-10" style={{ background: 'rgba(17,17,26,0.7)' }}>
                  <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                </button>

                {isImageFile(file.extension || '') && mediaUrl && (
                  <motion.img
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    src={mediaUrl}
                    alt={file.name}
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.25s ease',
                    }}
                    className="max-w-[92%] max-h-[85vh] object-contain rounded-xl"
                  />
                )}

                {isVideoFile(file.extension || '') && mediaUrl && (
                  <motion.video
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    src={mediaUrl}
                    controls
                    autoPlay
                    className="max-w-[92%] max-h-[85vh] rounded-xl"
                  />
                )}

                {isAudioFile(file.extension || '') && mediaUrl && (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <div className="w-36 h-36 rounded-3xl flex items-center justify-center shadow-xl" style={{ background: 'var(--bg-elevated)', boxShadow: '0 20px 50px rgba(99,102,241,0.15)' }}>
                      <Volume2 className="w-14 h-14" style={{ color: 'var(--accent)' }} />
                    </div>
                    <p className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                    <audio src={mediaUrl} controls autoPlay className="w-[360px]" />
                  </motion.div>
                )}

                {!isImageFile(file.extension || '') && !isVideoFile(file.extension || '') && !isAudioFile(file.extension || '') && (
                  <div className="text-center">
                    <p className="text-base font-medium mb-4" style={{ color: 'var(--text-muted)' }}>Preview not available for this file type</p>
                    <button onClick={handleDownload} className="btn btn-primary rounded-xl px-6 text-sm font-semibold shadow-md shadow-[var(--accent-muted)]">
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
