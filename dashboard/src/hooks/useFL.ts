import { useState, useEffect, useCallback, useRef } from "react";
import { fetchStatus, type FLStatus } from "../services/api";

const POLL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 3000);
const MAX_EVENTS = 50;

export interface ActivityEvent {
  id: number;
  time: Date;
  message: string;
  type: "info" | "success" | "warning";
}

export interface FLHookResult {
  data: FLStatus | null;
  error: string | null;
  loading: boolean;
  events: ActivityEvent[];
  eta: number | null;
  clientJoinTimes: Record<string, Date>; // client_id → time first seen
}

let eventId = 0;
function makeEvent(message: string, type: ActivityEvent["type"] = "info"): ActivityEvent {
  return { id: eventId++, time: new Date(), message, type };
}

export function useFL(): FLHookResult {
  const [data, setData]       = useState<FLStatus | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents]   = useState<ActivityEvent[]>([]);

  // Refs to track previous state between polls (no re-render needed)
  const prev              = useRef<FLStatus | null>(null);
  const roundTimestamps   = useRef<number[]>([]);
  const joinTimes         = useRef<Record<string, Date>>({});

  const addEvent = useCallback((message: string, type: ActivityEvent["type"] = "info") => {
    setEvents((e) => [makeEvent(message, type), ...e].slice(0, MAX_EVENTS));
  }, []);

  const poll = useCallback(async () => {
    try {
      const status = await fetchStatus();
      const p = prev.current;

      // ── Detect changes and emit events ──────────────────────────────
      if (!p) {
        addEvent(`Connected to FL server — state: ${status.state}`, "info");
      } else {
        // State transition
        if (p.state !== status.state) {
          const messages: Record<FLStatus["state"], string> = {
            waiting:     "Server entered WAITING state",
            round_open:  `Round ${status.current_round} opened`,
            aggregating: `Round ${status.current_round} — aggregating weights…`,
            finished:    "Training complete!",
          };
          const types: Record<FLStatus["state"], ActivityEvent["type"]> = {
            waiting: "warning", round_open: "info", aggregating: "warning", finished: "success",
          };
          addEvent(messages[status.state], types[status.state]);
        }

        // New client registered — record join time and emit event
        if (status.registered_clients > p.registered_clients) {
          const now = new Date();
          const newIds = status.client_ids.filter((id) => !p.client_ids.includes(id));
          newIds.forEach((id) => { joinTimes.current[id] = now; });
          const diff = status.registered_clients - p.registered_clients;
          addEvent(`${diff} client(s) registered (total: ${status.registered_clients})`, "info");
        }

        // Client left (kicked or reset) — remove their join time
        if (status.registered_clients < p.registered_clients) {
          const gone = p.client_ids.filter((id) => !status.client_ids.includes(id));
          gone.forEach((id) => { delete joinTimes.current[id]; });
        }

        // New submission
        if (status.submissions_this_round > p.submissions_this_round) {
          addEvent(
            `Submission received (${status.submissions_this_round}/${status.registered_clients})`,
            "info",
          );
        }

        // Round completed (new metric added)
        if (status.metrics.length > p.metrics.length) {
          roundTimestamps.current.push(Date.now());
          const m = status.metrics.at(-1)!;
          addEvent(
            `Round ${m.round} complete — loss: ${m.avg_loss?.toFixed(4) ?? "N/A"}  acc: ${m.avg_accuracy != null ? (m.avg_accuracy * 100).toFixed(1) + "%" : "N/A"}`,
            "success",
          );
        }
      }

      prev.current = status;
      setData(status);
      setError(null);
    } catch {
      setError("Cannot reach FL server");
    } finally {
      setLoading(false);
    }
  }, [addEvent]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  // ── ETA calculation ────────────────────────────────────────────────
  const eta = (() => {
    if (!data || data.state === "finished" || data.state === "waiting") return null;
    const ts = roundTimestamps.current;
    if (ts.length < 2) return null;
    const diffs = ts.slice(1).map((t, i) => t - ts[i]);
    const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const remaining = data.total_rounds - data.metrics.length;
    return Math.round((remaining * avgMs) / 1000);
  })();

  return { data, error, loading, events, eta, clientJoinTimes: joinTimes.current };
}
