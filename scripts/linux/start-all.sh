#!/usr/bin/env bash
# start-all.sh — Bring up the full FL stack locally
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▶ Starting FL server..."
docker compose -f "$ROOT/core/docker-compose.yml" up -d --build

echo "▶ Starting clients..."
docker compose -f "$ROOT/clients/docker-compose.yml" up -d --build --scale client=3

echo "▶ Starting dashboard..."
cd "$ROOT/dashboard"
npm install --silent
npm start &

echo ""
echo "✔  Stack running:"
echo "   FL Server  → http://localhost:8080"
echo "   Dashboard  → http://localhost:3000"
