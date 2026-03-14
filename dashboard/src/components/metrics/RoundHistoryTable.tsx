import { useState } from "react";
import { type RoundMetric } from "../../services/api";
import Delta from "./Delta";

type EnrichedMetric = RoundMetric & {
  loss_delta:     number | null;
  accuracy_delta: number | null;
};

interface Props {
  metrics:   EnrichedMetric[];
  clientIds: string[];
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

export default function RoundHistoryTable({ metrics, clientIds }: Props) {
  const [activeTab, setActiveTab] = useState<"all" | string>("all");

  const tabs = ["all", ...clientIds];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header + tab bar */}
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Round History</h2>
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
                <th className="px-5 py-3 text-right font-mono">Loss</th>
                <th className="px-5 py-3 text-right font-mono">Loss Delta</th>
                <th className="px-5 py-3 text-right font-mono">Accuracy</th>
                <th className="px-5 py-3 text-right font-mono">Acc Delta</th>
              </tr>
            </thead>
            <tbody>
              {[...metrics].reverse().map((m) => (
                <tr key={m.round} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-zinc-300">{m.round}</td>
                  <td className="px-5 py-3 text-zinc-400">{m.num_clients}</td>
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
              ))}
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
