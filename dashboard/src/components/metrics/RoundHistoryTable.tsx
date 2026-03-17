import { useState, useMemo, useEffect } from "react";
import { Download } from "lucide-react";
import { type RoundMetric } from "../../services/api";
import Delta from "./Delta";

type EnrichedMetric = RoundMetric & {
  loss_delta:     number | null;
  accuracy_delta: number | null;
};

interface Props {
  metrics:    EnrichedMetric[];
  clientIds?: string[]; // unused — tabs derived from per_client data instead
}

// Build per-client rows with deltas across rounds
function buildClientRows(metrics: EnrichedMetric[], clientId: string) {
  const rows = metrics
    .map((m) => ({ round: m.round, ...(m.per_client?.[clientId] ?? { loss: null, accuracy: null, num_samples: null }) }))
    .filter((r) => r.loss != null || r.accuracy != null);

  return rows.map((r, i) => {
    const prev = rows[i - 1];
    return {
      ...r,
      loss_delta:     prev && r.loss != null && prev.loss != null ? r.loss - prev.loss : null,
      accuracy_delta: prev && r.accuracy != null && prev.accuracy != null ? r.accuracy - prev.accuracy : null,
    };
  });
}

function bestRound(metrics: EnrichedMetric[]): number | null {
  const withAcc = metrics.filter((m) => m.avg_accuracy != null);
  if (withAcc.length === 0) return null;
  const best = withAcc.reduce((a, b) => {
    if (b.avg_accuracy! > a.avg_accuracy!) return b;
    if (b.avg_accuracy! === a.avg_accuracy!) {
      // tiebreak: lower loss wins
      if ((b.avg_loss ?? Infinity) < (a.avg_loss ?? Infinity)) return b;
    }
    return a;
  });
  return best.round;
}

export default function RoundHistoryTable({ metrics }: Props) {
  const [activeTab, setActiveTab] = useState<"all" | string>("all");
  const bestRoundNum = useMemo(() => bestRound(metrics), [metrics]);

  // Derive client list from historical per_client data — always accurate,
  // independent of who is currently registered (clientIds prop can be stale).
  const derivedClientIds = useMemo(() => {
    const ids = new Set<string>();
    metrics.forEach((m) => Object.keys(m.per_client ?? {}).forEach((id) => ids.add(id)));
    return Array.from(ids).sort();
  }, [metrics]);

  const tabs = ["all", ...derivedClientIds];

  const handleExport = () => {
    const fmt = (v: number | null | undefined, decimals: number) =>
      v != null ? v.toFixed(decimals) : "—";
    const fmtSigned = (v: number | null | undefined, decimals: number) =>
      v != null ? (v >= 0 ? `+${v.toFixed(decimals)}` : v.toFixed(decimals)) : "—";

    const header = "Round,Clients,Duration,Loss,Loss Delta,Accuracy,Acc Delta";
    const rows = metrics.map((m) => [
      m.round,
      m.num_clients,
      m.duration_seconds != null ? `${m.duration_seconds}s` : "—",
      fmt(m.avg_loss, 4),
      fmtSigned(m.loss_delta, 4),
      m.avg_accuracy != null ? `${(m.avg_accuracy * 100).toFixed(2)}%` : "—",
      fmtSigned(m.accuracy_delta, 4),
    ].join(","));

    const csv  = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "fl_metrics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset to "all" if active tab no longer exists in derived list
  useEffect(() => {
    if (activeTab !== "all" && !derivedClientIds.includes(activeTab)) {
      setActiveTab("all");
    }
  }, [derivedClientIds, activeTab]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header + tab bar */}
      <div className="px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-zinc-300">Round History</h2>
          {activeTab === "all" && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700
                         border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg
                         transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <Download size={11} />
              Export CSV
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs rounded-md font-mono transition-all duration-150 cursor-pointer
                ${activeTab === tab
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                }`}
            >
              {tab === "all" ? "All" : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        {activeTab === "all" ? (
          /* ── Global table (unchanged) ────────────────────────────────── */
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Round</th>
                <th className="px-5 py-3 text-left">Clients</th>
                <th className="px-5 py-3 text-right font-mono">Duration</th>
                <th className="px-5 py-3 text-right font-mono">Loss</th>
                <th className="px-5 py-3 text-right font-mono">Loss Delta</th>
                <th className="px-5 py-3 text-right font-mono">Accuracy</th>
                <th className="px-5 py-3 text-right font-mono">Acc Delta</th>
              </tr>
            </thead>
            <tbody>
              {[...metrics].reverse().map((m) => {
                const isBest = m.round === bestRoundNum;
                return (
                  <tr
                    key={m.round}
                    className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors
                      ${isBest ? "border-l-2 border-l-amber-400 bg-amber-500/5" : ""}`}
                  >
                    <td className="px-5 py-3 font-mono text-zinc-300">
                      {isBest && <span className="mr-1 text-amber-400">★</span>}
                      {m.round}
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{m.num_clients}</td>
                    <td className="px-5 py-3 text-right font-mono text-zinc-500">
                      {m.duration_seconds != null ? `${m.duration_seconds}s` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-blue-400">
                      {m.avg_loss?.toFixed(4) ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Delta value={m.loss_delta} invert />
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-400">
                      {m.avg_accuracy != null ? `${(m.avg_accuracy * 100).toFixed(2)}%` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Delta value={m.accuracy_delta} percent />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* ── Per-client table ────────────────────────────────────────── */
          (() => {
            const rows = buildClientRows(metrics, activeTab);
            return rows.length === 0 ? (
              <p className="px-5 py-8 text-xs text-zinc-500 text-center">
                No data recorded for <span className="font-mono text-zinc-400">{activeTab}</span> yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Round</th>
                    <th className="px-5 py-3 text-right font-mono">Loss</th>
                    <th className="px-5 py-3 text-right font-mono">Loss Delta</th>
                    <th className="px-5 py-3 text-right font-mono">Accuracy</th>
                    <th className="px-5 py-3 text-right font-mono">Acc Delta</th>
                    <th className="px-5 py-3 text-right font-mono">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r) => (
                    <tr key={r.round} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-zinc-300">{r.round}</td>
                      <td className="px-5 py-3 text-right font-mono text-blue-400">
                        {r.loss?.toFixed(4) ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Delta value={r.loss_delta} invert />
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-400">
                        {r.accuracy != null ? `${(r.accuracy * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Delta value={r.accuracy_delta} percent />
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-zinc-500">
                        {r.num_samples != null ? r.num_samples.toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()
        )}
      </div>
    </div>
  );
}
