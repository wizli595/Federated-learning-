import {
  ResponsiveContainer, ComposedChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { type RoundMetric } from "../../services/api";

// Shared style constants — change once, applies to all charts
const TOOLTIP_STYLE = {
  contentStyle: { background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: "#a1a1aa" },
};

const AXIS = {
  tick:     { fontSize: 11, fill: "#71717a" },
  tickLine: false as const,
  axisLine: false as const,
};

type EnrichedMetric = RoundMetric & { accuracy_delta: number | null };

interface Props {
  metrics:  RoundMetric[];
  enriched: EnrichedMetric[];
}

export default function MetricsCharts({ metrics, enriched }: Props) {
  return (
    <div className="space-y-4">
      {/* Combined loss + accuracy */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-300 mb-5">Loss & Accuracy — Combined</h2>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={metrics} margin={{ top: 0, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="round" {...AXIS} />
            <YAxis yAxisId="loss" {...AXIS} tickFormatter={(v) => v.toFixed(2)} />
            <YAxis yAxisId="acc"  {...AXIS} orientation="right" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v: number, name: string) =>
                name === "Loss" ? [v.toFixed(4), name] : [`${(v * 100).toFixed(2)}%`, name]
              }
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa", paddingTop: 12 }} />
            <Line yAxisId="loss" type="monotone" dataKey="avg_loss"     name="Loss"
              stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} activeDot={{ r: 5 }} />
            <Line yAxisId="acc"  type="monotone" dataKey="avg_accuracy" name="Accuracy"
              stroke="#34d399" strokeWidth={2} dot={{ fill: "#34d399", r: 3 }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Accuracy gain per round */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-300 mb-5">Accuracy Gain per Round</h2>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={enriched.slice(1)} margin={{ top: 0, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="round" {...AXIS} />
            <YAxis {...AXIS} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v: number) => [`${(v * 100).toFixed(3)}%`, "Delta"]}
            />
            <Bar dataKey="accuracy_delta" name="Delta" fill="#6366f1" radius={[3, 3, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
