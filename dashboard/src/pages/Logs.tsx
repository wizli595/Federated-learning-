import { useEffect, useRef, useState, useMemo } from "react";
import { getTrainingLogs, API_BASE } from "../services/api";
import type { LogEntry } from "../services/api";
import { Download, Trash2, Search, ArrowDown, Terminal } from "lucide-react";
import PageShell from "../components/PageShell";

// ── Color helpers ─────────────────────────────────────────────────────────────

const SOURCE_TEXT_COLORS = [
  "text-amber-400", "text-emerald-400", "text-violet-400",
  "text-pink-400",  "text-orange-400",  "text-cyan-400",
];

const SOURCE_BADGE_COLORS = [
  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
];

function srcHash(s: string): number {
  return s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

function srcTextColor(s: string): string {
  if (s === "server")     return "text-blue-400";
  if (s === "controller") return "text-zinc-400";
  return SOURCE_TEXT_COLORS[srcHash(s) % SOURCE_TEXT_COLORS.length];
}

function srcBadgeColor(s: string): string {
  if (s === "server")     return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (s === "controller") return "bg-zinc-800 text-zinc-400 border-zinc-700";
  return SOURCE_BADGE_COLORS[srcHash(s) % SOURCE_BADGE_COLORS.length];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Logs() {
  const [logs,       setLogs]       = useState<LogEntry[]>([]);
  const [filter,     setFilter]     = useState<string>("all");
  const [search,     setSearch]     = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [live,       setLive]       = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // ── Initial load + SSE ────────────────────────────────────────────────────

  useEffect(() => {
    // Load existing logs via REST, then subscribe to only NEW lines via SSE
    getTrainingLogs()
      .then((existing) => {
        setLogs(existing);
      })
      .catch(() => {});

    // Connect SSE with tail=true so we only get lines written after this point
    const es = new EventSource(`${API_BASE}/training/stream?tail=true`);
    es.onopen    = () => setLive(true);
    es.onerror   = () => setLive(false);
    es.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data) as LogEntry;
        setLogs((prev) => [...prev.slice(-2000), entry]);
      } catch { /* ignore malformed */ }
    };
    return () => { es.close(); setLive(false); };
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const sources = useMemo(() => {
    const s = new Set(logs.map((l) => l.source));
    return Array.from(s).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const lc = search.toLowerCase();
    return logs.filter((l) => {
      if (filter !== "all" && l.source !== filter) return false;
      if (lc && !l.msg.toLowerCase().includes(lc) && !l.source.toLowerCase().includes(lc)) return false;
      return true;
    });
  }, [logs, filter, search]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleDownload = () => {
    const text = filtered
      .map((l) => `[${l.ts}] [${l.source}] ${l.msg}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `spamfl-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleScroll = () => {
    if (!logRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (!atBottom) setAutoScroll(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const liveIndicator = live ? (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                    bg-emerald-500/10 border border-emerald-500/20">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <span className="text-xs text-emerald-400 font-medium">Live</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                    bg-zinc-800 border border-zinc-700">
      <span className="h-2 w-2 rounded-full bg-zinc-600" />
      <span className="text-xs text-zinc-500">Idle</span>
    </div>
  );

  return (
    <PageShell
      title="Logs"
      subtitle="Real-time output from the Flower server and all FL clients."
      actions={liveIndicator}
    >
      <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Source filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-full text-xs border font-medium transition
              ${filter === "all"
                ? "bg-zinc-700 text-zinc-100 border-zinc-500"
                : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
              }`}
          >
            All
          </button>
          {sources.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 rounded-full text-xs border font-medium transition
                ${filter === s
                  ? srcBadgeColor(s)
                  : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
                }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 pr-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100
                       text-xs focus:outline-none focus:border-blue-500 w-44"
          />
        </div>

        {/* Auto-scroll toggle */}
        <button
          onClick={() => setAutoScroll((a) => !a)}
          title={autoScroll ? "Auto-scroll on — click to disable" : "Auto-scroll off — click to enable"}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition
            ${autoScroll
              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
              : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300"
            }`}
        >
          <ArrowDown size={12} />
          Auto-scroll
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border
                     bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200 transition
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={12} /> Export
        </button>

        {/* Clear */}
        <button
          onClick={() => { setLogs([]); setFilter("all"); setSearch(""); }}
          disabled={logs.length === 0}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border
                     bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-red-400 hover:border-red-500/30
                     transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* Count bar */}
      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>
          {filtered.length === logs.length
            ? `${logs.length.toLocaleString()} lines`
            : `${filtered.length.toLocaleString()} of ${logs.length.toLocaleString()} lines`}
          {search && ` matching "${search}"`}
        </span>
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true);
              if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
            }}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition"
          >
            <ArrowDown size={11} /> Jump to bottom
          </button>
        )}
      </div>

      {/* Log panel */}
      <div
        ref={logRef}
        onScroll={handleScroll}
        className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-y-auto
                   p-4 font-mono text-xs space-y-px"
        style={{ height: "calc(100vh - 260px)", minHeight: "320px" }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
            <Terminal size={28} className="text-zinc-700" />
            {logs.length === 0 ? (
              <div className="text-center">
                <p className="text-sm text-zinc-500">No logs yet</p>
                <p className="text-xs mt-1">Start a training run — output will stream here in real time</p>
              </div>
            ) : (
              <p className="text-sm">No lines match the current filter</p>
            )}
          </div>
        ) : (
          filtered.map((l, i) => (
            <div
              key={i}
              className="flex gap-2 items-baseline leading-5 hover:bg-zinc-900/60 rounded px-1 -mx-1 group"
            >
              {/* Timestamp */}
              <span className="text-zinc-600 shrink-0 tabular-nums select-none w-[72px]">
                {l.ts.split("T")[1]}
              </span>

              {/* Source badge */}
              <span className={`shrink-0 font-semibold ${srcTextColor(l.source)}`}>
                [{l.source}]
              </span>

              {/* Message — strip the [source] prefix the process prints itself */}
              <span className="text-zinc-300 break-all">
                {l.msg.replace(/^\[[^\]]+\]\s*/, "")}
              </span>
            </div>
          ))
        )}
      </div>
      </div>
    </PageShell>
  );
}
