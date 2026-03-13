# INSTRUCTIONS — Running PFA-FL

Complete operational guide: environment setup, Docker commands, training flow, log inspection, and troubleshooting.

---

## Prerequisites

| Tool           | Min Version | Check                    |
| -------------- | ----------- | ------------------------ |
| Docker Desktop | 24+         | `docker --version`       |
| Docker Compose | v2          | `docker compose version` |
| Python         | 3.11+       | `python --version`       |
| Node.js        | 18+         | `node --version`         |
| Poetry         | 1.8+        | `poetry --version`       |

---

## 1 — First-Time Setup

### 1.1 Copy environment file

```bash
cp .env.example .env
```

### 1.2 Generate synthetic training data

```bash
# Creates clients/data/client-{1,2,3}/dataset.csv
python scripts/generate_data.py --clients 3 --samples 1500 --features 20 --classes 2
```

Options:

```
--clients   Number of client partitions  (default: 3)
--samples   Total rows across all clients (default: 1000)
--features  Number of input features      (default: 20)
--classes   Number of output classes      (default: 2)
--seed      Random seed                   (default: 42)
```

---

## 2 — Docker: Full Stack

### 2.1 Build and start the FL server

```bash
docker compose -f core/docker-compose.yml up -d --build
```

Verify it is up:

```bash
curl http://localhost:8080/health
# → {"status":"ok"}
```

### 2.2 Trigger training start

The server starts in `WAITING` state. You must call `/start` with the model dimensions before clients can join.

```bash
 curl.exe -X POST http://localhost:8080/start `
    -H "Content-Type: application/json" `
    -d '{\"input_dim\": 20, \"num_classes\": 2}'
```

> `input_dim` must match the number of features in your dataset.
> `num_classes` must match the number of unique labels.

Expected response:

```json
{ "message": "Training started", "round": 1 }
```

### 2.3 Start clients

```bash
docker compose -f clients/docker-compose.yml up -d --build
```

This starts `client-1`, `client-2`, `client-3` in parallel. Each client:

1. Waits for the server to be in `round_open` state
2. Registers itself
3. Downloads global weights
4. Trains locally and submits back

### 2.4 Start the dashboard

```bash
cd dashboard
cp .env.example .env        # only needed once
npm install                 # only needed once
npm run dev
```

Open: [http://localhost:5173](http://localhost:5173)

---

## 3 — Training Flow (Step by Step)

```
[You]     POST /start  →  server enters ROUND_OPEN
[clients] POST /register
[clients] GET  /weights   ← receive global model
[clients] ... train locally for 5 epochs ...
[clients] POST /submit    → server receives weights
[server]  All submitted → FedAvg → save checkpoint → open next round
          Repeat for N rounds
[server]  State → FINISHED
```

Check current state at any time:

```bash
curl http://localhost:8080/status
```

Response shape:

```json
{
  "state": "round_open",
  "current_round": 3,
  "total_rounds": 10,
  "registered_clients": 3,
  "submissions_this_round": 1,
  "metrics": [
    {
      "round": 1,
      "num_clients": 3,
      "avg_loss": 0.4821,
      "avg_accuracy": 0.7933
    },
    { "round": 2, "num_clients": 3, "avg_loss": 0.3944, "avg_accuracy": 0.8267 }
  ]
}
```

---

## 4 — Logs

### FL server logs (live)

```bash
docker logs -f fl-server
```

### Client logs (individual)

```bash
docker logs -f fl-client-1
docker logs -f fl-client-2
docker logs -f fl-client-3
```

### All clients at once

```bash
docker compose -f clients/docker-compose.yml logs -f
```

### Last N lines

```bash
docker logs --tail 50 fl-server
docker logs --tail 50 fl-client-1
```

### Since a timestamp

```bash
docker logs --since 10m fl-server       # last 10 minutes
docker logs --since 2024-01-01 fl-server
```

---

## 5 — Stopping the Stack

### Stop clients only

```bash
docker compose -f clients/docker-compose.yml down
```

### Stop server only

```bash
docker compose -f core/docker-compose.yml down
```

### Stop everything

```bash
# Windows
.\scripts\windows\stop-all.ps1

# Linux / macOS
bash scripts/linux/stop-all.sh
```

### Stop and remove volumes (wipes output/)

```bash
docker compose -f core/docker-compose.yml down -v
docker compose -f clients/docker-compose.yml down -v
```

---

## 6 — Restarting a New Training Session

The server holds state in memory. To reset:

```bash
# 1. Stop and remove the server container (clears in-memory state)
docker compose -f core/docker-compose.yml down

# 2. Restart it
docker compose -f core/docker-compose.yml up -d

# 3. Trigger a new session
curl -X POST http://localhost:8080/start \
     -H "Content-Type: application/json" \
     -d '{"input_dim": 20, "num_classes": 2}'

# 4. Restart clients
docker compose -f clients/docker-compose.yml down
docker compose -f clients/docker-compose.yml up -d
```

---

## 7 — Useful Docker Commands

| Action                  | Command                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| List running containers | `docker ps`                                                                             |
| List all containers     | `docker ps -a`                                                                          |
| Inspect a container     | `docker inspect fl-server`                                                              |
| Get container IP        | `docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' fl-server` |
| Open a shell in server  | `docker exec -it fl-server bash`                                                        |
| Open a shell in client  | `docker exec -it fl-client-1 bash`                                                      |
| Check resource usage    | `docker stats`                                                                          |
| List Docker networks    | `docker network ls`                                                                     |
| Inspect fl-network      | `docker network inspect fl-network`                                                     |
| Remove unused images    | `docker image prune -f`                                                                 |
| Rebuild without cache   | `docker compose -f core/docker-compose.yml build --no-cache`                            |

---

## 8 — Output

Trained model checkpoints are saved after every round:

```
output/global_model.pt
```

This file is a PyTorch `state_dict`. To load it:

```python
import torch
import sys
sys.path.insert(0, "core/server")
from shared.model import build_model

model = build_model(input_dim=20, num_classes=2)
model.load_state_dict(torch.load("output/global_model.pt"))
model.eval()
```

---

## 9 — Configuration

### FL server — `core/config/config.yaml`

```yaml
federation:
  rounds: 10 # Total training rounds
  min_clients: 2 # Minimum clients before aggregation triggers
```

### Client — `clients/config/client_config.yaml`

```yaml
training:
  local_epochs: 5 # Epochs per round
  batch_size: 32
  learning_rate: 0.01
data:
  test_split: 0.2 # Local eval split
```

### Dashboard — `dashboard/.env`

```
VITE_API_URL=http://localhost:8080
VITE_POLL_INTERVAL_MS=3000
```

---

## 10 — Troubleshooting

**Server returns 425 on `/register`**
→ You forgot to call `POST /start` first.

**Clients exit immediately**
→ Check `docker logs fl-client-1`. Usually a wrong `CLIENT_SERVER_URL` or missing data file.

**`fl-network` not found when starting clients**
→ The core stack must be started first — it creates the Docker network.

**Dashboard shows "Server unreachable"**
→ The server is not running or `VITE_API_URL` points to the wrong port. Check `.env`.

**`No such file: dataset.csv`**
→ Run `python scripts/generate_data.py` first to create the data partitions.

**Aggregation never triggers**
→ Check `FL_MIN_CLIENTS` in `.env` — it must be ≤ the number of registered clients.
