#!/usr/bin/env bash
# start-all.sh — Bring up the full SpamFL stack (Linux / macOS)
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENV="$ROOT/fl/.venv"

echo "==> SpamFL — starting full stack"
echo ""

# ── 1. Python venv for FL layer ────────────────────────────────────────────────
if [ ! -d "$VENV" ]; then
  echo "[1/4] Creating Python venv for fl/..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet --upgrade pip
  "$VENV/bin/pip" install --quiet -r "$ROOT/fl/requirements.txt"
else
  echo "[1/4] fl/ venv already exists — skipping install"
fi

# ── 2. Controller (Docker) ─────────────────────────────────────────────────────
echo "[2/4] Starting controller (Docker)..."
docker compose -f "$ROOT/controller/docker-compose.yml" up -d --build

echo "      Waiting for controller to be healthy..."
for i in $(seq 1 15); do
  if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo "      Controller ready."
    break
  fi
  sleep 1
done

# ── 3. Dashboard ───────────────────────────────────────────────────────────────
echo "[3/4] Installing dashboard dependencies..."
cd "$ROOT/dashboard"
npm install --silent

echo "[3/4] Starting dashboard dev server..."
npm run dev &
DASH_PID=$!
echo "      Dashboard PID: $DASH_PID"

# ── 4. Done ────────────────────────────────────────────────────────────────────
echo ""
echo "==> Stack running"
echo ""
echo "   Controller API  ->  http://localhost:8080"
echo "   Dashboard       ->  http://localhost:5173"
echo ""
echo "Next steps:"
echo "  1. Open the dashboard at http://localhost:5173"
echo "  2. Go to Clients -> Add clients and generate data"
echo "  3. Go to Training -> Start training"
echo "  4. After training, open a client inbox to classify emails"
echo ""
echo "To stop: bash scripts/linux/stop-all.sh"
