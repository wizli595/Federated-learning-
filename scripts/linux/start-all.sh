#!/usr/bin/env bash
# start-all.sh — Bring up the full SpamFL stack (Linux / macOS)
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo ""
echo "==> SpamFL — starting full stack"
echo ""

# ── 1. Remove stale containers ─────────────────────────────────────────────────
echo "[1/4] Removing any stale containers..."
for name in fl-controller fl-worker fl-dashboard; do
  if docker ps -aq -f "name=^${name}$" | grep -q .; then
    docker rm -f "$name"
    echo "      Removed $name"
  fi
done

# ── 2. Build images ────────────────────────────────────────────────────────────
echo "[2/4] Building images..."
docker compose -f "$ROOT/docker-compose.yml" build

# ── 3. Start full stack ────────────────────────────────────────────────────────
echo "[3/4] Starting all services..."
docker compose -f "$ROOT/docker-compose.yml" up -d

# ── 4. Wait for controller ─────────────────────────────────────────────────────
echo "[4/4] Waiting for controller to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/clients > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo ""
if curl -sf http://localhost:8080/clients > /dev/null 2>&1; then
  echo "==> Stack is up"
else
  echo "==> Services started (controller may still be initialising)"
fi
echo ""
echo "   Dashboard        ->  http://localhost:3000"
echo "   Controller API   ->  http://localhost:8080"
echo "   Kafka UI         ->  http://localhost:8090"
echo "   HDFS UI          ->  http://localhost:9870"
echo ""
echo "Next steps:"
echo "  1. Open the dashboard at http://localhost:3000"
echo "  2. Clients -> Add clients and generate data"
echo "  3. Training -> Start training"
echo "  4. After training, open a client inbox to classify emails"
echo ""
echo "To stop:  bash scripts/linux/stop-all.sh"
echo "Logs:     docker logs -f fl-controller"
echo ""
