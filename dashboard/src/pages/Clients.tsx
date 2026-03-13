import { Users, CheckCircle, Clock } from "lucide-react";
import { type FLStatus } from "../services/api";

interface Props { data: FLStatus }

export default function Clients({ data }: Props) {
  const { registered_clients, submissions_this_round, current_round, state } = data;
  const pending = Math.max(0, registered_clients - submissions_this_round);
  const submitPct = registered_clients > 0 ? (submissions_this_round / registered_clients) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Clients</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Connected training nodes</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
            <Users size={12} /> Total
          </div>
          <span className="text-3xl font-mono font-semibold text-zinc-100">{registered_clients}</span>
        </div>
        <div className="bg-zinc-900 border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
            <CheckCircle size={12} className="text-emerald-400" /> Submitted
          </div>
          <span className="text-3xl font-mono font-semibold text-emerald-400">{submissions_this_round}</span>
        </div>
        <div className="bg-zinc-900 border border-amber-500/20 bg-amber-500/5 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
            <Clock size={12} className="text-amber-400" /> Pending
          </div>
          <span className="text-3xl font-mono font-semibold text-amber-400">{pending}</span>
        </div>
      </div>

      {/* Submission progress */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>Round {current_round} submissions</span>
          <span className="font-mono">{submissions_this_round} / {registered_clients}</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${submitPct}%` }}
          />
        </div>
      </div>

      {/* Client list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-300">Registered clients — Round {current_round}</h2>
        </div>

        {registered_clients === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-500">
            No clients registered yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Client ID</th>
                <th className="px-5 py-3 text-left">State</th>
                <th className="px-5 py-3 text-right">Round</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: registered_clients }, (_, i) => {
                const submitted = i < submissions_this_round;
                return (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-zinc-300">client-{i + 1}</td>
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
                    <td className="px-5 py-3 text-right font-mono text-zinc-500">{current_round}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
