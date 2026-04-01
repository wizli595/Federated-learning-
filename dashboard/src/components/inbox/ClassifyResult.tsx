import { ShieldCheck } from "lucide-react";
import type { ClassifyResponse } from "../../services/api";
import { ConfidenceGauge } from "./ConfidenceGauge";
import { FEATURE_LABELS, SPAM_INDICATORS } from "./featureMeta";

interface Props {
  result: ClassifyResponse | null;
}

export function ClassifyResult({ result }: Props) {
  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6
                      rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50
                      min-h-80 px-8 py-10">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-2xl bg-zinc-700/20 scale-150" />
          <div className="relative w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/60
                          flex items-center justify-center">
            <ShieldCheck size={28} className="text-zinc-500" />
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <p className="text-sm font-semibold text-zinc-400">Awaiting email</p>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Compose manually or use a generated<br />sample, then click Classify
          </p>
        </div>

        <div className="w-full space-y-2 pt-2 border-t border-zinc-800/60">
          <p className="text-[10px] text-zinc-600 text-center mb-2">Classification threshold</p>
          <div className="relative h-2 rounded-full overflow-hidden"
               style={{ background: "linear-gradient(to right,#34d399,#fbbf24,#f87171)" }}>
            <div className="absolute top-0 h-full w-px bg-white/50" style={{ left: "40%" }} />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span className="text-emerald-600">0.00–0.40  Ham</span>
            <span className="text-red-600">0.40–1.00  Spam</span>
          </div>
        </div>
      </div>
    );
  }

  const isSpam = result.label === "spam";

  return (
    <div className="flex flex-col gap-4">
      {/* Verdict card */}
      <div className={`rounded-2xl border overflow-hidden
        ${isSpam
          ? "border-red-500/25 bg-gradient-to-b from-red-950/50 to-zinc-950"
          : "border-emerald-500/25 bg-gradient-to-b from-emerald-950/50 to-zinc-950"
        }`}>
        <div className={`h-0.5 ${isSpam
          ? "bg-gradient-to-r from-red-700 via-red-400 to-transparent"
          : "bg-gradient-to-r from-emerald-700 via-emerald-400 to-transparent"
        }`} />

        <div className="px-6 py-6 flex flex-col items-center gap-5">
          <ConfidenceGauge value={result.confidence} isSpam={isSpam} />

          <div className="text-center space-y-2">
            <p className={`text-5xl font-black uppercase tracking-[0.15em] font-mono
              ${isSpam ? "text-red-400" : "text-emerald-400"}`}>
              {result.label}
            </p>
            <p className="text-xs text-zinc-500">
              {(result.confidence * 100).toFixed(1)}% confidence
            </p>
            <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border font-mono
              ${result.model_type === "personalized"
                ? "text-violet-400 bg-violet-400/8 border-violet-400/20"
                : "text-zinc-500 bg-zinc-500/8 border-zinc-600/30"}`}>
              {result.model_type === "personalized" ? "✦ personalized model" : "◆ global model"}
            </span>
          </div>

          {/* Spam score gradient bar */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>Ham</span>
              <span className="text-zinc-400 font-mono">P(spam) = {result.spam_score.toFixed(3)}</span>
              <span>Spam</span>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden"
                 style={{ background: "linear-gradient(to right,#34d399,#fbbf24,#f87171)" }}>
              <div
                className="absolute top-0 w-1 h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-all duration-700"
                style={{ left: `calc(${result.spam_score * 100}% - 2px)` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feature breakdown */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-300">Feature Breakdown</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">20 extracted signals · no raw text shared</p>
        </div>
        <div className="divide-y divide-zinc-800/40 max-h-72 overflow-y-auto">
          {Object.entries(result.feature_breakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([key, val]) => {
              const hot = SPAM_INDICATORS.has(key) && val > 0.1;
              return (
                <div key={key} className="flex items-center justify-between px-5 py-2 hover:bg-zinc-900/40 transition-colors">
                  <span className={`text-xs ${hot ? "text-amber-400" : "text-zinc-500"}`}>
                    {FEATURE_LABELS[key] ?? key}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-28 bg-zinc-800 rounded-full h-1">
                      <div className={`h-1 rounded-full transition-all duration-500
                                       ${hot ? "bg-amber-400" : "bg-zinc-600"}`}
                           style={{ width: `${Math.min(val * 100, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-mono w-10 text-right
                                     ${hot ? "text-amber-400" : "text-zinc-600"}`}>
                      {val.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
