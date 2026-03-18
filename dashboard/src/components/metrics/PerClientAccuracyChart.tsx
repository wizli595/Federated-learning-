import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { type RoundMetric } from "../../services/api";

const TOOLTIP_STYLE = {
  contentStyle: { background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: "#a1a1aa" },
};

const AXIS = {
  tick:     { fontSize: 11, fill: "#71717a" },
  tickLine: false as const,
  axisLine: false as const,
};

// Deterministic color per client ID (same palette logic as Logs.tsx)
const PALETTE = [
  "#22d3ee", // cyan
  "#34d399", // emerald
  "#f59e0b", // amber
  "#f472b6", // pink
  "#818cf8", // indigo
  "#fb7185", // rose
  "#a3e635", // lime
  "#e879f9", // fuchsia
];

function clientColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  return PALETTE[hash % PALETTE.length];
}

interface Props {
  metrics: RoundMetric[];
}

export default function PerClientAccuracyChart({ metrics }: Props) {
  // Collect all unique client IDs across all rounds
  const allClients = [...new Set(metrics.flatMap((m) => Object.keys(m.per_client)))].sort();

  if (allClients.length === 0) return null;

  // Build recharts data: [{round: 1, "client-a": 0.85, ...}, ...]
  const chartData = metrics.map((m) => {
    const row: Record<string, number | null | string> = { round: m.round };
    for (const id of allClients) {
      row[id] = m.per_client[id]?.accuracy ?? null;
    }
    return row;
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h2 className="text-sm font-medium text-zinc-300 mb-1">Per-Client Accuracy</h2>
      <p className="text-xs text-zinc-500 mb-5">Accuracy reported by each client after local training, per round</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 0, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="round" {...AXIS} label={{ value: "Round", position: "insideBottom", offset: -2, fill: "#52525b", fontSize: 11 }} />
          <YAxis {...AXIS} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v: number, name: string) => [`${(v * 100).toFixed(2)}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa", paddingTop: 12 }} />
          {allClients.map((id) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              name={id}
              stroke={clientColor(id)}
              strokeWidth={1.5}
              dot={{ fill: clientColor(id), r: 2.5 }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
