# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Email Spam Detection using Horizontal Federated Learning. Five independent deployable units:

- **shared/** — Installable Python package (`pip install -e shared/`): model, schemas, features, Kafka utils — single source of truth for all services
- **controller/** — Orchestration API (FastAPI): manages clients, triggers data generation, controls FL training
- **fl/** — FL layer: Flower server (FedAvg/FedProx) + clients (local training + inference)
- **worker/** — Kafka consumer + HDFS aggregation service (type-router architecture)
- **dashboard/** — React control + monitoring frontend (Vite + Recharts + Tailwind)

The old custom FL server (pre-Flower) is preserved on the `v1-fedavg` branch.

## Key Constraints

- All services communicate via HTTP or Kafka — shared code lives in the `shared/` installable package
- Raw email data never leaves the client — only extracted features are used for training
- Model weights are DP-noised (clip + Gaussian noise) before submission
- `shared/shared/model.py` is the single source of truth for model architecture
- `shared/shared/schemas.py` is the single source of truth for Kafka message schemas
- `shared/shared/features/` is the single source of truth for email feature extraction
- Client configs are stored as JSON files in `controller/app/clients/`
- Training metrics flow: FL clients → Kafka (`client.weights`) → Worker → Kafka (`fl.metrics`) → Controller
- State is in-memory in the controller (SQLite for experiment history only)

## Commands

### Full Stack (Docker Compose — root level)
```bash
# Start infrastructure (Zookeeper, Kafka, HDFS, Kafka UI)
docker compose up -d zookeeper kafka kafka-init hdfs-namenode hdfs-datanode kafka-ui

# Start all services
docker compose up -d --build

# Tear down everything
docker compose down

# Logs
docker logs -f fl-worker
docker logs -f fl-controller
docker logs -f fl-kafka
```

### Scripts
```bash
# Windows
.\scripts\windows\start-all.ps1   # removes stale containers, builds, starts full stack
.\scripts\windows\stop-all.ps1

# Linux / macOS
bash scripts/linux/start-all.sh
bash scripts/linux/stop-all.sh
```

### Flower (FL Layer — local dev)
```bash
python fl/server/main.py                          # start Flower server (:8090)
python fl/client/main.py --client-id alice        # start a single Flower client
```

### Dashboard
```bash
cd dashboard && npm install
cd dashboard && npm run dev     # dev server at http://localhost:5173
cd dashboard && npm run build
cd dashboard && npm run lint
```

### Data Generation
```bash
python scripts/generate_email_data.py --clients 3 --samples 200 --seed 42
# Profiles: client-1=marketing, client-2=balanced, client-3=phishing
# Writes to fl/data/client-{id}/dataset.csv
```

## Service Ports

| Service            | Port  | Notes                        |
|--------------------|-------|------------------------------|
| Dashboard (prod)   | 3000  | Nginx + React SPA            |
| Dashboard (dev)    | 5173  | Vite dev server              |
| Controller API     | 8080  | FastAPI / HTTP               |
| Flower Server      | 8090  | gRPC (internal only)         |
| Kafka UI           | 8090  | Provectus web UI (prod only) |
| HDFS NameNode UI   | 9870  | WebHDFS + web browser        |
| HDFS NameNode RPC  | 9000  | Internal                     |
| Kafka broker       | 9092  | External (host access)       |
| Kafka broker       | 29092 | Internal (container network) |
| Zookeeper          | 2181  | Internal                     |

## Architecture

### Kafka Topics

| Topic            | Partitions | Producer       | Consumer         | Message type     |
|------------------|-----------|----------------|------------------|------------------|
| `client.weights` | 4          | FL clients     | Worker           | `fl_weights`     |
| `global.weights` | 1          | Worker         | FL clients + Controller | `global_weights` |
| `fl.metrics`     | 1          | Worker         | Controller       | `fl_metrics`     |
| `fl.status`      | 1          | Controller     | All              | `fl_status`      |

### Message Schemas (`shared/shared/schemas.py`)

All messages are JSON with a mandatory `type` field. The Worker routes on this field.

| Class                  | type field        | Topic            | Weights encoded as        |
|------------------------|-------------------|------------------|---------------------------|
| `ClientWeightsMessage` | `fl_weights`      | `client.weights` | base64 float32 bytes      |
| `GlobalWeightsMessage` | `global_weights`  | `global.weights` | base64 float32 bytes      |
| `MetricsMessage`       | `fl_metrics`      | `fl.metrics`     | —                         |
| `StatusMessage`        | `fl_status`       | `fl.status`      | —                         |

Helpers: `weights_to_payload(arrays)` / `payload_to_weights(payload)` in `schemas.py`.
Kafka helpers: `make_producer()`, `make_consumer()`, `publish()`, `poll_loop()` in `shared/shared/kafka_utils.py`.

### Full System Flow

```
STEP 1 — Create Clients
  Dashboard → POST /clients  (name, spam profile, num emails)
  Controller → saves config JSON + creates fl/data/{id}/ directory

STEP 2 — Generate Data
  Dashboard → POST /data/generate
  Controller → runs generate_email_data.py per client config
  Each client gets a non-IID email CSV (20 features + label)

STEP 3 — Start Training
  Dashboard → POST /training/start  (rounds, epochs, algorithm, mu, noise)
  Controller → publishes StatusMessage(status=training) to fl.status
  Controller → spawns fl/server/main.py + fl/client/main.py per client

STEP 4 — Training Rounds (per round, per client)
  FL client trains locally → applies DP noise to weights
  FL client publishes ClientWeightsMessage to Kafka (client.weights)
  Worker consumes → stores weight arrays in HDFS
  Worker runs FedAvg aggregation across client submissions for that round
  Worker publishes GlobalWeightsMessage to Kafka (global.weights)
  Worker publishes MetricsMessage to Kafka (fl.metrics)
  Controller consumes fl.metrics → updates training status
  FL clients consume global.weights → load new model → next round

STEP 5 — Model Distribution (automatic after final round)
  Worker saves fl/output/global_model.pt
  Controller copies model to fl/data/{id}/model.pt for each client
  Controller publishes StatusMessage(status=finished)

STEP 6 — Inference Simulation
  Dashboard → POST /clients/{id}/classify  (subject, body, sender fields)
  Controller → extracts 20 features from email fields
  Controller → loads fl/data/{id}/model.pt
  Controller → runs inference → returns { label, confidence, feature_breakdown }
  Dashboard shows: SPAM / HAM + confidence + which features triggered it
```

### Email Feature Set (input_dim = 20)

Each email is represented as 20 extracted features. Raw text never leaves the client.

| # | Feature | Description |
|---|---------|-------------|
| 0 | word_count | Total words in body |
| 1 | char_count | Total characters |
| 2 | caps_ratio | Uppercase char ratio |
| 3 | exclamation_count | Number of ! |
| 4 | question_count | Number of ? |
| 5 | url_count | Number of URLs/links |
| 6 | spam_keyword_count | "free", "win", "prize", "click", "offer" |
| 7 | digit_ratio | Ratio of digits to total chars |
| 8 | special_char_ratio | $, %, * etc. |
| 9 | subject_length | Subject line length |
| 10 | subject_caps_ratio | Caps ratio in subject |
| 11 | subject_spam_keywords | Spam words in subject |
| 12 | has_attachment | Binary 0/1 |
| 13 | reply_to_mismatch | Sender != reply-to (phishing indicator) |
| 14 | sender_domain_len | Length of sender domain |
| 15 | html_ratio | HTML content ratio |
| 16 | urgency_word_count | "urgent", "immediately", "limited time" |
| 17 | money_word_count | "cash", "earn", "$", "€" |
| 18 | personal_greeting | Generic "dear customer" (0) vs named (1) |
| 19 | line_break_ratio | Formatting density |

### Non-IID Client Profiles

| Profile   | Spam % | Dominant Spam Type         | Why it matters for FL |
|-----------|--------|----------------------------|-----------------------|
| marketing | 70%    | URLs, offers, promos       | high url_count, spam_keywords |
| balanced  | 50%    | Mixed                      | representative distribution |
| phishing  | 30%    | Urgency, spoofed sender    | high caps, reply_mismatch |

### Differential Privacy

Applied to weights before Kafka publish via `fl/client/privacy/` package (delta-based for better SNR):

```
fl/client/privacy/
├── __init__.py      — re-exports: privatize_weights, compute_deltas, clip_global_norm, add_noise
├── privatize.py     — orchestrator: deltas → clip → noise → reconstruct
├── deltas.py        — compute_deltas(local, global) → per-tensor subtraction
├── clipping.py      — clip_global_norm(deltas, clip_norm) → joint L2 scaling
└── noise.py         — add_noise(tensors, noise_std) → Gaussian noise per element
```

Pipeline: `delta = local - global → clip(delta) → noise(delta) → global + noised_delta`
Delta-based noise gives ~10x better SNR than noising absolute weights.
`clip_norm` and `noise_multiplier` are configurable from the dashboard at training start.

### Model: TabularMLP (`shared/shared/model.py`)

Architecture: `[20 → 128 → 64 → 2]` with LayerNorm, ReLU, Dropout(0.3).
- `input_dim = 20` (email features)
- `num_classes = 2` (spam=1, ham=0)
- Helper functions: `build_model`, `get_weights`, `set_weights`
- Note: LayerNorm used instead of BatchNorm1d — BatchNorm corrupts weights during FedAvg aggregation

### Worker Type-Router

Worker consumes from `client.weights` and routes by `type` field. Handlers auto-register via `@register(type)` decorator in `worker/handlers/`:

| type value       | Handler                     | Action |
|------------------|-----------------------------|--------|
| `fl_weights`     | `handlers/fl_weights.py`    | Buffer in aggregator → FedAvg → publish to `global.weights` + `fl.metrics` + HDFS |
| `fl_status`      | `handlers/fl_status.py`     | Configure aggregator on training start, reset on stop |
| `fl_metrics`     | `handlers/fl_metrics.py`    | Log/persist metrics |
| `predictions`    | `handlers/predictions.py`   | (future) store inference results |

Aggregation math lives in `worker/domain/` (pure, no I/O). State buffering in `worker/aggregator/`.

## Authentication

All controller routes except `/health` and `/auth/login` require a Bearer JWT token.

### How it works
1. Set `ACCESS_CODE` and `JWT_SECRET` in `.env` (root level)
2. `POST /auth/login` with `{"code": "<ACCESS_CODE>"}` → returns `{"token": "..."}`
3. All subsequent requests must include `Authorization: Bearer <token>`
4. Token is valid for 30 days
5. Dashboard handles this automatically — login page on first visit, token stored in `localStorage`

### Env vars (`.env`)
```
ACCESS_CODE=your-secret-code
JWT_SECRET=your-jwt-signing-secret
```

The controller loads these via `env_file: - .env` in `docker-compose.yml`.

### Auth route
| Method | Endpoint | Auth required | Purpose |
|--------|----------|---------------|---------|
| POST | `/auth/login` | No | Exchange access code for JWT |
| GET | `/health` | No | Health check |
| * | all other routes | Yes | Requires `Authorization: Bearer <token>` |

### Key files
- `controller/app/routes/auth.py` — login endpoint + `create_token()` / `verify_token()`
- `controller/app/middleware.py` — `AuthMiddleware` (Starlette middleware, extracted from main.py)
- `controller/app/main.py` — Composition Root (wires middleware, routes, lifespan hooks)
- `dashboard/src/context/AuthContext.tsx` — React auth state + `login()` / `logout()`
- `dashboard/src/pages/Login.tsx` — login page UI
- `dashboard/src/services/api.ts` — axios interceptors (attach token, redirect on 401)

## Project Structure & Architecture

### Design Patterns

- **Hexagonal Architecture**: `domain/` = pure functions (no I/O imports), `services/` = orchestration, `routes/` = inbound adapters, producers/HDFS = outbound adapters
- **Composition Root**: `main.py` files only import and wire — never define logic
- **Package Facade**: multi-file packages expose public API via `__init__.py` re-exports
- **Module Promotion**: single `.py` file → package when it has 3+ distinct concerns

### Shared Package (`shared/`)

Installable via `pip install -e shared/` — eliminates all `sys.path.insert` hacks.

```
shared/
├── pyproject.toml
└── shared/
    ├── __init__.py
    ├── model.py              — TabularMLP (20→128→64→2), build/get/set weights
    ├── schemas.py            — Kafka message dataclasses, base64 weight encoding, TOPICS registry
    ├── kafka_utils.py        — make_producer, make_consumer, publish, poll_loop
    └── features/
        ├── __init__.py       — re-exports: FEATURE_NAMES, INPUT_DIM, extract_features, features_to_dict
        ├── vocabulary.py     — SPAM_KEYWORDS, URGENCY_WORDS, MONEY_WORDS, FEATURE_NAMES
        ├── helpers.py        — domain(), keyword_hits(), url_count(), html_ratio()
        ├── body.py           — body_features(body) → 9 features (indices 0-8)
        ├── subject.py        — subject_features(subject) → 3 features (indices 9-11)
        ├── sender.py         — sender_features(sender, reply_to, has_attachment) → 3 features (12-14)
        ├── content.py        — content_features(body) → 5 features (indices 15-19)
        └── extract.py        — extract_features() assembler + features_to_dict()
```

### Worker (`worker/`)

```
worker/
├── main.py                   — Composition Root: health check → init → poll_loop
├── health.py                 — check_kafka(), check_hdfs(), wait_for_services()
├── router.py                 — @register(type) decorator, dispatch(raw_bytes)
├── producer.py               — publish aggregated metrics to Kafka
├── hdfs_client.py            — WebHDFS adapter (upload/download round data)
├── domain/                   — Pure functions (no I/O)
│   ├── fedavg.py             — weighted_average_weights()
│   ├── scalar_agg.py         — weighted_average_scalars()
│   └── confusion.py          — micro_confusion() → P/R/F1
├── aggregator/               — FedAvg round buffer (stateful)
│   ├── __init__.py           — re-exports: ClientSubmission, AggregationResult, Aggregator
│   ├── models.py             — ClientSubmission + AggregationResult dataclasses
│   ├── round_buffer.py       — RoundBuffer (accumulates until N clients submit)
│   └── aggregator.py         — Aggregator (manages round buffers, thread-safe)
└── handlers/                 — Auto-registered message handlers
    ├── fl_weights.py         — @register("fl_weights") → aggregate + publish
    ├── fl_status.py          — @register("fl_status") → configure aggregator
    ├── fl_metrics.py         — @register("fl_metrics") → log/persist
    └── predictions.py        — @register("predictions") → (future)
```

### Controller (`controller/app/`)

```
controller/app/
├── main.py                   — Composition Root: lifespan, CORS, route wiring
├── middleware.py              — AuthMiddleware (Starlette)
├── startup.py                — reset_stale_training()
├── db.py                     — SQLite experiment history (init, save_run, all_runs)
├── state.py                  — In-memory training state (running, processes)
├── domain/                   — Pure functions (no I/O)
│   ├── slugify.py            — slugify(name) → URL-safe string
│   ├── csv_validator.py      — validate_csv(content, features) → DataFrame or ValueError
│   └── stats.py              — compute_client_stats(rows, features) → {total, spam, ham}
├── services/
│   ├── classifier.py         — classify() + classify_batch_features()
│   ├── model_loader.py       — load_model(client_id) with mtime cache
│   ├── kafka_producer.py     — publish_status() → fire-and-forget StatusMessage
│   ├── kafka_consumer.py     — start() async task polling fl.metrics
│   ├── kafka_sse.py          — SSE queue: subscribe/unsubscribe/broadcast/store_round
│   ├── sse.py                — SSE generators: kafka_stream(), log_stream()
│   └── flower/               — Training lifecycle package
│       ├── __init__.py       — facade: start, stop, read_metrics, LOGS, METRICS
│       ├── lifecycle.py      — start/stop/read_metrics/_watch_and_distribute/_finalise_run
│       ├── spawner.py        — spawn_server(req), spawn_clients(clients, port)
│       ├── distributor.py    — copy_model_to_clients(), finetune_clients()
│       └── logs.py           — append_log(), drain_stdout(), LOGS/METRICS paths
└── routes/
    ├── auth.py               — POST /auth/login
    ├── clients.py            — CRUD /clients
    ├── data.py               — POST /data/generate, GET /data/stats
    ├── training.py           — POST /training/start|stop, GET /training/status|logs
    ├── inference.py          — POST /clients/{id}/classify, batch, model download/export
    ├── experiments.py        — GET/DELETE /experiments
    └── portal.py             — Client self-service portal
```

### FL Layer (`fl/`)

```
fl/
├── client/
│   ├── main.py               — Composition Root: parse args → start Flower client
│   ├── flower_client.py      — EmailSpamClient(NumPyClient): get_parameters, fit, evaluate
│   ├── trainer.py            — train() + evaluate() (Adam, class-weighted loss, FedProx support)
│   ├── data.py               — load_data(csv_path) → train/test tensors
│   ├── kafka_publisher.py    — publish_weights() to client.weights topic
│   ├── finetune.py           — post-distribution local fine-tuning
│   └── privacy/              — Delta-based Differential Privacy
│       ├── __init__.py       — re-exports: privatize_weights, compute_deltas, clip_global_norm, add_noise
│       ├── privatize.py      — orchestrator: deltas → clip → noise → reconstruct
│       ├── deltas.py         — compute_deltas(local, global)
│       ├── clipping.py       — clip_global_norm(deltas, clip_norm)
│       └── noise.py          — add_noise(tensors, noise_std)
├── server/
│   ├── main.py               — Composition Root: start Flower gRPC server
│   ├── strategy.py           — EmailFedAvg (LR scheduling: none/cosine/step, best checkpoint)
│   └── metrics/              — Round metrics package
│       ├── __init__.py       — re-exports: MetricsWriter
│       ├── writer.py         — MetricsWriter: append_round, best_acc tracking
│       ├── aggregation.py    — aggregate_fit_results, aggregate_eval_results (pure)
│       └── confusion.py      — compute_confusion(tp,fp,tn,fn) → P/R/F1
├── data/                     — Per-client datasets + models (gitignored)
├── output/                   — global_model.pt, best_model.pt, metrics.json, logs.jsonl
└── tests/
    └── test_features.py      — Feature extraction unit tests
```

---

## API Reference

### Controller Routes

#### Auth (`/auth`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Exchange access code for JWT token |

#### Clients (`/clients`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/clients` | List all clients with configs |
| POST | `/clients` | Create client (body: `ClientConfig`) |
| PUT | `/clients/{id}` | Update client config |
| DELETE | `/clients/{id}` | Delete client + data |

#### Data (`/data`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/data/generate` | Run data generation for all clients |
| POST | `/data/generate/{id}` | Run data generation for one client |
| GET | `/data/status` | Check if datasets exist per client |
| GET | `/data/stats` | Per-client spam/ham stats + top features |

#### Training (`/training`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/training/start` | Start Flower server + clients |
| POST | `/training/stop` | Kill Flower processes |
| GET | `/training/status` | Live metrics (rounds, confusion matrix, F1) |
| POST | `/training/reset` | Reset training state |
| GET | `/training/logs` | Tail training log entries |

#### Inference (`/clients/{id}`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/clients/{id}/classify` | Classify a test email |
| POST | `/clients/{id}/classify/batch` | Batch classify from CSV upload |
| GET | `/clients/{id}/model/download` | Download client model.pt |
| GET | `/clients/{id}/model/export` | Export model as ONNX |

### Key Schemas

- `ClientConfig`: `id`, `name`, `profile` (marketing/balanced/phishing), `num_emails`
- `StartTrainingRequest`: `rounds`, `local_epochs`, `learning_rate`, `algorithm`, `mu`, `clip_norm`, `noise_mult`, `min_clients`, `lr_schedule`, `finetune_epochs`
- `ClassifyRequest`: `subject`, `body`, `sender`, `reply_to`, `has_attachment`
- `ClassifyResponse`: `label` (spam/ham), `confidence`, `spam_score`, `model_type`, `feature_breakdown`

## Dashboard Pages

### Client Manager (`/clients`)
- Create / delete clients (name, spam profile, email count)
- Per-client: "Generate Data" button, data status indicator
- "Generate All" bulk action
- Dataset stats panel: spam/ham distribution bars + top discriminating features

### Training (`/training`)
- Configure and start training (rounds, epochs, algorithm, DP params, LR schedule)
- Live round progress: current round, avg loss, spam detection rate
- Convergence chart (accuracy + loss over rounds)
- Confusion matrix panel (TP/FP/TN/FN, precision/recall/F1, F1 sparkline)
- Per-client accuracy chart + round timeline

### Client Inbox (`/clients/{id}/inbox`)
- Generate random email (marketing / phishing / ham)
- Manual email composer (subject, body, sender, attachment toggle)
- Classification result: SPAM / HAM badge + confidence percentage
- Feature breakdown table: extracted feature values that drove the prediction
- Batch CSV classification + results download

### Experiments (`/experiments`)
- History of completed training runs with config + final accuracy
- Side-by-side comparison

### Explanation (`/explanation`)
- Accordion sections: App Flow, What is FL, Why FL for Email, Architecture, Features,
  FedAvg, FedProx, DP, Non-IID, Model, Training Config, Metrics Guide, Experiments, Privacy, Glossary

## Privacy Design

| Data | Location | Ever shared? |
|------|----------|-------------|
| Raw email text | Client (`fl/data/{id}/`) | Never |
| Extracted features | Client only | Never |
| Model weights (pre-noise) | Client only | Never |
| Model weights (post-DP noise) | Client → Kafka → Worker | Yes (Kafka) |
| Global model weights | Worker → Kafka → clients | Yes (Kafka) |
| Aggregate metrics (loss, accuracy %) | Worker → Kafka → Controller → Dashboard | Yes |

## Nginx Proxy Notes

The dashboard Nginx config (`dashboard/nginx.conf`) proxies `/api/*` to the controller:
- `rewrite ^/api/(.*) /$1 break` — strips the `/api` prefix before forwarding
- `set $upstream` before the rewrite — required because `proxy_pass` with a variable does not rewrite URIs automatically, and `rewrite ... break` runs before `set` if ordered incorrectly
- `resolver 127.0.0.11` — Docker's embedded DNS, enables lazy resolution so Nginx starts even if the controller isn't up yet
- `proxy_buffering off` + `proxy_read_timeout 3600s` — required for SSE streams (`/training/kafka-stream`)

## Adding New Email Features

1. Add extraction logic to the appropriate file in `shared/shared/features/` (body.py, subject.py, sender.py, or content.py)
2. Update the assembler in `shared/shared/features/extract.py` if feature count changes
3. Add generation logic to `scripts/generate_email_data.py`
4. Update `INPUT_DIM` constant in `shared/shared/features/vocabulary.py` and `shared/shared/model.py` if count changes
5. Add feature name to `FEATURE_NAMES` list in `shared/shared/features/vocabulary.py`
6. Dashboard feature breakdown table updates automatically via `ClassifyResponse.feature_breakdown`

## Docker Shared Package

Both `worker/Dockerfile` and `controller/Dockerfile` install the shared package:
```dockerfile
COPY shared/ ./shared/
RUN pip install --no-cache-dir -e ./shared
```

Volume mounts in `docker-compose.yml`: `./shared:/app/shared` (for hot-reload in dev)
