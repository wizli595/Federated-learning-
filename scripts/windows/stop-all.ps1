# stop-all.ps1 — Tear down the full SpamFL stack (Windows)
$ErrorActionPreference = "Continue"

$ROOT = Resolve-Path "$PSScriptRoot\..\.."

Write-Host "==> SpamFL - stopping stack" -ForegroundColor Cyan
Write-Host ""

# ── Stop controller ────────────────────────────────────────────────────────────
Write-Host "[1/3] Stopping controller..." -ForegroundColor Yellow
docker compose -f "$ROOT\controller\docker-compose.yml" down 2>&1 | Out-Null
Write-Host "      Done."

# ── Kill Flower processes ──────────────────────────────────────────────────────
Write-Host "[2/3] Stopping Flower processes..." -ForegroundColor Yellow
$flowerProcs = Get-CimInstance Win32_Process -Filter "Name = 'python.exe' OR Name = 'python3.exe'" |
    Where-Object { $_.CommandLine -match "server\.py|client\.py" }
if ($flowerProcs) {
    $flowerProcs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Write-Host "      Flower processes stopped."
} else {
    Write-Host "      No Flower processes running."
}

# ── Kill dashboard dev server ──────────────────────────────────────────────────
Write-Host "[3/3] Stopping dashboard..." -ForegroundColor Yellow
$nodeProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -match "vite" }
if ($nodeProcs) {
    $nodeProcs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Write-Host "      Dashboard stopped."
} else {
    Write-Host "      Dashboard was not running."
}

Write-Host ""
Write-Host "==> Stack stopped." -ForegroundColor Green
