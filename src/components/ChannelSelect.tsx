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
    setTimeout(() => onChatSelect(chat), 300);
  };

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'channel': return <Hash className="w-4 h-4" />;
      case 'group': return <Users className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full mx-4"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Select Storage Location</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Choose a channel to use as your cloud storage</p>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin mb-3" style={{ color: 'var(--accent)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading your channels...</p>
            </div>
          )}

          {error && (
            <div className="p-8">
              <div className="card p-4 mb-4" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
              </div>
              <button onClick={loadChats} className="btn btn-secondary w-full">Try again</button>
            </div>
          )}

          {!loading && !error && (
            <div className="max-h-[420px] overflow-y-auto">
              {chats.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--bg-elevated)' }}>
                    <Hash className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No channels found</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Join or create a channel first, then try again</p>
                </div>
              ) : (
                <div className="p-2">
                  {chats.map((chat, index) => (
                    <motion.button
                      key={chat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      onClick={() => handleSelect(chat)}
                      disabled={selectedId === chat.id}
                      className={`w-full rounded-xl p-4 flex items-center gap-3 text-left transition-all group ${
                        selectedId === chat.id ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
                      }`}
                      style={selectedId === chat.id ? { border: '1px solid var(--accent)' } : {}}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedId === chat.id
                          ? 'bg-[var(--accent)]'
                          : 'bg-[var(--bg-elevated)]'
                      }`}>
                        {selectedId === chat.id ? (
                          <Check className="w-4 h-4" style={{ color: 'var(--bg-base)' }} />
                        ) : (
                          <div style={{ color: selectedId === chat.id ? 'var(--bg-base)' : 'var(--text-muted)' }}>
                            {getChatIcon(chat.type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {chat.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="badge badge-neutral capitalize">
                            {chat.type}
                          </span>
                        </div>
                      </div>
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Files will be stored in your selected channel
        </p>
      </motion.div>
    </div>
  );
}
