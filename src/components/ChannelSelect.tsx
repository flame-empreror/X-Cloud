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
      case 'channel': return <Hash className="w-5 h-5" />;
      case 'group': return <Users className="w-5 h-5" />;
      default: return <MessageSquare className="w-5 h-5" />;
    }
  };

  return (
    <div className="h-screen flex items-center justify-center mesh-gradient relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/6 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] animate-float" style={{ animationDelay: '1.5s' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-2xl w-full relative z-10 px-4"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Select Storage Location</h1>
          <p className="text-zinc-400 text-sm">Choose a channel to use as your cloud storage</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl shadow-2xl overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-4" />
              <p className="text-zinc-400 text-sm">Loading your channels...</p>
            </div>
          )}

          {error && (
            <div className="p-8">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
              <button onClick={loadChats} className="btn btn-secondary w-full">Try again</button>
            </div>
          )}

          {!loading && !error && (
            <div className="max-h-[420px] overflow-y-auto">
              {chats.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Hash className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-zinc-300 font-medium mb-1">No channels found</p>
                  <p className="text-zinc-500 text-sm">Join or create a channel first, then try again</p>
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
                      className={`w-full rounded-xl p-4 flex items-center gap-4 text-left transition-all duration-200 group ${
                        selectedId === chat.id 
                          ? 'bg-blue-500/15 border border-blue-500/30' 
                          : 'hover:bg-[var(--surface-3)] border border-transparent'
                      }`}
                      style={{ borderColor: selectedId === chat.id ? 'rgba(59, 130, 246, 0.3)' : 'transparent' }}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedId === chat.id
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                          : 'bg-[var(--surface-4)] text-zinc-400 group-hover:bg-[var(--surface-5)]'
                      }`}>
                        {selectedId === chat.id ? <Check className="w-5 h-5" /> : getChatIcon(chat.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${selectedId === chat.id ? 'text-white' : 'text-zinc-200'}`}>
                          {chat.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="badge badge-neutral capitalize text-[10px]">
                            {chat.type}
                          </span>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-4">
          Files will be stored in your selected channel
        </p>
      </motion.div>
    </div>
  );
}
