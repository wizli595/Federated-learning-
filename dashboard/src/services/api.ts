import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const api = axios.create({ baseURL: API_URL, timeout: 10_000 });

export interface RoundMetric {
  round: number;
  num_clients: number;
  avg_loss: number | null;
  avg_accuracy: number | null;
}

export interface FLStatus {
  state: "waiting" | "round_open" | "aggregating" | "finished";
  current_round: number;
  total_rounds: number;
  registered_clients: number;
  submissions_this_round: number;
  metrics: RoundMetric[];
}

export const fetchStatus = (): Promise<FLStatus> =>
  api.get("/status").then((r) => r.data);

export const startTraining = (input_dim: number, num_classes: number) =>
  api.post("/start", { input_dim, num_classes }).then((r) => r.data);
