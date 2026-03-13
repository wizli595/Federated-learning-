import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type FLStatus } from "../services/api";

interface Props {
  data: FLStatus;
}

export default function Metrics({ data }: Props) {
  const { metrics } = data;

  // Enrich metrics with deltas
  const enriched = metrics.map((m, i) => {
    const prev = metrics[i - 1];
    return {
      ...m,
      loss_delta:
        prev && m.avg_loss != null && prev.avg_loss != null
          ? m.avg_loss - prev.avg_loss
          : null,
      accuracy_delta:
        prev && m.avg_accuracy != null && prev.avg_accuracy != null
          ? m.avg_accuracy - prev.avg_accuracy
          : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Metrics</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Per-round training statistics
        </p>
      </div>

      {metrics.length === 0 ? (
        <Empty />
      ) : (
        <>
          {/* Combined chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-5">
              Loss & Accuracy — Combined
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart
                data={metrics}
                margin={{ top: 0, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  vertical={false}
                />
                <XAxis
                  dataKey="round"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="loss"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.toFixed(2)}
                />
                <YAxis
                  yAxisId="acc"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#a1a1aa" }}
                  formatter={(v: number, name: string) =>
                    name === "Loss"
                      ? [v.toFixed(4), name]
                      : [`${(v * 100).toFixed(2)}%`, name]
                  }
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 12,
                    color: "#a1a1aa",
                    paddingTop: 12,
                  }}
                />
                <Line
                  yAxisId="loss"
                  type="monotone"
                  dataKey="avg_loss"
                  name="Loss"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="acc"
                  type="monotone"
                  dataKey="avg_accuracy"
                  name="Accuracy"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ fill: "#34d399", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Accuracy improvement per round */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-5">
              Accuracy Gain per Round
            </h2>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart
                data={enriched.slice(1)}
                margin={{ top: 0, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  vertical={false}
                />
                <XAxis
                  dataKey="round"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#a1a1aa" }}
                  formatter={(v: number) => [
                    `${(v * 100).toFixed(3)}%`,
                    "Delta",
                  ]}
                />
                <Bar
                  dataKey="accuracy_delta"
                  name="Delta"
                  fill="#6366f1"
                  radius={[3, 3, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Round history table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-medium text-zinc-300">
                Round History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Round</th>
                    <th className="px-5 py-3 text-left">Clients</th>
                    <th className="px-5 py-3 text-right font-mono">Loss</th>
                    <th className="px-5 py-3 text-right font-mono">
                      Loss Delta
                    </th>
                    <th className="px-5 py-3 text-right font-mono">Accuracy</th>
                    <th className="px-5 py-3 text-right font-mono">
                      Acc Delta
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...enriched].reverse().map((m) => (
                    <tr
                      key={m.round}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-zinc-300">
                        {m.round}
                      </td>
                      <td className="px-5 py-3 text-zinc-400">
                        {m.num_clients}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-blue-400">
                        {m.avg_loss?.toFixed(4) ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Delta value={m.loss_delta} invert />
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-400">
                        {m.avg_accuracy != null
                          ? `${(m.avg_accuracy * 100).toFixed(2)}%`
                          : "—"}
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
        </>
      )}
    </div>
  );
}

function Delta({
  value,
  invert = false,
  percent = false,
}: {
  value: number | null;
  invert?: boolean;
  percent?: boolean;
}) {
  if (value == null)
    return <span className="text-zinc-600 font-mono text-xs">—</span>;

  const better = invert ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.0001;
  const display = percent
    ? `${value > 0 ? "+" : ""}${(value * 100).toFixed(3)}%`
    : `${value > 0 ? "+" : ""}${value.toFixed(4)}`;

  if (neutral)
    return (
      <span className="inline-flex items-center gap-1 text-zinc-500 font-mono text-xs">
        <Minus size={10} />
        {display}
      </span>
    );

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs ${better ? "text-emerald-400" : "text-red-400"}`}>
      {better ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {display}
    </span>
  );
}

function Empty() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
      <p className="text-zinc-500 text-sm">No rounds completed yet.</p>
      <p className="text-zinc-600 text-xs mt-1">
        Metrics will appear here once clients start training.
      </p>
    </div>
  );
}
