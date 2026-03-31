import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import {
  Trash2, ChevronDown, ChevronUp, FlaskConical, Trophy,
  Check, X, GitCompare,
} from "lucide-react";
import PageShell from "../components/PageShell";
import { listExperiments, deleteExperiment } from "../services/api";
import type { ExperimentRun } from "../services/api";

// ── Constants ───────────────────────────────────────────────────────────────────

const ALGO_COLOR: Record<string, string> = {
  fedavg:  "text-blue-400  bg-blue-400/10  border-blue-400/20",
  fedprox: "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

const RUN_A_COLOR = "#818cf8"; // indigo
const RUN_B_COLOR = "#fb923c"; // orange

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmtPct(v: number | null)  { return v == null ? "—" : `${(v * 100).toFixed(1)}%`; }
function fmtLoss(v: number | null) { return v == null ? "—" : v.toFixed(4); }
function fmtDate(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

// Merge per-round data from two runs onto a common round axis
function buildCompareChartData(a: ExperimentRun, b: ExperimentRun) {
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

// Params shown in the comparison table (display order)
const PARAM_DEFS: { key: keyof ExperimentRun; label: string; fmt: (v: ExperimentRun[keyof ExperimentRun]) => string }[] = [
  { key: "algorithm",     label: "Algorithm",      fmt: String },
  { key: "rounds",        label: "Rounds",          fmt: String },
  { key: "local_epochs",  label: "Local Epochs",    fmt: String },
  { key: "learning_rate", label: "Learning Rate",   fmt: (v) => Number(v).toFixed(4) },
  { key: "mu",            label: "FedProx μ",       fmt: (v) => Number(v).toFixed(3) },
  { key: "clip_norm",     label: "DP Clip Norm",    fmt: (v) => Number(v).toFixed(2) },
  { key: "noise_mult",    label: "DP Noise Mult",   fmt: (v) => Number(v).toFixed(3) },
  { key: "num_clients",   label: "Clients",         fmt: String },
];

// ── Main page ───────────────────────────────────────────────────────────────────

export default function ExperimentsPage() {
  const [runs,        setRuns]        = useState<ExperimentRun[]>([]);
  const [expanded,    setExpanded]    = useState<number | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [confirmId,   setConfirmId]   = useState<number | null>(null);
  const [deleting,    setDeleting]    = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selected,    setSelected]    = useState<number[]>([]);

  const load = async () => {
    try {
      setRuns(await listExperiments());
    } catch {
      toast.error("Failed to load experiments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    setDeleting(id);
    setConfirmId(null);
    try {
      await deleteExperiment(id);
      toast.success("Run deleted");
      setRuns((prev) => prev.filter((r) => r.id !== id));
      if (expanded === id) setExpanded(null);
      setSelected((prev) => prev.filter((sid) => sid !== id));
    } catch {
      toast.error("Failed to delete run");
    } finally {
      setDeleting(null);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2)  return [prev[1], id]; // slide window: drop oldest
      return [...prev, id];
    });
  };

  const toggleCompareMode = () => {
    setCompareMode((v) => {
      if (v) setSelected([]);
      return !v;
    });
    setExpanded(null);
  };

  // run with highest final_accuracy gets the trophy
  const bestId = runs.length
    ? runs.reduce((best, r) =>
        (r.final_accuracy ?? 0) > (best.final_accuracy ?? 0) ? r : best,
        runs[0],
      ).id
    : null;

  const compareRuns = useMemo(() => {
    if (selected.length !== 2) return null;
    const a = runs.find((r) => r.id === selected[0]);
    const b = runs.find((r) => r.id === selected[1]);
    if (!a || !b) return null;
    return { a, b, chartData: buildCompareChartData(a, b) };
  }, [selected, runs]);

  const SHELL_PROPS = {
    title: "Experiment History",
    subtitle: "Every completed training run is stored here. Compare params to find the best config.",
  };

  if (loading) return (
    <PageShell {...SHELL_PROPS}>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" />
        </div>
        <div className="p-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-zinc-800/70 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    </PageShell>
  );

  return (
    <PageShell {...SHELL_PROPS}>
      {runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border border-dashed
                        border-zinc-700 rounded-xl text-zinc-500 space-y-2">
          <FlaskConical size={28} className="text-zinc-700" />
          <p className="text-sm">No experiments yet — complete a training run first</p>
        </div>
      ) : (
        <div className="space-y-3">

          {/* ── Toolbar ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              {runs.length} run{runs.length !== 1 ? "s" : ""}
              {compareMode && selected.length > 0 && (
                <span className="ml-1 text-indigo-400">{selected.length}/2 selected</span>
              )}
            </p>
            <button
              onClick={toggleCompareMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition
                ${compareMode
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:border-zinc-600"
                }`}
            >
              <GitCompare size={13} />
              {compareMode ? "Exit Compare" : "Compare Runs"}
            </button>
          </div>

          {/* ── Runs table ────────────────────────────────────────────── */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {compareMode && (
              <div className="px-4 py-2 border-b border-zinc-800 bg-indigo-500/5 flex items-center gap-2">
                <GitCompare size={12} className="text-indigo-400" />
                <p className="text-xs text-indigo-300">
                  Click rows to select — select 2 runs to compare
                </p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {compareMode && <th className="px-3 py-2 w-8" />}
                    {["#", "Date", "Algorithm", "Rounds", "Epochs", "LR", "μ", "DP Noise", "Clients", "Final Acc", "Final Loss", ""].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-zinc-500 font-normal whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const isSelected = selected.includes(r.id);
                    const selIdx     = selected.indexOf(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-zinc-800/50 cursor-pointer transition
                          ${compareMode
                            ? isSelected
                              ? selIdx === 0
                                ? "bg-indigo-500/10 hover:bg-indigo-500/15"
                                : "bg-orange-500/10 hover:bg-orange-500/15"
                              : "hover:bg-zinc-800/30"
                            : expanded === r.id
                              ? "bg-zinc-800/40 hover:bg-zinc-800/30"
                              : "hover:bg-zinc-800/30"
                          }`}
                        onClick={() =>
                          compareMode
                            ? toggleSelect(r.id)
                            : setExpanded(expanded === r.id ? null : r.id)
                        }
                      >
                        {compareMode && (
                          <td className="px-3 py-2">
                            {isSelected ? (
                              <span
                                className="inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold text-white"
                                style={{ background: selIdx === 0 ? RUN_A_COLOR : RUN_B_COLOR }}
                              >
                                {selIdx === 0 ? "A" : "B"}
                              </span>
                            ) : (
                              <span className="inline-block w-4 h-4 rounded border border-zinc-700" />
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2 text-zinc-500 font-mono">
                          <div className="flex items-center gap-1">
                            {r.id === bestId && <Trophy size={11} className="text-amber-400" />}
                            {r.id}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{fmtDate(r.started_at)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-mono
                            ${ALGO_COLOR[r.algorithm] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}>
                            {r.algorithm}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-300 font-mono">{r.rounds}</td>
                        <td className="px-3 py-2 text-zinc-300 font-mono">{r.local_epochs}</td>
                        <td className="px-3 py-2 text-zinc-300 font-mono">{r.learning_rate}</td>
                        <td className="px-3 py-2 text-zinc-300 font-mono">{r.mu}</td>
                        <td className="px-3 py-2 text-zinc-300 font-mono">{r.noise_mult}</td>
                        <td className="px-3 py-2 text-zinc-300 font-mono">{r.num_clients}</td>
                        <td className="px-3 py-2">
                          <span className={`font-semibold font-mono
                            ${(r.final_accuracy ?? 0) >= 0.8 ? "text-emerald-400" :
                              (r.final_accuracy ?? 0) >= 0.65 ? "text-amber-400" : "text-red-400"}`}>
                            {fmtPct(r.final_accuracy)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-400 font-mono">{fmtLoss(r.final_loss)}</td>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          {!compareMode && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                                className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition"
                              >
                                {expanded === r.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                              {confirmId === r.id ? (
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => handleDelete(r.id)}
                                    disabled={deleting === r.id}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]
                                               bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                                  >
                                    <Check size={10} /> Yes
                                  </button>
                                  <button
                                    onClick={() => setConfirmId(null)}
                                    className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmId(r.id)}
                                  disabled={deleting === r.id}
                                  className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition disabled:opacity-40"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Compare panel (shown when 2 runs selected) ─────────────── */}
          {compareMode && compareRuns && (
            <ComparePanel
              a={compareRuns.a}
              b={compareRuns.b}
              chartData={compareRuns.chartData}
              bestId={bestId}
            />
          )}

          {/* ── Single-run detail (non-compare mode) ──────────────────── */}
          {!compareMode && expanded !== null && (() => {
            const run = runs.find((r) => r.id === expanded);
            if (!run) return null;
            const chartData = (run.metrics?.rounds ?? []).map((r) => ({
              round:    r.round,
              loss:     r.avg_loss,
              accuracy: +(r.avg_accuracy * 100).toFixed(1),
            }));

            return (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {run.id === bestId && <Trophy size={14} className="text-amber-400" />}
                    <h2 className="text-sm font-medium text-zinc-300">
                      Run #{run.id} — {run.algorithm.toUpperCase()} — {fmtPct(run.final_accuracy ?? 0)} accuracy
                    </h2>
                  </div>
                  <span className="text-xs text-zinc-600">{fmtDate(run.started_at)}</span>
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      ["Algorithm",    run.algorithm],
                      ["Rounds",       run.rounds],
                      ["Local epochs", run.local_epochs],
                      ["Learning rate",run.learning_rate],
                      ["FedProx μ",    run.mu],
                      ["DP clip norm", run.clip_norm],
                      ["DP noise",     run.noise_mult],
                      ["Clients",      run.num_clients],
                    ].map(([k, v]) => (
                      <div key={k as string} className="bg-zinc-800/60 rounded-lg p-2.5">
                        <p className="text-[10px] text-zinc-500">{k}</p>
                        <p className="text-xs font-mono text-zinc-200 mt-0.5">{String(v)}</p>
                      </div>
                    ))}
                  </div>

                  {chartData.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Convergence</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="round" stroke="#52525b" tick={{ fontSize: 10 }} />
                          <YAxis yAxisId="left"  stroke="#52525b" tick={{ fontSize: 10 }} />
                          <YAxis yAxisId="right" orientation="right" stroke="#52525b" tick={{ fontSize: 10 }} unit="%" />
                          <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line yAxisId="left"  type="monotone" dataKey="loss"     stroke="#f87171" dot={false} strokeWidth={1.5} name="Loss" />
                          <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#34d399" dot={false} strokeWidth={1.5} name="Accuracy %" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {run.metrics?.rounds?.length > 0 && (
                    <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-zinc-800">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-zinc-900">
                          <tr className="border-b border-zinc-800">
                            {["Round", "Avg Loss", "Avg Acc", "Clients"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-zinc-500 font-normal">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...run.metrics.rounds].reverse().map((r) => (
                            <tr key={r.round} className="border-b border-zinc-800/40">
                              <td className="px-3 py-1.5 text-zinc-400 font-mono">#{r.round}</td>
                              <td className="px-3 py-1.5 text-zinc-400">{r.avg_loss.toFixed(4)}</td>
                              <td className="px-3 py-1.5 text-emerald-400 font-semibold">{fmtPct(r.avg_accuracy)}</td>
                              <td className="px-3 py-1.5 text-zinc-500">{Object.keys(r.clients).join(", ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </PageShell>
  );
}

// ── ComparePanel ────────────────────────────────────────────────────────────────

interface ComparePanelProps {
  a: ExperimentRun;
  b: ExperimentRun;
  chartData: ReturnType<typeof buildCompareChartData>;
  bestId: number | null;
}

function ComparePanel({ a, b, chartData, bestId }: ComparePanelProps) {
  const winner = (a.final_accuracy ?? 0) >= (b.final_accuracy ?? 0) ? a : b;
  const loser  = winner.id === a.id ? b : a;
  const accDiff  = Math.abs((a.final_accuracy ?? 0) - (b.final_accuracy ?? 0)) * 100;
  const lossDiff = Math.abs((a.final_loss ?? 0) - (b.final_loss ?? 0));
  const aWinsLoss = (a.final_loss ?? 999) <= (b.final_loss ?? 999);

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-zinc-900 overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-indigo-500/5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitCompare size={14} className="text-indigo-400" />
          <h2 className="text-sm font-medium text-zinc-300">
            Run #{a.id} vs Run #{b.id}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: RUN_A_COLOR }} />
            Run #{a.id}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 rounded border-t-2 border-dashed" style={{ borderColor: RUN_B_COLOR }} />
            Run #{b.id}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-5">

        {/* Winner banner */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <Trophy size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-emerald-300">
              Run #{winner.id} wins
              <span className="ml-1 font-normal text-zinc-400">
                {fmtPct(winner.final_accuracy)} accuracy
                {accDiff > 0.05 && ` (+${accDiff.toFixed(1)} pp over Run #${loser.id})`}
              </span>
            </p>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">
              {winner.algorithm.toUpperCase()}
              {" · "}{winner.rounds} rounds
              {" · "}{winner.local_epochs} epochs
              {" · "}LR {winner.learning_rate}
              {winner.algorithm === "fedprox" && ` · μ ${winner.mu}`}
              {winner.noise_mult > 0 && ` · noise ${winner.noise_mult}`}
              {winner.id === bestId && " · overall best run"}
            </p>
          </div>
        </div>

        {/* Overlay charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Accuracy % — per round</p>
            <ResponsiveContainer width="100%" height={185}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="round"
                  stroke="#52525b"
                  tick={{ fontSize: 10 }}
                  label={{ value: "Round", position: "insideBottom", offset: -8, fontSize: 9, fill: "#71717a" }}
                />
                <YAxis stroke="#52525b" tick={{ fontSize: 10 }} unit="%" domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: unknown) => [`${v}%`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone" dataKey="acc_a"
                  stroke={RUN_A_COLOR} dot={false} strokeWidth={2}
                  name={`Run #${a.id}`} connectNulls
                />
                <Line
                  type="monotone" dataKey="acc_b"
                  stroke={RUN_B_COLOR} dot={false} strokeWidth={2}
                  name={`Run #${b.id}`} connectNulls strokeDasharray="6 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-2">Loss — per round</p>
            <ResponsiveContainer width="100%" height={185}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="round"
                  stroke="#52525b"
                  tick={{ fontSize: 10 }}
                  label={{ value: "Round", position: "insideBottom", offset: -8, fontSize: 9, fill: "#71717a" }}
                />
                <YAxis stroke="#52525b" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: unknown) => [typeof v === "number" ? v.toFixed(4) : String(v), ""] as [string, string]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone" dataKey="loss_a"
                  stroke={RUN_A_COLOR} dot={false} strokeWidth={2}
                  name={`Run #${a.id}`} connectNulls
                />
                <Line
                  type="monotone" dataKey="loss_b"
                  stroke={RUN_B_COLOR} dot={false} strokeWidth={2}
                  name={`Run #${b.id}`} connectNulls strokeDasharray="6 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Param comparison table */}
        <div>
          <p className="text-xs text-zinc-500 mb-2">Parameter comparison</p>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/40">
                  <th className="px-3 py-2 text-left text-zinc-500 font-normal w-32">Param</th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: RUN_A_COLOR }}>
                    Run #{a.id}{a.id === bestId && " 🏆"}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold" style={{ color: RUN_B_COLOR }}>
                    Run #{b.id}{b.id === bestId && " 🏆"}
                  </th>
                  <th className="px-3 py-2 text-left text-zinc-600 font-normal">Δ</th>
                </tr>
              </thead>
              <tbody>
                {PARAM_DEFS.map(({ key, label, fmt }) => {
                  const va = a[key];
                  const vb = b[key];
                  const sa = fmt(va);
                  const sb = fmt(vb);
                  const differs = sa !== sb;
                  const numDiff =
                    typeof va === "number" && typeof vb === "number"
                      ? Math.abs(va - vb)
                      : null;
                  return (
                    <tr key={key} className={`border-b border-zinc-800/40 ${differs ? "bg-zinc-800/20" : ""}`}>
                      <td className="px-3 py-2 text-zinc-500">{label}</td>
                      <td className={`px-3 py-2 font-mono ${differs ? "text-zinc-200 font-semibold" : "text-zinc-500"}`}>{sa}</td>
                      <td className={`px-3 py-2 font-mono ${differs ? "text-zinc-200 font-semibold" : "text-zinc-500"}`}>{sb}</td>
                      <td className="px-3 py-2 font-mono text-zinc-600">
                        {differs && numDiff != null
                          ? numDiff > 0.0001 ? `±${numDiff.toFixed(4)}` : "≠"
                          : differs ? "≠" : "—"}
                      </td>
                    </tr>
                  );
                })}
                {/* Outcome rows */}
                <tr className="border-b border-zinc-800/40 bg-zinc-800/30">
                  <td className="px-3 py-2 text-zinc-400 font-medium">Final Acc</td>
                  <td className={`px-3 py-2 font-mono font-semibold ${winner.id === a.id ? "text-emerald-400" : "text-zinc-500"}`}>
                    {fmtPct(a.final_accuracy)}{winner.id === a.id && " ✓"}
                  </td>
                  <td className={`px-3 py-2 font-mono font-semibold ${winner.id === b.id ? "text-emerald-400" : "text-zinc-500"}`}>
                    {fmtPct(b.final_accuracy)}{winner.id === b.id && " ✓"}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-500">
                    {accDiff > 0.05 ? `${accDiff.toFixed(1)} pp` : "≈ tie"}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-zinc-400 font-medium">Final Loss</td>
                  <td className={`px-3 py-2 font-mono font-semibold ${aWinsLoss ? "text-emerald-400" : "text-zinc-500"}`}>
                    {fmtLoss(a.final_loss)}{aWinsLoss && " ✓"}
                  </td>
                  <td className={`px-3 py-2 font-mono font-semibold ${!aWinsLoss ? "text-emerald-400" : "text-zinc-500"}`}>
                    {fmtLoss(b.final_loss)}{!aWinsLoss && " ✓"}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-500">
                    {lossDiff > 0.0001 ? `±${lossDiff.toFixed(4)}` : "≈ tie"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Best config recommendation */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold text-amber-300 mb-2.5">
            Recommended config — use Run #{winner.id}'s settings for your next run
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ["Algorithm",  winner.algorithm],
              ["Rounds",     winner.rounds],
              ["Epochs",     winner.local_epochs],
              ["LR",         winner.learning_rate],
              ...(winner.algorithm === "fedprox" ? [["μ (FedProx)", winner.mu]] : []),
              ["Clip Norm",  winner.clip_norm],
              ["Noise Mult", winner.noise_mult],
              ["Clients",    winner.num_clients],
            ] as [string, string | number][]).map(([k, v]) => (
              <div key={k} className="bg-zinc-800/70 rounded p-2">
                <p className="text-[9px] text-zinc-500 uppercase tracking-wide">{k}</p>
                <p className="text-xs font-mono text-zinc-100 font-semibold mt-0.5">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
