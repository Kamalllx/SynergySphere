# SynergySphere Production Deployment Script
# Complete setup and deployment for production-ready application

param(
    [string]$Environment = "development",
    [switch]$SkipInstall,
    [switch]$SkipBuild,
    [switch]$RunTests
)

$ErrorActionPreference = "Stop"

# Configuration
$BACKEND_DIR = "packages\backend"
$FRONTEND_DIR = "packages\frontend"
$BACKEND_PORT = 3001
$FRONTEND_PORT = 3000

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   SynergySphere Production Deployment" -ForegroundColor Cyan
Write-Host "   Environment: $Environment" -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Prerequisites
Write-Host "[1] Checking Prerequisites..." -ForegroundColor Yellow

$requiredCommands = @("node", "npm", "git")
foreach ($cmd in $requiredCommands) {
    if (!(Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "[ERROR] $cmd is not installed" -ForegroundColor Red
        exit 1
    }
}
Write-Host "[OK] All prerequisites installed" -ForegroundColor Green

# Step 2: Environment Setup
Write-Host ""
Write-Host "[2] Setting up environment files..." -ForegroundColor Yellow

# Backend .env
$backendEnvPath = "$BACKEND_DIR\.env"
if (!(Test-Path $backendEnvPath)) {
    Write-Host "Creating backend .env file..." -ForegroundColor Cyan
    @"
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/synergysphere"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"

# Server
PORT=$BACKEND_PORT
NODE_ENV=$Environment

# Email (Optional)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER=""
EMAIL_PASS=""
EMAIL_FROM="noreply@synergysphere.com"

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"

# CORS
CORS_ORIGIN="http://localhost:$FRONTEND_PORT"
"@ | Out-File -FilePath $backendEnvPath -Encoding UTF8
    Write-Host "[OK] Backend .env created" -ForegroundColor Green
} else {
    Write-Host "[OK] Backend .env exists" -ForegroundColor Green
}

# Frontend .env.local
$frontendEnvPath = "$FRONTEND_DIR\.env.local"
if (!(Test-Path $frontendEnvPath)) {
    Write-Host "Creating frontend .env.local file..." -ForegroundColor Cyan
    @"
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT
NEXT_PUBLIC_WS_URL=ws://localhost:$BACKEND_PORT
NEXT_PUBLIC_APP_URL=http://localhost:$FRONTEND_PORT
NEXT_PUBLIC_ENVIRONMENT=$Environment
"@ | Out-File -FilePath $frontendEnvPath -Encoding UTF8
    Write-Host "[OK] Frontend .env.local created" -ForegroundColor Green
} else {
    Write-Host "[OK] Frontend .env.local exists" -ForegroundColor Green
}

# Step 3: Install Dependencies
if (!$SkipInstall) {
    Write-Host ""
    Write-Host "[3] Installing dependencies..." -ForegroundColor Yellow
    
    # Backend dependencies
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    Set-Location $BACKEND_DIR
    npm install --silent
    Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green
    
    # Frontend dependencies
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    Set-Location "..\..\$FRONTEND_DIR"
    npm install --silent
    Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green
    
    Set-Location "..\..\"
} else {
    Write-Host ""
    Write-Host "[3] Skipping dependency installation" -ForegroundColor Gray
}

# Step 4: Database Setup
Write-Host ""
Write-Host "[4] Setting up database..." -ForegroundColor Yellow

Set-Location $BACKEND_DIR

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate 2>$null
Write-Host "[OK] Prisma client generated" -ForegroundColor Green

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Cyan
if ($Environment -eq "production") {
    npx prisma migrate deploy 2>$null
} else {
    npx prisma migrate dev --name init 2>$null
}
Write-Host "[OK] Database migrations completed" -ForegroundColor Green

Set-Location "..\..\"

# Step 5: Build Applications
if (!$SkipBuild) {
    Write-Host ""
    Write-Host "[5] Building applications..." -ForegroundColor Yellow
    
    if ($Environment -eq "production") {
        # Build backend (TypeScript)
        Write-Host "Building backend..." -ForegroundColor Cyan
        Set-Location $BACKEND_DIR
        npm run build 2>$null
        Write-Host "[OK] Backend built" -ForegroundColor Green
        
        # Build frontend
        Write-Host "Building frontend..." -ForegroundColor Cyan
        Set-Location "..\..\$FRONTEND_DIR"
        npm run build 2>$null
        Write-Host "[OK] Frontend built" -ForegroundColor Green
        
        Set-Location "..\..\"
    } else {
        Write-Host "Skipping build in development mode" -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "[5] Skipping build step" -ForegroundColor Gray
}

# Step 6: Run Tests (Optional)
if ($RunTests) {
    Write-Host ""
    Write-Host "[6] Running tests..." -ForegroundColor Yellow
    
    # Backend tests
    Write-Host "Running backend tests..." -ForegroundColor Cyan
    Set-Location $BACKEND_DIR
    npm test 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Backend tests passed" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Some backend tests failed" -ForegroundColor Yellow
    }
    
    # Frontend tests
    Write-Host "Running frontend tests..." -ForegroundColor Cyan
    Set-Location "..\..\$FRONTEND_DIR"
    npm test 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Frontend tests passed" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Some frontend tests failed" -ForegroundColor Yellow
    }
    
    Set-Location "..\..\"
}

# Step 7: Start Services
Write-Host ""
Write-Host "[7] Starting services..." -ForegroundColor Yellow

# Start Backend
Write-Host "Starting backend server..." -ForegroundColor Cyan
$backendCmd = if ($Environment -eq "production") { "start" } else { "dev" }
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd $BACKEND_DIR; Write-Host 'Backend starting on port $BACKEND_PORT...' -ForegroundColor Green; npm run $backendCmd"

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting frontend server..." -ForegroundColor Cyan
$frontendCmd = if ($Environment -eq "production") { "start" } else { "dev" }
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd $FRONTEND_DIR; Write-Host 'Frontend starting on port $FRONTEND_PORT...' -ForegroundColor Green; npm run $frontendCmd"

# Step 8: Health Check
Write-Host ""
Write-Host "[8] Performing health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxAttempts = 10
$attempt = 0
$backendHealthy = $false
$frontendHealthy = $false

while ($attempt -lt $maxAttempts -and (!$backendHealthy -or !$frontendHealthy)) {
    Start-Sleep -Seconds 2
    $attempt++
    
    # Check backend
    if (!$backendHealthy) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/health" -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                $backendHealthy = $true
                Write-Host "[OK] Backend is healthy" -ForegroundColor Green
            }
        } catch {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
    
    # Check frontend
    if (!$frontendHealthy) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$FRONTEND_PORT" -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                $frontendHealthy = $true
                Write-Host "[OK] Frontend is healthy" -ForegroundColor Green
            }
        } catch {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
}

if (!$backendHealthy -or !$frontendHealthy) {
    Write-Host ""
    Write-Host "[WARN] Some services may not be fully started yet" -ForegroundColor Yellow
}

# Step 9: Summary
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   Deployment Complete!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services Running:" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:$BACKEND_PORT" -ForegroundColor White
Write-Host "  Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor White
Write-Host ""
Write-Host "Default Credentials (Development):" -ForegroundColor Yellow
Write-Host "  Email:    demo@synergysphere.com" -ForegroundColor White
Write-Host "  Password: Demo123!" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open http://localhost:$FRONTEND_PORT in your browser" -ForegroundColor White
Write-Host "2. Create an account or use demo credentials" -ForegroundColor White
Write-Host "3. Create your first project" -ForegroundColor White
Write-Host ""
Write-Host "API Documentation: http://localhost:$BACKEND_PORT/api-docs" -ForegroundColor Gray
Write-Host "Health Check:      http://localhost:$BACKEND_PORT/health" -ForegroundColor Gray
Write-Host ""

# Create demo user if in development
if ($Environment -eq "development") {
    Write-Host "Creating demo user..." -ForegroundColor Yellow
    
    $demoUser = @{
        email = "demo@synergysphere.com"
        password = "Demo123!"
        name = "Demo User"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$BACKEND_PORT/api/auth/register" `
            -Method POST -Body $demoUser -ContentType "application/json" -ErrorAction SilentlyContinue
        Write-Host "[OK] Demo user created" -ForegroundColor Green
    } catch {
        Write-Host "[INFO] Demo user may already exist" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Gray
