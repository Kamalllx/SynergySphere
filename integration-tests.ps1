# SynergySphere Integration Test Suite for Windows PowerShell
# Tests the complete integration between frontend and backend

$ErrorActionPreference = "Stop"

# Configuration
$BACKEND_DIR = "packages\backend"
$FRONTEND_DIR = "frontend"
$BACKEND_PORT = 5000
$FRONTEND_PORT = 3000

# Colors
function Write-Info {
    param($message)
    Write-Host "[INFO] $message" -ForegroundColor Blue
}

function Write-Success {
    param($message)
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-ErrorMsg {
    param($message)
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Write-Warning {
    param($message) 
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

# Check if command exists
function Test-Command($command) {
    try {
        Get-Command $command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Wait for service to start
function Wait-ForService($url, $serviceName, $maxAttempts = 30) {
    Write-Info "Waiting for $serviceName to start..."
    
    for ($i = 0; $i -lt $maxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 404) {
                Write-Success "$serviceName is running"
                return $true
            }
        } catch {
            # Service not ready yet
        }
        Start-Sleep -Seconds 1
    }
    
    Write-ErrorMsg "$serviceName failed to start"
    return $false
}

# Cleanup function
function Cleanup {
    Write-Info "Cleaning up..."
    
    # Kill backend process
    if ($global:backendProcess) {
        Stop-Process -Id $global:backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Kill frontend process
    if ($global:frontendProcess) {
        Stop-Process -Id $global:frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Kill any remaining processes on ports
    Get-NetTCPConnection -LocalPort $BACKEND_PORT -ErrorAction SilentlyContinue | 
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Get-NetTCPConnection -LocalPort $FRONTEND_PORT -ErrorAction SilentlyContinue | 
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

# Register cleanup on exit
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup }

# Main test suite
try {
    Write-Host "=================================================" -ForegroundColor Blue
    Write-Host "   SynergySphere Integration Test Suite" -ForegroundColor Blue
    Write-Host "=================================================" -ForegroundColor Blue
    Write-Host ""
    
    # Check prerequisites
    Write-Info "Checking prerequisites..."
    
    if (-not (Test-Command "node")) {
        Write-ErrorMsg "Node.js is not installed"
        exit 1
    }
    
    if (-not (Test-Command "npm")) {
        Write-ErrorMsg "npm is not installed"
        exit 1
    }
    
    Write-Success "All prerequisites installed"
    Write-Host ""
    
    # Setup backend
    Write-Info "Setting up backend..."
    Set-Location $BACKEND_DIR
    
    # Check if .env exists
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found in backend, creating from example..."
        
        $randomSecret1 = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
        $randomSecret2 = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
        
        @"
DATABASE_URL="postgresql://postgres:password@localhost:5432/synergysphere_test"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="test_jwt_secret_$randomSecret1"
JWT_REFRESH_SECRET="test_jwt_refresh_secret_$randomSecret2"
PORT=$BACKEND_PORT
NODE_ENV=test
"@ | Out-File -FilePath ".env" -Encoding UTF8
        
        Write-Success "Created .env file"
    }
    
    # Install dependencies
    Write-Info "Installing backend dependencies..."
    npm install 2>$null | Out-Null
    
    # Run database migrations
    Write-Info "Running database migrations..."
    try {
        npx prisma migrate deploy 2>$null | Out-Null
    } catch {
        Write-Warning "Migrations may already be up to date"
    }
    
    # Start backend
    Write-Info "Starting backend server..."
    $global:backendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory (Get-Location) -PassThru -WindowStyle Hidden -RedirectStandardOutput "backend.log" -RedirectStandardError "backend-error.log"
    
    # Wait for backend to start
    if (-not (Wait-ForService "http://localhost:$BACKEND_PORT/health" "Backend")) {
        throw "Backend failed to start"
    }
    Write-Host ""
    
    # Setup frontend
    Write-Info "Setting up frontend..."
    Set-Location "..\..\$FRONTEND_DIR"
    
    # Check if .env.local exists
    if (-not (Test-Path ".env.local")) {
        Write-Warning ".env.local file not found in frontend, creating..."
        
        @"
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT
NEXT_PUBLIC_WS_URL=ws://localhost:$BACKEND_PORT
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
        
        Write-Success "Created .env.local file"
    }
    
    # Install dependencies
    Write-Info "Installing frontend dependencies..."
    npm install 2>$null | Out-Null
    
    # Start frontend
    Write-Info "Starting frontend server..."
    $global:frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory (Get-Location) -PassThru -WindowStyle Hidden -RedirectStandardOutput "frontend.log" -RedirectStandardError "frontend-error.log"
    
    # Wait for frontend to start
    if (-not (Wait-ForService "http://localhost:$FRONTEND_PORT" "Frontend")) {
        throw "Frontend failed to start"
    }
    Write-Host ""
    
    # Run API tests
    Write-Info "Running API integration tests..."
    Set-Location ".."
    
    if (Test-Path "test-api.ts") {
        try {
            npx tsx test-api.ts --backend-url="http://localhost:$BACKEND_PORT"
            Write-Success "API tests passed"
        } catch {
            Write-ErrorMsg "API tests failed"
            throw
        }
    } else {
        Write-Warning "test-api.ts not found, skipping API tests"
    }
    Write-Host ""
    
    # Test frontend routes
    Write-Info "Testing frontend routes..."
    
    function Test-FrontendRoute($path, $description) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$FRONTEND_PORT$path" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Success "$description OK"
                return $true
            }
        } catch {
            Write-ErrorMsg "$description Failed"
            return $false
        }
    }
    
    Test-FrontendRoute "/" "Home page:" | Out-Null
    Test-FrontendRoute "/login" "Login page:" | Out-Null
    Test-FrontendRoute "/signup" "Signup page:" | Out-Null
    Test-FrontendRoute "/projects" "Projects page:" | Out-Null
    Test-FrontendRoute "/tasks" "Tasks page:" | Out-Null
    Write-Host ""
    
    # Test API endpoints
    Write-Info "Testing API endpoints..."
    
    function Test-ApiEndpoint($endpoint, $method, $description) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT$endpoint" -Method $method -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
            $statusCode = $response.StatusCode
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
        }
        
        if ($statusCode -eq 200 -or $statusCode -eq 401 -or $statusCode -eq 404) {
            Write-Success "$description OK (HTTP $statusCode)"
            return $true
        } else {
            Write-ErrorMsg "$description Failed (HTTP $statusCode)"
            return $false
        }
    }
    
    Test-ApiEndpoint "/health" "GET" "Health check:" | Out-Null
    Test-ApiEndpoint "/api/auth/login" "POST" "Auth endpoint:" | Out-Null
    Test-ApiEndpoint "/api/projects" "GET" "Projects endpoint:" | Out-Null
    Test-ApiEndpoint "/api/tasks" "GET" "Tasks endpoint:" | Out-Null
    Test-ApiEndpoint "/api/messages" "GET" "Messages endpoint:" | Out-Null
    Test-ApiEndpoint "/api/notifications" "GET" "Notifications endpoint:" | Out-Null
    Write-Host ""
    
    # Summary
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "   All Integration Tests Passed!" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host ""
    Write-Info "Frontend running at: http://localhost:$FRONTEND_PORT"
    Write-Info "Backend running at: http://localhost:$BACKEND_PORT"
    Write-Info "Press Ctrl+C to stop servers and exit"
    Write-Host ""
    
    # Keep running until interrupted
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if processes are still running
        if ($global:backendProcess.HasExited -or $global:frontendProcess.HasExited) {
            Write-ErrorMsg "One of the servers has stopped unexpectedly"
            break
        }
    }
    
} catch {
    Write-ErrorMsg "Test failed: $_"
    exit 1
} finally {
    Cleanup
}
