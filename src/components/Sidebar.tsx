import { useAppStore } from '../store';

export function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();

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
        <div className="text-xs text-muted">
          <p>Connected to Telegram</p>
        </div>
      </div>
    </aside>
  );
}
