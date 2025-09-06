# Test API Endpoints Script
$baseUrl = "http://localhost:3001"

Write-Host "`n=== Testing API Endpoints ===" -ForegroundColor Cyan

# Test health endpoint
Write-Host "`nTesting /health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -UseBasicParsing
    Write-Host "[OK] Health: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "[FAIL] Health endpoint" -ForegroundColor Red
}

# Test auth register
Write-Host "`nTesting /api/auth/register endpoint..." -ForegroundColor Yellow
$testEmail = "test$(Get-Random)@example.com"
$body = @{
    email = $testEmail
    password = "password123"
    name = "Test User"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $body -ContentType "application/json"
    if ($response.success) {
        Write-Host "[OK] Registration successful" -ForegroundColor Green
        $global:authToken = $response.data.token
        $global:userId = $response.data.user.id
        Write-Host "User ID: $($response.data.user.id)" -ForegroundColor Cyan
        Write-Host "Token obtained" -ForegroundColor Cyan
    } else {
        Write-Host "[FAIL] Registration failed" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAIL] Registration: $_" -ForegroundColor Red
}

# Test auth login
Write-Host "`nTesting /api/auth/login endpoint..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    if ($response.success) {
        Write-Host "[OK] Login successful" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Login failed" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAIL] Login: $_" -ForegroundColor Red
}

# Test creating a project (with auth)
if ($global:authToken) {
    Write-Host "`nTesting /api/projects endpoint (CREATE)..." -ForegroundColor Yellow
    $projectBody = @{
        name = "Test Project $(Get-Random)"
        description = "Test project description"
    } | ConvertTo-Json
    
    try {
        $headers = @{
            "Authorization" = "Bearer $($global:authToken)"
            "Content-Type" = "application/json"
        }
        $response = Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method POST -Body $projectBody -Headers $headers
        if ($response.success -or $response.data) {
            Write-Host "[OK] Project created" -ForegroundColor Green
            $global:projectId = $response.data.id
            Write-Host "Project ID: $($response.data.id)" -ForegroundColor Cyan
        } else {
            Write-Host "[FAIL] Project creation failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "[FAIL] Project creation: $_" -ForegroundColor Red
    }
}

# Test getting projects
Write-Host "`nTesting /api/projects endpoint (GET)..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $($global:authToken)"
    }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method GET -Headers $headers
    if ($response) {
        Write-Host "[OK] Projects retrieved" -ForegroundColor Green
        if ($response.data) {
            Write-Host "Found $($response.data.Count) projects" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "[FAIL] Get projects: $_" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
Write-Host "`nNote: If auth endpoints fail, make sure you've restarted the backend after adding auth routes." -ForegroundColor Yellow
