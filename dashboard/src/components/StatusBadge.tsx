import { type FLStatus } from "../services/api";

const CONFIG: Record<FLStatus["state"], { label: string; dot: string; text: string; ring: string }> = {
  waiting:     { label: "Waiting",     dot: "bg-zinc-400",    text: "text-zinc-400",    ring: "ring-zinc-400/20"   },
  round_open:  { label: "Round Open",  dot: "bg-blue-400",    text: "text-blue-400",    ring: "ring-blue-400/20"   },
  aggregating: { label: "Aggregating", dot: "bg-amber-400",   text: "text-amber-400",   ring: "ring-amber-400/20"  },
  finished:    { label: "Finished",    dot: "bg-emerald-400", text: "text-emerald-400", ring: "ring-emerald-400/20" },
};

export default function StatusBadge({ state }: { state: FLStatus["state"] }) {
  const cfg = CONFIG[state];
  const isLive = state === "round_open" || state === "aggregating";

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ring-1 ${cfg.ring} bg-zinc-900`}>
      <span className="relative flex h-2 w-2">
        {isLive && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-60`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${cfg.dot}`} />
      </span>
      <span className={cfg.text}>{cfg.label}</span>
    </span>
  );
}
