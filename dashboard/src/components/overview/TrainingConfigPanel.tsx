import { useState } from "react";
import { toast } from "sonner";
import { Play, TriangleAlert } from "lucide-react";
import { startTraining } from "../../services/api";

// ── constants ────────────────────────────────────────────────────────────────
const RECOMMENDED_INPUT_DIM   = 20;
const RECOMMENDED_NUM_CLASSES = 2;

// ── local helpers ─────────────────────────────────────────────────────────────
function Field({
  label, warn = false, hint, children,
}: {
  label: string; warn?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500">{label}</span>
        {warn && <TriangleAlert size={11} className="text-amber-400" />}
      </div>
      {children}
      {hint && <span className="text-[10px] text-zinc-600 font-mono">{hint}</span>}
    </label>
  );
}

const inputCls = (warn: boolean) =>
  `w-28 bg-zinc-800 border rounded-lg px-3 py-2 text-sm text-zinc-100
   focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono
   ${warn ? "border-amber-500/50" : "border-zinc-700"}`;

// ── component ─────────────────────────────────────────────────────────────────
interface Props {
  title?:        string;
  disableStart?: boolean;        // true while waiting room not full
  disableReason?: string;        // tooltip/label shown on the button
}

export default function TrainingConfigPanel({
  title = "Configure Training Session",
  disableStart = false,
  disableReason = "Waiting for clients…",
}: Props) {
  const [inputDim,     setInputDim]     = useState(20);
  const [numClasses,   setNumClasses]   = useState(2);
  const [rounds,       setRounds]       = useState(10);
  const [localEpochs,  setLocalEpochs]  = useState(5);
  const [learningRate, setLearningRate] = useState(0.01);
  const [algorithm,    setAlgorithm]    = useState<"fedavg" | "fedprox">("fedavg");
  const [mu,           setMu]           = useState(0.1);
  const [starting,     setStarting]     = useState(false);

  const mismatch = inputDim !== RECOMMENDED_INPUT_DIM || numClasses !== RECOMMENDED_NUM_CLASSES;

  const handleStart = () => {
    setStarting(true);
    toast.promise(startTraining(inputDim, numClasses, rounds, localEpochs, learningRate, algorithm, mu), {
      loading: "Starting training...",
      success: "Training started!",
      error:   "Failed to start training",
    });
    setStarting(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
      <h2 className="text-sm font-medium text-zinc-300">{title}</h2>

      {/* Model params */}
      <div>
        <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3">Model</p>
        <div className="flex flex-wrap gap-4">
          <Field label="Input dimensions" warn={inputDim !== RECOMMENDED_INPUT_DIM} hint={`recommended: ${RECOMMENDED_INPUT_DIM}`}>
            <input type="number" min={1} value={inputDim}
              onChange={(e) => setInputDim(Number(e.target.value))}
              className={inputCls(inputDim !== RECOMMENDED_INPUT_DIM)} />
          </Field>
          <Field label="Number of classes" warn={numClasses !== RECOMMENDED_NUM_CLASSES} hint={`recommended: ${RECOMMENDED_NUM_CLASSES}`}>
            <input type="number" min={2} value={numClasses}
              onChange={(e) => setNumClasses(Number(e.target.value))}
              className={inputCls(numClasses !== RECOMMENDED_NUM_CLASSES)} />
          </Field>
        </div>
      </div>

      {/* Hyperparameters */}
      <div>
        <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3">Hyperparameters</p>
        <div className="flex flex-wrap gap-4">
          <Field label="Rounds" hint="total FL rounds">
            <input type="number" min={1} value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className={inputCls(false)} />
          </Field>
          <Field label="Local epochs" hint="epochs per round per client">
            <input type="number" min={1} value={localEpochs}
              onChange={(e) => setLocalEpochs(Number(e.target.value))}
              className={inputCls(false)} />
          </Field>
          <Field label="Learning rate" hint="Adam optimizer LR">
            <input type="number" min={0.0001} step={0.001} value={learningRate}
              onChange={(e) => setLearningRate(Number(e.target.value))}
              className={inputCls(false)} />
          </Field>
          <Field label="Algorithm">
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as "fedavg" | "fedprox")}
              className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm
                         text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="fedavg">FedAvg</option>
              <option value="fedprox">FedProx</option>
            </select>
          </Field>
          {algorithm === "fedprox" && (
            <Field label="Mu (μ)" hint="proximal term strength — 0.01 to 1.0">
              <input type="number" min={0} step={0.01} value={mu}
                onChange={(e) => setMu(Number(e.target.value))}
                className={inputCls(false)} />
            </Field>
          )}
        </div>
      </div>

      {/* Mismatch warning */}
      {mismatch && (
        <div className="flex gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          <TriangleAlert size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-300/80 space-y-1">
            <p className="font-medium text-amber-300">Values differ from client configuration</p>
            <p>
              Clients are built with{" "}
              <span className="font-mono text-amber-200">input_dim={RECOMMENDED_INPUT_DIM}</span> and{" "}
              <span className="font-mono text-amber-200">num_classes={RECOMMENDED_NUM_CLASSES}</span>.
              Mismatched values will crash clients with a shape error.
            </p>
            <p>
              Regenerate data with{" "}
              <span className="font-mono text-amber-200">
                --features {inputDim} --classes {numClasses}
              </span>{" "}
              and update <span className="font-mono text-amber-200">client_config.yaml</span>.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleStart} disabled={starting || disableStart}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500
                     disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm
                     font-medium rounded-lg transition-all duration-150 active:scale-95 cursor-pointer">
          <Play size={14} />
          {starting ? "Starting..." : "Start Training"}
        </button>
        {disableStart && !starting && (
          <span className="text-xs text-zinc-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 inline-block" />
            {disableReason}
          </span>
        )}
      </div>
    </div>
  );
}
