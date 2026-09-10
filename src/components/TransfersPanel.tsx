import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpFromLine, ArrowDownToLine, CheckCircle2, XCircle, Loader2, Trash2, Pause, Play, Zap } from 'lucide-react';
import { useAppStore } from '../store';
import { formatFileSize, formatSpeed } from '../utils/fileUtils';

export default function TransfersPanel() {
  const { transfers, removeTransfer, clearCompletedTransfers } = useAppStore();

  const activeTransfers = transfers.filter(t => t.status === 'active');
  const completedTransfers = transfers.filter(t => t.status === 'completed');
  const errorTransfers = transfers.filter(t => t.status === 'error');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'paused': return <Pause className="w-4 h-4 text-amber-400" />;
      default: return <Loader2 className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'upload'
      ? <ArrowUpFromLine className="w-4 h-4 text-blue-400" />
      : <ArrowDownToLine className="w-4 h-4 text-green-400" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div>
          <h2 className="text-white font-bold text-lg">Transfers</h2>
          <p className="text-slate-500 text-sm">
            {activeTransfers.length} active • {completedTransfers.length} completed
          </p>
        </div>
        {completedTransfers.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={clearCompletedTransfers}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
          >
            Clear completed
          </motion.button>
        )}
      </div>

      {/* Speed Boost Banner */}
      {useAppStore.getState().settings.speedBoost && activeTransfers.length > 0 && (
        <div className="mx-6 mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400 text-sm font-medium">Speed Boost active - using parallel connections</span>
        </div>
      )}

      {/* Transfer List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
              <ArrowUpFromLine className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400">No transfers yet</p>
            <p className="text-slate-600 text-sm mt-1">Uploads and downloads will appear here</p>
          </div>
        ) : (
          <AnimatePresence>
            {transfers.map((transfer, i) => (
              <motion.div
                key={transfer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: i * 0.02 }}
                className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-3">
                  {getTypeIcon(transfer.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium truncate">{transfer.fileName}</p>
                      {getStatusIcon(transfer.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{formatFileSize(transfer.size)}</span>
                      {transfer.status === 'active' && transfer.speed && (
                        <span className="text-xs text-blue-400">{formatSpeed(transfer.speed)}</span>
                      )}
                      {transfer.error && (
                        <span className="text-xs text-red-400">{transfer.error}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => removeTransfer(transfer.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                {(transfer.status === 'active' || transfer.status === 'completed') && (
                  <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${transfer.progress}%` }}
                      transition={{ duration: 0.3 }}
                      className={`h-full rounded-full ${
                        transfer.status === 'completed'
                          ? 'bg-green-500'
                          : transfer.type === 'upload'
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                            : 'bg-gradient-to-r from-green-500 to-emerald-400'
                      }`}
                    />
                  </div>
                )}

                {/* Progress Text */}
                {transfer.status === 'active' && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    {transfer.progress.toFixed(1)}% • {formatFileSize(transfer.transferred)} / {formatFileSize(transfer.size)}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
