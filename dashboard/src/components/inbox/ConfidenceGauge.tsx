import { ShieldAlert, ShieldCheck } from "lucide-react";

export function ConfidenceGauge({ value, isSpam }: { value: number; isSpam: boolean }) {
  const R     = 40;
  const CIRC  = 2 * Math.PI * R;
  const color = isSpam ? "#f87171" : "#34d399";
  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#27272a" strokeWidth="8" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - value)}
          strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 8px ${color}88)`, transition:"stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {isSpam
          ? <ShieldAlert size={18} className="text-red-400" />
          : <ShieldCheck size={18} className="text-emerald-400" />
        }
        <span className={`text-2xl font-black font-mono leading-none ${isSpam ? "text-red-400" : "text-emerald-400"}`}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
