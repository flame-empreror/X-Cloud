export function SettingsPanel() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary">Settings</h2>
        <p className="text-sm text-muted mt-1">Configure your application settings</p>
      </div>

      <div className="bg-surface border border-default rounded-lg p-8">
        <div className="text-center text-muted">
          <p className="text-lg mb-2">Settings</p>
          <p className="text-sm">Your settings will appear here</p>
        </div>
      </div>
    </div>
  );
}
