# Architecture

Deep-dive on the federated learning pipeline, data flow, API surface, and schema.

---

## 1. Federated Learning Flow

```
┌────────── Device (Mobile App) ──────────┐      ┌──────── Server (FastAPI) ────────┐
│                                         │      │                                   │
│  1. Fetch training data for user's      │ ───► │  GET /training-data              │
│     assigned vehicle type only          │ ◄─── │  Returns per-vehicle JSON        │
│                                         │      │                                   │
│  2. Train locally (JS, 200 epochs,      │      │                                   │
│     lr=0.01, 8-param linear model)      │      │                                   │
│                                         │      │                                   │
│  3. Persist model to AsyncStorage       │      │                                   │
│                                         │      │                                   │
│  4. Upload weights only                 │ ───► │  POST /fl/upload-model            │
│     (raw data NEVER leaves device)      │      │   ├─ Add Gaussian noise (DP)     │
│                                         │      │   ├─ Store in fl_models_table    │
│                                         │      │   ├─ Create notification         │
│                                         │      │   └─ If 3+ uploads → FedAvg      │
│                                         │      │       → fl_global_table          │
│                                         │      │                                   │
│  5. On next cycle, fetch global model   │ ◄─── │  GET /fl/global-model            │
│     and initialize next round from it   │      │                                   │
└─────────────────────────────────────────┘      └───────────────────────────────────┘
```

**Key properties:**
- **Privacy:** Raw CSV rows stay on-device. Only an 8-dim weight vector + metadata (sample count, local accuracy) is transmitted.
- **Differential privacy:** Server adds Gaussian noise to weights before storing.
- **Aggregation trigger:** FedAvg runs once **3+ new contributions** accumulate in the current round. Threshold is configurable in `fl-server/project_fl/aggregator.py`.
- **Per-vehicle-type models:** Each of the 5 vehicle types has its own global model so one fleet's updates don't corrupt another.

---

## 2. Vehicle Types & Training Data

Five supported types, each with a dedicated training file in `fl-server/data/datasets/`:

| Vehicle | Filename | Source |
|---|---|---|
| Tesla Model 3 | `tesla_model_3_training.json` | Real CSV samples |
| BMW i3 | `bmw_i3_training.json` | Real CSV samples |
| Hyundai Kona | `hyundai_kona_training.json` | Real CSV samples |
| Chevy Bolt | `chevy_bolt_training.json` | Synthetic (matches CSV distributions) |
| Nissan Leaf | `nissan_leaf_training.json` | Synthetic (matches CSV distributions) |
| (fallback) | `other_evs_training.json` | Mixed |

Source CSV: `ev_charging_patterns.csv` (top-level). The notebook `FL_final.ipynb` shows how the per-vehicle files were derived.

Each training sample includes a `service_required` boolean so the app can surface maintenance alerts:
- `battery_health < 70` → `true`
- `battery_health < 80` AND `distance_km > 150` → `true`
- otherwise → `false`

---

## 3. API Endpoints (Client Backend, port 8001)

All paths are prefixed with `/api`. Authenticated endpoints require `Authorization: Bearer <JWT>`.

### Authentication
- `POST /auth/register` — create account
- `POST /auth/login` — exchange email/password for JWT
- `GET /auth/me` — current user profile
- `PUT /auth/profile` — update profile
- `POST /auth/change-password`

### Vehicles
- `POST /vehicles` — create a vehicle (returns `id`)
- `GET /vehicles` — list user's vehicles
- `GET /vehicles/{id}` — details
- `DELETE /vehicles/{id}`

### Vehicle Health
- `GET /vehicles/{id}/health`
- `PUT /vehicles/{id}/health`

### Rides
- `POST /rides`
- `GET /rides`
- `GET /rides/latest`

### Parking
- `GET /parking/latest`
- `GET /parking`

### Analytics
- `GET /analytics/summary` — totals, averages, monthly breakdowns

### Federated Learning
- `GET /training-data?vehicle_model=<name>` — per-vehicle training JSON
- `POST /fl/upload-model` — upload local weights + metadata
- `GET /fl/global-model?vehicle_type=<type>` — latest aggregated model
- `GET /fl/prediction?vehicle_id=<id>` — battery health & service-due prediction

### Notifications
- `GET /notifications` — user's notifications (newest first)
- `PUT /notifications/{id}/mark-read`
- `DELETE /notifications/{id}`

### User Tracking (for Salesman App)
- `GET /users-by-vehicle-type?vehicle_type=<type>` — users assigned to a type

### Debug / Observability
- `GET /fl/debug/status` — current round, pending uploads, aggregation readiness
- `GET /fl/debug/models-uploaded` — per-round per-model upload breakdown
- `GET /fl/debug/global-models` — all global model versions

---

## 4. Database Schema (TinyDB)

Backing file: `fl-server/db.json` (gitignored; regenerated on first run).

```
users_table
  ├─ id                       # e.g. "user_001"
  ├─ email, name, password_hash
  ├─ assigned_vehicle_types   # list, e.g. ["tesla"] or ["chevy", "nissan"]
  └─ is_demo_user             # true for seeded accounts

vehicles_table
  ├─ id, user_id
  ├─ name, model              # "My Tesla Model 3"
  ├─ vehicle_type             # normalized key: "tesla"
  ├─ battery_capacity, registration_number, purchase_date
  └─ created_at

rides_table
  ├─ id, user_id, vehicle_id
  ├─ distance, duration
  ├─ start/end location + lat/lng
  └─ date, start_time, end_time

parking_table              # auto-updated from latest ride end location
health_table               # per-vehicle battery health snapshots

fl_models_table            # per-user weight uploads
  ├─ user_id, vehicle_id, vehicle_type
  ├─ round, weights         # 8-param linear weights
  ├─ local_samples, loss, accuracy
  └─ uploaded_at

fl_global_table            # aggregated models after FedAvg
  ├─ vehicle_type, version, round
  ├─ weights, participants
  └─ aggregated_at

notifications_table
  ├─ id, user_id, vehicle_id
  ├─ type                   # "service_required" | "model_updated" | "training_complete"
  ├─ title, message, metadata
  ├─ is_read
  └─ created_at
```

---

## 5. Data Pipeline — "Load Demo Data" Flow

When a logged-in user taps **Load Demo Data** on the home screen:

```
1. Frontend builds MOCK_VEHICLES + MOCK_RIDES from utils/mockData.ts
   (rides vary by vehicle type: Tesla routes, BMW routes, etc.)
                │
                ▼
2. POST /vehicles                          ← creates vehicle record
   Response: { id: "<uuid>", ... }         ← captured and reused
                │
                ▼
3. POST /rides × 3                         ← creates 3 demo rides
   Each ride references vehicle_id from step 2
                │
                ▼
4. GET /vehicles, /rides/latest, /parking/latest   (parallel reload)
                │
                ▼
5. React state update → home screen renders ride card + FL card
```

After this, the user can tap **Train to Contribute** to run the FL cycle described in §1.

---

## 6. Mobile App Structure

```
mobile-app/
├── app/
│   ├── (tabs)/
│   │   ├── home.tsx          # Last ride, FL card, demo-data loader
│   │   ├── analytics.tsx     # Charts, totals, ride history
│   │   └── insights.tsx      # Battery health, service recommendations
│   ├── login.tsx, register.tsx
│   └── index.tsx             # Auth check, redirect
├── components/
│   ├── VehicleTabs.tsx       # Only shown for users with 2+ vehicles
│   └── NotificationCenter.tsx
├── contexts/AuthContext.tsx  # JWT storage, auto-login
├── services/
│   ├── api.ts                # Axios wrapper, auth headers
│   ├── ml.ts                 # FL pipeline: fetch data → train → upload
│   └── notifications.ts      # Fetch + AsyncStorage cache
└── utils/mockData.ts         # Per-vehicle-type demo data
```

**Multi-vehicle UX:** Users with >1 assigned vehicle see a tab switcher at the top of the home screen. Each tab shows that vehicle's rides and has its own **Train** button — models stay isolated per vehicle.

---

## 7. Salesman App Structure

```
dashboard-api/
├── server.js             # Express API, proxies to client backend
├── simulator.js          # Generates fleet-level demo stats
└── package.json

dashboard-app/
└── src/
        └── components/
            └── VehicleTypeCard.jsx   # One card per vehicle type,
                                     # fetches users + aggregated stats
```

The dashboard shows one card per vehicle type with:
- Average battery health across that fleet
- Number of users contributing
- Current global FL round
- Clickable → list of user names/emails for that type (via `/users-by-vehicle-type`)

---

## 8. Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Storage | TinyDB (JSON file) | Zero-setup, fine for demo scale; swap for Postgres in prod |
| User ↔ vehicle link | `assigned_vehicle_types: []` | List (not scalar) so users can own multiple types |
| Demo users | `demo_users.json` config file | Non-technical edits, version-controlled, scales to N users |
| Aggregation trigger | 3+ contributions | Balance between freshness and stability for 5–6 users |
| Privacy | Gaussian noise + on-device training | Raw data never transmitted |
| Notification storage | Backend (persistent) + AsyncStorage cache | Works offline, syncs on app open |
| Global model fetch | Auto on next cycle | Assumes aggregated > local; simpler UX |

---

## 9. Reference

- **`FL_final.ipynb`** — annotated notebook walking through the FL algorithm, weight math, and FedAvg aggregation
- **`ev_charging_patterns.csv`** — source dataset used to derive per-vehicle training files
- **`fl-server/project_fl/`** — aggregator, privacy, and model-store modules
