import type { RoundMetric } from "../../services/api";

interface Props {
  rounds: RoundMetric[];
}

function Cell({
  value, label, pct, color,
}: { value: number; label: string; pct: number; color: "emerald" | "red" | "amber" }) {
  const styles = {
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-emerald-600",
    red:     "bg-red-500/10     border-red-500/20     text-red-400     text-red-600",
    amber:   "bg-amber-500/10   border-amber-500/20   text-amber-400   text-amber-600",
  }[color].split(" ");

  return (
    <div className={`rounded-lg border p-3 text-center ${styles[0]} ${styles[1]}`}>
      <p className={`text-2xl font-bold font-mono ${styles[2]}`}>{value}</p>
      <p className={`text-[10px] mt-0.5 ${styles[3]}`}>{label}</p>
      <p className="text-[10px] text-zinc-600 mt-0.5">{pct.toFixed(1)}%</p>
    </div>
  );
}

export function ConfusionMatrix({ rounds }: Props) {
  if (!rounds.length) return null;

  const latest = rounds[rounds.length - 1];
  const { tp = 0, fp = 0, tn = 0, fn = 0, precision = 0, recall = 0, f1 = 0 } = latest;

  // Only render if confusion matrix data is present (new runs only)
  if (tp === 0 && fp === 0 && tn === 0 && fn === 0) return null;

  const total = tp + fp + tn + fn || 1;
  const f1Trend = rounds
    .filter((r) => r.f1 !== undefined)
    .map((r) => r.f1 as number);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">Confusion Matrix</h2>
          <p className="text-xs text-zinc-600 mt-0.5">
            Round {latest.round} · aggregated across all clients
          </p>
        </div>
        <div className="flex items-center gap-4">
          {[
            { label: "Precision", value: precision, color: "text-blue-400"    },
            { label: "Recall",    value: recall,    color: "text-violet-400"  },
            { label: "F1 Score",  value: f1,        color: "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-sm font-bold font-mono ${color}`}>
                {(value * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] text-zinc-600">{label}</p>
            </div>
          ))}
          {f1Trend.length > 1 && (
            <div className="flex items-end gap-px h-6 ml-2">
              {f1Trend.map((v, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-sm bg-emerald-500/60 transition-all"
                  style={{ height: `${Math.max(v * 100, 8)}%` }}
                  title={`R${i + 1}: F1=${(v * 100).toFixed(1)}%`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-[72px_1fr_1fr] gap-2 text-xs">
          {/* Header */}
          <div />
          <div className="text-center text-zinc-500 pb-1 font-medium">Predicted Ham</div>
          <div className="text-center text-zinc-500 pb-1 font-medium">Predicted Spam</div>

          {/* Row 1 — Actual Ham */}
          <div className="flex items-center text-zinc-500 font-medium pr-2">Actual Ham</div>
          <Cell value={tn} label="True Negative"  pct={(tn / total) * 100} color="emerald" />
          <Cell value={fp} label="False Positive" pct={(fp / total) * 100} color="red" />

          {/* Row 2 — Actual Spam */}
          <div className="flex items-center text-zinc-500 font-medium pr-2">Actual Spam</div>
          <Cell value={fn} label="False Negative" pct={(fn / total) * 100} color="amber" />
          <Cell value={tp} label="True Positive"  pct={(tp / total) * 100} color="emerald" />
        </div>

        <p className="text-[10px] text-zinc-700 mt-3 text-center">
          FP = ham misclassified as spam &nbsp;·&nbsp; FN = spam that slipped through
        </p>
      </div>
    </div>
  );
}
