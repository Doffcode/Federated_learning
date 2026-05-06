# Setup Guide

Detailed installation, environment configuration, and troubleshooting.

---

## Prerequisites

- **Python** 3.10+
- **Node.js** 18+ and **npm** (or **yarn**)
- **Expo Go** app installed on your phone (iOS or Android) — or an emulator
- Your phone and computer on the **same Wi-Fi / LAN** (required for Expo to reach the backend)

---

## 1. Clone & Layout

```bash
git clone <your-repo-url>
cd "Federated Learning"
```

Top-level structure (see [README.md](../README.md) for the full tree):

- `fl-server/` — FastAPI server
- `mobile-app/` — Expo mobile app
- `dashboard-api/` — Node/Express salesman API
- `dashboard-app/` — Vite/React dashboard

---

## 2. Install Dependencies

### Backend (Python)

```bash
# Linux / macOS
cd fl-server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

```powershell
# Windows
cd fl-server
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Mobile frontend (Expo)

```bash
cd mobile-app
yarn install      # or: npm install
```

### Salesman backend (Node)

```bash
cd dashboard-api
npm install
```

### Salesman frontend (Vite)

```bash
cd dashboard-app
npm install
```

---

## 3. Environment Variables

### `fl-server/.env`

Copy the template and edit if needed:

```bash
cd fl-server
cp .env.example .env
```

Default contents:

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
```

> The system uses **TinyDB** (a JSON file) for real persistence — these vars are legacy placeholders kept for future MongoDB migration. No MongoDB is needed to run the project.

### `mobile-app/.env`

**Auto-generated on every run** by `start-all.sh`. It writes the host computer's LAN IP so the Expo app on your phone can reach the backend:

```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.x.x:8001
```

If you're running the frontend without `start-all.sh`, create it manually with your host's LAN IP.

---

## 4. Running the System

### Option A — start everything with one script

```bash
chmod +x scripts/start-all.sh
./scripts/start-all.sh
```

This:
1. Detects your LAN IP and writes `mobile-app/.env`
2. Starts the client backend on port 8001
3. Starts the salesman backend on port 3001
4. Waits for the client backend to be reachable
5. Tails logs to `logs/client-backend.log` and `logs/salesman-backend.log`

Press **Ctrl+C** to stop both.

### Option B — start each component manually

```bash
# Terminal 1 — Client backend
cd fl-server
# Linux/macOS: source venv/bin/activate
# Windows: .\venv\Scripts\activate
python server.py

# Terminal 2 — Salesman backend
cd dashboard-api
npm start

# Terminal 3 — Mobile app (Expo)
cd mobile-app
npx expo start --tunnel -c         # scan QR in Expo Go

# Terminal 4 — Salesman dashboard (optional)
cd dashboard-app
npm run dev       # opens http://localhost:3000
```

---

## 5. Verifying It Works

After starting both backends:

```bash
# Client backend health
curl http://localhost:8001/api/fl/debug/status | jq .

# Should show current_round, uploads_this_round, total_users: 6, etc.

# Salesman backend
curl http://localhost:3001/api/vehicles | jq .

# Login as a demo user
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tesla@example.com","password":"demo123"}' | jq .
```

---

## 6. Logs

Runtime logs go to:

- `logs/client-backend.log` — FastAPI stdout/stderr when started via `start-all.sh`
- `logs/salesman-backend.log` — Node stdout/stderr
- `fl-server/logs/` — structured logs written by `fl-server/utils/logger.py`
  - `audit.log`, `backend.log`, `server.log`

All `*.log` files are gitignored. The `logs/` folder itself is preserved in the repo via `.gitkeep`.

View live:

```bash
tail -f logs/client-backend.log
tail -f logs/salesman-backend.log
tail -f fl-server/logs/server.log
```

---

## 7. Troubleshooting

### Port already in use

```bash
lsof -i :8001         # find PID
kill -9 <PID>         # stop it
```

### Expo app can't connect to backend

1. Check the backend is running: `curl http://localhost:8001/api/fl/debug/status`
2. Check `mobile-app/.env` has your host's **LAN IP** (not `localhost` — Expo on phone can't reach your computer's localhost)
3. Make sure phone and computer are on the **same Wi-Fi**
4. Re-run `./scripts/start-all.sh` to refresh the IP, then reload Expo

### Demo users not created

- Confirm `fl-server/demo_users.json` exists and has `"auto_create": true`
- Check backend logs: `grep "demo user" fl-server/logs/server.log`

### Mobile app won't load / blank screen

```bash
cd mobile-app
rm -rf .expo .metro-cache
npx expo start --tunnel -c
```

Press `r` in the Expo terminal to reload.

### Training won't upload / 401 errors

- Confirm you're logged in (the app should redirect to login if the JWT expired)
- Verify: `curl http://localhost:8001/api/auth/me -H "Authorization: Bearer <token>"`
- Check `fl-server/logs/audit.log` for auth failures

### Reset database

TinyDB stores everything in `fl-server/db.json` (gitignored). To start fresh:

```bash
rm fl-server/db.json
# Restart backend — demo users are re-seeded automatically
```

---

## 8. Notes on Production

This project is for demo / research use. Before any production deployment:

- Replace TinyDB with a real database (Postgres/MongoDB)
- Generate a strong JWT secret and move it to a secrets manager
- Terminate TLS at a reverse proxy (nginx/Caddy)
- Tighten CORS in `fl-server/server.py`
- Replace Gaussian-noise DP with a vetted DP-SGD implementation if you need formal privacy guarantees
