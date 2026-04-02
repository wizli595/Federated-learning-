# start-all.ps1 — Bring up the full SpamFL stack (Windows)
$ErrorActionPreference = "Stop"

$ROOT = Resolve-Path "$PSScriptRoot\..\.."

Write-Host ""
Write-Host "==> SpamFL — starting full stack" -ForegroundColor Cyan
Write-Host ""

# ── 1. Remove stale containers ─────────────────────────────────────────────────
Write-Host "[1/5] Removing any stale containers..." -ForegroundColor Yellow
$stale = @("fl-controller", "fl-worker", "fl-dashboard", "fl-client-portal")
foreach ($name in $stale) {
    $exists = docker ps -aq -f "name=^${name}$" 2>$null
    if ($exists) {
        docker rm -f $name | Out-Null
        Write-Host "      Removed $name"
    }
}

# ── 2. Build client portal on host (avoids Docker npm network issues) ──────────
Write-Host "[2/5] Building client portal (npm run build)..." -ForegroundColor Yellow
Push-Location "$ROOT\client-portal"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Client portal build failed" -ForegroundColor Red; exit 1 }
Pop-Location

# ── 3. Build Docker images ─────────────────────────────────────────────────────
Write-Host "[3/5] Building Docker images..." -ForegroundColor Yellow
docker compose -f "$ROOT\docker-compose.yml" build

# ── 4. Start full stack ────────────────────────────────────────────────────────
Write-Host "[4/5] Starting all services..." -ForegroundColor Yellow
docker compose -f "$ROOT\docker-compose.yml" up -d

# ── 5. Wait for controller ─────────────────────────────────────────────────────
Write-Host "[5/5] Waiting for controller to be ready..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 2
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
Write-Host "   Admin Dashboard   ->  http://localhost:3000"
Write-Host "   Client Portal     ->  http://localhost:4000"
Write-Host "   Controller API    ->  http://localhost:8080"
Write-Host "   Kafka UI          ->  http://localhost:8090"
Write-Host "   HDFS UI           ->  http://localhost:9870"
Write-Host ""
Write-Host "Admin flow (port 3000):"
Write-Host "  1. Login -> Clients -> Add clients and generate data"
Write-Host "  2. Training -> Watch for portal clients badge, then Start Training"
Write-Host "  3. After training, model is distributed automatically"
Write-Host ""
Write-Host "Portal client flow (port 4000):"
Write-Host "  1. Register or log in with your client ID"
Write-Host "  2. Upload your email dataset (CSV)"
Write-Host "  3. Wait for the admin to start a training round"
Write-Host "  4. Once training finishes, test emails in the Inbox Simulator"
Write-Host ""
Write-Host "To stop:  .\scripts\windows\stop-all.ps1"
Write-Host "Logs:     docker logs -f fl-controller"
Write-Host ""
