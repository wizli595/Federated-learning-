import {
  Trash2, ChevronDown, ChevronUp, Trophy,
  Check, X, GitCompare, FileDown,
} from "lucide-react";
import type { ExperimentRun } from "../../services/api";
import { ALGO_COLOR, RUN_A_COLOR, RUN_B_COLOR, fmtPct, fmtLoss, fmtDate, exportRunPdf } from "./helpers";

interface Props {
  runs: ExperimentRun[];
  expanded: number | null;
  compareMode: boolean;
  selected: number[];
  confirmId: number | null;
  deleting: number | null;
  bestId: number | null;
  onExpand: (id: number) => void;
  onSelect: (id: number) => void;
  onConfirm: (id: number | null) => void;
  onDelete: (id: number) => void;
}

export function RunsTable({
  runs, expanded, compareMode, selected,
  confirmId, deleting, bestId,
  onExpand, onSelect, onConfirm, onDelete,
}: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {compareMode && (
        <div className="px-4 py-2 border-b border-zinc-800 bg-indigo-500/5 flex items-center gap-2">
          <GitCompare size={12} className="text-indigo-400" />
          <p className="text-xs text-indigo-300">Click rows to select — select 2 runs to compare</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800">
              {compareMode && <th className="px-3 py-2 w-8" />}
              {["#", "Date", "Algorithm", "Rounds", "Epochs", "LR", "μ", "DP Noise", "Clients", "Final Acc", "Final Loss", ""].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-zinc-500 font-normal whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const isSelected = selected.includes(r.id);
              const selIdx     = selected.indexOf(r.id);
              return (
                <tr
                  key={r.id}
                  className={`border-b border-zinc-800/50 cursor-pointer transition
                    ${compareMode
                      ? isSelected
                        ? selIdx === 0
                          ? "bg-indigo-500/10 hover:bg-indigo-500/15"
                          : "bg-orange-500/10 hover:bg-orange-500/15"
                        : "hover:bg-zinc-800/30"
                      : expanded === r.id
                        ? "bg-zinc-800/40 hover:bg-zinc-800/30"
                        : "hover:bg-zinc-800/30"
                    }`}
                  onClick={() => compareMode ? onSelect(r.id) : onExpand(r.id)}
                >
                  {compareMode && (
                    <td className="px-3 py-2">
                      {isSelected ? (
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold text-white"
                          style={{ background: selIdx === 0 ? RUN_A_COLOR : RUN_B_COLOR }}
                        >
                          {selIdx === 0 ? "A" : "B"}
                        </span>
                      ) : (
                        <span className="inline-block w-4 h-4 rounded border border-zinc-700" />
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2 text-zinc-500 font-mono">
                    <div className="flex items-center gap-1">
                      {r.id === bestId && <Trophy size={11} className="text-amber-400" />}
                      {r.id}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{fmtDate(r.started_at)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-mono
                      ${ALGO_COLOR[r.algorithm] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}>
                      {r.algorithm}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-300 font-mono">{r.rounds}</td>
                  <td className="px-3 py-2 text-zinc-300 font-mono">{r.local_epochs}</td>
                  <td className="px-3 py-2 text-zinc-300 font-mono">{r.learning_rate}</td>
                  <td className="px-3 py-2 text-zinc-300 font-mono">{r.mu}</td>
                  <td className="px-3 py-2 text-zinc-300 font-mono">{r.noise_mult}</td>
                  <td className="px-3 py-2 text-zinc-300 font-mono">{r.num_clients}</td>
                  <td className="px-3 py-2">
                    <span className={`font-semibold font-mono
                      ${(r.final_accuracy ?? 0) >= 0.8 ? "text-emerald-400" :
                        (r.final_accuracy ?? 0) >= 0.65 ? "text-amber-400" : "text-red-400"}`}>
                      {fmtPct(r.final_accuracy)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-400 font-mono">{fmtLoss(r.final_loss)}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => exportRunPdf(r)}
                        className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition"
                        title="Export PDF report"
                      >
                        <FileDown size={12} />
                      </button>
                    {!compareMode && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onExpand(r.id)}
                          className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition"
                        >
                          {expanded === r.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {confirmId === r.id ? (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => onDelete(r.id)}
                              disabled={deleting === r.id}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]
                                         bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                            >
                              <Check size={10} /> Yes
                            </button>
                            <button onClick={() => onConfirm(null)}
                              className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition">
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onConfirm(r.id)}
                            disabled={deleting === r.id}
                            className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition disabled:opacity-40"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
