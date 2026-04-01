# PFA-FL — Federated Learning System for Email Spam Detection

A production-structured **Horizontal Federated Learning** system for email spam detection. Clients train locally on private email data; only DP-noised model weights are shared. Model updates flow through **Kafka** and are aggregated via **HDFS**-backed FedAvg in a dedicated Worker service.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Dashboard  :5173                             │
│              React · TypeScript · Vite · Tailwind · Recharts         │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ HTTP (REST)
┌───────────────────────────▼──────────────────────────────────────────┐
│                      Controller API  :8080                           │
│                FastAPI · manages clients, data, training             │
└──────┬──────────────────────────────────────┬────────────────────────┘
       │ spawns                               │ reads fl.metrics
       │                                      │
┌──────▼──────────────────────────────────────▼────────────────────────┐
│                           Kafka  :9092                               │
│  client.weights · global.weights · fl.metrics · fl.status           │
└──────┬──────────────────────────┬───────────────────────────────────-┘
       │                          │
┌──────▼──────────┐   ┌───────────▼──────────────────────────────────┐
│   FL Clients    │   │              Worker  (type-router)            │
│  (per client)   │   │  Kafka consumer → HDFS → FedAvg → Kafka      │
│                 │   │  Routes by message.type:                      │
│  Train locally  │   │    fl_weights   → aggregate + publish         │
│  DP noise       │   │    fl_metrics   → forward to controller       │
│  Publish weights│   │    predictions  → store (future)              │
│  to Kafka       │   └──────────────────────────────────────────────┘
└─────────────────┘
```

---

## Stack

| Layer       | Technology                                                  |
|-------------|-------------------------------------------------------------|
| FL Training | Python 3.11 · PyTorch · Flower (gRPC transport)            |
| Messaging   | Apache Kafka (Confluent) · Zookeeper                        |
| Storage     | Apache HDFS (bde2020 images) — weight aggregation buffer    |
| Orchestration | FastAPI · Uvicorn · asyncio subprocesses                  |
| Model       | TabularMLP — LayerNorm + Dropout · input_dim=20 · 2 classes |
| Dashboard   | React 19 · TypeScript · Vite · Tailwind CSS · Recharts      |
| Infra       | Docker · Docker Compose                                     |

---

## Project Structure

```
pfa-fl/
├── docker-compose.yml          # Full stack: Kafka + HDFS + all services
│
├── controller/                 # FastAPI orchestration API (:8080)
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── clients.py      # CRUD for FL participants
│   │   │   ├── data.py         # Data generation + stats
│   │   │   ├── training.py     # Start/stop/status training
│   │   │   └── inference.py    # Email classify + model download
│   │   └── services/
│   │       ├── classifier.py   # Feature extraction + inference
│   │       └── flower.py       # Flower subprocess management
│   ├── Dockerfile
│   ├── docker-compose.yml      # Standalone (no Kafka) — legacy dev mode
│   └── requirements.txt
│
├── fl/
│   ├── shared/                 # Imported by ALL FL services
│   │   ├── model.py            # TabularMLP — single source of truth
│   │   ├── features.py         # 20-feature email extractor
│   │   ├── schemas.py          # Kafka message dataclasses + serialisation
│   │   └── kafka_utils.py      # Producer/consumer factory helpers
│   │
│   ├── server/                 # Flower server (aggregation strategy)
│   │   ├── main.py
│   │   ├── strategy.py         # FedAvg / FedProx strategy
│   │   └── metrics.py          # Round metrics + confusion matrix
│   │
│   ├── client/                 # Flower client (per FL participant)
│   │   ├── main.py             # NumPyClient + Kafka publisher
│   │   ├── trainer.py          # Local training + TP/FP/TN/FN eval
│   │   ├── privacy.py          # DP noise (clip + Gaussian)
│   │   ├── data.py             # CSV loader + StandardScaler
│   │   └── finetune.py         # Post-federation personalisation
│   │
│   ├── data/                   # Per-client private datasets
│   │   └── {client-id}/
│   │       ├── dataset.csv
│   │       └── model.pt        # Personalised model (post-distribution)
│   │
│   └── output/                 # Global model + training logs
│       ├── global_model.pt
│       ├── metrics.json
│       └── logs.jsonl
│
├── worker/                     # Kafka consumer + HDFS + aggregation
│   ├── main.py                 # Entry point (Phase 1: connectivity stub)
│   ├── Dockerfile
│   └── requirements.txt
│
├── dashboard/                  # React monitoring UI (:5173)
│   └── src/
│       ├── pages/
│       │   ├── ClientManager.tsx
│       │   ├── Training.tsx
│       │   ├── ClientInbox.tsx
│       │   ├── Logs.tsx
│       │   └── Explanation.tsx
│       ├── components/
│       │   ├── training/       # ConfusionMatrix, Charts, Timeline
│       │   ├── client/         # ClientCard, DatasetStats, WorkflowSteps
│       │   └── explanation/    # Accordion section components
│       └── services/api.ts     # Axios + TypeScript types
│
└── scripts/
    └── generate_email_data.py  # Synthetic non-IID dataset generator
```

---

## Quick Start

### 1 — Start infrastructure

```bash
docker compose up -d zookeeper kafka kafka-init hdfs-namenode hdfs-datanode kafka-ui
```

Wait ~30 s for Kafka to become healthy, then:

```bash
# Verify topics exist
docker exec fl-kafka kafka-topics --bootstrap-server localhost:29092 --list
```

### 2 — Start all services

```bash
docker compose up -d --build
```

### 3 — Open the dashboard

`http://localhost:5173`

Use the **Client Manager** to create clients, generate datasets, then go to **Training** to run a federated round.

---

## Kafka Topics

| Topic            | Producer    | Consumer              | Purpose                         |
|------------------|-------------|-----------------------|---------------------------------|
| `client.weights` | FL clients  | Worker                | Local weights after DP noise    |
| `global.weights` | Worker      | FL clients            | Aggregated global model         |
| `fl.metrics`     | Worker      | Controller            | Per-round metrics + F1          |
| `fl.status`      | Controller  | All                   | Training lifecycle events       |

Kafka UI: **`http://localhost:8090`**

---

## Privacy Design

| Data | Location | Ever shared? |
|------|----------|-------------|
| Raw email text | `fl/data/{id}/` | Never |
| Extracted features | Client only | Never |
| Model weights (pre-noise) | Client only | Never |
| Model weights (post-DP noise) | Client → Kafka → Worker | Yes |
| Global model weights | Worker → Kafka → clients | Yes |
| Aggregate metrics | Worker → Kafka → Controller → Dashboard | Yes |

Differential Privacy applied in `fl/client/privacy.py`:
- **Gradient clipping** — per-layer L2 norm clipped to `clip_norm`
- **Gaussian noise** — `σ = noise_mult × clip_norm` added per weight

Both parameters are configurable from the Training page.

---

## Email Feature Set

Each email is represented as **20 numerical features** — raw text never leaves the client.

| # | Feature | # | Feature |
|---|---------|---|---------|
| 0 | word_count | 10 | subject_caps_ratio |
| 1 | char_count | 11 | subject_spam_keywords |
| 2 | caps_ratio | 12 | has_attachment |
| 3 | exclamation_count | 13 | reply_to_mismatch |
| 4 | question_count | 14 | sender_domain_len |
| 5 | url_count | 15 | html_ratio |
| 6 | spam_keyword_count | 16 | urgency_word_count |
| 7 | digit_ratio | 17 | money_word_count |
| 8 | special_char_ratio | 18 | personal_greeting |
| 9 | subject_length | 19 | line_break_ratio |

---

## Non-IID Client Profiles

| Profile | Spam % | Dominant pattern | FL relevance |
|---------|--------|-----------------|--------------|
| marketing | 70% | High url_count, spam_keywords | Teaches promo detection |
| balanced | 50% | Mixed | Anchor client |
| phishing | 30% | High caps, reply_to_mismatch | Teaches spoofing detection |

Federation is genuinely valuable: a model trained on only one client's data misses patterns seen by the others.

---

## Model

**TabularMLP** — `[20 → 128 → 64 → 2]`
- LayerNorm + ReLU + Dropout(0.3) after each hidden layer
- LayerNorm (not BatchNorm) — BatchNorm running stats corrupt FedAvg aggregation
- Trained with Adam + CrossEntropyLoss
- Configurable: LR schedule (none / cosine / step), local epochs, FedProx μ

---

## Implementation Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | Done | Docker Compose — Zookeeper, Kafka, HDFS, Kafka UI |
| 2 | Done | Kafka message schemas (`schemas.py`) + producer/consumer helpers |
| 3 | Pending | Worker consumer loop + HDFS storage + FedAvg aggregation |
| 4 | Pending | Controller Kafka producer/consumer integration |
| 5 | Pending | FL client Kafka publisher (replaces direct Flower gRPC) |
| 6 | Pending | Dashboard SSE bridge + port updates |
| 7 | Pending | Oracle Cloud ARM VM deployment |
