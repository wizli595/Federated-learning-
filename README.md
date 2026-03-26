# PFA-FL — Federated Learning System

A production-structured **Federated Learning** system built from scratch — no Flower, no shortcuts. Three fully independent deployable units communicate exclusively over HTTP, implementing the FedAvg algorithm with a real training loop, REST API, and live monitoring dashboard.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CORE  :8080                          │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              FL Server  (FastAPI)                   │   │
│   │                                                     │   │
│   │  POST /start     →  initialise model, open round 1 │   │
│   │  POST /register  →  client registers itself         │   │
│   │  GET  /weights   →  broadcast global weights        │   │
│   │  POST /submit    →  receive local weights           │   │
│   │  GET  /status    →  round state + metrics history   │   │
│   └─────────────────────────────────────────────────────┘   │
│              ▲  weights (HTTP/JSON)  ▲  status poll         │
└──────────────┼──────────────────────┼─────────────────────┘
               │                      │
   ┌───────────┴──────────┐  ┌────────┴────────┐
   │      CLIENTS         │  │    DASHBOARD    │
   │                      │  │   Vite + React  │
   │  client-1  (train)   │  │   TypeScript    │
   │  client-2  (train)   │  │   Tailwind CSS  │
   │  client-3  (train)   │  │   Recharts      │
   └──────────────────────┘  └─────────────────┘
```

### FedAvg Round Lifecycle

```
Server opens round
      │
      ├─► Client fetches global weights  (GET /weights)
      ├─► Client trains locally  (E epochs, Adam, CrossEntropyLoss)
      ├─► Client submits updated weights  (POST /submit)
      │
      └─► When all clients submit:
              w_global = Σ (n_i / n_total) × w_i
              Save checkpoint → /output/global_model.pt
              Open next round (or finish)
```

---

## Stack

| Layer     | Technology                                             |
| --------- | ------------------------------------------------------ |
| FL Server | Python 3.11 · FastAPI · Uvicorn                        |
| Model     | PyTorch · tabular MLP (BatchNorm + Dropout)            |
| Clients   | Python 3.11 · PyTorch · Pandas · scikit-learn          |
| Dashboard | React 19 · TypeScript · Vite · Tailwind CSS · Recharts |
| Infra     | Docker · Docker Compose · Poetry                       |

---

## Project Structure

```
pfa-fl/
├── core/
│   ├── server/
│   │   ├── app/
│   │   │   ├── main.py          # FastAPI app entry point
│   │   │   ├── config.py        # Config loading
│   │   │   ├── state.py         # FLState + ServerState enum
│   │   │   ├── schemas.py       # Pydantic request/response models
│   │   │   ├── aggregation.py   # FedAvg implementation
│   │   │   └── routes/
│   │   │       ├── control.py   # /health /status /start
│   │   │       └── federation.py # /register /weights /submit
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   ├── shared/
│   │   └── model.py             # Single source of truth — TabularMLP
│   └── config/
│       └── config.yaml          # Rounds, min_clients, output path
│
├── clients/
│   ├── app/
│   │   ├── config.py            # Client constants
│   │   ├── data.py              # CSV loading + StandardScaler
│   │   ├── trainer.py           # train() + evaluate()
│   │   └── comms.py             # All HTTP calls to server
│   ├── client.py                # FL loop entry point
│   ├── data/                    # Per-client dataset partitions
│   │   ├── client-1/dataset.csv
│   │   ├── client-2/dataset.csv
│   │   └── client-3/dataset.csv
│   ├── Dockerfile
│   └── pyproject.toml
│
├── dashboard/
│   └── src/
│       ├── services/api.ts      # Axios calls + TypeScript types
│       ├── hooks/useFL.ts       # Polling hook (GET /status every 3s)
│       ├── components/          # Sidebar, StatCard, StatusBadge
│       └── pages/               # Overview, Metrics, Clients
│
├── scripts/
│   ├── generate_data.py         # Synthetic non-IID dataset generator
│   ├── linux/                   # start-all.sh  stop-all.sh
│   └── windows/                 # start-all.ps1 stop-all.ps1
│
├── output/                      # Saved model checkpoints
└── .env.example                 # Environment variable template
```

---

## Key Design Decisions

**No Flower** — the FL protocol (weight broadcast, submission, aggregation) is implemented from scratch over HTTP using FastAPI and the `requests` library. This makes every step observable and debuggable.

**Independent deployables** — `core/`, `clients/`, and `dashboard/` share no Python imports. The shared model file is injected into client containers via a Docker volume mount at runtime, not at build time.

**Non-IID data** — the data generator partitions samples by label order before splitting, giving each client a skewed class distribution that simulates real-world federated heterogeneity.

**Single API surface** — the FL server is the only backend service. The dashboard polls `GET /status` which returns all state, round info, and metrics history in one response.

---

## Quick Start

See [`INSTRUCTIONS.md`](./INSTRUCTIONS.md) for the full step-by-step guide with Docker commands, log inspection, and troubleshooting.

---

## Experiments & Findings

We ran 6 configurations to find the optimal
training setup for this FL system.

### Dataset

- 600 samples split across 3 clients
- 20 features (2 informative, 18 noise)
- Binary classification (class 0 vs class 1)
- Non-IID: each client has a skewed class distribution

### Configurations Tested

| #   | Algorithm     | LR    | Data Skew        | Best Acc | Oscillation | Notes                           |
| --- | ------------- | ----- | ---------------- | -------- | ----------- | ------------------------------- |
| 1   | FedAvg        | 0.01  | Extreme (90/10)  | 78.07%   | ±11%        | Fast learning, chaotic          |
| 2   | FedAvg        | 0.001 | Extreme (90/10)  | 64.39%   | ±3%         | Stable but too slow             |
| 3   | FedAvg        | 0.005 | Extreme (90/10)  | 78.16%   | ±13%        | Same ceiling, more chaos        |
| 4   | FedProx μ=0.1 | 0.01  | Extreme (90/10)  | 76.32%   | ±12%        | No improvement over FedAvg      |
| 5   | FedAvg        | 0.01  | Moderate (70/30) | 77.50%   | ±3%         | ✅ Best overall                 |
| 6   | FedProx μ=0.1 | 0.01  | Moderate (70/30) | 74.17%   | ±4%         | Worse than FedAvg on clean data |

### Key Finding

**The data distribution matters more than the algorithm.**

Fixing the non-IID skew from extreme (90/10) to moderate
(70/30) improved oscillation from ±11% to ±3% — more than
any algorithm or learning rate change.

FedAvg with well-structured non-IID data outperforms
FedProx with extreme non-IID data. FedProx adds a
proximal term that prevents client drift, but when
clients are learning genuinely opposite class
distributions, the proximal term fights valid
learning signals rather than correcting drift.

### Recommended Config

```yaml
algorithm: FedAvg
learning_rate: 0.01
rounds: 25
local_epochs: 5
data_skew: 70/30 (moderate non-IID)
```

### Why FedProx Did Not Help Here

FedProx is designed for system heterogeneity —
slow clients, partial updates, dropped connections.
It is not designed for extreme data heterogeneity.
When client-1 has 90% class 0 and client-3 has
90% class 1, they are not drifting — they are
learning genuinely different things. The proximal
term penalizes this valid learning and reduces
overall model quality.

---
