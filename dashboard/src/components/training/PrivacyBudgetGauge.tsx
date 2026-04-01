import { Shield } from "lucide-react";

const DELTA = 1e-5;

function computeEpsilon(rounds: number, noiseMult: number): number {
  if (noiseMult <= 0 || rounds <= 0) return Infinity;
  const sigma2      = noiseMult * noiseMult;
  const logInvDelta = Math.log(1 / DELTA);
  let minEps = Infinity;
  for (let a = 1.01; a <= 1000; a += a < 20 ? 0.01 : a < 100 ? 0.1 : 1) {
    const eps = (rounds * a) / (2 * sigma2) + logInvDelta / (a - 1);
    if (eps < minEps) minEps = eps;
  }
  return minEps;
}

const PRIVACY_LEVELS = [
  {
    maxEps: 1, label: "Strong", color: "text-emerald-400",
    border: "border-emerald-500/30", bg: "bg-emerald-500/10",
    desc: "Tight guarantee — each client's data is well protected from adversarial inference.",
  },
  {
    maxEps: 3, label: "Good", color: "text-teal-400",
    border: "border-teal-500/30", bg: "bg-teal-500/10",
    desc: "Strong privacy in practice. Suitable for sensitive data in production deployments.",
  },
  {
    maxEps: 10, label: "Moderate", color: "text-amber-400",
    border: "border-amber-500/30", bg: "bg-amber-500/10",
    desc: "Acceptable for research. Increase DP Noise to tighten the budget.",
  },
  {
    maxEps: 50, label: "Weak", color: "text-orange-400",
    border: "border-orange-500/30", bg: "bg-orange-500/10",
    desc: "Marginal guarantee. Increase DP Noise significantly to strengthen privacy.",
  },
  {
    maxEps: Infinity, label: "None", color: "text-red-400",
    border: "border-red-500/30", bg: "bg-red-500/10",
    desc: "No meaningful DP guarantee. Set DP Noise > 0 to enable differential privacy.",
  },
] as const;

function getLevel(eps: number) {
  return PRIVACY_LEVELS.find((l) => eps <= l.maxEps) ?? PRIVACY_LEVELS[PRIVACY_LEVELS.length - 1];
}

const BAR_LO = Math.log(0.5);
const BAR_HI = Math.log(200);
function epsToPos(eps: number): number {
  return Math.max(0, Math.min(1, (Math.log(Math.max(eps, 0.5)) - BAR_LO) / (BAR_HI - BAR_LO)));
}

const BAR_TICKS = [
  { eps: 0.5, label: "0.5" },
  { eps: 1,   label: "1"   },
  { eps: 3,   label: "3"   },
  { eps: 10,  label: "10"  },
  { eps: 50,  label: "50"  },
  { eps: 200, label: "200" },
];

export function PrivacyBudgetGauge({ rounds, noiseMult }: { rounds: number; noiseMult: number }) {
  const eps    = computeEpsilon(rounds, noiseMult);
  const level  = getLevel(eps);
  const pos    = epsToPos(eps === Infinity ? 300 : eps);
  const epsStr = eps === Infinity ? "∞" : eps >= 100 ? eps.toFixed(0) : eps.toFixed(2);

  return (
    <div className={`col-span-full rounded-lg border ${level.border} bg-zinc-950/60 p-3 space-y-2.5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield size={13} className={level.color} />
          <span className="text-xs text-zinc-400 font-medium">Privacy Budget (ε-δ DP)</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${level.bg} ${level.border} ${level.color}`}>
          {level.label}
        </span>
      </div>

      <div className="flex items-end gap-5">
        <div>
          <p className="text-[9px] text-zinc-600 uppercase tracking-wide mb-0.5">ε (epsilon)</p>
          <p className={`text-2xl font-mono font-bold leading-none ${level.color}`}>{epsStr}</p>
        </div>
        <div>
          <p className="text-[9px] text-zinc-600 uppercase tracking-wide mb-0.5">δ (delta)</p>
          <p className="text-sm font-mono text-zinc-400 leading-none">10⁻⁵</p>
        </div>
        <p className="text-[10px] text-zinc-500 leading-snug flex-1">{level.desc}</p>
      </div>

      <div className="space-y-1">
        <div className="relative h-1.5 rounded-full"
          style={{ background: "linear-gradient(to right, #10b981 0%, #14b8a6 18%, #f59e0b 42%, #f97316 62%, #ef4444 100%)" }}>
          {eps !== Infinity && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-zinc-900 border-2 shadow-md transition-all duration-300"
              style={{ left: `calc(${pos * 100}% - 5px)`, borderColor: "white" }}
            />
          )}
        </div>
        <div className="relative h-3">
          {BAR_TICKS.map(({ eps: e, label }) => (
            <span
              key={label}
              className="absolute text-[9px] text-zinc-700 font-mono -translate-x-1/2"
              style={{ left: `${epsToPos(e) * 100}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
