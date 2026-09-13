import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpFromLine, Download, Upload, X, CheckCircle2, AlertCircle, PauseCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { formatFileSize } from '../utils/fileUtils';

export function TransfersPanel() {
  const { transfers, removeTransfer, clearCompletedTransfers } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'error'>('all');

  const filteredTransfers = transfers.filter(t => filter === 'all' ? true : t.status === filter);
  const activeCount = transfers.filter(t => t.status === 'active').length;
  const completedCount = transfers.filter(t => t.status === 'completed').length;
  const errorCount = transfers.filter(t => t.status === 'error').length;

  const getIcon = (type: string, status: string) => {
    if (status === 'completed') return CheckCircle2;
    if (status === 'error') return AlertCircle;
    if (status === 'paused') return PauseCircle;
    return type === 'upload' ? Upload : Download;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'var(--accent)';
      case 'completed': return 'var(--success)';
      case 'error': return 'var(--error)';
      case 'paused': return 'var(--warning)';
      case 'cancelled': return 'var(--text-muted)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <header className="px-7 py-5 border-b border-[var(--border-subtle)]" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="h2 mb-0.5" style={{ color: 'var(--text-primary)' }}>Transfers</h2>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Manage uploads and downloads</p>
          </div>
          {transfers.length > 0 && (
            <button onClick={clearCompletedTransfers} className="btn btn-ghost rounded-2xl px-4 py-2.5 text-xs font-extrabold tracking-wide uppercase">Clear Completed</button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FilterTab label="All" count={transfers.length} isActive={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterTab label="Active" count={activeCount} isActive={filter === 'active'} onClick={() => setFilter('active')} />
          <FilterTab label="Completed" count={completedCount} isActive={filter === 'completed'} onClick={() => setFilter('completed')} />
          <FilterTab label="Errors" count={errorCount} isActive={filter === 'error'} onClick={() => setFilter('error')} />
        </div>
      </header>
      <div className="flex-1 overflow-auto px-7 py-7">
        {filteredTransfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-[28px] flex items-center justify-center mb-6" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <ArrowUpFromLine className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="h3 mb-2" style={{ color: 'var(--text-primary)' }}>No transfers</h3>
            <p className="text-sm font-medium max-w-xs" style={{ color: 'var(--text-muted)' }}>{filter === 'all' ? 'Your transfers will appear here' : `No ${filter} transfers`}</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            <AnimatePresence>
              {filteredTransfers.map((transfer, i) => {
                const Icon = getIcon(transfer.type, transfer.status);
                const statusColor = getStatusColor(transfer.status);
                return (
                  <motion.div
                    key={transfer.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className="surface-card rounded-[24px] p-5 hover:border-[rgba(99,102,241,0.15)] transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-[18px] flex items-center justify-center flex-shrink-0" style={{ background: `${statusColor}12` }}>
                        <Icon className="w-5 h-5" style={{ color: statusColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="text-sm font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>{transfer.fileName}</span>
                          <span className="badge badge-neutral text-[10px] capitalize">{transfer.type}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                          <span>{formatFileSize(transfer.size)}</span>
                          <span>·</span>
                          <span style={{ color: statusColor }}>{transfer.status}</span>
                        </div>
                      </div>
                      <div className="w-28 flex-shrink-0">
                        {(transfer.status === 'active' || transfer.status === 'pending') ? (
                          <>
                            <div className="flex items-center justify-between text-[11px] font-extrabold mb-1.5">
                              <span style={{ color: 'var(--text-secondary)' }}>{Math.round(transfer.progress)}%</span>
                            </div>
                            <div className="progress-bar"><motion.div initial={{ width: 0 }} animate={{ width: `${transfer.progress}%` }} transition={{ duration: 0.2 }} className="progress-bar-fill" /></div>
                          </>
                        ) : (
                          <span className="text-sm font-extrabold" style={{ color: statusColor }}>{transfer.status === 'completed' ? 'Done' : transfer.status}</span>
                        )}
                      </div>
                      {(transfer.status === 'active' || transfer.status === 'error' || transfer.status === 'completed') && (
                        <button onClick={() => removeTransfer(transfer.id)} className="p-2.5 rounded-2xl hover:bg-[var(--bg-hover)] transition-colors" aria-label="Remove">
                          <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterTab({ label, count, isActive, onClick }: { label: string; count: number; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold tracking-wide transition-all ${isActive ? 'bg-[var(--accent)] text-white shadow-md shadow-[rgba(99,102,241,0.25)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
      {label} {count > 0 && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${isActive ? 'bg-white/15' : 'bg-[var(--bg-elevated)]'}`}>{count}</span>}
    </button>
  );
}
