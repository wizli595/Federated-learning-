import { type FLStatus } from "../services/api";
import MetricsCharts          from "../components/metrics/MetricsCharts";
import RoundHistoryTable       from "../components/metrics/RoundHistoryTable";
import PerClientAccuracyChart  from "../components/metrics/PerClientAccuracyChart";
import RoundTimeline           from "../components/metrics/RoundTimeline";

export default function Metrics({ data }: { data: FLStatus }) {
  const { metrics, client_ids } = data;

  // Enrich with per-round deltas
  const enriched = metrics.map((m, i) => {
    const prev = metrics[i - 1];
    return {
      ...m,
      loss_delta:
        prev && m.avg_loss != null && prev.avg_loss != null
          ? m.avg_loss - prev.avg_loss : null,
      accuracy_delta:
        prev && m.avg_accuracy != null && prev.avg_accuracy != null
          ? m.avg_accuracy - prev.avg_accuracy : null,
    };
  });

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Metrics</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Per-round training statistics</p>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      {metrics.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">No rounds completed yet.</p>
          <p className="text-zinc-600 text-xs mt-1">
            Metrics will appear here once clients start training.
          </p>
        </div>
      ) : (
        <>
          <MetricsCharts   metrics={metrics} enriched={enriched} />
          <PerClientAccuracyChart metrics={metrics} />
          <RoundTimeline metrics={metrics} />
          <RoundHistoryTable metrics={enriched} clientIds={client_ids} />
        </>
      )}

    </div>
  );
}
