import { useEffect, useState } from "react";
import { Wifi, Clock } from "lucide-react";

// Must match MIN_CLIENTS in core/server/config.yaml
const MIN_CLIENTS = 1;

interface Props {
  clients:         string[];
  connectionTimes: Record<string, Date>;
}

/** Format elapsed seconds as "Xs" or "Xm Ys" */
function elapsed(since: Date): string {
  const s = Math.floor((Date.now() - since.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ${s % 60}s ago`;
}

export { MIN_CLIENTS };

export default function WaitingRoom({ clients, connectionTimes }: Props) {
  // Tick every second so elapsed times stay live
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const connected = clients.length;
  const allReady  = connected >= MIN_CLIENTS;

  return (
    <div className={`bg-zinc-900 rounded-xl border p-5 space-y-4 transition-colors
      ${allReady ? "border-emerald-500/30" : "border-zinc-800"}`}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">Waiting Room</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Clients connecting here before training starts
          </p>
        </div>
        <div className={`text-xs font-mono px-3 py-1.5 rounded-lg border font-medium
          ${allReady
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-zinc-800 border-zinc-700 text-zinc-400"
          }`}>
          {connected} / {MIN_CLIENTS} ready
        </div>
      </div>

      {/* Client list */}
      <div className="space-y-1.5">
        {clients.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-800/50 border border-zinc-800 border-dashed">
            <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
            <span className="text-xs text-zinc-600 italic">
              No clients connected yet — start your client containers
            </span>
          </div>
        ) : (
          clients.map((id, i) => {
            const joinedAt = connectionTimes[id];
            return (
              <div
                key={id}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-800/60 border border-zinc-800
                  animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
              >
                {/* Pulsing green dot */}
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <Wifi size={12} className="text-emerald-400 shrink-0" />
                <span className="font-mono text-xs text-zinc-200 flex-1">{id}</span>
                {joinedAt && (
                  <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                    <Clock size={9} />
                    {elapsed(joinedAt)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Ready / waiting message */}
      {allReady ? (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          All clients ready — you can start training below
        </p>
      ) : (
        <p className="text-xs text-zinc-600">
          Waiting for at least {MIN_CLIENTS} client{MIN_CLIENTS > 1 ? "s" : ""} to connect
          before training can start.
        </p>
      )}
    </div>
  );
}
