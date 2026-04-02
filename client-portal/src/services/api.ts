import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

const http = axios.create({ baseURL: BASE, timeout: 15_000 });

export interface RegisterRequest {
  name: string;
}

export interface RegisterResponse {
  client_id:  string;
  name:       string;
  profile:    string;
  num_emails: number;
  message:    string;
}

export interface ClientStatus {
  client_id:  string;
  name:       string;
  profile:    string;
  num_emails: number;
  has_data:   boolean;
  has_model:  boolean;
}

export interface UploadResponse {
  client_id: string;
  rows:      number;
  message:   string;
}

export interface TrainingStatus {
  status:           "idle" | "training" | "finished";
  current_round:    number;
  total_rounds:     number;
  avg_accuracy:     number | null;
  avg_loss:         number | null;
  f1:               number | null;
  has_global_model: boolean;
}

export interface ClassifyRequest {
  subject:        string;
  body:           string;
  sender:         string;
  reply_to:       string;
  has_attachment: boolean;
}

export interface ClassifyResponse {
  label:             "spam" | "ham";
  confidence:        number;
  spam_score:        number;
  model_type:        string;
  feature_breakdown: Record<string, number>;
}

export const registerClient = (req: RegisterRequest): Promise<RegisterResponse> =>
  http.post("/portal/register", req).then((r) => r.data);

export const clientStatus = (id: string): Promise<ClientStatus> =>
  http.get(`/portal/status/${id}`).then((r) => r.data);

export const uploadDataset = (clientId: string, csvContent: string): Promise<UploadResponse> =>
  http.post(`/portal/upload/${clientId}`, { csv_content: csvContent }, { timeout: 120_000 }).then((r) => r.data);

export const trainingStatus = (): Promise<TrainingStatus> =>
  http.get("/portal/training-status").then((r) => r.data);

export const classifyEmail = (clientId: string, req: ClassifyRequest): Promise<ClassifyResponse> =>
  http.post(`/portal/classify/${clientId}`, req).then((r) => r.data);
