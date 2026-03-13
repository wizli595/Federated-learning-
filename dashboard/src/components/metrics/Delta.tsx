import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  value:   number | null;
  invert?: boolean;
  percent?: boolean;
}

export default function Delta({ value, invert = false, percent = false }: Props) {
  if (value == null)
    return <span className="text-zinc-600 font-mono text-xs">—</span>;

  const better  = invert ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.0001;
  const display = percent
    ? `${value > 0 ? "+" : ""}${(value * 100).toFixed(3)}%`
    : `${value > 0 ? "+" : ""}${value.toFixed(4)}`;

  if (neutral)
    return (
      <span className="inline-flex items-center gap-1 text-zinc-500 font-mono text-xs">
        <Minus size={10} /> {display}
      </span>
    );

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs ${better ? "text-emerald-400" : "text-red-400"}`}>
      {better ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {display}
    </span>
  );
}
