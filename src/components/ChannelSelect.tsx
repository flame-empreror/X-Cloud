import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hash, Users, MessageSquare, Check, Loader2 } from 'lucide-react';
import { mtprotoService } from '../services/mtproto';
import { TelegramChat } from '../types';

interface ChannelSelectProps {
  onChatSelect: (chat: TelegramChat) => void;
}

export default function ChannelSelect({ onChatSelect }: ChannelSelectProps) {
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => { loadChats(); }, []);

  const loadChats = async () => {
    setLoading(true); setError('');
    try {
      const dialogs = await mtprotoService.getDialogs();
      const groups: TelegramChat[] = dialogs
        .filter((d: any) => d.type === 'group' || d.type === 'channel')
        .map((d: any) => ({
          id: d.id,
          title: d.title || 'Unknown',
          type: d.type as 'channel' | 'group',
          inputPeer: d.peer,
        }));
      setChats(groups);
    } catch (err: any) {
      setError(err.message || 'Failed to load chats');
    } finally { setLoading(false); }
  };

  const handleSelect = (chat: TelegramChat) => {
    setSelectedId(chat.id);
    setTimeout(() => onChatSelect(chat), 250);
  };

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'channel': return <Hash className="w-4 h-4" />;
      case 'group': return <Users className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-xl w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>Select Storage</h1>
          <p className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>Choose a Telegram channel or group</p>
        </div>

        <div className="surface-card rounded-[24px] overflow-hidden shadow-2xl shadow-black/30">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin mb-4" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading your channels...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <div className="p-4 rounded-xl mb-5 border border-[rgba(244,63,94,0.15)]" style={{ background: 'rgba(244,63,94,0.05)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--error)' }}>{error}</p>
              </div>
              <button onClick={loadChats} className="btn btn-secondary rounded-xl px-6">Try again</button>
            </div>
          )}

          {!loading && !error && (
            <div className="max-h-[440px] overflow-y-auto">
              {chats.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--bg-elevated)' }}>
                    <Hash className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No channels found</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Join or create a channel, then refresh</p>
                </div>
              ) : (
                <div className="p-3">
                  {chats.map((chat, index) => (
                    <motion.button
                      key={chat.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.04 }}
                      onClick={() => handleSelect(chat)}
                      disabled={selectedId === chat.id}
                      className={`w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all mb-1 ${
                        selectedId === chat.id
                          ? 'bg-[var(--accent-muted)] border border-[var(--accent)]/30'
                          : 'hover:bg-[var(--bg-hover)] border border-transparent'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedId === chat.id ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'
                      }`}>
                        {selectedId === chat.id ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : (
                          <div style={{ color: selectedId === chat.id ? 'white' : 'var(--text-muted)' }}>
                            {getChatIcon(chat.type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm" style={{ color: 'var(--text-primary)' }}>
                          {chat.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge badge-neutral capitalize text-[10px]">{chat.type}</span>
                        </div>
                      </div>
                      <svg className="w-4 h-4 flex-shrink-0 transition-colors" style={{ color: selectedId === chat.id ? 'var(--accent)' : 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs font-medium mt-6" style={{ color: 'var(--text-muted)' }}>
          Files will be stored in your selected channel
        </p>
      </motion.div>
    </div>
  );
}
