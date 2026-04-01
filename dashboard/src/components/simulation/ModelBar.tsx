import { useNavigate } from "react-router-dom";
import { Cpu, Loader2 } from "lucide-react";
import type { ClientConfig, TrainingStatus } from "../../services/api";

interface Props {
  clients: ClientConfig[];
  clientId: string | null;
  onClientChange: (id: string) => void;
  trainStatus: TrainingStatus | null;
  statusLoading: boolean;
  locked: boolean;
}

export function ModelBar({ clients, clientId, onClientChange, trainStatus, statusLoading, locked }: Props) {
  const navigate     = useNavigate();
  const modelReady   = trainStatus?.model_distributed === true;
  const modelPending = trainStatus?.status === "training" || trainStatus?.status === "waiting";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex-wrap">
      <div className="flex items-center gap-2 shrink-0">
        <Cpu size={13} className="text-zinc-500" />
        <span className="text-xs text-zinc-500">Classify with:</span>
      </div>

      {statusLoading ? (
        <span className="text-xs text-zinc-600 flex items-center gap-1.5">
          <Loader2 size={11} className="animate-spin" /> Loading…
        </span>
      ) : clients.length === 0 ? (
        <span className="text-xs text-amber-400">No clients — add one first</span>
      ) : (
        <select
          value={clientId ?? ""}
          onChange={(e) => onClientChange(e.target.value)}
          disabled={locked}
          className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700
                     text-zinc-200 text-xs focus:outline-none focus:border-blue-500
                     disabled:opacity-50 cursor-pointer"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      <div className="ml-auto flex items-center gap-2">
        {statusLoading ? null : modelReady ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Model ready
          </span>
        ) : modelPending ? (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <Loader2 size={11} className="animate-spin" /> Training in progress…
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              No trained model
            </span>
            <button
              onClick={() => navigate("/training")}
              className="text-xs text-blue-400 hover:text-blue-300 transition underline underline-offset-2"
            >
              Train now →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
