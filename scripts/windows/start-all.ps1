# start-all.ps1 — Bring up the full FL stack on Windows
$ErrorActionPreference = "Continue"

$ROOT = Resolve-Path "$PSScriptRoot\..\.."

Write-Host ">> Starting FL server..."
docker compose -f "$ROOT\core\docker-compose.yml" up -d --build

Write-Host ">> Starting clients..."
docker compose -f "$ROOT\clients\docker-compose.yml" up -d --build

Write-Host ">> Starting dashboard..."
$DASHBOARD = "$ROOT\dashboard"
& npm --prefix "$DASHBOARD" install --silent
Start-Process cmd -ArgumentList "/c", "npm run dev" -WorkingDirectory "$DASHBOARD" -WindowStyle Normal

Write-Host ""
Write-Host "Stack running:"
Write-Host "  FL Server  -> http://localhost:8080"
Write-Host "  Dashboard  -> http://localhost:5173"
