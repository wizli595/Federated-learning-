# Tech Stack — SpamFL

Federated Learning system for email spam detection. Every technology choice is explained below.

---

## 1. Python 3.11
**Role:** Core language for all backend services (Controller, FL clients, Worker)

**Why:**
- De facto standard for ML/AI — PyTorch, Flower, NumPy all have first-class Python support
- Fast enough for the compute we do (model training, FedAvg aggregation)
- Simple subprocess management for spawning FL clients from the Controller

---

## 2. PyTorch
**Role:** Neural network training and inference (`fl/shared/model.py`)

**Why:**
- Industry standard for research and production ML
- Dynamic computation graph — easier to debug than TensorFlow
- `state_dict()` / `load_state_dict()` makes weight extraction and loading trivial — critical for FedAvg
- ONNX export built-in for model portability

**Model:** TabularMLP `[20 → 128 → 64 → 2]` with LayerNorm + ReLU + Dropout(0.3)
- LayerNorm instead of BatchNorm — BatchNorm corrupts weights during FedAvg aggregation because batch statistics differ per client

---

## 3. Flower (flwr)
**Role:** Federated Learning orchestration — gRPC transport between server and clients (`fl/`)

**Why:**
- Handles the FL protocol: round coordination, client selection, weight serialization over gRPC
- Supports FedAvg and FedProx out of the box
- Abstracts the distributed training loop — we only implement `fit()` and `evaluate()` on the client
- Lets us focus on the FL logic, not the networking

**What it does NOT do here:**
- Aggregation — we bypassed Flower's built-in aggregation and route weights through Kafka instead, giving us persistence, replay, and decoupling

---

## 4. Apache Kafka
**Role:** Event bus — the backbone of all inter-service communication (`fl/shared/kafka_utils.py`)

**Why:**
- Services don't know each other — they only know topic names (Event-Driven Architecture)
- Durable message log — if the Worker crashes, weight messages are still in Kafka and can be replayed
- Supports multiple consumers on the same topic — adding Prometheus exporter, alerting, or analytics requires zero changes to existing services
- Partitioned by client ID — each client's weights land on the same partition, preserving order

**Topics:**

| Topic | Producer | Consumer | Content |
|---|---|---|---|
| `client.weights` | FL clients | Worker | DP-noised weight arrays (base64) |
| `global.weights` | Worker | FL clients | Aggregated global model |
| `fl.metrics` | Worker | Controller | Round metrics (loss, F1, accuracy) |
| `fl.status` | Controller | Worker, clients | Lifecycle events (training/finished) |

---

## 5. Apache Hadoop (HDFS)
**Role:** Persistent storage for weight arrays (`worker/hdfs_client.py`)

**Why:**
- Every client's weights for every round are persisted at `/fl/weights/round_N/client.npz`
- Audit trail — you can replay any round, inspect any client's contribution
- Designed for large binary files (`.npz` weight arrays) — exactly what we write
- **Migration path:** when client count grows, replace Python FedAvg with a Hadoop MapReduce job that reads directly from HDFS — zero changes to the rest of the system

**Current usage:** single node, replication factor 1 — used as a durable file store, not for distributed compute. MapReduce is the next step at scale.

---

## 6. FastAPI
**Role:** Controller REST API — orchestrates clients, data, training, inference (`controller/`)

**Why:**
- Async by default (built on Starlette + asyncio) — handles SSE streams, Kafka consumer loop, and HTTP requests concurrently without threads
- Auto-generates OpenAPI docs at `/docs` — useful for testing endpoints directly
- Pydantic validation — request/response schemas are enforced automatically
- Fast — comparable to Node.js, much faster than Flask for async workloads

---

## 7. SQLite
**Role:** Experiment history storage (`controller/app/experiments.db`)

**Why:**
- Zero-ops — no separate database service, just a file
- Sufficient for the write pattern: one row per completed training run
- Persisted as a volume in Docker — survives container restarts
- If experiment history grows large, swap for PostgreSQL with no API changes

---

## 8. React + TypeScript
**Role:** Dashboard frontend (`dashboard/src/`)

**Why:**
- Component model maps naturally to the dashboard's panels (metrics chart, confusion matrix, client cards)
- TypeScript catches API contract mismatches at compile time — critical when the backend schema evolves
- Large ecosystem: Recharts for data visualization, React Router for navigation, Framer Motion for animations

---

## 9. Vite
**Role:** Frontend build tool and dev server (`dashboard/`)

**Why:**
- Near-instant hot module replacement during development — no waiting for webpack
- Production builds are fast and produce optimized static assets
- `VITE_API_URL` build arg lets us switch between dev (direct to `:8080`) and prod (Nginx proxy `/api`) with one variable

---

## 10. Tailwind CSS
**Role:** UI styling (`dashboard/src/`)

**Why:**
- Utility-first — no context switching between CSS files and components
- Dark theme is trivial with Tailwind's color palette
- Consistent spacing/sizing system across all components

---

## 11. Recharts
**Role:** Data visualization in the dashboard (accuracy/loss charts, confusion matrix, per-client bars)

**Why:**
- React-native — components, not imperative D3 code
- Responsive out of the box
- Composable — mix Line, Bar, Area charts in one component

---

## 12. Nginx
**Role:** Serves the React SPA and proxies `/api/*` to the Controller (`dashboard/nginx.conf`)

**Why:**
- Serves static files (React build) with gzip compression and correct cache headers
- Reverse proxy eliminates CORS — browser talks to one origin (`:3000`), Nginx routes internally
- SSE support: `proxy_buffering off` + `chunked_transfer_encoding on` lets real-time events pass through without buffering
- Lazy DNS resolution (`resolver 127.0.0.11` + `set $upstream`) — container starts even if Controller isn't up yet

**Key config:** `rewrite ^/api/(.*) /$1 break` strips the `/api` prefix before forwarding to the Controller — required because `proxy_pass` with a variable does not rewrite the URI automatically.

---

## 13. Docker + Docker Compose
**Role:** Containerization and local orchestration

**Why:**
- Every service runs in an isolated environment — no "works on my machine"
- `depends_on` + healthchecks ensure services start in the right order (Zookeeper → Kafka → Worker/Controller)
- Named volumes for HDFS data and SQLite — state survives container restarts
- Multi-stage Dockerfile for the dashboard — Node build stage produces the artifact, Nginx stage serves it (final image is ~94MB with no Node.js)

---

## 14. Confluent Kafka (cp-kafka 7.5.0)
**Role:** Kafka broker Docker image

**Why:**
- Most production-ready Kafka image — used by enterprises in production
- Comes with CLI tools (`kafka-topics`, `kafka-console-consumer`) for debugging
- Zookeeper-based (not KRaft) — more stable for the version we're using

---

## 15. NumPy
**Role:** Weight array manipulation — FedAvg math, DP noise, `.npz` serialization

**Why:**
- PyTorch weights are extracted as NumPy arrays for transport (JSON-serializable via base64)
- FedAvg weighted average is 3 lines of NumPy
- `np.savez` / `np.load` is the standard format for storing multi-array bundles (one per model layer)

---

## 16. Server-Sent Events (SSE)
**Role:** Real-time Kafka metric push from Controller to Dashboard (`/training/kafka-stream`)

**Why:**
- One-way server → browser stream — perfect for live training updates
- No WebSocket complexity — SSE is a plain HTTP response that stays open
- Works through Nginx with `proxy_buffering off`
- Browser reconnects automatically if the connection drops
- Dashboard receives each completed round instantly instead of waiting for the next 2s poll

---

## Architecture Pattern: Event-Driven Architecture (EDA)

Every service is **decoupled** — they communicate only through Kafka topics, never by calling each other directly.

```
FL Client    only knows → topic: client.weights
Worker       only knows → topics: client.weights, fl.status (consume)
                       → topics: global.weights, fl.metrics (produce)
Controller   only knows → topic: fl.status (produce), fl.metrics (consume)
Dashboard    only knows → Controller HTTP API
```

**Consequence:** any service can be replaced, scaled, or extended without touching the others.
Adding Prometheus monitoring, for example, requires only a new Kafka consumer — zero changes to FL clients, Worker, or Controller.

---

## What Can Be Added

| Gap | Technology |
|---|---|
| Metrics persistence + alerting | Prometheus + Grafana |
| MapReduce FedAvg at scale | Hadoop MapReduce / Apache Spark |
| Encrypted weight transport | Secure Aggregation / Homomorphic Encryption |
| Cloud deployment | Oracle Cloud ARM VM + Docker Compose |
| Model tracking across experiments | MLflow |
| Dynamic client registration | Kafka + Controller registration topic |
| Privacy budget tracking | RDP accountant (ε per round) |
