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

---

## Architecture Overview

```
dashboard/       React UI — client manager, training control, inbox simulation
controller/      FastAPI — orchestrates clients, data, Flower training, inference
fl/              Flower FL layer — server (FedAvg/FedProx) + clients
scripts/         Start/stop helpers and data generation
```

**Ports**

| Service        | Port |
| -------------- | ---- |
| Controller API | 8080 |
| Flower server  | 8090 |
| Dashboard      | 5173 |

---

## 1 — First-Time Setup

### 1.1 Install FL Python dependencies

```bash
# Linux / macOS
python3 -m venv fl/.venv
source fl/.venv/bin/activate
pip install -r fl/requirements.txt

# Windows (PowerShell)
python -m venv fl\.venv
fl\.venv\Scripts\Activate.ps1
pip install -r fl\requirements.txt
```

### 1.2 Install dashboard dependencies

```bash
cd dashboard
npm install
```

---

## 2 — One-Command Start

```bash
# Linux / macOS
bash scripts/linux/start-all.sh

# Windows (PowerShell)
.\scripts\windows\start-all.ps1
```

This will:
1. Create the FL Python venv (if missing) and install dependencies
2. Build and start the controller container (Docker)
3. Install dashboard npm deps and start the dev server

---

## 3 — Manual Step-by-Step

### 3.1 Start the controller

```bash
docker compose -f controller/docker-compose.yml up -d --build
```

Verify:

```bash
curl http://localhost:8080/health
# → {"status":"ok"}
```

### 3.2 Start the dashboard

```bash
cd dashboard
npm run dev
```

Open: [http://localhost:5173](http://localhost:5173)

---

## 4 — User Flow (Dashboard)

### Step 1 — Create clients

Go to **Clients** in the sidebar.

Click **Add Client** and fill in:
- **ID** — unique slug (e.g. `alice`)
- **Name** — display name (e.g. `Alice`)
- **Spam Profile** — determines the non-IID data distribution:
  - `marketing` — 70% spam, high URL count and promotional keywords
  - `balanced`  — 50% spam, mixed marketing and phishing patterns
  - `phishing`  — 70% spam, high caps ratio, urgency words, spoofed sender
- **Number of Emails** — dataset size (50–2000)

### Step 2 — Generate data

Click **Generate Data** next to a client, or **Generate All Data** for all clients.

This runs `scripts/generate_email_data.py` which creates:
```
fl/data/{client-id}/dataset.csv
```

Each email is represented as 20 extracted features — no raw text is stored.

### Step 3 — Start training

Go to **Training** in the sidebar.

Configure (optional):
- **Rounds** — number of FL rounds (default: 10)
- **Local Epochs** — training epochs per client per round (default: 5)
- **Algorithm** — `FedAvg` or `FedProx`
- **FedProx μ** — proximal term weight (only used with FedProx)
- **DP Clip Norm** — gradient clipping threshold for differential privacy
- **DP Noise** — Gaussian noise multiplier (higher = more privacy, less accuracy)
- **Min Clients** — minimum clients required to start a round

Click **Start Training**. The controller will:
1. Spawn the Flower server (`fl/server.py`)
2. Spawn one Flower client process per configured client (`fl/client.py`)
3. Write live metrics to `fl/output/metrics.json` after each round

The chart and round table update every 2 seconds.

### Step 4 — Simulate email classification

Once training is complete, go back to **Clients**.

Click **Open Inbox** on any client.

You can:
- Click **Generate Random Email** to auto-fill a marketing spam, phishing spam, or legitimate email
- Or compose one manually (From, Reply-To, Subject, Body, attachment toggle)

Click **Classify Email**. The result shows:
- **SPAM** or **HAM** verdict with confidence score
- **Feature breakdown** — the 20 extracted features with their values, spam-indicator features highlighted

> The model runs on the extracted features only. Raw email text is never stored or transmitted.

---

## 5 — CLI Usage

### Generate data manually

```bash
python scripts/generate_email_data.py \
  --clients-dir controller/app/clients \
  --output-dir  fl/data \
  --samples     300 \
  --seed        42
```

Options:

| Flag            | Default                    | Description                    |
| --------------- | -------------------------- | ------------------------------ |
| `--clients-dir` | `controller/app/clients`   | Directory of client JSON files |
| `--output-dir`  | `fl/data`                  | Output root directory          |
| `--samples`     | `300`                      | Emails per client              |
| `--seed`        | `42`                       | Random seed                    |

### Run Flower manually

```bash
# Terminal 1 — server
source fl/.venv/bin/activate
python fl/server.py --rounds 10 --min-clients 2

# Terminal 2+ — one per client
python fl/client.py --client-id alice --data-path fl/data/alice/dataset.csv --server 127.0.0.1:8090
python fl/client.py --client-id bob   --data-path fl/data/bob/dataset.csv   --server 127.0.0.1:8090
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
curl -X POST "http://localhost:8080/data/generate?samples=300"

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

## 6 — Stopping the Stack

```bash
# Linux / macOS
bash scripts/linux/stop-all.sh

# Windows
.\scripts\windows\stop-all.ps1
```

Or manually:

```bash
docker compose -f controller/docker-compose.yml down
```

---

## 7 — Output Files

| File                              | Description                                  |
| --------------------------------- | -------------------------------------------- |
| `fl/data/{id}/dataset.csv`        | Client email dataset (20 features + label)   |
| `fl/data/{id}/model.pt`           | Global model distributed to client after training |
| `fl/output/global_model.pt`       | Saved global model (last round)              |
| `fl/output/metrics.json`          | Live training metrics (round, loss, accuracy) |
| `controller/app/clients/{id}.json`| Client configuration                         |

### Loading the trained model

```python
import torch
import sys
sys.path.insert(0, "fl")
from model import build_model

model = build_model(input_dim=20, num_classes=2)
model.load_state_dict(torch.load("fl/output/global_model.pt", map_location="cpu"))
model.eval()
```

---

## 8 — Privacy Design

| Data                     | Location          | Ever leaves device? |
| ------------------------ | ----------------- | ------------------- |
| Raw email text           | Client only       | Never               |
| Extracted features (20)  | Client only       | Never               |
| Model weights (pre-noise)| Client only       | Never               |
| Model weights (DP-noised)| Client → Server   | Yes (noised)        |
| Global model weights     | Server → Clients  | Yes                 |
| Aggregate metrics        | Server → Dashboard| Yes (aggregated)    |

Differential privacy is applied before each weight submission:
- Weights are **clipped** to a maximum norm (`clip_norm`)
- **Gaussian noise** is added scaled by `noise_mult × clip_norm`

---

## 9 — Troubleshooting

**Controller not reachable**
→ Check `docker ps` — the `fl-controller` container must be running.
→ Run `docker logs fl-controller` to see startup errors.

**"no clients configured" when starting training**
→ Create at least one client via the dashboard or `POST /clients`.

**"missing datasets" when starting training**
→ Generate data first via the dashboard or `POST /data/generate`.

**Training starts but no rounds appear**
→ The Flower server needs `min_clients` to connect before starting.
   Ensure the number of configured clients ≥ `min_clients`.

**"no trained model found" when classifying**
→ Training must complete at least one round. Check `fl/output/metrics.json`.

**Dashboard shows "Controller offline"**
→ The controller is not running on port 8080. Start it with Docker.

**Port 8090 already in use**
→ A previous Flower server is still running. Stop it:
   `pkill -f "fl/server.py"` (Linux) or kill the Python process (Windows Task Manager).
