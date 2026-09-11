import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Hash, MessageSquare } from 'lucide-react';
import { mtprotoService } from '../services/mtproto';
import { TelegramChat } from '../types';

interface ChannelSelectProps {
  onChatSelect: (chat: TelegramChat) => void;
}

export default function ChannelSelect({ onChatSelect }: ChannelSelectProps) {
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    setLoading(true);
    setError('');

    try {
      const dialogs = await mtprotoService.getDialogs();
      
      // Filter only groups and channels
      const groups: TelegramChat[] = dialogs
        .filter((d: any) => {
          const peer = d.peer;
          return peer._ === 'peerChat' || peer._ === 'peerChannel';
        })
        .map((d: any) => ({
          id: d.peer.chat_id || d.peer.channel_id,
          title: d.title || 'Unknown',
          type: (d.peer._ === 'peerChannel' ? 'channel' : 'group') as 'channel' | 'group',
        }));

      setChats(groups);
    } catch (err: any) {
      setError(err.message || 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (chat: TelegramChat) => {
    onChatSelect(chat);
  };

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'channel':
        return <Hash className="w-5 h-5" />;
      case 'group':
        return <Users className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Select Storage Location</h1>
            <p className="text-gray-400">Choose a group or channel to use as your cloud storage</p>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400">Loading your chats...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={loadChats}
                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No groups or channels found</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Join or create a group/channel first, then try again
                  </p>
                </div>
              ) : (
                chats.map((chat) => (
                  <motion.button
                    key={chat.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(chat)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all flex items-center gap-4 text-left"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                      {getChatIcon(chat.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{chat.title}</p>
                      <p className="text-gray-500 text-xs capitalize">{chat.type}</p>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-blue-300 text-sm">
              <strong>Tip:</strong> Your files will be stored in the selected group/channel. 
              You can access them from any device after logging in with your Telegram account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
