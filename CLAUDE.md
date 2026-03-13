# CLAUDE.md — PFA-FL Project Guide

## Project Overview
Horizontal Federated Learning system. Three fully independent deployable units:
- **core/** — FL aggregation server + REST API + shared model
- **clients/** — mock training clients
- **dashboard/** — React monitoring frontend

## Key Constraints
- `core/`, `clients/`, and `dashboard/` are **independent** — they communicate only via HTTP/sockets, never via shared imports.
- `core/shared/model.py` is the single source of truth for the model architecture. Clients copy or mount this file; they do not import from `core/`.
- All inter-service URLs are configured via environment variables (see `.env.example`).

## Tech Stack
| Layer | Technology |
|-------|------------|
| FL Server | Python (Flower / custom) |
| REST API | Python (FastAPI or Flask) |
| Clients | Python |
| Dashboard | React + Chart.js |
| Infra | Docker Compose |

## Docker Compose Layout
- `core/docker-compose.yml` — brings up `fl-server` and `api` services
- `clients/docker-compose.yml` — brings up N client replicas
- Services communicate over a shared Docker network (`fl-network`)

## Output
- Trained global model is saved to `output/` at the end of each FL round
- `output/` is a Docker volume mounted into the server container

## Development Notes
- Run `scripts/start-all.sh` to bring up the full stack locally
- Dashboard runs on port `3000`, API on `5000`, FL server on `8080` by default
- Add new evaluation metrics in `core/api/` and surface them in `dashboard/src/services/`
