# INSTRUCTIONS — SpamFL

Complete operational guide for the federated email spam detection system.

---

## Prerequisites

| Tool           | Min Version | Check                    |
| -------------- | ----------- | ------------------------ |
| Docker Desktop | 24+         | `docker --version`       |
| Docker Compose | v2          | `docker compose version` |
| Python         | 3.11+       | `python --version`       |
| Node.js        | 18+         | `node --version`         |

> Poetry is **not** required. All Python components use `requirements.txt` + `venv`.

Docker Desktop must be running with **at least 6 GB RAM** allocated (Settings → Resources).

---

## Architecture Overview

```
dashboard/       React UI + Nginx — client manager, training control, inbox simulation
controller/      FastAPI — orchestrates clients, data, Flower training, inference
fl/              Flower FL layer — server (FedAvg/FedProx) + clients
worker/          Kafka consumer — FedAvg aggregation, HDFS weight storage
fl/shared/       Shared schemas and Kafka helpers (cross-service, not cross-import)
scripts/         Data generation utilities
```

### Service Ports

| Service           | Port | Notes                         |
| ----------------- | ---- | ----------------------------- |
| Dashboard (React) | 3000 | Nginx + React SPA (prod)      |
| Dashboard (dev)   | 5173 | Vite dev server               |
| Controller API    | 8080 | FastAPI                       |
| Flower server     | 8090 | gRPC (internal, FL training)  |
| Kafka UI          | 8090 | Provectus web UI (prod only)  |
| HDFS NameNode UI  | 9870 | WebHDFS browser               |
| Kafka broker      | 9092 | External (host access)        |
| Zookeeper         | 2181 | Internal                      |

> In production, Kafka UI and Flower server both use 8090 — Kafka UI runs in Docker while Flower is a subprocess spawned inside the controller container.

---

## 1 — Production (Full Stack via Docker Compose)

### 1.1 Start everything

```bash
# From repo root
docker compose up -d --build
```

First run takes ~3–5 minutes to pull images and build. Subsequent runs are faster.

### 1.2 Verify health

```bash
docker compose ps
```

All services should show `healthy` or `running` status.

```bash
# Quick API check
curl http://localhost:8080/clients        # → []
curl http://localhost:8080/training/status
```

### 1.3 Access the stack

| UI                  | URL                        |
| ------------------- | -------------------------- |
| Dashboard           | http://localhost:3000      |
| Controller API docs | http://localhost:8080/docs |
| Kafka UI            | http://localhost:8090      |
| HDFS Web UI         | http://localhost:9870      |

### 1.4 Start only infrastructure (Kafka + HDFS)

If you want to run the controller/dashboard outside Docker:

```bash
docker compose up -d zookeeper kafka kafka-init kafka-ui hdfs-namenode hdfs-datanode
```

### 1.5 Tear down

```bash
docker compose down          # stops containers, keeps HDFS volumes
docker compose down -v       # also deletes HDFS volumes (full reset)
```

### 1.6 Logs

```bash
docker logs -f fl-controller    # FastAPI + training subprocess output
docker logs -f fl-worker        # Kafka consumer + FedAvg aggregation
docker logs -f fl-kafka         # Broker internals
docker logs -f fl-dashboard     # Nginx access log
```

---

## 2 — Development Mode (Without Docker for App Services)

Run infrastructure in Docker and app services locally for hot-reload.

### 2.1 Start infrastructure

```bash
docker compose up -d zookeeper kafka kafka-init kafka-ui hdfs-namenode hdfs-datanode
```

### 2.2 Controller

```bash
cd controller
python -m venv .venv

# Linux / macOS
source .venv/bin/activate

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

### 2.3 Dashboard

```bash
# Create .env.local so the dev server hits the controller directly (no Nginx)
echo "VITE_API_URL=http://localhost:8080" > dashboard/.env.local

cd dashboard
npm install
npm run dev       # http://localhost:5173
```

### 2.4 FL Python environment (for manual Flower runs)

```bash
# Linux / macOS
python3 -m venv fl/.venv
source fl/.venv/bin/activate
pip install -r fl/requirements.txt

# Windows
python -m venv fl\.venv
fl\.venv\Scripts\Activate.ps1
pip install -r fl\requirements.txt
```

---

## 3 — User Flow (Dashboard)

### Step 1 — Create clients

Go to **Clients** in the sidebar → **Add Client**:

- **Name** — display name (e.g. `Alice`)
- **Spam Profile** — determines the non-IID data distribution:
  - `marketing` — 70% spam, high URL count and promotional keywords
  - `balanced`  — 50% spam, mixed marketing and phishing patterns
  - `phishing`  — 30% spam, high caps ratio, urgency words, spoofed sender
- **Number of Emails** — dataset size (50–2000)

### Step 2 — Generate data

Click **Generate Data** next to a client, or **Generate All** to generate for all clients at once.

This runs `scripts/generate_email_data.py` and writes:
```
fl/data/{client-id}/dataset.csv
```

Each email is represented as 20 extracted features — no raw text is stored.

### Step 3 — Start training

Go to **Training** → configure parameters:

| Parameter       | Default | Description                                           |
| --------------- | ------- | ----------------------------------------------------- |
| Rounds          | 10      | Number of FL rounds                                   |
| Local Epochs    | 5       | Training epochs per client per round                  |
| Algorithm       | FedAvg  | `FedAvg` or `FedProx`                                 |
| FedProx μ       | 0.1     | Proximal term weight (FedProx only)                   |
| DP Clip Norm    | 1.0     | Gradient clipping threshold (differential privacy)    |
| DP Noise        | 0.05    | Gaussian noise multiplier (higher = more privacy)     |
| Min Clients     | 2       | Minimum clients required to start a round             |

Click **Start Training**. The system will:
1. Publish a `training` status event to Kafka (`fl.status`)
2. Spawn the Flower gRPC server (`fl/server/main.py`)
3. Spawn one Flower client process per configured client
4. Each client trains locally, applies DP noise, and publishes weights to Kafka (`client.weights`)
5. The Worker aggregates via FedAvg and pushes global weights + metrics back through Kafka
6. The dashboard receives live round updates via SSE — rounds sourced from Kafka show a **Worker** badge

### Step 4 — Classify emails

Once training completes, go to **Clients** → **Open Inbox** on any client.

- Click **Generate Random Email** to auto-fill a spam or ham example
- Or compose manually (From, Reply-To, Subject, Body, attachment toggle)

Click **Classify**. The result shows:
- **SPAM** or **HAM** verdict with confidence score
- **Feature breakdown** — the 20 extracted features with values, spam-indicators highlighted

> Raw email text never leaves the client. Only the 20 extracted features are used.

---

## 4 — CLI Usage

### Generate data manually

```bash
python scripts/generate_email_data.py \
  --clients-dir controller/app/clients \
  --output-dir  fl/data \
  --samples     300 \
  --seed        42
```

### Run Flower manually (dev/debug)

```bash
# Terminal 1 — server
source fl/.venv/bin/activate      # or fl\.venv\Scripts\activate on Windows
python fl/server/main.py --rounds 10 --min-clients 2

# Terminal 2+ — one per client
python fl/client/main.py --client-id alice
python fl/client/main.py --client-id bob
```

### Controller API (curl)

```bash
# List clients
curl http://localhost:8080/clients

# Create a client
curl -X POST http://localhost:8080/clients \
     -H "Content-Type: application/json" \
     -d '{"id":"alice","name":"Alice","profile":"marketing","num_emails":300}'

# Generate data for all clients
curl -X POST http://localhost:8080/data/generate

# Start training
curl -X POST http://localhost:8080/training/start \
     -H "Content-Type: application/json" \
     -d '{"rounds":10,"local_epochs":5,"learning_rate":0.01,"algorithm":"fedavg","mu":0.1,"clip_norm":1.0,"noise_mult":0.05,"min_clients":2}'

# Check training status
curl http://localhost:8080/training/status

# Classify an email (after training)
curl -X POST http://localhost:8080/clients/alice/classify \
     -H "Content-Type: application/json" \
     -d '{"subject":"WIN A FREE PRIZE!!!","body":"Click now at www.free.com","sender":"promo@deals.net","reply_to":"","has_attachment":false}'
```

---

## 5 — Output Files

| File                               | Description                                        |
| ---------------------------------- | -------------------------------------------------- |
| `fl/data/{id}/dataset.csv`         | Client email dataset (20 features + label)         |
| `fl/data/{id}/model.pt`            | Global model distributed to client after training  |
| `fl/output/global_model.pt`        | Saved global model (last round)                    |
| `fl/output/best_model.pt`          | Best model by validation accuracy                  |
| `fl/output/metrics.json`           | Training metrics (round, loss, accuracy)           |
| `fl/output/logs.jsonl`             | Structured training log entries                    |
| `controller/app/clients/{id}.json` | Client configuration                               |
| `controller/app/experiments.db`    | SQLite experiment history                          |

### Loading the trained model

```python
import torch
import sys
sys.path.insert(0, "fl")
from shared.model import build_model

model = build_model(input_dim=20, num_classes=2)
model.load_state_dict(torch.load("fl/output/global_model.pt", map_location="cpu"))
model.eval()
```

---

## 6 — Privacy Design

| Data                      | Location           | Ever shared?        |
| ------------------------- | ------------------ | ------------------- |
| Raw email text            | Client only        | Never               |
| Extracted features (20)   | Client only        | Never               |
| Model weights (pre-noise) | Client only        | Never               |
| Model weights (DP-noised) | Client → Kafka → Worker | Yes (noised)   |
| Global model weights      | Worker → Kafka → Clients | Yes             |
| Aggregate metrics         | Worker → Kafka → Controller → Dashboard | Yes (aggregated) |

Differential privacy is applied before each weight submission (`fl/client/privacy.py`):
- Weights are **clipped** to a maximum norm (`clip_norm`)
- **Gaussian noise** is added scaled by `noise_mult × clip_norm`

---

## 7 — Kafka Topics

| Topic            | Producer    | Consumer          | Content                    |
| ---------------- | ----------- | ----------------- | -------------------------- |
| `client.weights` | FL clients  | Worker            | DP-noised weight arrays    |
| `global.weights` | Worker      | FL clients        | Aggregated global weights  |
| `fl.metrics`     | Worker      | Controller        | Round metrics (loss, F1)   |
| `fl.status`      | Controller  | Worker, clients   | Training lifecycle events  |

Monitor topics live at http://localhost:8090 (Kafka UI).

---

## 8 — Troubleshooting

**`docker compose ps` shows unhealthy containers on first run**
→ Kafka and HDFS take time to initialise. Wait 60–90 seconds and re-check.
→ Run `docker logs fl-kafka` to see broker startup progress.

**Controller not reachable on port 8080**
→ Run `docker ps` — the `fl-controller` container must be running.
→ Run `docker logs fl-controller` to see startup errors.

**"no clients configured" when starting training**
→ Create at least one client via the dashboard or `POST /clients`.

**"missing datasets" when starting training**
→ Generate data first via the dashboard or `POST /data/generate`.

**Training starts but no rounds appear in the chart**
→ The Flower server waits for `min_clients` before starting.
→ Ensure the number of configured clients ≥ `min_clients`.
→ Check `docker logs fl-controller` for subprocess errors.

**Rounds appear but no Worker badge (Kafka metrics not arriving)**
→ Check `docker logs fl-worker` for consumer or HDFS errors.
→ Kafka UI at http://localhost:8090 — verify `client.weights` topic has messages.

**"no trained model found" when classifying**
→ Training must complete at least one round. Check `fl/output/metrics.json`.

**Dashboard shows "Controller offline"**
→ The controller is not running or not reachable. In dev mode, check port 8080. In prod, check `docker logs fl-controller`.
→ If the controller logs show 200 OK but the dashboard still shows offline, the Nginx proxy may be misconfigured. Verify `dashboard/nginx.conf` has the `rewrite ^/api/(.*) /$1 break;` line before `proxy_pass` inside `location /api/`. Without it, `/api/health` is forwarded as-is instead of being stripped to `/health`.

**Port conflict on startup**
→ `9092` — another Kafka instance running. Stop it or change the port mapping in `docker-compose.yml`.
→ `8080` — another service on that port. Run `docker compose down` first.

**HDFS errors in worker logs**
→ HDFS NameNode may still be initialising. The worker retries automatically.
→ Check http://localhost:9870 — NameNode must show `active` state.

**"Conflict. The container name is already in use" on `docker compose up`**
→ A stale container from a previous run exists. Remove it and retry:
```bash
docker rm fl-controller fl-worker fl-dashboard 2>/dev/null; docker compose up -d
```
Or use the start script which handles this automatically:
```powershell
.\scripts\windows\start-all.ps1
```

**Full reset (wipe all data and volumes)**
```bash
docker compose down -v
rm -rf fl/data/*/dataset.csv fl/output/*.pt fl/output/metrics.json fl/output/logs.jsonl
```
