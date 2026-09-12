import React from 'react';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatSpeed(bytesPerSecond: number): string {
  return formatFileSize(bytesPerSecond) + '/s';
}

export function isImageFile(extension: string): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'].includes(extension.toLowerCase());
}

export function isVideoFile(extension: string): boolean {
  return ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'].includes(extension.toLowerCase());
}

export function isAudioFile(extension: string): boolean {
  return ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a', 'opus'].includes(extension.toLowerCase());
}

export function getFileIcon(extension: string): string {
  const iconMap: Record<string, string> = {
    // Images
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
    // Videos
    mp4: '🎥', avi: '🎥', mov: '🎥', mkv: '🎥', webm: '🎥',
    // Audio
    mp3: '🎵', wav: '🎵', ogg: '🎵', flac: '🎵', m4a: '🎵',
    // Documents
    pdf: '📄', doc: '📄', docx: '📄', txt: '📄', rtf: '📄',
    // Spreadsheets
    xls: '📊', xlsx: '📊', csv: '📊',
    // Presentations
    ppt: '📽️', pptx: '📽️',
    // Archives
    zip: '🗜️', rar: '🗜️', '7z': '🗜️', tar: '🗜️', gz: '🗜️',
    // Code
    js: '💻', ts: '💻', py: '💻', java: '💻', cpp: '💻', c: '💻', html: '💻', css: '💻',
    // Default
    default: '📁',
  };

  return iconMap[extension.toLowerCase()] || iconMap.default;
}

export function getFileIconComponent(extension: string): React.FC<{ className?: string }> {
  // Return a simple SVG icon component based on file type
  const ext = extension.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return ImageIcon;
  }
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
    return VideoIcon;
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return AudioIcon;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return DocumentIcon;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return ArchiveIcon;
  }
  
  return FileIcon;
}

const ImageIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

const VideoIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

const AudioIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

const DocumentIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

const ArchiveIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}

const FileIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
