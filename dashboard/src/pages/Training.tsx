import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  trainingStatus, startTraining, stopTraining, resetTraining,
} from "../services/api";
import { API_BASE } from "../services/api";
import type { TrainingStatus, StartTrainingRequest, LogEntry } from "../services/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import {
  Play, Square, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, Circle, Send, Trash2, RotateCcw, Shield,
} from "lucide-react";
import PageShell from "../components/PageShell";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_CFG: StartTrainingRequest = {
  rounds:        10,
  local_epochs:  3,
  learning_rate: 0.005,
  algorithm:     "fedprox",
  mu:            0.05,
  clip_norm:     1.0,
  noise_mult:    0.01,
  min_clients:   2,
  lr_schedule:   "none",
};

const STATUS_COLOR: Record<string, string> = {
  idle:     "text-zinc-500",
  waiting:  "text-amber-400",
  training: "text-blue-400",
  finished: "text-emerald-400",
};

// Hash a source string to a stable color
const SOURCE_COLORS = [
  "text-amber-400", "text-emerald-400", "text-violet-400",
  "text-pink-400",  "text-orange-400",  "text-cyan-400",
];
function sourceColor(s: string): string {
  if (s === "server")     return "text-blue-400";
  if (s === "controller") return "text-zinc-400";
  const idx = s.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % SOURCE_COLORS.length;
  return SOURCE_COLORS[idx];
}

// ── Privacy budget (RDP Gaussian mechanism) ───────────────────────────────────

const DELTA = 1e-5;

/**
 * Compute (ε, δ)-DP budget for k rounds of the Gaussian mechanism.
 * Uses RDP: ε_RDP(α) = k·α/(2σ²), then converts via ε = min_{α>1} { ε_RDP + ln(1/δ)/(α−1) }
 */
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

// Log-scale bar ticks: ε ∈ [0.5, 200]
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

function PrivacyBudgetGauge({ rounds, noiseMult }: { rounds: number; noiseMult: number }) {
  const eps    = computeEpsilon(rounds, noiseMult);
  const level  = getLevel(eps);
  const pos    = epsToPos(eps === Infinity ? 300 : eps);
  const epsStr = eps === Infinity ? "∞" : eps >= 100 ? eps.toFixed(0) : eps.toFixed(2);

  return (
    <div className={`col-span-2 rounded-lg border ${level.border} bg-zinc-950/60 p-3 space-y-2.5`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield size={13} className={level.color} />
          <span className="text-xs text-zinc-400 font-medium">Privacy Budget (ε-δ DP)</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${level.bg} ${level.border} ${level.color}`}>
          {level.label}
        </span>
      </div>

      {/* Metrics */}
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

      {/* Log-scale gradient bar with marker */}
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
        {/* Tick labels */}
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function Training() {
  const [status,  setStatus]  = useState<TrainingStatus | null>(null);
  const [cfg,     setCfg]     = useState<StartTrainingRequest>(DEFAULT_CFG);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [logs,    setLogs]    = useState<LogEntry[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef  = useRef<HTMLDivElement>(null);

  // ── Polling ────────────────────────────────────────────────────────────────

  const poll = async () => {
    try {
      setStatus(await trainingStatus());
    } catch { /* server may not be up yet */ }
  };

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── SSE log stream ─────────────────────────────────────────────────────────

  useEffect(() => {
    const s = status?.status;
    if (s !== "training" && s !== "waiting") return;

    const es = new EventSource(`${API_BASE}/training/stream`);
    es.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data) as LogEntry;
        setLogs((prev) => [...prev.slice(-400), entry]);
      } catch { /* ignore malformed lines */ }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [status?.status]);

  // Auto-scroll log panel to bottom when new entries arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleStart = async () => {
    setBusy(true);
    setLogs([]);
    const tid = toast.loading("Starting federated training…");
    try {
      const res = await startTraining(cfg);
      await poll();
      toast.success(`Training started — ${res.clients?.length ?? ""} clients`, { id: tid });
    } catch (e: any) {
      const d = e.response?.data?.detail;
      toast.error(
        Array.isArray(d) ? d.map((x: any) => x.msg ?? JSON.stringify(x)).join("; ") : (d ?? "Failed to start"),
        { id: tid },
      );
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    const tid = toast.loading("Stopping training…");
    try {
      await stopTraining();
      await poll();
      toast.success("Training stopped", { id: tid });
    } catch (e: any) {
      const d = e.response?.data?.detail;
      toast.error(
        Array.isArray(d) ? d.map((x: any) => x.msg ?? JSON.stringify(x)).join("; ") : (d ?? "Failed to stop"),
        { id: tid },
      );
    } finally {
      setBusy(false);
    }
  };

  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = async () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    setConfirmReset(false);
    setBusy(true);
    const tid = toast.loading("Resetting…");
    try {
      const res = await resetTraining();
      setLogs([]);
      await poll();
      toast.success(`Reset complete — removed ${res.removed?.length ?? 0} files`, { id: tid });
    } catch (e: any) {
      const d = e.response?.data?.detail;
      toast.error(d ?? "Reset failed", { id: tid });
    } finally {
      setBusy(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const isRunning = status?.status === "training" || status?.status === "waiting";
  const chartData = (status?.rounds ?? []).map((r) => ({
    round:    r.round,
    loss:     r.avg_loss,
    accuracy: +(r.avg_accuracy * 100).toFixed(1),
  }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageShell
      title="Training"
      subtitle="Start federated learning across all configured clients."
    >

      {/* Status bar + round progress */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-xs text-zinc-500">Status</span>
              <p className={`text-sm font-medium capitalize ${STATUS_COLOR[status?.status ?? "idle"]}`}>
                {status?.status ?? "idle"}
              </p>
            </div>
            {status && status.total_rounds > 0 && (
              <>
                <div className="w-px h-8 bg-zinc-800" />
                <div>
                  <span className="text-xs text-zinc-500">Round</span>
                  <p className="text-sm font-mono font-medium text-zinc-200">
                    {status.current_round}<span className="text-zinc-600">/{status.total_rounds}</span>
                  </p>
                </div>
                <div className="w-px h-8 bg-zinc-800" />
                <div>
                  <span className="text-xs text-zinc-500">Best Accuracy</span>
                  <p className="text-sm font-medium text-emerald-400">
                    {status.rounds.length
                      ? `${Math.max(...status.rounds.map((r) => r.avg_accuracy * 100)).toFixed(1)}%`
                      : "—"}
                  </p>
                </div>
                <div className="w-px h-8 bg-zinc-800" />
                <div>
                  <span className="text-xs text-zinc-500">Latest Loss</span>
                  <p className="text-sm font-medium text-zinc-200">
                    {status.rounds.length ? status.rounds.at(-1)!.avg_loss.toFixed(4) : "—"}
                  </p>
                </div>
                {status.rounds.length >= 2 && (
                  <>
                    <div className="w-px h-8 bg-zinc-800" />
                    <div>
                      <span className="text-xs text-zinc-500">Δ Accuracy</span>
                      <p className={`text-sm font-medium ${
                        status.rounds.at(-1)!.avg_accuracy >= status.rounds[0].avg_accuracy
                          ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {((status.rounds.at(-1)!.avg_accuracy - status.rounds[0].avg_accuracy) * 100) >= 0 ? "+" : ""}
                        {((status.rounds.at(-1)!.avg_accuracy - status.rounds[0].avg_accuracy) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Reset button — confirm on first click */}
            {!isRunning && (
              <button
                onClick={handleReset} disabled={busy}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition disabled:opacity-50
                  border ${confirmReset
                    ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:border-zinc-500"}`}
                title="Delete all datasets and model files"
                onBlur={() => setConfirmReset(false)}
              >
                <RotateCcw size={13} />
                {confirmReset ? "Confirm reset?" : "Reset"}
              </button>
            )}
            {isRunning ? (
              <button
                onClick={handleStop} disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400
                           border border-red-500/20 text-sm hover:bg-red-500/20 transition disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                Stop
              </button>
            ) : (
              <button
                onClick={handleStart} disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                           text-white text-sm transition disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Start Training
              </button>
            )}
          </div>
        </div>

        {/* Visual round progress bar */}
        {status && status.total_rounds > 0 && (
          <div className="px-4 pb-3">
            <div className="flex gap-0.5">
              {(() => {
                const completedSet = new Set(status.rounds.map((r) => r.round));
                return Array.from({ length: status.total_rounds }, (_, i) => i + 1).map((r) => {
                  const done   = completedSet.has(r);
                  const active = !done && r === status.current_round && isRunning;
                  return (
                    <div
                      key={r}
                      title={`Round ${r}${done ? " — done" : active ? " — in progress" : ""}`}
                      className={`h-1 flex-1 rounded-sm transition-all duration-500 ${
                        done ? "bg-emerald-500" : active ? "bg-blue-400 animate-pulse" : "bg-zinc-800"
                      }`}
                    />
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Training pipeline steps */}
      {status && status.status !== "idle" && (() => {
        const s    = status.status;
        const done = s === "finished";
        const steps = [
          { label: "Configure",       done: true },
          { label: "Training rounds", done: done || s === "training", active: s === "waiting" || s === "training" },
          { label: "Model saved",     done: done },
          { label: "Distributed",     done: !!status.model_distributed },
        ];
        return (
          <div className="flex items-center gap-2 flex-wrap p-4 rounded-xl border border-zinc-800 bg-zinc-900">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                {i > 0 && <div className={`w-10 h-px ${step.done ? "bg-emerald-500" : "bg-zinc-700"}`} />}
                <div className="flex items-center gap-1.5">
                  {step.done
                    ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    : step.active
                    ? <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" />
                    : <Circle size={14} className="text-zinc-600 shrink-0" />}
                  <span className={`text-xs ${step.done ? "text-emerald-400" : step.active ? "text-blue-400" : "text-zinc-600"}`}>
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
            {status.model_distributed && (
              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Send size={12} className="text-emerald-400" />
                <span className="text-xs text-emerald-400">Model distributed to all clients</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Config panel */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-400
                     hover:text-zinc-200 transition"
          onClick={() => setCfgOpen(!cfgOpen)}
        >
          <span>Training Configuration</span>
          {cfgOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {cfgOpen && (
          <div className="px-4 pb-4 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
            {([
              { key: "rounds",        label: "Rounds",        type: "number", min: 1,      max: 100          },
              { key: "local_epochs",  label: "Local Epochs",  type: "number", min: 1,      max: 50           },
              { key: "learning_rate", label: "Learning Rate", type: "number", min: 0.0001, max: 1, step: 0.001 },
              { key: "mu",            label: "FedProx μ",     type: "number", min: 0,      max: 1, step: 0.01 },
              { key: "clip_norm",     label: "DP Clip Norm",  type: "number", min: 0.1,   max: 10, step: 0.1  },
              { key: "noise_mult",    label: "DP Noise",      type: "number", min: 0,      max: 1, step: 0.01 },
              { key: "min_clients",   label: "Min Clients",   type: "number", min: 1,      max: 10           },
            ] as const).map(({ key, label, ...props }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-zinc-500">{label}</label>
                <input
                  {...props}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100
                             text-sm focus:outline-none focus:border-blue-500"
                  value={(cfg as any)[key]}
                  onChange={(e) => setCfg({ ...cfg, [key]: parseFloat(e.target.value) || 0 })}
                />
              </div>
            ))}

            {/* Algorithm */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Algorithm</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100
                           text-sm focus:outline-none focus:border-blue-500"
                value={cfg.algorithm}
                onChange={(e) => setCfg({ ...cfg, algorithm: e.target.value as any })}
              >
                <option value="fedavg">FedAvg</option>
                <option value="fedprox">FedProx</option>
              </select>
            </div>

            {/* LR Schedule */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">LR Schedule</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100
                           text-sm focus:outline-none focus:border-blue-500"
                value={cfg.lr_schedule}
                onChange={(e) => setCfg({ ...cfg, lr_schedule: e.target.value as any })}
              >
                <option value="none">None (constant)</option>
                <option value="cosine">Cosine annealing</option>
                <option value="step">Step decay (÷2 every ⅓)</option>
              </select>
              <p className="text-[10px] text-zinc-600 leading-tight">
                {cfg.lr_schedule === "cosine" && `${cfg.learning_rate} → ${(cfg.learning_rate * 0.01).toFixed(4)} over ${cfg.rounds} rounds`}
                {cfg.lr_schedule === "step"   && `${cfg.learning_rate} → halves every ~${Math.floor(cfg.rounds / 3)} rounds`}
                {cfg.lr_schedule === "none"   && "Learning rate stays constant throughout training"}
              </p>
            </div>

            <PrivacyBudgetGauge rounds={cfg.rounds} noiseMult={cfg.noise_mult} />
          </div>
        )}
      </div>

      {/* Live log panel */}
      {(logs.length > 0 || isRunning) && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRunning && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
              )}
              <h2 className="text-sm font-medium text-zinc-300">Live Log</h2>
              <span className="text-xs text-zinc-600">{logs.length} lines</span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition"
            >
              <Trash2 size={11} /> Clear
            </button>
          </div>

          <div
            ref={logRef}
            className="h-52 overflow-y-auto p-3 font-mono text-xs space-y-px scroll-smooth"
          >
            {logs.length === 0 ? (
              <p className="text-zinc-600">Waiting for processes to start…</p>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="flex gap-2 items-baseline leading-5">
                  <span className="text-zinc-600 shrink-0 tabular-nums">
                    {l.ts.split("T")[1]}
                  </span>
                  <span className={`shrink-0 font-semibold ${sourceColor(l.source)}`}>
                    [{l.source}]
                  </span>
                  <span className="text-zinc-400 break-all">
                    {/* strip the [source] prefix the process prints itself */}
                    {l.msg.replace(/^\[[^\]]+\]\s*/, "")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Convergence chart */}
      {chartData.length > 0 && (
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">Convergence</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="round" stroke="#52525b" tick={{ fontSize: 11 }}
                label={{ value: "Round", position: "insideBottom", offset: -2, fontSize: 11, fill: "#71717a" }}
              />
              <YAxis yAxisId="left"  stroke="#52525b" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#52525b" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left"  type="monotone" dataKey="loss"     stroke="#f87171" dot={false} strokeWidth={2} name="Loss" />
              <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#34d399" dot={false} strokeWidth={2} name="Accuracy %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Round history table */}
      {status && status.rounds.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300">Round History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-2 text-left text-zinc-500 font-normal">Round</th>
                  <th className="px-4 py-2 text-left text-zinc-500 font-normal">Avg Loss</th>
                  <th className="px-4 py-2 text-left text-zinc-500 font-normal">Avg Accuracy</th>
                  <th className="px-4 py-2 text-left text-zinc-500 font-normal">Clients</th>
                  <th className="px-4 py-2 text-left text-zinc-500 font-normal">Time</th>
                </tr>
              </thead>
              <tbody>
                {[...status.rounds].reverse().map((r) => (
                  <tr key={r.round} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-2 text-zinc-300 font-mono">#{r.round}</td>
                    <td className="px-4 py-2 text-zinc-300">{r.avg_loss.toFixed(4)}</td>
                    <td className="px-4 py-2 text-emerald-400">{(r.avg_accuracy * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2 text-zinc-500">{Object.keys(r.clients).join(", ")}</td>
                    <td className="px-4 py-2 text-zinc-600">{new Date(r.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
