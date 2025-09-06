# Simple script to start both backend and frontend servers
# Run this from the SynergySphere root directory

Write-Host "Starting SynergySphere Servers..." -ForegroundColor Cyan
Write-Host ""

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd packages\backend; Write-Host 'Installing backend dependencies...' -ForegroundColor Yellow; npm install; Write-Host 'Starting backend on port 5000...' -ForegroundColor Green; npm run dev"

# Wait a moment
Start-Sleep -Seconds 2

# Start Frontend  
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host 'Installing frontend dependencies...' -ForegroundColor Yellow; npm install; Write-Host 'Starting frontend on port 3000...' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   Servers Starting!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Please wait for both servers to fully start..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Once both servers are running, you can:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "2. Run .\quick-test.ps1 to test the integration" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop this script (servers will continue running)" -ForegroundColor Gray
