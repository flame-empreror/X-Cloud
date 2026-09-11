import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpFromLine, ArrowDownToLine, CheckCircle2, XCircle, Loader2, Trash2, Zap, Clock } from 'lucide-react';
import { useAppStore } from '../store';
import { formatFileSize, formatSpeed } from '../utils/fileUtils';

export default function TransfersPanel() {
  const { transfers, removeTransfer, clearCompletedTransfers, settings } = useAppStore();

  const activeTransfers = transfers.filter(t => t.status === 'active');
  const completedTransfers = transfers.filter(t => t.status === 'completed');

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div>
          <h2 className="text-white font-bold text-2xl">Transfers</h2>
          <p className="text-gray-400 text-sm mt-1">
            {activeTransfers.length > 0 ? `${activeTransfers.length} active` : 'No active transfers'} • {completedTransfers.length} completed
          </p>
        </div>
        {completedTransfers.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={clearCompletedTransfers}
            className="px-5 py-2.5 text-sm text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-semibold"
          >
            Clear completed
          </motion.button>
        )}
      </div>

      {/* Speed Boost Banner */}
      {settings.speedBoost && activeTransfers.length > 0 && (
        <div className="mx-6 mt-4 card-warning rounded-2xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-amber-300 text-sm font-semibold">Speed Boost active — using {settings.parallelDownloads} parallel connections</span>
        </div>
      )}

      {/* Transfer List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {transfers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 rounded-3xl flex items-center justify-center mb-5">
              <Clock className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">No transfers yet</h3>
            <p className="text-gray-400 text-sm">Uploads and downloads will appear here in real-time</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {transfers.map((transfer, i) => (
              <motion.div
                key={transfer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50, scale: 0.95 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                  transfer.status === 'active'
                    ? 'card-primary'
                    : transfer.status === 'completed'
                      ? 'card-success'
                      : transfer.status === 'error'
                        ? 'card-danger'
                        : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Type Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                      transfer.type === 'upload'
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-br from-green-500 to-emerald-500'
                    }`}>
                      {transfer.type === 'upload'
                        ? <ArrowUpFromLine className="w-6 h-6 text-white" />
                        : <ArrowDownToLine className="w-6 h-6 text-white" />
                      }
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-semibold truncate">{transfer.fileName}</p>
                        {/* Status icon */}
                        {transfer.status === 'active' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />}
                        {transfer.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
                        {transfer.status === 'error' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">{formatFileSize(transfer.size)}</span>
                        {transfer.status === 'active' && transfer.speed && transfer.speed > 0 && (
                          <span className="text-xs text-blue-400 font-semibold">{formatSpeed(transfer.speed)}</span>
                        )}
                        {transfer.error && (
                          <span className="text-xs text-red-400">{transfer.error}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeTransfer(transfer.id)}
                      className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  {(transfer.status === 'active' || transfer.status === 'completed') && (
                    <div className="mt-4">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${transfer.progress}%` }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            transfer.status === 'completed'
                              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                              : transfer.type === 'upload'
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                : 'bg-gradient-to-r from-green-500 to-emerald-400'
                          }`}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-gray-400 font-semibold">
                          {transfer.progress.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatFileSize(transfer.transferred)} / {formatFileSize(transfer.size)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
