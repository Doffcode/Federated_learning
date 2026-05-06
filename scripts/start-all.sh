#!/bin/bash

# Federated Learning System — Start Both Backends
# Usage: chmod +x start-all.sh && ./start-all.sh

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║    Federated Learning System — Starting All Services         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Auto-detect LAN IP (prefer 192.168.x / 10.x / 172.x, skip tailscale 100.x and IPv6)
LOCAL_IP=$(hostname -I | tr ' ' '\n' | grep -E '^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))\.' | head -1)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi
echo -e "${BLUE}[0/3]${NC} Detected LAN IP: ${GREEN}${LOCAL_IP}${NC}"
echo "EXPO_PUBLIC_BACKEND_URL=http://${LOCAL_IP}:8001" > "$PROJECT_DIR/mobile-app/.env"
echo -e "${GREEN}✓${NC} Wrote mobile-app/.env → http://${LOCAL_IP}:8001"
echo ""

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}✗${NC} Port $1 is already in use"
        return 1
    fi
    return 0
}

# Kill background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    if [ ! -z "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null || true
    fi
    if [ ! -z "$SALESMAN_PID" ]; then
        kill $SALESMAN_PID 2>/dev/null || true
    fi
    if [ ! -z "$DASHBOARD_PID" ]; then
        kill $DASHBOARD_PID 2>/dev/null || true
    fi
    echo "Done!"
}
trap cleanup EXIT

# Start Client Backend (port 8001)
if ! check_port 8001; then
    echo "Try: lsof -i :8001 to find the process"
    echo "Then: kill -9 <PID>"
    exit 1
fi

echo -e "${BLUE}[1/3]${NC} Starting Client Backend (port 8001)..."
cd "$PROJECT_DIR/fl-server"

if [ ! -f "server.py" ]; then
    echo -e "${RED}Error: server.py not found${NC}"
    exit 1
fi

# Use virtual environment if available, otherwise use system python
if [ -f "$PROJECT_DIR/fl-server/venv/bin/python" ]; then
    "$PROJECT_DIR/fl-server/venv/bin/python" server.py > "$PROJECT_DIR/logs/client-backend.log" 2>&1 &
else
    python3 server.py > "$PROJECT_DIR/logs/client-backend.log" 2>&1 &
fi
CLIENT_PID=$!
echo -e "${GREEN}✓${NC} Client Backend started (PID: $CLIENT_PID)"
echo "   Log: $PROJECT_DIR/logs/client-backend.log"

# Wait for client backend to be ready
sleep 2
echo -n "   Waiting for server to be ready..."
for i in {1..10}; do
    if curl -s http://localhost:8001/api/auth/me -H "Authorization: Bearer test" >/dev/null 2>&1; then
        echo -e " ${GREEN}OK${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e " ${RED}Timeout${NC}"
    else
        echo -n "."
        sleep 1
    fi
done

cd "$PROJECT_DIR"

# Start Salesman Backend (port 3001)
if ! check_port 3001; then
    echo "Try: lsof -i :3001 to find the process"
    exit 1
fi

echo -e "${BLUE}[2/3]${NC} Starting Salesman Backend (port 3001)..."
cd "$PROJECT_DIR/dashboard-api"

if [ ! -f "server.js" ]; then
    echo -e "${RED}Error: server.js not found${NC}"
    exit 1
fi

npm start > "$PROJECT_DIR/logs/salesman-backend.log" 2>&1 &
SALESMAN_PID=$!
echo -e "${GREEN}✓${NC} Salesman Backend started (PID: $SALESMAN_PID)"
echo "   Log: $PROJECT_DIR/logs/salesman-backend.log"

sleep 2

# Start Salesman Dashboard Frontend (port 3000)
if ! check_port 3000; then
    echo "Try: lsof -i :3000 to find the process"
    exit 1
fi

echo -e "${BLUE}[3/3]${NC} Starting Salesman Dashboard Frontend (port 3000)..."
cd "$PROJECT_DIR/dashboard-app"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}No node_modules found. Installing dependencies first...${NC}"
    npm install
fi

npm run dev > "$PROJECT_DIR/logs/salesman-dashboard.log" 2>&1 &
DASHBOARD_PID=$!
echo -e "${GREEN}✓${NC} Salesman Dashboard started (PID: $DASHBOARD_PID)"
echo "   Log: $PROJECT_DIR/logs/salesman-dashboard.log"

sleep 2

cd "$PROJECT_DIR"

# Summary
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                   System Ready! 🚀                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Client Backend${NC}"
echo "   URL: http://localhost:8001"
echo "   API: http://localhost:8001/api"
echo "   Debug: http://localhost:8001/api/fl/debug/status"
echo ""
echo -e "${GREEN}Salesman Dashboard${NC}"
echo "   URL: http://localhost:3000"
echo ""
echo -e "${GREEN}Mobile App${NC}"
echo "   cd mobile-app && npx expo start --tunnel -c"
echo "   Scan QR code with Expo Go"
echo ""
echo -e "${YELLOW}Demo Users (auto-created):${NC}"
echo "   user_001 (Tesla):        tesla@example.com"
echo "   user_002 (Hyundai):      hyundai@example.com"
echo "   user_003 (BMW):          bmw@example.com"
echo "   user_004 (Chevy):        chevy@example.com"
echo "   user_005 (Nissan):       nissan@example.com"
echo "   user_006 (Chevy+Nissan): multi@example.com"
echo ""
echo "   Password: demo123 (all users)"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "   tail -f logs/client-backend.log"
echo "   tail -f logs/salesman-backend.log"
echo ""
echo "Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo ""

# Keep script running
wait
