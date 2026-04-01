import { CheckCircle, Play, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  clientCount: number;
  allHaveData: boolean;
}

export function WorkflowSteps({ clientCount, allHaveData }: Props) {
  const navigate = useNavigate();

  const step1Done = clientCount > 0;
  const step2Done = allHaveData;
  const currentStep = !step1Done ? 1 : !step2Done ? 2 : 3;

  const steps = [
    { n: 1, label: "Add Clients",    desc: "Create FL participants",    done: step1Done },
    { n: 2, label: "Generate Data",  desc: "Synthesize email datasets", done: step2Done },
    { n: 3, label: "Start Training", desc: "Run federated learning",    done: false     },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-stretch divide-x divide-zinc-800">
        {steps.map(({ n, label, desc, done }) => {
          const active = n === currentStep;
          return (
            <div
              key={n}
              className={`flex-1 flex items-center gap-3 px-5 py-4 transition-colors
                ${active ? "bg-blue-500/5" : done ? "bg-emerald-500/3" : ""}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold border
                ${done   ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : active ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                :          "bg-zinc-800 text-zinc-600 border-zinc-700"}`}>
                {done ? <CheckCircle size={14} /> : n}
              </div>
              <div>
                <p className={`text-xs font-semibold leading-tight
                  ${done ? "text-emerald-400" : active ? "text-zinc-200" : "text-zinc-500"}`}>
                  {label}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{desc}</p>
              </div>
              {n === 3 && currentStep === 3 && (
                <button
                  onClick={() => navigate("/training")}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500
                             text-white text-xs font-medium transition shrink-0 shadow-lg shadow-blue-900/30"
                >
                  <Play size={10} /> Start <ArrowRight size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
