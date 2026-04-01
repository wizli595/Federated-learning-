/**
 * useKafkaStream — subscribe to the controller's /training/kafka-stream SSE endpoint.
 *
 * When the Worker aggregates a round and publishes to Kafka, the controller
 * forwards it via SSE instantly — no 2-second poll lag.
 *
 * Usage:
 *   useKafkaStream(isTraining, (round) => {
 *     setStatus(prev => mergeRound(prev, round));
 *   });
 *
 * The hook self-cleans on unmount or when `active` goes false.
 * If the SSE connection errors it closes and does not retry (the poller
 * will catch up within 2 s).
 */

import { useEffect, useRef } from "react";
import { API_BASE } from "../services/api";

export function useKafkaStream(
  active: boolean,
  onRound: (data: unknown) => void,
): void {
  // Stable ref so we can call the latest onRound without re-subscribing
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;

  useEffect(() => {
    if (!active) return;

    const es = new EventSource(`${API_BASE}/training/kafka-stream`);

    es.onmessage = (e: MessageEvent) => {
      try {
        onRoundRef.current(JSON.parse(e.data as string));
      } catch {
        /* ignore malformed events */
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [active]);
}
