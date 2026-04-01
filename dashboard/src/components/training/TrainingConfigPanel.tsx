import type { StartTrainingRequest } from "../../services/api";
import { PrivacyBudgetGauge } from "./PrivacyBudgetGauge";

interface Props {
  cfg: StartTrainingRequest;
  onChange: (cfg: StartTrainingRequest) => void;
}

export function TrainingConfigPanel({ cfg, onChange }: Props) {
  return (
    <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 border-t border-zinc-800 pt-4">
      {([
        { key: "rounds",        label: "Rounds",        type: "number", min: 1,      max: 100           },
        { key: "local_epochs",  label: "Local Epochs",  type: "number", min: 1,      max: 50            },
        { key: "learning_rate", label: "Learning Rate", type: "number", min: 0.0001, max: 1,  step: 0.001 },
        { key: "mu",            label: "FedProx μ",     type: "number", min: 0,      max: 1,  step: 0.01  },
        { key: "clip_norm",     label: "DP Clip Norm",  type: "number", min: 0.1,    max: 10, step: 0.1   },
        { key: "noise_mult",    label: "DP Noise",      type: "number", min: 0,      max: 1,  step: 0.01  },
        { key: "min_clients",      label: "Min Clients",      type: "number", min: 1, max: 10 },
        { key: "finetune_epochs",  label: "Fine-tune Epochs", type: "number", min: 0, max: 10,
          title: "Local epochs after global model distribution (0 = disabled)" },
      ] as const).map(({ key, label, ...props }) => (
        <div key={key} className="space-y-1">
          <label className="text-xs text-zinc-500">{label}</label>
          <input
            {...props}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100
                       text-sm focus:outline-none focus:border-blue-500"
            value={(cfg as any)[key]}
            onChange={(e) => onChange({ ...cfg, [key]: parseFloat(e.target.value) || 0 })}
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
          onChange={(e) => onChange({ ...cfg, algorithm: e.target.value as any })}
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
          onChange={(e) => onChange({ ...cfg, lr_schedule: e.target.value as any })}
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
  );
}
