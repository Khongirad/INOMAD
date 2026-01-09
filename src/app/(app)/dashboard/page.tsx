export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-sm text-zinc-400">Seat</div>
        <div className="mt-1 text-lg">Unregistered (Guest)</div>
        <div className="mt-3 text-sm text-zinc-500">
          Next: Register → SeatSBT → Wallet Locked → Human Unlock (3 peers)
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-sm text-zinc-400">Today</div>
        <div className="mt-2 text-sm text-zinc-300">
          Open the Board to take contracts. Later this becomes your hero’s quest flow.
        </div>
      </div>
    </div>
  );
}
