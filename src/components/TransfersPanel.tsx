import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpFromLine, Download, Upload, X, CheckCircle2, AlertCircle, PauseCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { formatFileSize } from '../utils/fileUtils';

export function TransfersPanel() {
  const { transfers, removeTransfer, clearCompletedTransfers } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'error'>('all');

  const filteredTransfers = transfers.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

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
      <header className="px-6 py-5 border-b border-[var(--border-default)]" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Transfers</h2>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Manage uploads and downloads</p>
          </div>
          {transfers.length > 0 && (
            <button onClick={clearCompletedTransfers} className="btn btn-ghost text-xs font-semibold rounded-xl px-3">
              Clear Completed
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <FilterTab label="All" count={transfers.length} isActive={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterTab label="Active" count={activeCount} isActive={filter === 'active'} onClick={() => setFilter('active')} />
          <FilterTab label="Completed" count={completedCount} isActive={filter === 'completed'} onClick={() => setFilter('completed')} />
          <FilterTab label="Errors" count={errorCount} isActive={filter === 'error'} onClick={() => setFilter('error')} />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {filteredTransfers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full"
          >
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-elevated)' }}>
              <ArrowUpFromLine className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-lg font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>No transfers</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {filter === 'all' ? 'Your transfers will appear here' : `No ${filter} transfers`}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            <AnimatePresence mode="popLayout">
              {filteredTransfers.map((transfer, index) => {
                const Icon = getIcon(transfer.type, transfer.status);
                const statusColor = getStatusColor(transfer.status);
                return (
                  <motion.div
                    key={transfer.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -80 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="p-4 rounded-2xl border border-[var(--border-default)] transition-all hover:border-[var(--border-hover)]" style={{ background: 'var(--bg-surface)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${statusColor}15` }}>
                        <Icon className="w-5 h-5" style={{ color: statusColor }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>
                            {transfer.fileName}
                          </span>
                          <span className="badge badge-neutral capitalize text-[10px]">{transfer.type}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                          <span>{formatFileSize(transfer.size)}</span>
                          <span>•</span>
                          <span style={{ color: statusColor }}>{transfer.status}</span>
                        </div>
                      </div>

                      <div className="w-28 flex-shrink-0">
                        {transfer.status === 'active' || transfer.status === 'pending' ? (
                          <>
                            <div className="flex items-center justify-between text-xs font-bold mb-1">
                              <span style={{ color: 'var(--text-secondary)' }}>{Math.round(transfer.progress)}%</span>
                            </div>
                            <div className="progress-bar" style={{ height: '4px' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${transfer.progress}%` }}
                                transition={{ duration: 0.2 }}
                                className="progress-bar-fill"
                              />
                            </div>
                          </>
                        ) : (
                          <span className="text-sm font-extrabold" style={{ color: statusColor }}>
                            {transfer.status === 'completed' ? 'Done' : transfer.status}
                          </span>
                        )}
                      </div>

                      {(transfer.status === 'active' || transfer.status === 'error' || transfer.status === 'completed') && (
                        <button
                          onClick={() => removeTransfer(transfer.id)}
                          className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
                        >
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

interface FilterTabProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterTab({ label, count, isActive, onClick }: FilterTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
        isActive ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-muted)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-white/20' : 'bg-[var(--bg-elevated)]'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
