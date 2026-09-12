import { Sidebar } from './components/Sidebar';
import { FileManager } from './components/FileManager';
import { TransfersPanel } from './components/TransfersPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useAppStore } from './store';

export default function App() {
  const { activeTab } = useAppStore();

  return (
    <div className="flex h-screen bg-base">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'files' && <FileManager />}
        {activeTab === 'transfers' && <TransfersPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}
