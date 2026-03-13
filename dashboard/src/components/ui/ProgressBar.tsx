interface Props {
  value: number;
  color?: "blue" | "emerald";
  labelLeft?: string;
  labelRight?: string;
  footer?: [string, string];
}

export default function ProgressBar({
  value,
  color = "blue",
  labelLeft,
  labelRight,
  footer,
}: Props) {
  const bar = color === "emerald" ? "bg-emerald-500" : "bg-blue-500";
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div>
      {(labelLeft || labelRight) && (
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          {labelLeft  && <span>{labelLeft}</span>}
          {labelRight && <span className="font-mono">{labelRight}</span>}
        </div>
      )}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${bar} rounded-full transition-all duration-700`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {footer && (
        <div className="flex justify-between text-xs text-zinc-600 mt-1.5">
          <span>{footer[0]}</span>
          <span>{footer[1]}</span>
        </div>
      )}
    </div>
  );
}
