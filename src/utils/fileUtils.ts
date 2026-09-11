import {
  File, FileText, FileImage, FileVideo, FileAudio, FileArchive,
  FileCode, FileSpreadsheet, Presentation, FileJson,
  Folder, Globe, HardDrive, Package, Terminal, Database
} from 'lucide-react';

export function getFileIcon(extension: string, type?: string): React.ComponentType<any> {
  const ext = extension.toLowerCase();
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'].includes(ext)) return FileImage;
  
  // Videos
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'].includes(ext)) return FileVideo;
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a', 'opus'].includes(ext)) return FileAudio;
  
  // Documents
  if (['pdf'].includes(ext)) return FileText;
  if (['doc', 'docx', 'odt', 'rtf', 'tex'].includes(ext)) return FileText;
  
  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'ods', 'tsv'].includes(ext)) return FileSpreadsheet;
  
  // Presentations
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) return Presentation;
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(ext)) return FileArchive;
  
  // Code
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt'].includes(ext)) return FileCode;
  
  // Web
  if (['html', 'css', 'scss', 'less', 'xml', 'yaml', 'yml'].includes(ext)) return Globe;
  
  // Data
  if (['json', 'xml', 'sql', 'db', 'sqlite'].includes(ext)) return Database;
  if (ext === 'json') return FileJson;
  
  // System
  if (['exe', 'msi', 'dmg', 'app', 'deb', 'rpm', 'apk', 'ipa'].includes(ext)) return Package;
  if (['sh', 'bash', 'bat', 'cmd', 'ps1'].includes(ext)) return Terminal;
  if (['iso', 'img', 'dmg'].includes(ext)) return HardDrive;
  
  // Folder
  if (type === 'folder') return Folder;
  
  return File;
}

export function getFileIconColor(extension: string): string {
  const ext = extension.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'].includes(ext)) return 'text-pink-500';
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'].includes(ext)) return 'text-purple-500';
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a', 'opus'].includes(ext)) return 'text-green-500';
  if (['pdf'].includes(ext)) return 'text-red-500';
  if (['doc', 'docx', 'odt', 'rtf', 'tex'].includes(ext)) return 'text-blue-500';
  if (['xls', 'xlsx', 'csv', 'ods', 'tsv'].includes(ext)) return 'text-emerald-500';
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) return 'text-orange-500';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(ext)) return 'text-yellow-500';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'rb', 'php'].includes(ext)) return 'text-cyan-500';
  if (['html', 'css', 'scss', 'less', 'xml', 'yaml', 'yml'].includes(ext)) return 'text-indigo-500';
  if (['json', 'xml', 'sql', 'db', 'sqlite'].includes(ext)) return 'text-teal-500';
  if (['exe', 'msi', 'dmg', 'app', 'deb', 'rpm', 'apk', 'ipa'].includes(ext)) return 'text-gray-500';
  
  return 'text-slate-400';
}

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

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
