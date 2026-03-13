# stop-all.ps1 — Tear down the full FL stack on Windows
$ErrorActionPreference = "Continue"

$ROOT = Resolve-Path "$PSScriptRoot\..\.."

Write-Host "Stopping clients..."
docker compose -f "$ROOT\clients\docker-compose.yml" down 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  clients stopped."
} else {
    Write-Host "  clients already stopped or not found."
}

Write-Host "Stopping FL server..."
docker compose -f "$ROOT\core\docker-compose.yml" down 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  server stopped."
} else {
    Write-Host "  server already stopped or not found."
}

Write-Host "Stopping dashboard..."
$node = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($node) {
    $node | Stop-Process -Force
    Write-Host "  dashboard stopped."
} else {
    Write-Host "  dashboard not running."
}

Write-Host ""
Write-Host "Stack stopped."
