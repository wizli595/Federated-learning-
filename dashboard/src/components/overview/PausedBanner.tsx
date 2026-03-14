import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Play } from "lucide-react";
import { resumeTraining } from "../../services/api";

interface Props {
  currentRound: number;
  totalRounds:  number;
  onNewSession: () => void;
}

export default function PausedBanner({ currentRound, totalRounds, onNewSession }: Props) {
  const [resuming, setResuming] = useState(false);

  const handleResume = () => {
    setResuming(true);
    toast.promise(resumeTraining(), {
      loading: "Resuming training...",
      success: "Training resumed! Clients will reconnect automatically.",
      error:   "Failed to resume training",
    });
    setResuming(false);
  };

  return (
    <div className="bg-zinc-900 border border-amber-500/20 rounded-xl p-5 space-y-4 animate-scale-in">
      <div>
        <h2 className="text-sm font-medium text-zinc-300">Training Paused</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Paused at round{" "}
          <span className="font-mono text-zinc-300">{currentRound}</span>
          {" "}of{" "}
          <span className="font-mono text-zinc-300">{totalRounds}</span>.
          Global weights and metrics are preserved.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleResume}
          disabled={resuming}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500
                     disabled:opacity-50 text-white text-sm font-medium rounded-lg
                     transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <RotateCcw size={14} />
          {resuming ? "Resuming…" : "Resume Training"}
        </button>
        <button
          onClick={onNewSession}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700
                     border border-zinc-700 text-zinc-300 text-sm rounded-lg
                     transition-colors cursor-pointer"
        >
          <Play size={14} />
          New Session
        </button>
      </div>

      <p className="text-xs text-zinc-600">
        Resume continues from round {currentRound} with the same model weights — clients
        reconnect automatically. "New Session" discards all progress and starts fresh.
      </p>
    </div>
  );
}
