#!/usr/bin/env bash
# stop-all.sh — Tear down the full FL stack
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▶ Stopping clients..."
docker compose -f "$ROOT/clients/docker-compose.yml" down

echo "▶ Stopping core..."
docker compose -f "$ROOT/core/docker-compose.yml" down

echo "▶ Stopping dashboard (kills npm start)..."
pkill -f "react-scripts start" 2>/dev/null || true

echo "✔  Stack stopped."
