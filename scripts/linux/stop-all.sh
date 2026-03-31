#!/usr/bin/env bash
# stop-all.sh — Tear down the full SpamFL stack (Linux / macOS)
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "==> SpamFL — stopping stack"
echo ""

# ── Stop controller ────────────────────────────────────────────────────────────
echo "[1/3] Stopping controller..."
docker compose -f "$ROOT/controller/docker-compose.yml" down

# ── Kill any Flower processes ──────────────────────────────────────────────────
echo "[2/3] Stopping Flower processes..."
pkill -f "fl/server.py" 2>/dev/null && echo "      Flower server stopped." || echo "      Flower server was not running."
pkill -f "fl/client.py" 2>/dev/null && echo "      Flower clients stopped." || echo "      Flower clients were not running."

# ── Kill dashboard dev server ──────────────────────────────────────────────────
echo "[3/3] Stopping dashboard..."
pkill -f "vite" 2>/dev/null && echo "      Dashboard stopped." || echo "      Dashboard was not running."

echo ""
echo "==> Stack stopped."
