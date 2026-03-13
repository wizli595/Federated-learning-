import { useState } from "react";
import { toast } from "sonner";
import { Activity, Users, BarChart2, RefreshCw, Play, Clock, CheckCircle, Info, AlertTriangle, TriangleAlert } from "lucide-react";

const RECOMMENDED_INPUT_DIM  = 20;
const RECOMMENDED_NUM_CLASSES = 2;
import { ResponsiveContainer, LineChart, Line, Tooltip, CartesianGrid, YAxis, XAxis } from "recharts";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { type FLStatus, startTraining } from "../services/api";
import { type ActivityEvent } from "../hooks/useFL";

interface Props {
  data: FLStatus;
  events: ActivityEvent[];
  eta: number | null;
}

export default function Overview({ data, events, eta }: Props) {
  const [inputDim, setInputDim]     = useState(20);
  const [numClasses, setNumClasses] = useState(2);
  const [starting, setStarting]     = useState(false);

  const latestMetric = data.metrics.at(-1);
  const progress = data.total_rounds > 0
    ? ((data.current_round - 1) / data.total_rounds) * 100
    : 0;

  const handleStart = () => {
    setStarting(true);
    toast.promise(startTraining(inputDim, numClasses), {
      loading: "Starting training...",
      success: "Training started!",
      error: "Failed to start training",
    });
    setStarting(false);
  };

  const formatEta = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current Round" value={data.current_round}
          icon={RefreshCw} sub={`/ ${data.total_rounds}`} accent="blue" />
        <StatCard label="Clients" value={data.registered_clients} icon={Users} accent="amber" />
        <StatCard label="Submissions" value={data.submissions_this_round}
          sub={`/ ${data.registered_clients}`} icon={Activity} accent="emerald" />
        <StatCard
          label="Best Accuracy"
          value={latestMetric?.avg_accuracy != null
            ? `${(latestMetric.avg_accuracy * 100).toFixed(1)}%`
            : "—"
          }
          icon={BarChart2} accent="blue"
        />
      </div>

      {/* Round progress */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>Round progress</span>
          <span className="font-mono">{data.current_round} / {data.total_rounds}</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-600 mt-1.5">
          <span>0</span>
          <span>{data.total_rounds}</span>
        </div>
      </div>

      {/* Charts + Activity log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-4">
          {data.metrics.length > 0 ? (
            <>
              <MiniChart title="Loss" dataKey="avg_loss" color="#3b82f6"
                metrics={data.metrics} format={(v) => v.toFixed(4)} />
              <MiniChart title="Accuracy" dataKey="avg_accuracy" color="#34d399"
                metrics={data.metrics} format={(v) => `${(v * 100).toFixed(1)}%`} />
            </>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
              <p className="text-zinc-500 text-sm">Charts will appear once the first round completes.</p>
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-300">Activity Log</h2>
          </div>
          <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-zinc-800/50">
            {events.length === 0 ? (
              <p className="px-4 py-6 text-xs text-zinc-500 text-center">No events yet.</p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="px-4 py-2.5 flex gap-2.5 items-start">
                  <EventIcon type={e.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 leading-snug">{e.message}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">
                      {e.time.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Start panel */}
      {data.state === "waiting" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-zinc-300">Start Training Session</h2>

          <div className="flex flex-wrap gap-4 items-end">
            <label className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">Input dimensions</span>
                {inputDim !== RECOMMENDED_INPUT_DIM && (
                  <TriangleAlert size={11} className="text-amber-400" />
                )}
              </div>
              <input type="number" min={1} value={inputDim}
                onChange={(e) => setInputDim(Number(e.target.value))}
                className={`w-28 bg-zinc-800 border rounded-lg px-3 py-2 text-sm
                           text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono
                           ${inputDim !== RECOMMENDED_INPUT_DIM ? "border-amber-500/50" : "border-zinc-700"}`} />
              <span className="text-[10px] text-zinc-600 font-mono">recommended: {RECOMMENDED_INPUT_DIM}</span>
            </label>

            <label className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">Number of classes</span>
                {numClasses !== RECOMMENDED_NUM_CLASSES && (
                  <TriangleAlert size={11} className="text-amber-400" />
                )}
              </div>
              <input type="number" min={2} value={numClasses}
                onChange={(e) => setNumClasses(Number(e.target.value))}
                className={`w-28 bg-zinc-800 border rounded-lg px-3 py-2 text-sm
                           text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono
                           ${numClasses !== RECOMMENDED_NUM_CLASSES ? "border-amber-500/50" : "border-zinc-700"}`} />
              <span className="text-[10px] text-zinc-600 font-mono">recommended: {RECOMMENDED_NUM_CLASSES}</span>
            </label>

            <button onClick={handleStart} disabled={starting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500
                         disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm
                         font-medium rounded-lg transition-colors cursor-pointer mb-5">
              <Play size={14} />
              {starting ? "Starting..." : "Start Training"}
            </button>
          </div>

          {(inputDim !== RECOMMENDED_INPUT_DIM || numClasses !== RECOMMENDED_NUM_CLASSES) && (
            <div className="flex gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
              <TriangleAlert size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-300/80 space-y-1">
                <p className="font-medium text-amber-300">Values differ from client configuration</p>
                <p>
                  Clients are configured with{" "}
                  <span className="font-mono text-amber-200">input_dim={RECOMMENDED_INPUT_DIM}</span> and{" "}
                  <span className="font-mono text-amber-200">num_classes={RECOMMENDED_NUM_CLASSES}</span>.
                  Sending different values will cause a shape mismatch crash when clients load the global weights.
                </p>
                <p>
                  To use different values, regenerate the data with{" "}
                  <span className="font-mono text-amber-200">
                    --features {inputDim} --classes {numClasses}
                  </span>{" "}
                  and update <span className="font-mono text-amber-200">client_config.yaml</span> accordingly.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Finished banner */}
      {data.state === "finished" && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center">
          <p className="text-emerald-400 font-medium">
            Training complete — {data.metrics.length} rounds finished
          </p>
          {latestMetric && (
            <p className="text-zinc-400 text-sm mt-1">
              Final accuracy:{" "}
              <span className="font-mono text-emerald-300">
                {((latestMetric.avg_accuracy ?? 0) * 100).toFixed(2)}%
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EventIcon({ type }: { type: ActivityEvent["type"] }) {
  if (type === "success") return <CheckCircle size={13} className="text-emerald-400 mt-0.5 shrink-0" />;
  if (type === "warning") return <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />;
  return <Info size={13} className="text-blue-400 mt-0.5 shrink-0" />;
}

function MiniChart({ title, dataKey, color, metrics, format }: {
  title: string;
  dataKey: "avg_loss" | "avg_accuracy";
  color: string;
  metrics: FLStatus["metrics"];
  format: (v: number) => string;
}) {
  const latest = metrics.at(-1)?.[dataKey];
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-zinc-300">{title}</span>
        {latest != null && (
          <span className="font-mono text-xs text-zinc-400">{format(latest)}</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={metrics} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="round" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} tickFormatter={format} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#a1a1aa" }}
            itemStyle={{ color }}
            formatter={(v) => [format(Number(v)), title]}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
            dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
