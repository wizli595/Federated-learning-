import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const api = axios.create({ baseURL: API_BASE, timeout: 15_000 });

// ── Client config ──────────────────────────────────────────────────────────────

export interface ClientConfig {
  id: string;
  name: string;
  profile: "marketing" | "balanced" | "phishing";
  num_emails: number;
}

export const listClients    = (): Promise<ClientConfig[]> =>
  api.get("/clients").then((r) => r.data);

export const createClient   = (cfg: ClientConfig) =>
  api.post("/clients", cfg).then((r) => r.data);

export const updateClient   = (id: string, cfg: ClientConfig) =>
  api.put(`/clients/${id}`, cfg).then((r) => r.data);

export const deleteClient   = (id: string) =>
  api.delete(`/clients/${id}`);

// ── Data generation ────────────────────────────────────────────────────────────

export const generateAllData  = (samples = 800, seed = 42) =>
  api.post("/data/generate", null, { params: { samples, seed } }).then((r) => r.data);

export const generateClientData = (id: string, samples = 800, seed = 42) =>
  api.post(`/data/generate/${id}`, null, { params: { samples, seed } }).then((r) => r.data);

export const dataStatus = (): Promise<Record<string, boolean>> =>
  api.get("/data/status").then((r) => r.data);

// ── Logs ───────────────────────────────────────────────────────────────────────

export interface LogEntry {
  ts: string;
  source: string;
  msg: string;
}

export const getTrainingLogs = (): Promise<LogEntry[]> =>
  api.get("/training/logs").then((r) => r.data);

// ── Training ───────────────────────────────────────────────────────────────────

export interface StartTrainingRequest {
  rounds: number;
  local_epochs: number;
  learning_rate: number;
  algorithm: "fedavg" | "fedprox";
  mu: number;
  clip_norm: number;
  noise_mult: number;
  min_clients: number;
  lr_schedule: "none" | "cosine" | "step";
}

export interface PerClientRoundMetric {
  loss: number;
  accuracy: number;
  spam_rate: number;
  num_samples: number;
}

export interface RoundMetric {
  round: number;
  timestamp: string;
  avg_loss: number;
  avg_accuracy: number;
  clients: Record<string, PerClientRoundMetric>;
}

export interface TrainingStatus {
  status: "idle" | "waiting" | "training" | "finished";
  current_round: number;
  total_rounds: number;
  rounds: RoundMetric[];
  config: StartTrainingRequest | null;
  model_distributed: boolean;
  started_at?: string;
  finished_at?: string;
}

export const startTraining  = (req: StartTrainingRequest) =>
  api.post("/training/start", req).then((r) => r.data);

export const stopTraining   = () =>
  api.post("/training/stop").then((r) => r.data);

export const trainingStatus = (): Promise<TrainingStatus> =>
  api.get("/training/status").then((r) => r.data);

export const resetTraining  = () =>
  api.post("/training/reset").then((r) => r.data);

// ── Inference ──────────────────────────────────────────────────────────────────

export interface ClassifyRequest {
  subject: string;
  body: string;
  sender: string;
  reply_to: string;
  has_attachment: boolean;
}

export interface ClassifyResponse {
  label: "spam" | "ham";
  confidence: number;
  spam_score: number;
  feature_breakdown: Record<string, number>;
}

export const classifyEmail = (clientId: string, req: ClassifyRequest): Promise<ClassifyResponse> =>
  api.post(`/clients/${clientId}/classify`, req).then((r) => r.data);

export const downloadModel = async (clientId: string) => {
  const resp = await api.get(`/clients/${clientId}/model/download`, { responseType: "blob" });
  const url  = URL.createObjectURL(resp.data);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "global_model.pt";
  a.click();
  URL.revokeObjectURL(url);
};

// ── Experiments ────────────────────────────────────────────────────────────────

export interface ExperimentRun {
  id: number;
  started_at: string;
  finished_at: string;
  algorithm: string;
  rounds: number;
  local_epochs: number;
  learning_rate: number;
  mu: number;
  clip_norm: number;
  noise_mult: number;
  min_clients: number;
  num_clients: number;
  final_accuracy: number | null;
  final_loss: number | null;
  metrics: {
    rounds: RoundMetric[];
    status: string;
    model_distributed: boolean;
  };
}

export const listExperiments  = (): Promise<ExperimentRun[]> =>
  api.get("/experiments").then((r) => r.data);

export const deleteExperiment = (id: number) =>
  api.delete(`/experiments/${id}`);

// ── Health ─────────────────────────────────────────────────────────────────────

export const health = () => api.get("/health").then((r) => r.data);
