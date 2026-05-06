#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║    Stopping All Federated Learning Services & Clearing Cache  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# List of ports to clean up
# 8001: Client Backend (Python)
# 3001: Salesman Backend (Node)
# 3000/5173: Salesman Dashboard (Vite)
# 8081: Mobile App (Expo)
PORTS=(8001 3001 3000 5173 8081)

for PORT in "${PORTS[@]}"; do
    # Find process ID listening on this port
    PID=$(lsof -t -i:$PORT 2>/dev/null)
    
    if [ ! -z "$PID" ]; then
        echo -e "[\033[0;31mSTOP\033[0m] Killing process on port $PORT (PID: $PID)..."
        kill -9 $PID 2>/dev/null || true
    else
        echo -e "[\033[0;32m OK \033[0m] Port $PORT is already free."
    fi
done

echo ""
echo "Cleaning up caches and database..."

# Wipe TinyDB so every restart begins with a clean, consistent state
if [ -f "fl-server/db.json" ]; then
    rm -f fl-server/db.json
    echo -e "[\033[0;32m OK \033[0m] Cleared backend database (db.json)."
fi

# Clean Expo and Metro cache to avoid stale code issues
if [ -d "mobile-app/.expo" ] || [ -d "mobile-app/.metro-cache" ]; then
    rm -rf mobile-app/.expo mobile-app/.metro-cache
fi

# Also clear the OS-level Metro caches in /tmp
rm -rf /tmp/metro-* /tmp/haste-map-* 2>/dev/null || true

echo -e "[\033[0;32m OK \033[0m] Cleared Expo and Metro caches."

echo ""
echo "✅ All services stopped and caches cleared!"
echo ""
echo "To start everything again (from any new terminal):"
echo "  Terminal 1: cd \"/home/shiva/Desktop/desk/Federated Learning\" && ./scripts/start-all.sh"
echo "  Terminal 2: cd \"/home/shiva/Desktop/desk/Federated Learning/mobile-app\" && npx expo start --tunnel -c"
echo "  Terminal 3: cd \"/home/shiva/Desktop/desk/Federated Learning/dashboard-app\" && npm run dev"
echo ""
