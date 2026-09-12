export function TransfersPanel() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary">Transfers</h2>
        <p className="text-sm text-muted mt-1">View your download and upload progress</p>
      </div>

      <div className="bg-surface border border-default rounded-lg p-8">
        <div className="text-center text-muted">
          <p className="text-lg mb-2">Transfers</p>
          <p className="text-sm">Your transfers will appear here</p>
        </div>
      </div>
    </div>
  );
}
