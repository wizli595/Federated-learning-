import { type TrainingConfig } from "../../services/api";

function ConfigPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-600">{label}</span>
      <span className="font-mono text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">{value}</span>
    </div>
  );
}

export default function ActiveConfigStrip({ config }: { config: TrainingConfig }) {
  const algoLabel = config.algorithm === "fedprox"
    ? `FedProx μ=${config.mu ?? 0.1}`
    : "FedAvg";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 flex flex-wrap gap-6 animate-fade-in">
      <ConfigPill label="Rounds"    value={config.total_rounds} />
      <ConfigPill label="Epochs"    value={config.local_epochs} />
      <ConfigPill label="LR"        value={config.learning_rate} />
      <ConfigPill label="Input dim" value={config.input_dim} />
      <ConfigPill label="Classes"   value={config.num_classes} />
      <ConfigPill label="Algorithm" value={algoLabel} />
    </div>
  );
}
