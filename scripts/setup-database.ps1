param(
  [string]$ProjectRoot = "C:\Users\Sir. Lord's\Documents\DEMMY"
)

$ErrorActionPreference = "Stop"

Set-Location $ProjectRoot

Write-Host "Starting PostgreSQL and Redis with Docker Compose..."
docker compose up -d postgres redis

Write-Host "Waiting for PostgreSQL to accept connections..."
Start-Sleep -Seconds 8

Write-Host "Building RentFlow backend..."
& "C:\Program Files\nodejs\node.exe" "$ProjectRoot\node_modules\typescript\bin\tsc" -p "$ProjectRoot\backend\tsconfig.json"

Write-Host "Checking database connection..."
Set-Location "$ProjectRoot\backend"
& "C:\Program Files\nodejs\npx.cmd" tsx src/scripts/checkDb.ts

Write-Host ""
Write-Host "Database setup complete."
Write-Host "Run backend with:"
Write-Host "cd `"$ProjectRoot\backend`""
Write-Host "node dist/server.js"
