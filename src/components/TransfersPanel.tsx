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
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-white font-bold text-xl tracking-tight">Transfers</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {activeTransfers.length > 0 ? `${activeTransfers.length} active` : 'No active transfers'} • {completedTransfers.length} completed
          </p>
        </div>
        {completedTransfers.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={clearCompletedTransfers}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl transition-all font-medium"
          >
            Clear completed
          </motion.button>
        )}
      </div>

      {/* Speed Boost Banner */}
      {settings.speedBoost && activeTransfers.length > 0 && (
        <div className="mx-6 mt-4 px-4 py-3 bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.04] border border-amber-500/15 rounded-xl flex items-center gap-3">
          <div className="w-6 h-6 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-amber-400/90 text-sm font-medium">Speed Boost active — using {settings.parallelDownloads} parallel connections</span>
        </div>
      )}

      {/* Transfer List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {transfers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-20 h-20 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center mb-5">
              <Clock className="w-9 h-9 text-slate-600" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-1">No transfers yet</h3>
            <p className="text-slate-500 text-sm">Uploads and downloads will appear here in real-time</p>
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
                    ? 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.12]'
                    : transfer.status === 'completed'
                      ? 'bg-green-500/[0.02] border-green-500/[0.08]'
                      : transfer.status === 'error'
                        ? 'bg-red-500/[0.02] border-red-500/[0.08]'
                        : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Type Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      transfer.type === 'upload'
                        ? 'bg-blue-500/10 border border-blue-500/20'
                        : 'bg-green-500/10 border border-green-500/20'
                    }`}>
                      {transfer.type === 'upload'
                        ? <ArrowUpFromLine className="w-5 h-5 text-blue-400" />
                        : <ArrowDownToLine className="w-5 h-5 text-green-400" />
                      }
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{transfer.fileName}</p>
                        {/* Status icon */}
                        {transfer.status === 'active' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />}
                        {transfer.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                        {transfer.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-slate-500">{formatFileSize(transfer.size)}</span>
                        {transfer.status === 'active' && transfer.speed && transfer.speed > 0 && (
                          <span className="text-[11px] text-blue-400 font-medium">{formatSpeed(transfer.speed)}</span>
                        )}
                        {transfer.error && (
                          <span className="text-[11px] text-red-400">{transfer.error}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeTransfer(transfer.id)}
                      className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  {(transfer.status === 'active' || transfer.status === 'completed') && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
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
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-slate-500">
                          {transfer.progress.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-500">
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
