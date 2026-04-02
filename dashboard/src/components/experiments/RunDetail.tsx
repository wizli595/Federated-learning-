import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { Trophy, FileDown } from "lucide-react";
import type { ExperimentRun } from "../../services/api";
import { fmtPct, fmtDate, exportRunPdf } from "./helpers";

interface Props {
  run: ExperimentRun;
  isBest: boolean;
}

export function RunDetail({ run, isBest }: Props) {
  const chartData = (run.metrics?.rounds ?? []).map((r) => ({
    round:    r.round,
    loss:     r.avg_loss,
    accuracy: +(r.avg_accuracy * 100).toFixed(1),
  }));

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBest && <Trophy size={14} className="text-amber-400" />}
          <h2 className="text-sm font-medium text-zinc-300">
            Run #{run.id} — {run.algorithm.toUpperCase()} — {fmtPct(run.final_accuracy ?? 0)} accuracy
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600">{fmtDate(run.started_at)}</span>
          <button
            onClick={() => exportRunPdf(run)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border
                       bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:border-zinc-500 transition"
            title="Export PDF report"
          >
            <FileDown size={12} /> PDF
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {([
            ["Algorithm",    run.algorithm],
            ["Rounds",       run.rounds],
            ["Local epochs", run.local_epochs],
            ["Learning rate",run.learning_rate],
            ["FedProx μ",    run.mu],
            ["DP clip norm", run.clip_norm],
            ["DP noise",     run.noise_mult],
            ["Clients",      run.num_clients],
          ] as [string, string | number][]).map(([k, v]) => (
            <div key={k} className="bg-zinc-800/60 rounded-lg p-2.5">
              <p className="text-[10px] text-zinc-500">{k}</p>
              <p className="text-xs font-mono text-zinc-200 mt-0.5">{String(v)}</p>
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 mb-2">Convergence</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="round" stroke="#52525b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left"  stroke="#52525b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#52525b" tick={{ fontSize: 10 }} unit="%" />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left"  type="monotone" dataKey="loss"     stroke="#f87171" dot={false} strokeWidth={1.5} name="Loss" />
                <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#34d399" dot={false} strokeWidth={1.5} name="Accuracy %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {run.metrics?.rounds?.length > 0 && (
          <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-900">
                <tr className="border-b border-zinc-800">
                  {["Round", "Avg Loss", "Avg Acc", "Clients"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-zinc-500 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...run.metrics.rounds].reverse().map((r) => (
                  <tr key={r.round} className="border-b border-zinc-800/40">
                    <td className="px-3 py-1.5 text-zinc-400 font-mono">#{r.round}</td>
                    <td className="px-3 py-1.5 text-zinc-400">{r.avg_loss.toFixed(4)}</td>
                    <td className="px-3 py-1.5 text-emerald-400 font-semibold">{fmtPct(r.avg_accuracy)}</td>
                    <td className="px-3 py-1.5 text-zinc-500">{Object.keys(r.clients).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
