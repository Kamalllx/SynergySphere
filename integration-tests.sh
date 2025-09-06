#!/bin/bash

# SynergySphere Integration Test Suite
# Tests the complete integration between frontend and backend

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="packages/backend"
FRONTEND_DIR="frontend"
BACKEND_PORT=5000
FRONTEND_PORT=3000
TEST_TIMEOUT=30

# Functions
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

log_error() {
    echo -e "${RED}✗ ${NC}$1"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed"
        exit 1
    fi
}

wait_for_service() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=0
    
    log_info "Waiting for $service to start..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" $url | grep -q "200\|404"; then
            log_success "$service is running"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    log_error "$service failed to start"
    return 1
}

cleanup() {
    log_info "Cleaning up..."
    
    # Kill backend process
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    # Kill frontend process
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Kill any remaining processes on ports
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
}

# Trap cleanup on exit
trap cleanup EXIT

# Main test suite
main() {
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}   SynergySphere Integration Test Suite${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo
    
    # Check prerequisites
    log_info "Checking prerequisites..."
    check_command node
    check_command npm
    check_command curl
    log_success "All prerequisites installed"
    echo
    
    # Setup backend
    log_info "Setting up backend..."
    cd $BACKEND_DIR
    
    # Check if .env exists
    if [ ! -f .env ]; then
        log_warning ".env file not found in backend, creating from example..."
        cat > .env << EOF
DATABASE_URL="postgresql://postgres:password@localhost:5432/synergysphere_test"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="test_jwt_secret_$(openssl rand -hex 32)"
JWT_REFRESH_SECRET="test_jwt_refresh_secret_$(openssl rand -hex 32)"
PORT=$BACKEND_PORT
NODE_ENV=test
EOF
        log_success "Created .env file"
    fi
    
    # Install dependencies
    log_info "Installing backend dependencies..."
    npm install --silent
    
    # Run database migrations
    log_info "Running database migrations..."
    npx prisma migrate deploy 2>/dev/null || log_warning "Migrations may already be up to date"
    
    # Start backend
    log_info "Starting backend server..."
    npm run dev > backend.log 2>&1 &
    BACKEND_PID=$!
    
    # Wait for backend to start
    wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend"
    echo
    
    # Setup frontend
    log_info "Setting up frontend..."
    cd ../../$FRONTEND_DIR
    
    # Check if .env.local exists
    if [ ! -f .env.local ]; then
        log_warning ".env.local file not found in frontend, creating..."
        cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT
NEXT_PUBLIC_WS_URL=ws://localhost:$BACKEND_PORT
EOF
        log_success "Created .env.local file"
    fi
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm install --silent
    
    # Start frontend
    log_info "Starting frontend server..."
    npm run dev > frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    # Wait for frontend to start
    wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend"
    echo
    
    # Run API tests
    log_info "Running API integration tests..."
    cd ..
    
    if [ -f test-api.ts ]; then
        npx tsx test-api.ts --backend-url=http://localhost:$BACKEND_PORT
        if [ $? -eq 0 ]; then
            log_success "API tests passed"
        else
            log_error "API tests failed"
            exit 1
        fi
    else
        log_warning "test-api.ts not found, skipping API tests"
    fi
    echo
    
    # Test frontend routes
    log_info "Testing frontend routes..."
    
    test_frontend_route() {
        local path=$1
        local description=$2
        
        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$FRONTEND_PORT$path)
        if [ "$response" = "200" ]; then
            log_success "$description: OK"
        else
            log_error "$description: Failed (HTTP $response)"
            return 1
        fi
    }
    
    test_frontend_route "/" "Home page"
    test_frontend_route "/login" "Login page"
    test_frontend_route "/signup" "Signup page"
    test_frontend_route "/projects" "Projects page"
    test_frontend_route "/tasks" "Tasks page"
    echo
    
    # Test API endpoints through frontend proxy
    log_info "Testing API endpoints..."
    
    test_api_endpoint() {
        local endpoint=$1
        local method=$2
        local description=$3
        
        response=$(curl -s -o /dev/null -w "%{http_code}" -X $method http://localhost:$BACKEND_PORT$endpoint)
        # Allow 401 for protected endpoints
        if [ "$response" = "200" ] || [ "$response" = "401" ] || [ "$response" = "404" ]; then
            log_success "$description: OK (HTTP $response)"
        else
            log_error "$description: Failed (HTTP $response)"
            return 1
        fi
    }
    
    test_api_endpoint "/health" "GET" "Health check"
    test_api_endpoint "/api/auth/login" "POST" "Auth endpoint"
    test_api_endpoint "/api/projects" "GET" "Projects endpoint"
    test_api_endpoint "/api/tasks" "GET" "Tasks endpoint"
    test_api_endpoint "/api/messages" "GET" "Messages endpoint"
    test_api_endpoint "/api/notifications" "GET" "Notifications endpoint"
    echo
    
    # Summary
    echo -e "${GREEN}=================================================${NC}"
    echo -e "${GREEN}   All Integration Tests Passed!${NC}"
    echo -e "${GREEN}=================================================${NC}"
    echo
    log_info "Frontend running at: http://localhost:$FRONTEND_PORT"
    log_info "Backend running at: http://localhost:$BACKEND_PORT"
    log_info "Press Ctrl+C to stop servers and exit"
    echo
    
    # Keep running until interrupted
    wait $BACKEND_PID
}

# Run main function
main "$@"
