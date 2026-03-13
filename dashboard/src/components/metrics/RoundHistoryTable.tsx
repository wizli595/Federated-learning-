import { type RoundMetric } from "../../services/api";
import Delta from "./Delta";

type EnrichedMetric = RoundMetric & {
  loss_delta:     number | null;
  accuracy_delta: number | null;
};

export default function RoundHistoryTable({ metrics }: { metrics: EnrichedMetric[] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-300">Round History</h2>
      </div>
      <div className="overflow-x-auto">
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
      </div>
    </div>
  );
}
