import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  trainingStatus,
  startTraining,
  stopTraining,
  resetTraining,
  listPortalClients,
} from "../services/api";
import { API_BASE } from "../services/api";
import type { PortalClient } from "../services/api";
import type {
  TrainingStatus,
  StartTrainingRequest,
  LogEntry,
  RoundMetric,
} from "../services/api";
import { useKafkaStream } from "../hooks/useKafkaStream";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Play,
  Square,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Send,
  RotateCcw,
  Users,
} from "lucide-react";
import PageShell from "../components/PageShell";
import { TrainingConfigPanel } from "../components/training/TrainingConfigPanel";
import { LiveLog } from "../components/training/LiveLog";
import { FederatedEvalPanel } from "../components/training/FederatedEvalPanel";
import { ConfusionMatrix } from "../components/training/ConfusionMatrix";

const DEFAULT_CFG: StartTrainingRequest = {
  rounds: 20,
  local_epochs: 5,
  learning_rate: 0.01,
  algorithm: "fedprox",
  mu: 0.1,
  clip_norm: 1.0,
  noise_mult: 0.01,
  min_clients: 2,
  lr_schedule: "cosine",
  finetune_epochs: 5,
};

const STATUS_COLOR: Record<string, string> = {
  idle: "text-zinc-500",
  waiting: "text-amber-400",
  training: "text-blue-400",
  finished: "text-emerald-400",
};

export default function Training() {
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [cfg, setCfg] = useState<StartTrainingRequest>(DEFAULT_CFG);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [portalClients, setPortalClients] = useState<PortalClient[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = async () => {
    try {
      setStatus(await trainingStatus());
    } catch {
      /* server may not be up */
    }
  };

  const pollPortal = async () => {
    try {
      setPortalClients(await listPortalClients());
    } catch {
      /* portal may not have any clients yet */
    }
  };

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    pollPortal();
    const id = setInterval(pollPortal, 10_000);
    return () => clearInterval(id);
  }, []);

  // Real-time Kafka push: merge Worker-aggregated rounds instantly (no 2 s lag)
  const handleKafkaRound = useCallback((data: unknown) => {
    const round = data as RoundMetric;
    if (!round?.round) return;
    setStatus((prev) => {
      if (!prev) return prev;
      const others = prev.rounds.filter((r) => r.round !== round.round);
      return {
        ...prev,
        rounds: [...others, round].sort((a, b) => a.round - b.round),
      };
    });
  }, []);

  const isActive = status?.status === "training" || status?.status === "waiting";
  useKafkaStream(isActive, handleKafkaRound);

  useEffect(() => {
    const s = status?.status;
    if (s !== "training" && s !== "waiting") return;
    const es = new EventSource(`${API_BASE}/training/stream`);
    es.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data) as LogEntry;
        setLogs((prev) => [...prev.slice(-400), entry]);
      } catch {
        /* ignore malformed */
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [status?.status]);

  const apiError = (e: unknown, fallback: string): string => {
    if (e && typeof e === "object" && "response" in e) {
      const detail = (e as { response: { data?: { detail?: unknown } } })
        .response.data?.detail;
      if (Array.isArray(detail))
        return detail
          .map((x) => (x as { msg?: string }).msg ?? JSON.stringify(x))
          .join("; ");
      if (typeof detail === "string") return detail;
    }
    return fallback;
  };

  const handleStart = async () => {
    setBusy(true);
    setLogs([]);
    const tid = toast.loading("Starting federated training…");
    try {
      const res = await startTraining(cfg);
      await poll();
      toast.success(`Training started — ${res.clients?.length ?? ""} clients`, {
        id: tid,
      });
    } catch (e) {
      toast.error(apiError(e, "Failed to start"), { id: tid });
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
    } catch (e) {
      toast.error(apiError(e, "Failed to stop"), { id: tid });
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    setBusy(true);
    const tid = toast.loading("Resetting…");
    try {
      const res = await resetTraining();
      setLogs([]);
      await poll();
      toast.success(
        `Reset complete — removed ${res.removed?.length ?? 0} files`,
        { id: tid },
      );
    } catch (e) {
      toast.error(apiError(e, "Reset failed"), { id: tid });
    } finally {
      setBusy(false);
    }
  };

  const isRunning =
    status?.status === "training" || status?.status === "waiting";
  const chartData = (status?.rounds ?? []).map((r) => ({
    round: r.round,
    loss: r.avg_loss,
    accuracy: +(r.avg_accuracy * 100).toFixed(1),
  }));

  return (
    <PageShell
      title="Training"
      subtitle="Start federated learning across all configured clients.">
      {/* Portal clients ready banner */}
      {portalClients.filter((c) => c.has_data).length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <Users size={15} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            <span className="font-semibold">
              {portalClients.filter((c) => c.has_data).length} portal client
              {portalClients.filter((c) => c.has_data).length !== 1 ? "s have" : " has"} uploaded data
            </span>{" "}
            and {portalClients.filter((c) => c.has_data).length !== 1 ? "are" : "is"} waiting for a training round.
          </p>
          <div className="ml-auto flex gap-1.5 shrink-0">
            {portalClients.filter((c) => c.has_data).map((c) => (
              <span key={c.client_id} className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-mono">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status bar + round progress */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-xs text-zinc-500">Status</span>
              <p
                className={`text-sm font-medium capitalize ${STATUS_COLOR[status?.status ?? "idle"]}`}>
                {status?.status ?? "idle"}
              </p>
            </div>
            {status && status.total_rounds > 0 && (
              <>
                <div className="w-px h-8 bg-zinc-800" />
                <div>
                  <span className="text-xs text-zinc-500">Round</span>
                  <p className="text-sm font-mono font-medium text-zinc-200">
                    {status.current_round}
                    <span className="text-zinc-600">
                      /{status.total_rounds}
                    </span>
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
                    {status.rounds.length
                      ? status.rounds.at(-1)!.avg_loss.toFixed(4)
                      : "—"}
                  </p>
                </div>
                {status.rounds.length >= 2 && (
                  <>
                    <div className="w-px h-8 bg-zinc-800" />
                    <div>
                      <span className="text-xs text-zinc-500">Δ Accuracy</span>
                      <p
                        className={`text-sm font-medium ${
                          status.rounds.at(-1)!.avg_accuracy >=
                          status.rounds[0].avg_accuracy
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}>
                        {(status.rounds.at(-1)!.avg_accuracy -
                          status.rounds[0].avg_accuracy) *
                          100 >=
                        0
                          ? "+"
                          : ""}
                        {(
                          (status.rounds.at(-1)!.avg_accuracy -
                            status.rounds[0].avg_accuracy) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isRunning && (
              <button
                onClick={handleReset}
                disabled={busy}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition disabled:opacity-50
                  border ${
                    confirmReset
                      ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:border-zinc-500"
                  }`}
                title="Delete all datasets and model files"
                onBlur={() => setConfirmReset(false)}>
                <RotateCcw size={13} />
                {confirmReset ? "Confirm reset?" : "Reset"}
              </button>
            )}
            {isRunning ? (
              <button
                onClick={handleStop}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400
                           border border-red-500/20 text-sm hover:bg-red-500/20 transition disabled:opacity-50">
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Square size={14} />
                )}
                Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                           text-white text-sm transition disabled:opacity-50">
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
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
                return Array.from(
                  { length: status.total_rounds },
                  (_, i) => i + 1,
                ).map((r) => {
                  const done = completedSet.has(r);
                  const active =
                    !done && r === status.current_round && isRunning;
                  return (
                    <div
                      key={r}
                      title={`Round ${r}${done ? " — done" : active ? " — in progress" : ""}`}
                      className={`h-1 flex-1 rounded-sm transition-all duration-500 ${
                        done
                          ? "bg-emerald-500"
                          : active
                            ? "bg-blue-400 animate-pulse"
                            : "bg-zinc-800"
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
      {status &&
        status.status !== "idle" &&
        (() => {
          const s = status.status;
          const done = s === "finished";
          const steps = [
            { label: "Configure", done: true },
            {
              label: "Training rounds",
              done: done || s === "training",
              active: s === "waiting" || s === "training",
            },
            { label: "Model saved", done: done },
            { label: "Distributed", done: !!status.model_distributed },
            ...((status.config?.finetune_epochs ?? 0) > 0
              ? [
                  {
                    label: "Personalized",
                    done: !!status.finetuning_complete,
                    active:
                      !!status.model_distributed && !status.finetuning_complete,
                  },
                ]
              : []),
          ];
          return (
            <div className="flex items-center gap-2 flex-wrap p-4 rounded-xl border border-zinc-800 bg-zinc-900">
              {steps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  {i > 0 && (
                    <div
                      className={`w-10 h-px ${step.done ? "bg-emerald-500" : "bg-zinc-700"}`}
                    />
                  )}
                  <div className="flex items-center gap-1.5">
                    {step.done ? (
                      <CheckCircle2
                        size={14}
                        className="text-emerald-400 shrink-0"
                      />
                    ) : step.active ? (
                      <Loader2
                        size={14}
                        className="text-blue-400 animate-spin shrink-0"
                      />
                    ) : (
                      <Circle size={14} className="text-zinc-600 shrink-0" />
                    )}
                    <span
                      className={`text-xs ${step.done ? "text-emerald-400" : step.active ? "text-blue-400" : "text-zinc-600"}`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              ))}
              {status.model_distributed && (
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Send size={12} className="text-emerald-400" />
                  <span className="text-xs text-emerald-400">
                    Model distributed to all clients
                  </span>
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
          onClick={() => setCfgOpen(!cfgOpen)}>
          <span>Training Configuration</span>
          {cfgOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {cfgOpen && <TrainingConfigPanel cfg={cfg} onChange={setCfg} />}
      </div>

      {/* Live log */}
      {(logs.length > 0 || isRunning) && (
        <LiveLog
          logs={logs}
          isRunning={isRunning}
          onClear={() => setLogs([])}
        />
      )}

      {/* Convergence chart */}
      {chartData.length > 0 && (
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            Convergence
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="round"
                stroke="#52525b"
                tick={{ fontSize: 11 }}
                label={{
                  value: "Round",
                  position: "insideBottom",
                  offset: -2,
                  fontSize: 11,
                  fill: "#71717a",
                }}
              />
              <YAxis yAxisId="left" stroke="#52525b" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#52525b"
                tick={{ fontSize: 11 }}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="loss"
                stroke="#f87171"
                dot={false}
                strokeWidth={2}
                name="Loss"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="accuracy"
                stroke="#34d399"
                dot={false}
                strokeWidth={2}
                name="Accuracy %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Confusion matrix */}
      {status && status.rounds.length > 0 && (
        <ConfusionMatrix rounds={status.rounds} />
      )}

      {/* Federated evaluation */}
      {status?.federated_eval && status.federated_eval.length > 0 && (
        <FederatedEvalPanel evalRounds={status.federated_eval} />
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
                  {["Round", "Avg Loss", "Avg Accuracy", "Clients", "Time"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left text-zinc-500 font-normal">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {[...status.rounds].reverse().map((r) => (
                  <tr
                    key={r.round}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-2 text-zinc-300 font-mono">
                      <span className="flex items-center gap-1.5">
                        #{r.round}
                        {r.source === "kafka" && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-violet-500/20
                                           text-violet-400 border border-violet-500/30 font-sans">
                            Worker
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-300">
                      {r.avg_loss.toFixed(4)}
                    </td>
                    <td className="px-4 py-2 text-emerald-400">
                      {(r.avg_accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {Object.keys(r.clients).join(", ")}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </td>
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
