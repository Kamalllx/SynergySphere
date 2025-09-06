# Quick Test Script for SynergySphere
# Simple version without complex process management

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   SynergySphere Quick Test" -ForegroundColor Cyan  
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Backend Setup
Write-Host "[1] Backend Setup" -ForegroundColor Yellow
Write-Host "Please open a new terminal and run:" -ForegroundColor White
Write-Host ""
Write-Host "  cd packages\backend" -ForegroundColor Green
Write-Host "  npm install" -ForegroundColor Green
Write-Host "  npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter when backend is running..." -ForegroundColor Yellow
Read-Host

# Test backend health
Write-Host "Testing backend health..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing
    Write-Host "[OK] Backend is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Backend is not responding" -ForegroundColor Red
    Write-Host "Make sure the backend is running on port 5000" -ForegroundColor Yellow
    exit 1
}

# Step 2: Frontend Setup
Write-Host ""
Write-Host "[2] Frontend Setup" -ForegroundColor Yellow
Write-Host "Please open another terminal and run:" -ForegroundColor White
Write-Host ""
Write-Host "  cd frontend" -ForegroundColor Green
Write-Host "  npm install" -ForegroundColor Green
Write-Host "  npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter when frontend is running..." -ForegroundColor Yellow
Read-Host

# Test frontend
Write-Host "Testing frontend..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
    Write-Host "[OK] Frontend is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Frontend is not responding" -ForegroundColor Red
    Write-Host "Make sure the frontend is running on port 3000" -ForegroundColor Yellow
    exit 1
}

# Step 3: Run API Tests
Write-Host ""
Write-Host "[3] Running API Tests" -ForegroundColor Yellow

# Test API endpoints
Write-Host ""
Write-Host "Testing API Endpoints:" -ForegroundColor Cyan

$endpoints = @(
    @{Path="/health"; Method="GET"; Name="Health Check"},
    @{Path="/api/auth/register"; Method="POST"; Name="Auth Register"},
    @{Path="/api/projects"; Method="GET"; Name="Projects List"},
    @{Path="/api/tasks"; Method="GET"; Name="Tasks List"},
    @{Path="/api/messages"; Method="GET"; Name="Messages List"},
    @{Path="/api/notifications"; Method="GET"; Name="Notifications List"}
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000$($endpoint.Path)" -Method $endpoint.Method -UseBasicParsing -ErrorAction SilentlyContinue
        $status = $response.StatusCode
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($null -eq $status) { $status = "Error" }
    }
    
    if ($status -eq 200 -or $status -eq 401 -or $status -eq 404) {
        Write-Host "[OK] $($endpoint.Name): HTTP $status" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $($endpoint.Name): HTTP $status" -ForegroundColor Red
    }
}

# Step 4: Test Frontend Pages
Write-Host ""
Write-Host "Testing Frontend Pages:" -ForegroundColor Cyan

$pages = @(
    @{Path="/"; Name="Home Page"},
    @{Path="/login"; Name="Login Page"},
    @{Path="/signup"; Name="Signup Page"},
    @{Path="/projects"; Name="Projects Page"},
    @{Path="/tasks"; Name="Tasks Page"}
)

foreach ($page in $pages) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000$($page.Path)" -UseBasicParsing
        Write-Host "[OK] $($page.Name)" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $($page.Name)" -ForegroundColor Red
    }
}

# Summary
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   Test Complete!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "2. Test creating projects and tasks" -ForegroundColor White
Write-Host "3. Check the console for any errors" -ForegroundColor White
Write-Host ""
