#!/usr/bin/env bash
# stop-all.sh — Tear down the full SpamFL stack (Linux / macOS)

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo ""
echo "==> SpamFL — stopping stack"
echo ""

echo "[1/1] Stopping all containers..."
docker compose -f "$ROOT/docker-compose.yml" down

echo ""
echo "==> Stack stopped."
echo ""
echo "To also delete HDFS volumes (full reset):"
echo "  docker compose -f \"$ROOT/docker-compose.yml\" down -v"
echo ""
