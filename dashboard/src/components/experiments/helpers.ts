import type { ExperimentRun } from "../../services/api";

export const ALGO_COLOR: Record<string, string> = {
  fedavg:  "text-blue-400  bg-blue-400/10  border-blue-400/20",
  fedprox: "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

export const RUN_A_COLOR = "#818cf8"; // indigo
export const RUN_B_COLOR = "#fb923c"; // orange

export function fmtPct(v: number | null)  { return v == null ? "—" : `${(v * 100).toFixed(1)}%`; }
export function fmtLoss(v: number | null) { return v == null ? "—" : v.toFixed(4); }
export function fmtDate(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

export function buildCompareChartData(a: ExperimentRun, b: ExperimentRun) {
  const ra = a.metrics?.rounds ?? [];
  const rb = b.metrics?.rounds ?? [];
  const maxRound = Math.max(
    ra.length > 0 ? Math.max(...ra.map((r) => r.round)) : 0,
    rb.length > 0 ? Math.max(...rb.map((r) => r.round)) : 0,
  );
  return Array.from({ length: maxRound }, (_, i) => {
    const round = i + 1;
    const ma = ra.find((r) => r.round === round);
    const mb = rb.find((r) => r.round === round);
    return {
      round,
      acc_a:  ma != null ? +(ma.avg_accuracy * 100).toFixed(1) : null,
      acc_b:  mb != null ? +(mb.avg_accuracy * 100).toFixed(1) : null,
      loss_a: ma != null ? ma.avg_loss : null,
      loss_b: mb != null ? mb.avg_loss : null,
    };
  });
}

export const PARAM_DEFS: { key: keyof ExperimentRun; label: string; fmt: (v: ExperimentRun[keyof ExperimentRun]) => string }[] = [
  { key: "algorithm",     label: "Algorithm",     fmt: String },
  { key: "rounds",        label: "Rounds",         fmt: String },
  { key: "local_epochs",  label: "Local Epochs",   fmt: String },
  { key: "learning_rate", label: "Learning Rate",  fmt: (v) => Number(v).toFixed(4) },
  { key: "mu",            label: "FedProx μ",      fmt: (v) => Number(v).toFixed(3) },
  { key: "clip_norm",     label: "DP Clip Norm",   fmt: (v) => Number(v).toFixed(2) },
  { key: "noise_mult",    label: "DP Noise Mult",  fmt: (v) => Number(v).toFixed(3) },
  { key: "num_clients",   label: "Clients",        fmt: String },
];
