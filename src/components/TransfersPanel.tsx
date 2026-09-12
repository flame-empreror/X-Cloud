import { motion } from 'framer-motion';
import { X, Download, Upload, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';
import { useAppStore } from '../store';
import { formatFileSize, formatSpeed } from '../utils/fileUtils';

export default function TransfersPanel() {
  const { transfers, removeTransfer, clearCompletedTransfers, settings } = useAppStore();

  const activeTransfers = transfers.filter(t => t.status === 'active');
  const completedTransfers = transfers.filter(t => t.status === 'completed');

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Transfers</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {activeTransfers.length > 0 ? `${activeTransfers.length} active` : 'No active transfers'} • {completedTransfers.length} completed
          </p>
        </div>
        {completedTransfers.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={clearCompletedTransfers}
            className="btn btn-secondary"
          >
            Clear completed
          </motion.button>
        )}
      </div>

      {/* Speed Boost Banner */}
      {settings.speedBoost && activeTransfers.length > 0 && (
        <div className="mx-6 mt-4 card p-4 flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
            <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Speed Boost active — using {settings.parallelDownloads} parallel connections</span>
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
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-surface)' }}>
              <Upload className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No transfers yet</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Uploads and downloads will appear here in real-time</p>
          </motion.div>
        ) : (
          <motion.div className="space-y-2">
            {transfers.map((transfer, i) => (
              <motion.div
                key={transfer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card p-4"
              >
                <div className="flex items-center gap-3">
                  {/* Type Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                    background: transfer.type === 'upload' ? 'var(--accent-muted)' : 'rgba(74, 222, 128, 0.1)',
                    border: '1px solid var(--border)'
                  }}>
                    {transfer.type === 'upload'
                      ? <Upload className="w-5 h-5" style={{ color: 'var(--accent-secondary)' }} />
                      : <Download className="w-5 h-5" style={{ color: 'var(--success)' }} />
                    }
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{transfer.fileName}</span>
                      {/* Status icon */}
                      {transfer.status === 'active' && <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent-secondary)' }} />}
                      {transfer.status === 'completed' && <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />}
                      {transfer.status === 'error' && <XCircle className="w-4 h-4" style={{ color: 'var(--error)' }} />}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatFileSize(transfer.size)}</span>
                      {transfer.status === 'active' && transfer.speed && transfer.speed > 0 && (
                        <span className="text-xs font-medium" style={{ color: 'var(--accent-secondary)' }}>{formatSpeed(transfer.speed)}</span>
                      )}
                      {transfer.error && (
                        <span className="text-xs" style={{ color: 'var(--error)' }}>{transfer.error}</span>
                      )}
                    </div>
                  </div>

                  {/* Cancel button for active transfers */}
                  {transfer.status === 'active' && (
                    <button
                      onClick={() => {
                        if (transfer.abortController) {
                          transfer.abortController.abort();
                        }
                      }}
                      className="btn btn-ghost p-2"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" style={{ color: 'var(--error)' }} />
                    </button>
                  )}
                  
                  <button
                    onClick={() => removeTransfer(transfer.id)}
                    className="btn btn-ghost p-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                {(transfer.status === 'active' || transfer.status === 'completed') && (
                  <div className="mt-3">
                    <div className="progress-bar">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${transfer.progress}%` }}
                        transition={{ duration: 0.3 }}
                        className="progress-bar-fill"
                        style={{
                          background: transfer.status === 'completed'
                            ? 'var(--success)'
                            : transfer.type === 'upload'
                              ? 'var(--accent-secondary)'
                              : 'var(--success)'
                        }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
