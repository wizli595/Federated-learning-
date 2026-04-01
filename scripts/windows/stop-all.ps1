# stop-all.ps1 - Tear down the full SpamFL stack (Windows)
$ErrorActionPreference = "Continue"

$ROOT    = (Resolve-Path "$PSScriptRoot\..\..")
$COMPOSE = "$ROOT\docker-compose.yml"

Write-Host ""
Write-Host "==> SpamFL - stopping stack" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/1] Stopping all containers..." -ForegroundColor Yellow
docker compose -f "$COMPOSE" down

Write-Host ""
Write-Host "==> Stack stopped." -ForegroundColor Green
Write-Host ""
Write-Host "To also delete HDFS volumes (full reset):"
Write-Host ("  docker compose -f " + $COMPOSE + " down -v")
Write-Host ""
