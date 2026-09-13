import { useAppStore } from '../store';
import { useEffect } from 'react';

export function Sidebar() {
  const { activeTab, setActiveTab, user } = useAppStore();

  useEffect(() => {
    console.log('[Sidebar] User data received:', user);
  }, [user]);

  const tabs = [
    { id: 'files', label: 'Files', icon: '📁' },
    { id: 'transfers', label: 'Transfers', icon: '⬇️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ] as const;

  return (
    <aside className="w-64 bg-surface border-r border-default flex flex-col">
      <div className="p-6 border-b border-default">
        <h1 className="text-xl font-bold text-primary">TeleCloud</h1>
        <p className="text-xs text-muted mt-1">Telegram Cloud Storage</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent-muted text-accent'
                    : 'text-secondary hover:bg-hover hover:text-primary'
                }`}
              >
                <span className="mr-3">{tab.icon}</span>
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-default">
        <div className="flex items-center gap-3">
          {user?.photo_url ? (
            <img 
              src={user.photo_url} 
              alt={user.first_name || 'User'}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-accent-muted flex items-center justify-center text-accent font-semibold">
              {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary truncate">
              {user?.first_name || 'User'}
            </p>
            {user?.username && (
              <p className="text-xs text-muted truncate">@{user.username}</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
