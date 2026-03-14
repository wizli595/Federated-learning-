import { useState } from "react";
import { toast } from "sonner";
import { Wifi, WifiOff, RefreshCw, UserX, CheckCircle, Clock } from "lucide-react";
import { type FLStatus, type ClientSubmission, kickClient, kickAndRestartClient } from "../../services/api";

interface Props {
  clientIds:         string[];
  submittedIds:      string[];
  clientSubmissions: Record<string, ClientSubmission>;
  state:             FLStatus["state"];
  currentRound:      number;
}

export default function ClientTable({ clientIds, submittedIds, clientSubmissions, state, currentRound }: Props) {
  const [kicking,        setKicking]        = useState<string | null>(null);
  const [kickingRestart, setKickingRestart] = useState<string | null>(null);

  const canKick        = state === "round_open" || state === "aggregating";
  const canKickRestart = !(state === "waiting" && currentRound === 0);
  const showActions    = canKick || canKickRestart;

  const handleKick = (id: string) => {
    setKicking(id);
    toast.promise(kickClient(id), {
      loading: `Kicking ${id}…`,
      success: `${id} removed from session`,
      error:   `Failed to kick ${id}`,
    });
    setKicking(null);
  };

  const handleKickAndRestart = (id: string) => {
    setKickingRestart(id);
    toast.promise(kickAndRestartClient(id), {
      loading: `Kicking ${id} and restarting…`,
      success: `${id} removed — training restarted without them`,
      error:   `Failed to kick & restart`,
    });
    setKickingRestart(null);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">
          Registered clients — Round {currentRound}
        </h2>
        <div className="flex items-center gap-3">
          {canKick && (
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <UserX size={11} /> Kick to simulate dropout
            </span>
          )}
          {canKickRestart && (
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <RefreshCw size={11} /> Kick & restart to retrain
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {clientIds.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-zinc-500">
          No clients registered yet.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
              <th className="px-5 py-3 text-left">Client ID</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Round</th>
              <th className="px-5 py-3 text-right">Loss</th>
              <th className="px-5 py-3 text-right">Accuracy</th>
              <th className="px-5 py-3 text-right">Samples</th>
              {showActions && <th className="px-5 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {clientIds.map((id, i) => {
              const submitted = submittedIds.includes(id);
              return (
                <tr
                  key={id}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-all duration-150
                    animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
                >
                  <td className="px-5 py-3 font-mono text-zinc-300 flex items-center gap-2">
                    <Wifi size={12} className="text-emerald-400" />
                    {id}
                  </td>
                  <td className="px-5 py-3">
                    {state === "finished" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle size={12} /> Done
                      </span>
                    ) : submitted ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle size={12} /> Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400">
                        <Clock size={12} /> Training…
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-zinc-500">{currentRound}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">
                    {clientSubmissions[id]?.loss != null
                      ? <span className="text-blue-400">{clientSubmissions[id].loss!.toFixed(4)}</span>
                      : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs">
                    {clientSubmissions[id]?.accuracy != null
                      ? <span className="text-emerald-400">{(clientSubmissions[id].accuracy! * 100).toFixed(1)}%</span>
                      : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-zinc-500">
                    {clientSubmissions[id]?.num_samples != null
                      ? clientSubmissions[id].num_samples!.toLocaleString()
                      : <span className="text-zinc-600">—</span>}
                  </td>
                  {showActions && (
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {canKick && (
                          <button
                            onClick={() => handleKick(id)}
                            disabled={kicking === id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs
                                       text-red-400 border border-red-500/20 bg-red-500/5
                                       hover:bg-red-500/15 rounded-md transition-all duration-150
                                       active:scale-95 disabled:opacity-40 cursor-pointer"
                          >
                            <WifiOff size={11} />
                            {kicking === id ? "Kicking…" : "Kick"}
                          </button>
                        )}
                        {canKickRestart && (
                          <button
                            onClick={() => handleKickAndRestart(id)}
                            disabled={kickingRestart === id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs
                                       text-blue-400 border border-blue-500/20 bg-blue-500/5
                                       hover:bg-blue-500/15 rounded-md transition-all duration-150
                                       active:scale-95 disabled:opacity-40 cursor-pointer"
                          >
                            <RefreshCw size={11} />
                            {kickingRestart === id ? "Restarting…" : "Kick & Restart"}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
