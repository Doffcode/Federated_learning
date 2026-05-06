# Federated Learning for EV Fleet Management

A privacy-preserving federated learning system for electric vehicles. Users train a battery-health model **locally on their device** using their own vehicle's data; only the learned **weights** (not raw data) are sent to a central server, where they're aggregated via FedAvg into a shared global model.

The system has three parts:
- **Mobile app** (Expo / React Native) — end-user client for EV owners
- **Client backend** (FastAPI + TinyDB) — handles auth, data, and federated aggregation
- **Salesman dashboard** (Node/Express + Vite/React) — fleet-level view of contributions per vehicle type

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App (Expo)                    │
│  Local training → Upload weights only → Get global     │
└──────────────────────┬──────────────────────────────────┘
                       │ REST (JWT)
┌──────────────────────▼──────────────────────────────────┐
│          Client Backend — FastAPI (port 8001)           │
│  TinyDB: users · vehicles · rides · fl_models · global  │
│  FedAvg aggregator (runs at 3+ contributions)           │
└──────────────────────┬──────────────────────────────────┘
                       │ polls
┌──────────────────────▼──────────────────────────────────┐
│         Salesman Backend — Node/Express (port 3001)     │
│  Serves aggregated fleet stats to dashboard             │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│          Salesman Dashboard — Vite/React (port 3000)    │
│  Vehicle-type cards · users per type · FL round stats  │
└─────────────────────────────────────────────────────────┘
```

**Supported vehicle types (5):** Tesla Model 3, BMW i3, Hyundai Kona, Chevy Bolt, Nissan Leaf.
**Privacy:** Raw charging/ride data stays on-device. Only 8-parameter weight vectors are transmitted. The server adds Gaussian noise before aggregation.

---

## Repository Layout

```
Federated Learning/
├── mobile-app/               # Expo / React Native mobile app
│   ├── app/                  # Screens (tabs, login, etc.)
│   ├── components/
│   ├── services/             # API client, ML pipeline, notifications
│   ├── utils/mockData.ts     # Demo data generator
│   ├── contexts/
│   └── package.json
├── dashboard-app/            # Vite + React dashboard
│   ├── src/
│   ├── index.html
│   └── package.json
├── fl-server/                # FastAPI client backend
│   ├── server.py             # All API endpoints
│   ├── project_fl/           # FL aggregator, privacy, model store
│   ├── data/datasets/        # Per-vehicle training data (JSON)
│   ├── demo_users.json       # 6 pre-seeded demo users
│   ├── requirements.txt
│   └── .env.example          # Copy to .env and customize
├── dashboard-api/            # Node/Express + simulator
│   ├── server.js
│   ├── simulator.js
│   └── package.json
├── data/                     # Raw dataset
│   └── ev_charging_patterns.csv
├── docs/
│   ├── SETUP.md                  # Install, env setup, troubleshooting
│   ├── ARCHITECTURE.md           # FL flow, data pipeline, endpoints
│   └── TEST_GUIDE.md             # 11 end-to-end test scenarios
├── scripts/
│   ├── start-all.sh              # Starts client + salesman backends
│   ├── start.sh                  # Starts client backend only
│   └── stop-all.sh               # Stops all services
├── FL_final.ipynb                # Reference notebook (algorithm walkthrough)
├── docker-compose.yml            # Docker orchestration
└── README.md                     # This file
```

---

## Quick Start

### 1. Install dependencies

```bash
# Python backend
cd fl-server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cd ..

# Mobile frontend
cd mobile-app
yarn install         # or: npm install
cd ..

# Salesman backend
cd dashboard-api
npm install
cd ..

# Salesman frontend
cd dashboard-app
npm install
cd ..
```

### 2. Start both backends

```bash
chmod +x scripts/start-all.sh
./scripts/start-all.sh
```

This auto-detects your LAN IP, writes it to `mobile-app/.env`, and starts:
- Client backend → `http://localhost:8001`
- Salesman backend (API) → `http://localhost:3001`
- **Salesman Dashboard (Vite Frontend) → `http://localhost:3000` (Opens automatically!)**

### 3. Start the mobile app

```bash
cd mobile-app
npx expo start --tunnel -c        # scan QR code with Expo Go
```

See **`docs/SETUP.md`** for detailed setup and troubleshooting.

---

## Demo Users

Six accounts are auto-created on first backend start (password: `demo123`):

| Email | Vehicle(s) |
|---|---|
| `tesla@example.com` | Tesla Model 3 |
| `hyundai@example.com` | Hyundai Kona |
| `bmw@example.com` | BMW i3 |
| `chevy@example.com` | Chevy Bolt |
| `nissan@example.com` | Nissan Leaf |
| `multi@example.com` | Chevy Bolt + Nissan Leaf |

---

## Tech Stack

**Frontend (mobile):** Expo · React Native · TypeScript · Axios · AsyncStorage
**Frontend (dashboard):** Vite · React · Tailwind CSS
**Backend (client):** FastAPI · TinyDB (JSON storage) · JWT · Bcrypt · uvicorn
**Backend (salesman):** Node.js · Express
**FL algorithm:** FedAvg with Gaussian-noise differential privacy, aggregation at 3+ local contributions

---

## Documentation

- **[docs/SETUP.md](docs/SETUP.md)** — installation, environment variables, troubleshooting
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — FL pipeline, API endpoints, data flow diagrams, schema
- **[docs/TEST_GUIDE.md](docs/TEST_GUIDE.md)** — 11-scenario end-to-end test plan
- **`FL_final.ipynb`** — annotated notebook explaining the FL algorithm
