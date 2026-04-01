import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { FlaskConical, GitCompare } from "lucide-react";
import PageShell from "../components/PageShell";
import { listExperiments, deleteExperiment } from "../services/api";
import type { ExperimentRun } from "../services/api";
import { buildCompareChartData } from "../components/experiments/helpers";
import { RunsTable } from "../components/experiments/RunsTable";
import { ComparePanel } from "../components/experiments/ComparePanel";
import { RunDetail } from "../components/experiments/RunDetail";

const SHELL_PROPS = {
  title: "Experiment History",
  subtitle: "Every completed training run is stored here. Compare params to find the best config.",
};

export default function ExperimentsPage() {
  const [runs,        setRuns]        = useState<ExperimentRun[]>([]);
  const [expanded,    setExpanded]    = useState<number | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [confirmId,   setConfirmId]   = useState<number | null>(null);
  const [deleting,    setDeleting]    = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selected,    setSelected]    = useState<number[]>([]);

  useEffect(() => {
    listExperiments()
      .then(setRuns)
      .catch(() => toast.error("Failed to load experiments"))
      .finally(() => setLoading(false));
  }, []);

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
    } finally { setDeleting(null); }
  };

  const toggleSelect = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id)
      : prev.length >= 2 ? [prev[1], id]
      : [...prev, id]
    );

  const toggleCompareMode = () => {
    setCompareMode((v) => { if (v) setSelected([]); return !v; });
    setExpanded(null);
  };

  const handleExpand = (id: number) => setExpanded((prev) => (prev === id ? null : id));

  const bestId = runs.length
    ? runs.reduce((b, r) => (r.final_accuracy ?? 0) > (b.final_accuracy ?? 0) ? r : b, runs[0]).id
    : null;

  const compareRuns = useMemo(() => {
    if (selected.length !== 2) return null;
    const a = runs.find((r) => r.id === selected[0]);
    const b = runs.find((r) => r.id === selected[1]);
    return a && b ? { a, b, chartData: buildCompareChartData(a, b) } : null;
  }, [selected, runs]);

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
          {/* Toolbar */}
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
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:border-zinc-600"}`}
            >
              <GitCompare size={13} />
              {compareMode ? "Exit Compare" : "Compare Runs"}
            </button>
          </div>

          <RunsTable
            runs={runs}
            expanded={expanded}
            compareMode={compareMode}
            selected={selected}
            confirmId={confirmId}
            deleting={deleting}
            bestId={bestId}
            onExpand={handleExpand}
            onSelect={toggleSelect}
            onConfirm={setConfirmId}
            onDelete={handleDelete}
          />

          {compareMode && compareRuns && (
            <ComparePanel a={compareRuns.a} b={compareRuns.b}
              chartData={compareRuns.chartData} bestId={bestId} />
          )}

          {!compareMode && expanded !== null && (() => {
            const run = runs.find((r) => r.id === expanded);
            return run ? <RunDetail run={run} isBest={run.id === bestId} /> : null;
          })()}
        </div>
      )}
    </PageShell>
  );
}
