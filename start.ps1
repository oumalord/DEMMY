#!/usr/bin/env pwsh
# RentFlow Quick Start - Neon Edition

Write-Host "🚀 RentFlow Startup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js found: $(node --version)" -ForegroundColor Green

# Check backend dependencies
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
}

# Check frontend dependencies
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting RentFlow..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 Backend will start at: http://localhost:4000" -ForegroundColor Cyan
Write-Host "📌 Frontend will start at: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting in 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start backend in new PowerShell window
Write-Host "🔧 Starting backend..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$(Get-Location)\backend'; npm run dev"

# Wait for backend to start
Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start frontend in new PowerShell window
Write-Host "🎨 Starting frontend..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$(Get-Location)\frontend'; npm run dev"

Write-Host ""
Write-Host "✅ RentFlow is starting!" -ForegroundColor Green
Write-Host "📱 Open browser to: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test accounts (password: 'password'):" -ForegroundColor Cyan
Write-Host "  • tenant@test.com (Tenant)" -ForegroundColor Gray
Write-Host "  • caretaker@test.com (Caretaker)" -ForegroundColor Gray
Write-Host "  • owner@test.com (Owner)" -ForegroundColor Gray
Write-Host "  • admin@test.com (Admin)" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
