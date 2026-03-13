# start-all.ps1 — Bring up the full FL stack on Windows
$ErrorActionPreference = "Continue"

$ROOT = Resolve-Path "$PSScriptRoot\..\.."

Write-Host ">> Starting FL server..."
docker compose -f "$ROOT\core\docker-compose.yml" up -d --build

Write-Host ">> Starting clients..."
docker compose -f "$ROOT\clients\docker-compose.yml" up -d --build

Write-Host ">> Starting dashboard..."
Set-Location "$ROOT\dashboard"
npm install --silent
Start-Process npm -ArgumentList "run", "dev" -WindowStyle Normal

Write-Host ""
Write-Host "Stack running:"
Write-Host "  FL Server  -> http://localhost:8080"
Write-Host "  Dashboard  -> http://localhost:5173"
