# PFA-FL — Horizontal Federated Learning System

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
