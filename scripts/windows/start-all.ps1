# start-all.ps1 — Bring up the full SpamFL stack (Windows)
$ErrorActionPreference = "Stop"

$ROOT   = Resolve-Path "$PSScriptRoot\..\.."
$VENV   = "$ROOT\fl\.venv"

Write-Host "==> SpamFL - starting full stack" -ForegroundColor Cyan
Write-Host ""

# ── 1. Python venv for FL layer ────────────────────────────────────────────────
Write-Host "[1/4] Checking Python venv for fl/..." -ForegroundColor Yellow
if (-not (Test-Path $VENV)) {
    Write-Host "      Creating venv..."
    python -m venv $VENV
    & "$VENV\Scripts\pip" install --quiet --upgrade pip
    & "$VENV\Scripts\pip" install --quiet -r "$ROOT\fl\requirements.txt"
} else {
    Write-Host "      Venv already exists - skipping install."
}

# ── 2. Controller (Docker) ─────────────────────────────────────────────────────
Write-Host "[2/4] Starting controller (Docker)..." -ForegroundColor Yellow
docker compose -f "$ROOT\controller\docker-compose.yml" up -d --build

Write-Host "      Waiting for controller to be healthy..."
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 1
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}
if ($ready) { Write-Host "      Controller ready." } else { Write-Host "      Controller may still be starting..." -ForegroundColor DarkYellow }

# ── 3. Dashboard ───────────────────────────────────────────────────────────────
Write-Host "[3/4] Installing dashboard dependencies..." -ForegroundColor Yellow
& npm --prefix "$ROOT\dashboard" install --silent

Write-Host "[4/4] Starting dashboard dev server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" `
    -WorkingDirectory "$ROOT\dashboard" -WindowStyle Normal

# ── 4. Done ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==> Stack running" -ForegroundColor Green
Write-Host ""
Write-Host "   Controller API  ->  http://localhost:8080"
Write-Host "   Dashboard       ->  http://localhost:5173"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open the dashboard at http://localhost:5173"
Write-Host "  2. Go to Clients -> Add clients and generate data"
Write-Host "  3. Go to Training -> Start training"
Write-Host "  4. After training, open a client inbox to classify emails"
Write-Host ""
Write-Host "To stop: .\scripts\windows\stop-all.ps1"
