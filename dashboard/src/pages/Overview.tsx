import { useState } from "react";
import { toast } from "sonner";
import { Activity, Users, BarChart2, RefreshCw, Square, Clock } from "lucide-react";

import StatCard          from "../components/ui/StatCard";
import StatusBadge       from "../components/ui/StatusBadge";
import ProgressBar       from "../components/ui/ProgressBar";
import ActivityLog       from "../components/overview/ActivityLog";
import MiniChart         from "../components/overview/MiniChart";
import TrainingConfigPanel from "../components/overview/TrainingConfigPanel";
import ActiveConfigStrip from "../components/overview/ActiveConfigStrip";
import PausedBanner      from "../components/overview/PausedBanner";
import FinishedBanner    from "../components/overview/FinishedBanner";

import { type FLStatus, stopTraining } from "../services/api";
import { type ActivityEvent } from "../hooks/useFL";

interface Props {
  data:   FLStatus;
  events: ActivityEvent[];
  eta:    number | null;
}

export default function Overview({ data, events, eta }: Props) {
  const [stopping,   setStopping]   = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const isActive = data.state === "round_open" || data.state === "aggregating";
  const isPaused = data.state === "waiting" && data.current_round > 0;

  const progress = data.total_rounds > 0
    ? ((data.current_round - 1) / data.total_rounds) * 100
    : 0;

  const latestMetric = data.metrics.at(-1);

  const formatEta = (s: number) =>
    s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  const handleStop = () => {
    setStopping(true);
    toast.promise(stopTraining(), {
      loading: "Pausing training...",
      success: "Training paused. Weights preserved — you can resume.",
      error:   "Failed to pause training",
    });
    setStopping(false);
  };

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Overview</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Live federated learning session</p>
        </div>
        <div className="flex items-center gap-3">
          {eta !== null && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <Clock size={12} />
              <span>ETA {formatEta(eta)}</span>
            </div>
          )}
          <StatusBadge state={data.state} />
          {isActive && (
            <button
              onClick={handleStop} disabled={stopping}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20
                         border border-amber-500/30 text-amber-400 text-xs font-medium rounded-lg
                         transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Square size={11} />
              {stopping ? "Pausing…" : "Pause"}
            </button>
          )}
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current Round" value={data.current_round} icon={RefreshCw}
          sub={`/ ${data.total_rounds}`} accent="blue" />
        <StatCard label="Clients"       value={data.registered_clients}     icon={Users}    accent="amber" />
        <StatCard label="Submissions"   value={data.submissions_this_round} icon={Activity}
          sub={`/ ${data.registered_clients}`} accent="emerald" />
        <StatCard label="Best Accuracy"
          value={latestMetric?.avg_accuracy != null
            ? `${(latestMetric.avg_accuracy * 100).toFixed(1)}%` : "—"}
          icon={BarChart2} accent="blue" />
      </div>

      {/* ── Round progress bar ─────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <ProgressBar
          value={progress}
          color="blue"
          labelLeft="Round progress"
          labelRight={`${data.current_round} / ${data.total_rounds}`}
          footer={["0", String(data.total_rounds)]}
        />
      </div>

      {/* ── Active config strip ────────────────────────────────────────── */}
      {data.training_config && <ActiveConfigStrip config={data.training_config} />}

      {/* ── Charts + Activity log ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {data.metrics.length > 0 ? (
            <>
              <MiniChart title="Loss"     dataKey="avg_loss"
                color="#3b82f6" metrics={data.metrics} format={(v) => v.toFixed(4)} />
              <MiniChart title="Accuracy" dataKey="avg_accuracy"
                color="#34d399" metrics={data.metrics} format={(v) => `${(v * 100).toFixed(1)}%`} />
            </>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
              <p className="text-zinc-500 text-sm">Charts will appear once the first round completes.</p>
            </div>
          )}
        </div>
        <ActivityLog events={events} />
      </div>

      {/* ── Paused banner (resume or new session) ─────────────────────── */}
      {isPaused && (
        <PausedBanner
          currentRound={data.current_round}
          totalRounds={data.total_rounds}
          onNewSession={() => setShowConfig((v) => !v)}
        />
      )}

      {/* ── Configure + Start panel ────────────────────────────────────── */}
      {(data.state === "waiting" && !isPaused) || showConfig ? (
        <TrainingConfigPanel
          title={isPaused ? "Configure New Session" : "Configure Training Session"}
        />
      ) : null}

      {/* ── Finished banner ────────────────────────────────────────────── */}
      {data.state === "finished" && (
        <FinishedBanner roundsCompleted={data.metrics.length} latestMetric={latestMetric} />
      )}

    </div>
  );
}
