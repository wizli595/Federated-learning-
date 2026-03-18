import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw, Trash2, Download } from "lucide-react";

const API_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8080";

interface LogEntry {
  ts: string;
  level: string;
  source: string;
  msg: string;
}

const SOURCE_COLORS: Record<string, string> = {
  server: "border-violet-500 text-violet-400",
};

function getSourceColor(source: string): string {
  if (SOURCE_COLORS[source]) return SOURCE_COLORS[source];
  // deterministic color for client tabs
  const palette = [
    "border-cyan-500 text-cyan-400",
    "border-emerald-500 text-emerald-400",
    "border-amber-500 text-amber-400",
    "border-pink-500 text-pink-400",
    "border-blue-500 text-blue-400",
  ];
  let hash = 0;
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) & 0xffff;
  return palette[hash % palette.length];
}

function levelClass(level: string): string {
  if (level === "ERROR" || level === "CRITICAL") return "text-red-400 font-bold";
  if (level === "WARNING" || level === "WARN") return "text-amber-400";
  return "text-zinc-400";
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sources, setSources] = useState<string[]>(["server"]);
  const [activeTab, setActiveTab] = useState("server");
  const [cleared, setCleared] = useState<Record<string, number>>({});
  const terminalRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async (source: string) => {
    try {
      const res = await fetch(`${API_URL}/logs?source=${source}&limit=500`);
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs ?? []);
      // discover other sources from all logs
      const allRes = await fetch(`${API_URL}/logs?limit=1000`);
      if (allRes.ok) {
        const allData = await allRes.json();
        const seen = new Set<string>(["server"]);
        for (const e of allData.logs ?? []) seen.add(e.source);
        setSources(["server", ...Array.from(seen).filter((s) => s !== "server").sort()]);
      }
    } catch {
      // server unreachable — keep stale data
    }
  }, []);

  // start polling when tab changes
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    fetchLogs(activeTab);
    intervalRef.current = setInterval(() => fetchLogs(activeTab), 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTab, fetchLogs]);

  // auto-scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const visibleLogs = logs.filter((e) => {
    const clearTs = cleared[activeTab];
    if (!clearTs) return true;
    return new Date(e.ts).getTime() > clearTs;
  });

  function handleClear() {
    setCleared((prev) => ({ ...prev, [activeTab]: Date.now() }));
  }

  function handleExport() {
    const text = visibleLogs
      .map((e) => `${e.ts}  [${e.level}]  ${e.msg}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `logs-${activeTab}-${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-zinc-100">Logs</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Live server and client output</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {sources.map((src) => {
          const colorCls = getSourceColor(src);
          const isActive = activeTab === src;
          return (
            <button
              key={src}
              onClick={() => setActiveTab(src)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer
                ${isActive
                  ? `${colorCls} bg-zinc-800`
                  : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                }`}
            >
              {src}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => fetchLogs(activeTab)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <Trash2 size={12} />
          Clear
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <Download size={12} />
          Export
        </button>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        className="rounded-xl border border-zinc-800 overflow-y-auto p-4"
        style={{
          backgroundColor: "#000",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: "12px",
          height: "calc(100vh - 260px)",
        }}
      >
        {visibleLogs.length === 0 ? (
          <p className="text-zinc-600 text-center mt-8">No logs yet for this source.</p>
        ) : (
          visibleLogs.map((entry, i) => (
            <div key={i} className="flex gap-3 leading-5 hover:bg-zinc-900/40 px-1 rounded">
              <span className="text-zinc-600 shrink-0 select-none">
                {entry.ts.replace("T", " ").replace("Z", "").slice(0, 19)}
              </span>
              <span className={`shrink-0 w-16 text-right ${levelClass(entry.level)}`}>
                {entry.level}
              </span>
              <span className="text-zinc-200 break-all">{entry.msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
