import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const api = axios.create({ baseURL: API_URL, timeout: 10_000 });

export interface PerClientMetric {
  loss:        number | null;
  accuracy:    number | null;
  num_samples: number | null;
}

export interface RoundMetric {
  round:             number;
  num_clients:       number;
  avg_loss:          number | null;
  avg_accuracy:      number | null;
  per_client:        Record<string, PerClientMetric>;
  duration_seconds?: number;
}

export interface TrainingConfig {
  local_epochs: number;
  learning_rate: number;
  total_rounds: number;
  input_dim: number;
  num_classes: number;
  algorithm?: string;
  mu?: number;
}

export interface ClientSubmission {
  loss:        number | null;
  accuracy:    number | null;
  num_samples: number | null;
}

export interface FLStatus {
  state: "waiting" | "round_open" | "aggregating" | "finished";
  current_round: number;
  total_rounds: number;
  registered_clients: number;
  submissions_this_round: number;
  submitted_client_ids: string[];
  metrics: RoundMetric[];
  client_ids: string[];
  training_config: TrainingConfig | null;
  client_submissions: Record<string, ClientSubmission>;
}

export const fetchStatus    = (): Promise<FLStatus> =>
  api.get("/status").then((r) => r.data);

export const startTraining  = (
  input_dim: number,
  num_classes: number,
  rounds: number,
  local_epochs: number,
  learning_rate: number,
  algorithm: string = "fedavg",
  mu: number = 0.1,
) => api.post("/start", { input_dim, num_classes, rounds, local_epochs, learning_rate, algorithm, mu }).then((r) => r.data);

export const stopTraining   = () =>
  api.post("/stop").then((r) => r.data);

export const resumeTraining = () =>
  api.post("/resume").then((r) => r.data);

export const resetTraining  = () =>
  api.post("/reset").then((r) => r.data);

export const kickClient           = (clientId: string) =>
  api.post(`/clients/${clientId}/kick`).then((r) => r.data);

export const kickAndRestartClient = (clientId: string) =>
  api.post(`/clients/${clientId}/kick-and-restart`).then((r) => r.data);

export const downloadModel = async () => {
  const resp = await api.get("/model/download", { responseType: "blob" });
  const url  = URL.createObjectURL(resp.data);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "global_model.pt";
  a.click();
  URL.revokeObjectURL(url);
};
