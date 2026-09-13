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
      const groups: TelegramChat[] = dialogs.filter((d: any) => d.type === 'group' || d.type === 'channel').map((d: any) => ({ id: d.id, title: d.title || 'Unknown', type: d.type as 'channel' | 'group', inputPeer: d.peer }));
      setChats(groups);
    } catch (err: any) { setError(err.message || 'Failed to load chats'); }
    finally { setLoading(false); }
  };

  const handleSelect = (chat: TelegramChat) => {
    setSelectedId(chat.id);
    setTimeout(() => onChatSelect(chat), 200);
  };

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'channel': return <Hash className="w-4 h-4" />;
      case 'group': return <Users className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg-base)' }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }} className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>Select Storage</h1>
          <p className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>Choose a Telegram channel or group</p>
        </div>
        <div className="surface-card rounded-[28px] overflow-hidden shadow-2xl shadow-black/30">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: 'var(--accent)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading your channels...</p>
            </div>
          )}
          {error && (
            <div className="p-8 text-center">
              <div className="p-4 rounded-2xl mb-5 border border-[rgba(244,63,94,0.15)]" style={{ background: 'rgba(244,63,94,0.05)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--error)' }}>{error}</p>
              </div>
              <button onClick={loadChats} className="btn btn-secondary rounded-2xl px-6 py-3 text-sm font-extrabold">Try Again</button>
            </div>
          )}
          {!loading && !error && (
            <div className="max-h-[460px] overflow-y-auto p-3">
              {chats.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--bg-elevated)' }}>
                    <Hash className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p className="font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>No channels found</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Join or create a Telegram channel first</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat, i) => (
                    <motion.button
                      key={chat.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.04 }}
                      onClick={() => handleSelect(chat)}
                      disabled={selectedId === chat.id}
                      className={`w-full rounded-[20px] p-4 flex items-center gap-4 text-left transition-all duration-200 ${selectedId === chat.id ? 'bg-[var(--accent-glow)] border border-[rgba(99,102,241,0.2)]' : 'hover:bg-[var(--bg-hover)] border border-transparent'}`}
                    >
                      <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center flex-shrink-0 transition-all duration-200 ${selectedId === chat.id ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'}`}>
                        {selectedId === chat.id ? <Check className="w-5 h-5 text-white" /> : <div style={{ color: 'var(--text-muted)' }}>{getChatIcon(chat.type)}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold truncate text-sm" style={{ color: 'var(--text-primary)' }}>{chat.title}</p>
                        <span className="badge badge-neutral capitalize text-[10px] mt-1.5 inline-block">{chat.type}</span>
                      </div>
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: selectedId === chat.id ? 'var(--accent)' : 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
