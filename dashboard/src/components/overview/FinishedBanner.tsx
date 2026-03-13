import { type RoundMetric } from "../../services/api";

interface Props {
  roundsCompleted: number;
  latestMetric?:   RoundMetric;
}

export default function FinishedBanner({ roundsCompleted, latestMetric }: Props) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center">
      <p className="text-emerald-400 font-medium">
        Training complete — {roundsCompleted} rounds finished
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
  );
}
