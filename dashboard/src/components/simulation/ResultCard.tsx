import { motion } from "framer-motion";
import { Shield, ShieldAlert } from "lucide-react";
import type { SimEmail } from "./types";

interface ResultProps {
  email: SimEmail;
}

export function ResultCard({ email }: ResultProps) {
  const r      = email.result!;
  const isSpam = r.label === "spam";
  const top    = Object.entries(r.feature_breakdown)
    .filter(([, v]) => v > 0.02)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.95 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`rounded-2xl border p-4 h-full ${
        isSpam ? "border-red-500/40 bg-red-950/20" : "border-emerald-500/30 bg-emerald-950/10"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isSpam
            ? <ShieldAlert size={15} className="text-red-400" />
            : <Shield size={15} className="text-emerald-400" />}
          <span className={`text-sm font-bold tracking-wider ${isSpam ? "text-red-400" : "text-emerald-400"}`}>
            {r.label.toUpperCase()}
          </span>
        </div>
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
          className={`text-sm font-bold px-2 py-0.5 rounded-full ${
            isSpam ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"
          }`}
        >
          {(r.confidence * 100).toFixed(0)}%
        </motion.span>
      </div>

      <p className="text-xs text-zinc-400 truncate mb-3">{email.subject}</p>

      <div className="space-y-1.5">
        {top.map(([k, v], i) => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-600 truncate shrink-0" style={{ width: 96 }}>
              {k.replace(/_/g, " ")}
            </span>
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isSpam ? "bg-red-500" : "bg-emerald-500"}`}
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(v * 100, 100)}%` }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="text-[9px] text-zinc-600 w-5 text-right">{(v * 100).toFixed(0)}</span>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-zinc-700 font-mono mt-2.5">P(spam) = {r.spam_score.toFixed(3)}</p>
    </motion.div>
  );
}

export function EmptySlot() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800/60 h-full flex items-center justify-center min-h-[112px]">
      <span className="text-[10px] text-zinc-800 select-none">—</span>
    </div>
  );
}
