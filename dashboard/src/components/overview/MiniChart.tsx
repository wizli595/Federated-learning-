import {
  ResponsiveContainer, LineChart, Line,
  Tooltip, CartesianGrid, YAxis, XAxis,
} from "recharts";
import { type RoundMetric } from "../../services/api";

interface Props {
  title: string;
  dataKey: "avg_loss" | "avg_accuracy";
  color: string;
  metrics: RoundMetric[];
  format: (v: number) => string;
}

export default function MiniChart({ title, dataKey, color, metrics, format }: Props) {
  const latest = metrics.at(-1)?.[dataKey];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-zinc-300">{title}</span>
        {latest != null && (
          <span className="font-mono text-xs text-zinc-400">{format(latest)}</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={metrics} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="round" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} tickFormatter={format} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#a1a1aa" }}
            itemStyle={{ color }}
            formatter={(v) => [format(Number(v)), title]}
          />
          <Line
            type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
            dot={false} activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
