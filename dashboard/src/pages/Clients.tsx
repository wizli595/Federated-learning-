import { type FLStatus } from "../services/api";
import ClientSummaryCards from "../components/clients/ClientSummaryCards";
import ClientTable        from "../components/clients/ClientTable";

export default function Clients({ data }: { data: FLStatus }) {
  const {
    registered_clients, submissions_this_round,
    client_ids, submitted_client_ids, current_round, state,
  } = data;

  const pending = Math.max(0, registered_clients - submissions_this_round);

  const canKick        = state === "round_open" || state === "aggregating";
  const canKickRestart = !(state === "waiting" && current_round === 0);

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Clients</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Connected training nodes</p>
      </div>

      {/* ── Summary cards + submission progress ───────────────────────── */}
      <ClientSummaryCards
        totalClients={registered_clients}
        submitted={submissions_this_round}
        pending={pending}
        currentRound={current_round}
      />

      {/* ── Client table with action buttons ──────────────────────────── */}
      <ClientTable
        clientIds={client_ids}
        submittedIds={submitted_client_ids}
        state={state}
        currentRound={current_round}
      />

      {/* ── Action notes ───────────────────────────────────────────────── */}
      {registered_clients > 0 && (canKick || canKickRestart) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 space-y-2">
          {canKick && (
            <p className="text-xs text-zinc-500 leading-relaxed">
              <span className="text-red-400 font-medium">Kick — </span>
              Removes a client mid-round. Simulates device dropout or network failure.
              The server aggregates once all <em>remaining</em> clients have submitted.
            </p>
          )}
          {canKickRestart && (
            <p className="text-xs text-zinc-500 leading-relaxed">
              <span className="text-blue-400 font-medium">Kick &amp; Restart — </span>
              Permanently removes a client and immediately restarts the full training session
              with the same config. Remaining clients reconnect automatically.
            </p>
          )}
        </div>
      )}

    </div>
  );
}
