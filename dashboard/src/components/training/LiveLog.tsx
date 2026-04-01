import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import type { LogEntry } from "../../services/api";

const SOURCE_COLORS = [
  "text-amber-400", "text-emerald-400", "text-violet-400",
  "text-pink-400",  "text-orange-400",  "text-cyan-400",
];

function sourceColor(s: string): string {
  if (s === "server")     return "text-blue-400";
  if (s === "controller") return "text-zinc-400";
  const idx = s.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % SOURCE_COLORS.length;
  return SOURCE_COLORS[idx];
}

interface Props {
  logs: LogEntry[];
  isRunning: boolean;
  onClear: () => void;
}

export function LiveLog({ logs, isRunning, onClear }: Props) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          )}
          <h2 className="text-sm font-medium text-zinc-300">Live Log</h2>
          <span className="text-xs text-zinc-600">{logs.length} lines</span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition"
        >
          <Trash2 size={11} /> Clear
        </button>
      </div>

      <div
        ref={logRef}
        className="h-52 overflow-y-auto p-3 font-mono text-xs space-y-px scroll-smooth"
      >
        {logs.length === 0 ? (
          <p className="text-zinc-600">Waiting for processes to start…</p>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="flex gap-2 items-baseline leading-5">
              <span className="text-zinc-600 shrink-0 tabular-nums">
                {l.ts.split("T")[1]}
              </span>
              <span className={`shrink-0 font-semibold ${sourceColor(l.source)}`}>
                [{l.source}]
              </span>
              <span className="text-zinc-400 break-all">
                {l.msg.replace(/^\[[^\]]+\]\s*/, "")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
