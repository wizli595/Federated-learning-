# start-all.ps1 — Bring up the full SpamFL stack (Windows)
$ErrorActionPreference = "Stop"

$ROOT = Resolve-Path "$PSScriptRoot\..\.."

Write-Host ""
Write-Host "==> SpamFL — starting full stack" -ForegroundColor Cyan
Write-Host ""

# ── 1. Remove stale containers ─────────────────────────────────────────────────
Write-Host "[1/4] Removing any stale containers..." -ForegroundColor Yellow
$stale = @("fl-controller", "fl-worker", "fl-dashboard")
foreach ($name in $stale) {
    $exists = docker ps -aq -f "name=^${name}$" 2>$null
    if ($exists) {
        docker rm -f $name | Out-Null
        Write-Host "      Removed $name"
    }
}

# ── 2. Build images ────────────────────────────────────────────────────────────
Write-Host "[2/4] Building images..." -ForegroundColor Yellow
docker compose -f "$ROOT\docker-compose.yml" build

# ── 3. Start full stack ────────────────────────────────────────────────────────
Write-Host "[3/4] Starting all services..." -ForegroundColor Yellow
docker compose -f "$ROOT\docker-compose.yml" up -d

# ── 4. Wait for controller ─────────────────────────────────────────────────────
Write-Host "[4/4] Waiting for controller to be ready..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8080/clients" -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
}

Write-Host ""
if ($ready) {
    Write-Host "==> Stack is up" -ForegroundColor Green
} else {
    Write-Host "==> Services started (controller may still be initialising)" -ForegroundColor DarkYellow
}
Write-Host ""
Write-Host "   Dashboard        ->  http://localhost:3000"
Write-Host "   Controller API   ->  http://localhost:8080"
Write-Host "   Kafka UI         ->  http://localhost:8090"
Write-Host "   HDFS UI          ->  http://localhost:9870"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open the dashboard at http://localhost:3000"
Write-Host "  2. Clients -> Add clients and generate data"
Write-Host "  3. Training -> Start training"
Write-Host "  4. After training, open a client inbox to classify emails"
Write-Host ""
Write-Host "To stop:  .\scripts\windows\stop-all.ps1"
Write-Host "Logs:     docker logs -f fl-controller"
Write-Host ""
