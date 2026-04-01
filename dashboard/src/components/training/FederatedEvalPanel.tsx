import { Users } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import type { FedEvalRound } from "../../services/api";

export function FederatedEvalPanel({ evalRounds }: { evalRounds: FedEvalRound[] }) {
  const latest  = evalRounds[evalRounds.length - 1];
  const clients = Object.entries(latest.clients).sort((a, b) => b[1].accuracy - a[1].accuracy);

  const chartData = evalRounds.map((r) => ({
    round:    r.round,
    accuracy: +(r.weighted_accuracy * 100).toFixed(1),
    loss:     r.weighted_loss,
  }));

  return (
    <div className="rounded-xl border border-blue-500/20 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-blue-400" />
          <h2 className="text-sm font-medium text-zinc-300">Federated Evaluation</h2>
          <span className="text-xs text-zinc-600">global model tested on every client's hold-out set</span>
        </div>
        <span className="text-xs text-zinc-600">round {latest.round}</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-800/60 rounded-lg p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Federated Accuracy</p>
            <p className={`text-2xl font-mono font-bold mt-1 ${
              latest.weighted_accuracy >= 0.8 ? "text-emerald-400" :
              latest.weighted_accuracy >= 0.65 ? "text-amber-400" : "text-red-400"
            }`}>
              {(latest.weighted_accuracy * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">weighted avg across {clients.length} clients</p>
          </div>
          <div className="bg-zinc-800/60 rounded-lg p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Federated Loss</p>
            <p className="text-2xl font-mono font-bold mt-1 text-zinc-300">
              {latest.weighted_loss.toFixed(4)}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">cross-entropy (unweighted)</p>
          </div>
          <div className="bg-zinc-800/60 rounded-lg p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Spam Detection</p>
            <p className="text-2xl font-mono font-bold mt-1 text-violet-400">
              {(latest.weighted_spam_rate * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">recall on spam class</p>
          </div>
        </div>

        {/* Per-client table */}
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-800/30">
            <p className="text-xs text-zinc-400 font-medium">Per-client results — round {latest.round}</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                {["Client", "Samples", "Accuracy", "Loss", "Spam Recall"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-zinc-500 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map(([cid, m]) => (
                <tr key={cid} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="px-3 py-2 font-mono text-zinc-300">{cid}</td>
                  <td className="px-3 py-2 text-zinc-500">{m.num_samples}</td>
                  <td className="px-3 py-2">
                    <span className={`font-semibold font-mono ${
                      m.accuracy >= 0.8 ? "text-emerald-400" :
                      m.accuracy >= 0.65 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {(m.accuracy * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-400 font-mono">{m.loss.toFixed(4)}</td>
                  <td className="px-3 py-2 text-violet-400 font-mono">{(m.spam_rate * 100).toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="bg-zinc-800/30">
                <td className="px-3 py-2 text-zinc-400 font-medium">Weighted avg</td>
                <td className="px-3 py-2 text-zinc-500">
                  {clients.reduce((s, [, m]) => s + m.num_samples, 0)}
                </td>
                <td className="px-3 py-2 font-semibold font-mono text-emerald-400">
                  {(latest.weighted_accuracy * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 font-mono text-zinc-400">{latest.weighted_loss.toFixed(4)}</td>
                <td className="px-3 py-2 font-mono text-violet-400">
                  {(latest.weighted_spam_rate * 100).toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Accuracy-over-rounds chart */}
        {chartData.length > 1 && (
          <div>
            <p className="text-xs text-zinc-500 mb-2">Federated accuracy over rounds</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 12, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="round" stroke="#52525b" tick={{ fontSize: 10 }}
                  label={{ value: "Round", position: "insideBottom", offset: -6, fontSize: 9, fill: "#71717a" }} />
                <YAxis stroke="#52525b" tick={{ fontSize: 10 }} unit="%" domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: unknown) => [`${v}%`, "Federated Accuracy"]}
                />
                <Line type="monotone" dataKey="accuracy" stroke="#60a5fa" dot={false}
                  strokeWidth={2} name="Federated Accuracy" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
