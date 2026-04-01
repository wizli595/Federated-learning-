import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { GitCompare, Trophy } from "lucide-react";
import type { ExperimentRun } from "../../services/api";
import {
  fmtPct, fmtLoss, RUN_A_COLOR, RUN_B_COLOR, PARAM_DEFS, buildCompareChartData,
} from "./helpers";

interface Props {
  a: ExperimentRun;
  b: ExperimentRun;
  chartData: ReturnType<typeof buildCompareChartData>;
  bestId: number | null;
}

export function ComparePanel({ a, b, chartData, bestId }: Props) {
  const winner   = (a.final_accuracy ?? 0) >= (b.final_accuracy ?? 0) ? a : b;
  const loser    = winner.id === a.id ? b : a;
  const accDiff  = Math.abs((a.final_accuracy ?? 0) - (b.final_accuracy ?? 0)) * 100;
  const lossDiff = Math.abs((a.final_loss ?? 0) - (b.final_loss ?? 0));
  const aWinsLoss = (a.final_loss ?? 999) <= (b.final_loss ?? 999);

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-zinc-900 overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-indigo-500/5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitCompare size={14} className="text-indigo-400" />
          <h2 className="text-sm font-medium text-zinc-300">Run #{a.id} vs Run #{b.id}</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: RUN_A_COLOR }} />
            Run #{a.id}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 rounded border-t-2 border-dashed" style={{ borderColor: RUN_B_COLOR }} />
            Run #{b.id}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-5">

        {/* Winner banner */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <Trophy size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-emerald-300">
              Run #{winner.id} wins
              <span className="ml-1 font-normal text-zinc-400">
                {fmtPct(winner.final_accuracy)} accuracy
                {accDiff > 0.05 && ` (+${accDiff.toFixed(1)} pp over Run #${loser.id})`}
              </span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">
              {winner.algorithm.toUpperCase()}
              {" · "}{winner.rounds} rounds
              {" · "}{winner.local_epochs} epochs
              {" · "}LR {winner.learning_rate}
              {winner.algorithm === "fedprox" && ` · μ ${winner.mu}`}
              {winner.noise_mult > 0 && ` · noise ${winner.noise_mult}`}
              {winner.id === bestId && " · overall best run"}
            </p>
          </div>
        </div>

        {/* Overlay charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Accuracy % — per round</p>
            <ResponsiveContainer width="100%" height={185}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="round" stroke="#52525b" tick={{ fontSize: 10 }}
                  label={{ value: "Round", position: "insideBottom", offset: -8, fontSize: 9, fill: "#71717a" }} />
                <YAxis stroke="#52525b" tick={{ fontSize: 10 }} unit="%" domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: unknown) => [`${v}%`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="acc_a" stroke={RUN_A_COLOR} dot={false} strokeWidth={2}
                  name={`Run #${a.id}`} connectNulls />
                <Line type="monotone" dataKey="acc_b" stroke={RUN_B_COLOR} dot={false} strokeWidth={2}
                  name={`Run #${b.id}`} connectNulls strokeDasharray="6 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-2">Loss — per round</p>
            <ResponsiveContainer width="100%" height={185}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="round" stroke="#52525b" tick={{ fontSize: 10 }}
                  label={{ value: "Round", position: "insideBottom", offset: -8, fontSize: 9, fill: "#71717a" }} />
                <YAxis stroke="#52525b" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: unknown) => [typeof v === "number" ? v.toFixed(4) : String(v), ""] as [string, string]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="loss_a" stroke={RUN_A_COLOR} dot={false} strokeWidth={2}
                  name={`Run #${a.id}`} connectNulls />
                <Line type="monotone" dataKey="loss_b" stroke={RUN_B_COLOR} dot={false} strokeWidth={2}
                  name={`Run #${b.id}`} connectNulls strokeDasharray="6 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Param comparison table */}
        <div>
          <p className="text-xs text-zinc-500 mb-2">Parameter comparison</p>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/40">
                  <th className="px-3 py-2 text-left text-zinc-500 font-normal w-32">Param</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: RUN_A_COLOR }}>
                    Run #{a.id}{a.id === bestId && " 🏆"}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: RUN_B_COLOR }}>
                    Run #{b.id}{b.id === bestId && " 🏆"}
                  </th>
                  <th className="px-3 py-2 text-left text-zinc-600 font-normal">Δ</th>
                </tr>
              </thead>
              <tbody>
                {PARAM_DEFS.map(({ key, label, fmt }) => {
                  const va = a[key];
                  const vb = b[key];
                  const sa = fmt(va);
                  const sb = fmt(vb);
                  const differs = sa !== sb;
                  const numDiff =
                    typeof va === "number" && typeof vb === "number"
                      ? Math.abs(va - vb) : null;
                  return (
                    <tr key={key} className={`border-b border-zinc-800/40 ${differs ? "bg-zinc-800/20" : ""}`}>
                      <td className="px-3 py-2 text-zinc-500">{label}</td>
                      <td className={`px-3 py-2 font-mono ${differs ? "text-zinc-200 font-semibold" : "text-zinc-500"}`}>{sa}</td>
                      <td className={`px-3 py-2 font-mono ${differs ? "text-zinc-200 font-semibold" : "text-zinc-500"}`}>{sb}</td>
                      <td className="px-3 py-2 font-mono text-zinc-600">
                        {differs && numDiff != null
                          ? numDiff > 0.0001 ? `±${numDiff.toFixed(4)}` : "≠"
                          : differs ? "≠" : "—"}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-b border-zinc-800/40 bg-zinc-800/30">
                  <td className="px-3 py-2 text-zinc-400 font-medium">Final Acc</td>
                  <td className={`px-3 py-2 font-mono font-semibold ${winner.id === a.id ? "text-emerald-400" : "text-zinc-500"}`}>
                    {fmtPct(a.final_accuracy)}{winner.id === a.id && " ✓"}
                  </td>
                  <td className={`px-3 py-2 font-mono font-semibold ${winner.id === b.id ? "text-emerald-400" : "text-zinc-500"}`}>
                    {fmtPct(b.final_accuracy)}{winner.id === b.id && " ✓"}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-500">
                    {accDiff > 0.05 ? `${accDiff.toFixed(1)} pp` : "≈ tie"}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-zinc-400 font-medium">Final Loss</td>
                  <td className={`px-3 py-2 font-mono font-semibold ${aWinsLoss ? "text-emerald-400" : "text-zinc-500"}`}>
                    {fmtLoss(a.final_loss)}{aWinsLoss && " ✓"}
                  </td>
                  <td className={`px-3 py-2 font-mono font-semibold ${!aWinsLoss ? "text-emerald-400" : "text-zinc-500"}`}>
                    {fmtLoss(b.final_loss)}{!aWinsLoss && " ✓"}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-500">
                    {lossDiff > 0.0001 ? `±${lossDiff.toFixed(4)}` : "≈ tie"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Best config recommendation */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold text-amber-300 mb-2.5">
            Recommended config — use Run #{winner.id}'s settings for your next run
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ["Algorithm",  winner.algorithm],
              ["Rounds",     winner.rounds],
              ["Epochs",     winner.local_epochs],
              ["LR",         winner.learning_rate],
              ...(winner.algorithm === "fedprox" ? [["μ (FedProx)", winner.mu]] : []),
              ["Clip Norm",  winner.clip_norm],
              ["Noise Mult", winner.noise_mult],
              ["Clients",    winner.num_clients],
            ] as [string, string | number][]).map(([k, v]) => (
              <div key={k} className="bg-zinc-800/70 rounded p-2">
                <p className="text-[9px] text-zinc-500 uppercase tracking-wide">{k}</p>
                <p className="text-xs font-mono text-zinc-100 font-semibold mt-0.5">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
