#!/bin/bash
# EV Federated Learning Platform - Local Startup Script

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/fl-server"
FRONTEND_DIR="$PROJECT_DIR/mobile-app"
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "========================================"
echo "  EV FL Platform - Local Start Script   "
echo "========================================"
echo "Local IP: $LOCAL_IP"
echo ""

# Step 1: Backend uses TinyDB (file-based, no MongoDB needed)
echo "[1/3] Database: TinyDB (file-based, no external service needed)"
echo "  Data stored in: fl-server/db.json"

# Step 2: Start Backend
echo ""
echo "[2/3] Starting Backend (FastAPI on port 8001)..."
cd "$BACKEND_DIR"
mkdir -p logs
pkill -f "uvicorn server:app" 2>/dev/null || true
sleep 1
nohup venv/bin/python server.py > logs/backend.log 2>&1 &
echo "  Backend started (PID $!). Waiting 3s..."
sleep 3
echo "  Backend log: $BACKEND_DIR/logs/backend.log"

# Step 3: Update .env with current IP (in case IP changed)
echo ""
echo "[3/3] Updating frontend config..."
echo "EXPO_PUBLIC_BACKEND_URL=http://${LOCAL_IP}:8001" > "$FRONTEND_DIR/.env"
echo "  Backend URL set to: http://${LOCAL_IP}:8001"

echo ""
echo "========================================"
echo "  All services started!"
echo "========================================"
echo ""
echo "  Test backend: curl http://localhost:8001/api/auth/register"
echo ""
echo "  Now start the frontend:"
echo "    cd mobile-app"
echo "    npx expo start --tunnel -c"
echo ""
echo "  Then scan the QR code with Expo Go on your phone."
echo "  Make sure your phone is on the same WiFi network."
echo "========================================"
