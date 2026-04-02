export function ArchDiagram() {
  return (
    <div className="space-y-8">
      {/* Hub-and-spoke service map */}
      <div>
        <p className="text-xs text-zinc-500 mb-3">Service topology — all services run in Docker containers</p>
        <div className="rounded-xl overflow-hidden border border-zinc-800 bg-white">
          <img
            src="/flow.png"
            alt="SpamFL system architecture"
            className="w-full h-auto"
          />
        </div>
      </div>

      {/* Round-trip data flow sequence */}
      <div>
        <p className="text-xs text-zinc-500 mb-3">Data flow — one federated round, step by step</p>
        <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#1a1a1a]">
          <img
            src="/fl_data_flow_roundtrip.svg"
            alt="FL round-trip data flow"
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}
