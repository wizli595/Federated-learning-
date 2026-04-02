#!/usr/bin/env bash
# start-all.sh — Bring up the full SpamFL stack (Linux / macOS)
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo ""
echo "==> SpamFL — starting full stack"
echo ""

# ── 1. Remove stale containers ─────────────────────────────────────────────────
echo "[1/5] Removing any stale containers..."
for name in fl-controller fl-worker fl-dashboard fl-client-portal; do
  if docker ps -aq -f "name=^${name}$" | grep -q .; then
    docker rm -f "$name"
    echo "      Removed $name"
  fi
done

# ── 2. Build client portal on host (avoids Docker npm network issues) ──────────
echo "[2/5] Building client portal (npm run build)..."
(cd "$ROOT/client-portal" && npm run build)

# ── 3. Build Docker images ─────────────────────────────────────────────────────
echo "[3/5] Building Docker images..."
docker compose -f "$ROOT/docker-compose.yml" build

# ── 4. Start full stack ────────────────────────────────────────────────────────
echo "[4/5] Starting all services..."
docker compose -f "$ROOT/docker-compose.yml" up -d

# ── 5. Wait for controller ─────────────────────────────────────────────────────
echo "[5/5] Waiting for controller to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo ""
if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
  echo "==> Stack is up"
else
  echo "==> Services started (controller may still be initialising)"
fi
echo ""
echo "   Admin Dashboard   ->  http://localhost:3000"
echo "   Client Portal     ->  http://localhost:4000"
echo "   Controller API    ->  http://localhost:8080"
echo "   Kafka UI          ->  http://localhost:8090"
echo "   HDFS UI           ->  http://localhost:9870"
echo ""
echo "Admin flow (port 3000):"
echo "  1. Login -> Clients -> Add clients and generate data"
echo "  2. Training -> Watch for portal clients badge, then Start Training"
echo "  3. After training, model is distributed automatically"
echo ""
echo "Portal client flow (port 4000):"
echo "  1. Register or log in with your client ID"
echo "  2. Upload your email dataset (CSV)"
echo "  3. Wait for the admin to start a training round"
echo "  4. Once training finishes, test emails in the Inbox Simulator"
echo ""
echo "To stop:  bash scripts/linux/stop-all.sh"
echo "Logs:     docker logs -f fl-controller"
echo ""
