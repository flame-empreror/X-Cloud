import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { FileItem } from '../types';
import { isImageFile, isVideoFile, isAudioFile, formatFileSize } from '../utils/fileUtils';
import { mtprotoService } from '../services/mtproto';

interface MediaViewerProps {
  file: FileItem | null;
  chatId: number;
  inputPeer?: any;
  onClose: () => void;
  files: FileItem[];
  onNavigate: (file: FileItem) => void;
}

export default function MediaViewer({ file, chatId, inputPeer, onClose, files, onNavigate }: MediaViewerProps) {
  const [loading, setLoading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

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
      // Get the message to access its media
      const messages = await mtprotoService.getMessages(chatId, 100, inputPeer);
      const message = messages.find((m: any) => m.id === fileItem.telegramMessageId);
      
      if (!message || !message.media) {
        throw new Error('Media not found');
      }

      const blob = await mtprotoService.downloadMedia(message, (progress) => {
        console.log('[MediaViewer] Media load progress:', progress);
      });
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

    try {
      const messages = await mtprotoService.getMessages(chatId, 100, inputPeer);
      const message = messages.find((m: any) => m.id === file.telegramMessageId);
      
      if (!message || !message.media) {
        throw new Error('File not found');
      }

      const blob = await mtprotoService.downloadMedia(message, (progress) => {
        console.log('[MediaViewer] Download progress:', progress);
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download failed:', error);
      alert('Failed to download file');
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
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <h3 className="text-white font-medium truncate max-w-md">{file.name}</h3>
              <span className="text-gray-400 text-sm">{formatFileSize(file.size)}</span>
            </div>
            <div className="flex items-center gap-2">
              {isImageFile(file.extension || '') && (
                <>
                  <button
                    onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setRotation(r => r + 90)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={handleDownload}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-gray-400">Loading media...</p>
              </div>
            ) : (
              <>
                {/* Navigation Arrows */}
                <button
                  onClick={navigatePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={navigateNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
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
                    <div className="w-40 h-40 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl">
                      <Volume2 className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-white text-lg font-medium">{file.name}</p>
                    <audio src={mediaUrl} controls autoPlay className="w-80" />
                  </motion.div>
                )}

                {/* Unsupported */}
                {!isImageFile(file.extension || '') && !isVideoFile(file.extension || '') && !isAudioFile(file.extension || '') && (
                  <div className="text-center">
                    <p className="text-gray-400 mb-4">Preview not available for this file type</p>
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
