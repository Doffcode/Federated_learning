from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import bcrypt as _bcrypt
from tinydb import TinyDB, Query
from tinydb.storages import JSONStorage
from tinydb.middlewares import CachingMiddleware
import os
import logging
import threading
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta, date
import jwt
import uuid
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ── Database setup (TinyDB – no MongoDB required) ──────────────────────────
DB_PATH = ROOT_DIR / "db.json"
_db_lock = threading.Lock()
db = TinyDB(DB_PATH, storage=CachingMiddleware(JSONStorage))

users_table     = db.table("users")
vehicles_table  = db.table("vehicles")
rides_table     = db.table("rides")
parking_table   = db.table("parking_records")
health_table    = db.table("vehicle_health")
fl_models_table = db.table("fl_models")
fl_global_table = db.table("fl_global_model")
notifications_table = db.table("notifications")  # NEW

Q = Query()

# ── Vehicle type mappings ───────────────────────────────────────────────────
VEHICLE_TYPE_NAMES = {
    "tesla": "Tesla Model 3",
    "hyundai": "Hyundai Kona",
    "bmw": "BMW i3",
    "chevy": "Chevy Bolt",
    "nissan": "Nissan Leaf",
}

# Proper vehicle specs matching frontend mockData.ts
VEHICLE_SPECS = {
    "tesla":   {"registration_number": "AP39TS1001", "battery_capacity": 75,  "purchase_date": "2024-01-15"},
    "bmw":     {"registration_number": "AP39BM1001", "battery_capacity": 60,  "purchase_date": "2024-02-20"},
    "hyundai": {"registration_number": "AP39HD1001", "battery_capacity": 64,  "purchase_date": "2024-03-10"},
    "chevy":   {"registration_number": "AP39CV1001", "battery_capacity": 66,  "purchase_date": "2024-01-25"},
    "nissan":  {"registration_number": "AP39NS1001", "battery_capacity": 62,  "purchase_date": "2024-02-15"},
}

# ── Post-training FL predicted battery health per vehicle type ─────────────────
# Single source of truth used by BOTH /fl/prediction (mobile) AND
# /fl/fleet-insights (salesman app) so values stay consistent after training.
FL_VEHICLE_HEALTH = {
    "tesla":   {"battery_health": 92, "degradation_level": "low",      "service_due_km": 8000},
    "bmw":     {"battery_health": 85, "degradation_level": "moderate",  "service_due_km": 4000},
    "hyundai": {"battery_health": 93, "degradation_level": "low",      "service_due_km": 9000},
    "chevy":   {"battery_health": 65, "degradation_level": "high",     "service_due_km": 500},
    "nissan":  {"battery_health": 64, "degradation_level": "high",     "service_due_km": 500},
}

# ── Password hashing helpers (using bcrypt directly — passlib compat issue with bcrypt>=4)
def _hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()

def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "ev-fl-secret-key-2024-change-in-prod")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200  # 30 days

# ── FastAPI app ─────────────────────────────────────────────────────────────
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ── Pydantic models ─────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    email: EmailStr
    name: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    created_at: str = ""

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class VehicleCreate(BaseModel):
    name: str
    model: str
    registration_number: str
    battery_capacity: int
    purchase_date: Optional[str] = None
    vehicle_image: Optional[str] = None

class Vehicle(BaseModel):
    id: str
    user_id: str
    name: str
    model: str
    registration_number: str
    battery_capacity: int
    purchase_date: Optional[str] = None
    vehicle_image: Optional[str] = None
    vehicle_type: Optional[str] = None
    created_at: str = ""

class RideCreate(BaseModel):
    vehicle_id: str
    distance: float
    duration: int
    start_location: str
    end_location: str
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    date: str
    start_time: str
    end_time: str

class Ride(BaseModel):
    id: str
    user_id: str
    vehicle_id: str
    distance: float
    duration: int
    start_location: str
    end_location: str
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    date: str
    start_time: str
    end_time: str
    created_at: str = ""

class ParkingRecord(BaseModel):
    id: str
    user_id: str
    vehicle_id: str
    location: str
    latitude: float
    longitude: float
    timestamp: str = ""

class VehicleHealthCreate(BaseModel):
    vehicle_id: str
    battery_health: int
    service_due_km: int
    charging_status: str
    degradation_level: str
    last_service_date: Optional[str] = None

class VehicleHealth(BaseModel):
    id: str
    user_id: str
    vehicle_id: str
    battery_health: int
    service_due_km: int
    charging_status: str
    degradation_level: str
    last_service_date: Optional[str] = None
    updated_at: str = ""

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class FLModelUpload(BaseModel):
    vehicle_id: str
    vehicle_model: str
    weights: List[List[float]]
    local_samples: int
    loss: Optional[float] = None
    accuracy: Optional[float] = None

class FLPrediction(BaseModel):
    vehicle_id: str
    battery_health_pred: float
    service_due_date: str
    confidence: float
    is_personalized: bool
    degradation_rate: float

# NEW: Notification models
class Notification(BaseModel):
    id: str
    user_id: str
    vehicle_id: str
    type: str  # "service_required", "model_updated", "training_complete"
    title: str
    message: str
    is_read: bool = False
    created_at: str
    metadata: dict = {}

# ── Helpers ─────────────────────────────────────────────────────────────────

def now_str() -> str:
    return datetime.utcnow().isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    with _db_lock:
        user = users_table.get(Q.id == user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# NEW: Demo user creation function
def load_demo_users():
    """Load and create demo users on startup from demo_users.json"""
    config_path = ROOT_DIR / "demo_users.json"
    if not config_path.exists():
        logger.info("ℹ️ demo_users.json not found, skipping demo user creation")
        return

    try:
        config = json.loads(config_path.read_text())
    except Exception as e:
        logger.error(f"❌ Failed to read demo_users.json: {e}")
        return

    if not config.get("auto_create", False):
        logger.info("ℹ️ auto_create is disabled in demo_users.json")
        return

    with _db_lock:
        for user_data in config.get("users", []):
            existing = users_table.get(Q.id == user_data["id"])
            if existing:
                logger.info(f"ℹ️ User {user_data['id']} already exists, skipping")
                continue

            # Create user
            user_record = {
                "id": user_data["id"],
                "email": user_data["email"],
                "name": user_data["name"],
                "password": _hash_password(user_data["password"]),
                "phone": user_data.get("phone"),
                "profile_image": None,
                "assigned_vehicle_types": user_data.get("vehicle_types", []),  # NEW
                "is_demo_user": True,
                "created_at": now_str(),
            }
            users_table.insert(user_record)

            # Create vehicle(s) for each assigned type
            for vehicle_type in user_data.get("vehicle_types", []):
                vehicle_name = VEHICLE_TYPE_NAMES.get(vehicle_type, vehicle_type)
                specs = VEHICLE_SPECS.get(vehicle_type, {
                    "registration_number": f"AP39{vehicle_type[:2].upper()}0001",
                    "battery_capacity": 75,
                    "purchase_date": "2024-01-15",
                })
                vehicle_record = {
                    "id": new_id(),
                    "user_id": user_data["id"],
                    "name": f"My {vehicle_name}",
                    "model": vehicle_name,
                    "vehicle_type": vehicle_type,
                    "registration_number": specs["registration_number"],
                    "battery_capacity": specs["battery_capacity"],
                    "purchase_date": specs["purchase_date"],
                    "vehicle_image": None,
                    "created_at": now_str(),
                }
                vehicles_table.insert(vehicle_record)

                # Create health record
                health_table.insert({
                    "id": new_id(),
                    "user_id": user_data["id"],
                    "vehicle_id": vehicle_record["id"],
                    "battery_health": 100,
                    "service_due_km": 5000,
                    "charging_status": "OK",
                    "degradation_level": "low",
                    "last_service_date": datetime.utcnow().strftime("%Y-%m-%d"),
                    "updated_at": now_str(),
                })

            logger.info(f"✓ Created demo user: {user_data['name']} ({user_data['id']})")

# NEW: Helper to create notifications
def create_notification(user_id: str, vehicle_id: str, type: str, title: str,
                       message: str, metadata: dict = {}):
    """Create a notification in the database"""
    with _db_lock:
        notifications_table.insert({
            "id": new_id(),
            "user_id": user_id,
            "vehicle_id": vehicle_id,
            "type": type,
            "title": title,
            "message": message,
            "is_read": False,
            "created_at": now_str(),
            "metadata": metadata
        })

# ── Auth routes ─────────────────────────────────────────────────────────────

@api_router.post("/auth/register", response_model=Token)
def register(user_data: UserRegister):
    with _db_lock:
        existing = users_table.get(Q.email == user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = new_id()
    hashed_pw = _hash_password(user_data.password)
    record = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_pw,
        "name": user_data.name,
        "phone": user_data.phone,
        "profile_image": None,
        "assigned_vehicle_types": [],  # NEW
        "is_demo_user": False,  # NEW
        "created_at": now_str(),
    }
    with _db_lock:
        users_table.insert(record)

    access_token = create_access_token({"sub": user_id})
    user_obj = User(id=user_id, email=user_data.email, name=user_data.name,
                    phone=user_data.phone, created_at=record["created_at"])
    return Token(access_token=access_token, token_type="bearer", user=user_obj)


@api_router.post("/auth/login", response_model=Token)
def login(user_data: UserLogin):
    with _db_lock:
        user = users_table.get(Q.email == user_data.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not _verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"sub": user["id"]})
    user_obj = User(
        id=user["id"], email=user["email"], name=user["name"],
        phone=user.get("phone"), profile_image=user.get("profile_image"),
        created_at=user.get("created_at", ""),
    )
    return Token(access_token=access_token, token_type="bearer", user=user_obj)


@api_router.get("/auth/me", response_model=User)
def get_me(current_user=Depends(get_current_user)):
    return User(
        id=current_user["id"], email=current_user["email"],
        name=current_user["name"], phone=current_user.get("phone"),
        profile_image=current_user.get("profile_image"),
        created_at=current_user.get("created_at", ""),
    )


@api_router.put("/auth/profile", response_model=User)
def update_profile(profile_data: ProfileUpdate, current_user=Depends(get_current_user)):
    update_dict = {}
    if profile_data.name is not None:
        update_dict["name"] = profile_data.name
    if profile_data.phone is not None:
        update_dict["phone"] = profile_data.phone
    if profile_data.profile_image is not None:
        update_dict["profile_image"] = profile_data.profile_image

    if update_dict:
        with _db_lock:
            users_table.update(update_dict, Q.id == current_user["id"])

    with _db_lock:
        updated = users_table.get(Q.id == current_user["id"])
    return User(
        id=updated["id"], email=updated["email"], name=updated["name"],
        phone=updated.get("phone"), profile_image=updated.get("profile_image"),
        created_at=updated.get("created_at", ""),
    )


@api_router.post("/auth/change-password")
def change_password(password_data: PasswordChange, current_user=Depends(get_current_user)):
    if not _verify_password(password_data.old_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid old password")
    hashed = _hash_password(password_data.new_password)
    with _db_lock:
        users_table.update({"password": hashed}, Q.id == current_user["id"])
    return {"message": "Password changed successfully"}

# ── Vehicle routes ───────────────────────────────────────────────────────────

@api_router.post("/vehicles", response_model=Vehicle)
def create_vehicle(vehicle_data: VehicleCreate, current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    vid = new_id()
    record = {
        "id": vid,
        "user_id": user_id,
        **vehicle_data.dict(),
        "vehicle_type": vehicle_data.model.lower().replace(" ", "_"),  # NEW
        "created_at": now_str(),
    }
    with _db_lock:
        vehicles_table.insert(record)
        health_table.insert({
            "id": new_id(), "user_id": user_id, "vehicle_id": vid,
            "battery_health": 100, "service_due_km": 5000,
            "charging_status": "OK", "degradation_level": "low",
            "last_service_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "updated_at": now_str(),
        })
    return Vehicle(**record)


@api_router.get("/vehicles", response_model=List[Vehicle])
def get_vehicles(current_user=Depends(get_current_user)):
    with _db_lock:
        records = vehicles_table.search(Q.user_id == current_user["id"])
    return [Vehicle(**r) for r in records]


@api_router.get("/vehicles/{vehicle_id}", response_model=Vehicle)
def get_vehicle(vehicle_id: str, current_user=Depends(get_current_user)):
    with _db_lock:
        v = vehicles_table.get((Q.id == vehicle_id) & (Q.user_id == current_user["id"]))
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return Vehicle(**v)


@api_router.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: str, current_user=Depends(get_current_user)):
    with _db_lock:
        removed = vehicles_table.remove((Q.id == vehicle_id) & (Q.user_id == current_user["id"]))
    if not removed:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    with _db_lock:
        rides_table.remove(Q.vehicle_id == vehicle_id)
        parking_table.remove(Q.vehicle_id == vehicle_id)
        health_table.remove(Q.vehicle_id == vehicle_id)
    return {"message": "Vehicle deleted successfully"}

# ── Ride routes ──────────────────────────────────────────────────────────────

@api_router.post("/rides", response_model=Ride)
def create_ride(ride_data: RideCreate, current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    with _db_lock:
        v = vehicles_table.get((Q.id == ride_data.vehicle_id) & (Q.user_id == user_id))
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    rid = new_id()
    record = {"id": rid, "user_id": user_id, **ride_data.dict(), "created_at": now_str()}
    with _db_lock:
        rides_table.insert(record)
        parking_rec = {
            "id": new_id(), "user_id": user_id, "vehicle_id": ride_data.vehicle_id,
            "location": ride_data.end_location,
            "latitude": ride_data.end_lat, "longitude": ride_data.end_lng,
            "timestamp": now_str(),
        }
        existing_p = parking_table.get(Q.vehicle_id == ride_data.vehicle_id)
        if existing_p:
            parking_table.update(parking_rec, Q.vehicle_id == ride_data.vehicle_id)
        else:
            parking_table.insert(parking_rec)
    return Ride(**record)


@api_router.get("/rides", response_model=List[Ride])
def get_rides(current_user=Depends(get_current_user)):
    with _db_lock:
        records = rides_table.search(Q.user_id == current_user["id"])
    records.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return [Ride(**r) for r in records]


@api_router.get("/rides/latest")
def get_latest_ride(current_user=Depends(get_current_user)):
    with _db_lock:
        records = rides_table.search(Q.user_id == current_user["id"])
    if not records:
        return None
    records.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return Ride(**records[0])

# ── Parking routes ───────────────────────────────────────────────────────────

@api_router.get("/parking/latest")
def get_latest_parking(current_user=Depends(get_current_user)):
    with _db_lock:
        records = parking_table.search(Q.user_id == current_user["id"])
    if not records:
        return None
    records.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
    return ParkingRecord(**records[0])


@api_router.get("/parking", response_model=List[ParkingRecord])
def get_parking_records(current_user=Depends(get_current_user)):
    with _db_lock:
        records = parking_table.search(Q.user_id == current_user["id"])
    records.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
    return [ParkingRecord(**r) for r in records]

# ── Vehicle health routes ─────────────────────────────────────────────────────

@api_router.get("/vehicles/{vehicle_id}/health", response_model=VehicleHealth)
def get_vehicle_health(vehicle_id: str, current_user=Depends(get_current_user)):
    with _db_lock:
        h = health_table.get((Q.vehicle_id == vehicle_id) & (Q.user_id == current_user["id"]))
    if not h:
        raise HTTPException(status_code=404, detail="Vehicle health data not found")
    return VehicleHealth(**h)


@api_router.put("/vehicles/{vehicle_id}/health", response_model=VehicleHealth)
def update_vehicle_health(vehicle_id: str, health_data: VehicleHealthCreate,
                          current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    with _db_lock:
        v = vehicles_table.get((Q.id == vehicle_id) & (Q.user_id == user_id))
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    record = {**health_data.dict(), "user_id": user_id, "updated_at": now_str()}
    with _db_lock:
        existing = health_table.get((Q.vehicle_id == vehicle_id) & (Q.user_id == user_id))
        if existing:
            health_table.update(record, (Q.vehicle_id == vehicle_id) & (Q.user_id == user_id))
            updated = health_table.get((Q.vehicle_id == vehicle_id) & (Q.user_id == user_id))
        else:
            record["id"] = new_id()
            health_table.insert(record)
            updated = record
    return VehicleHealth(**updated)

# ── Analytics ────────────────────────────────────────────────────────────────

@api_router.get("/analytics/summary")
def get_analytics_summary(current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    with _db_lock:
        rides  = rides_table.search(Q.user_id == user_id)
        veh    = vehicles_table.search(Q.user_id == user_id)
        veh_ids = [v["id"] for v in veh]
        health_records = [health_table.get(Q.vehicle_id == vid) for vid in veh_ids]
        health_records = [h for h in health_records if h]

    total_distance = sum(r["distance"] for r in rides)
    total_rides    = len(rides)
    avg_distance   = total_distance / total_rides if total_rides else 0
    avg_battery    = (sum(h["battery_health"] for h in health_records) / len(health_records)
                      if health_records else 100)

    return {
        "total_rides": total_rides,
        "total_distance": round(total_distance, 2),
        "average_distance": round(avg_distance, 2),
        "average_battery_health": round(avg_battery, 1),
        "total_vehicles": len(veh),
    }

# ── Notification routes (NEW) ───────────────────────────────────────────────

@api_router.get("/notifications", response_model=List[dict])
def get_notifications(current_user=Depends(get_current_user)):
    """Get all notifications for the current user"""
    with _db_lock:
        records = notifications_table.search(Q.user_id == current_user["id"])
    records.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return records


@api_router.put("/notifications/{notif_id}/mark-read")
def mark_notification_read(notif_id: str, current_user=Depends(get_current_user)):
    """Mark a notification as read"""
    with _db_lock:
        notifications_table.update(
            {"is_read": True},
            (Q.id == notif_id) & (Q.user_id == current_user["id"])
        )
    return {"message": "Marked as read"}


@api_router.delete("/notifications/{notif_id}")
def delete_notification(notif_id: str, current_user=Depends(get_current_user)):
    """Delete a notification"""
    with _db_lock:
        notifications_table.remove(
            (Q.id == notif_id) & (Q.user_id == current_user["id"])
        )
    return {"message": "Deleted"}

# ── User tracking for salesman app (NEW) ────────────────────────────────────

@api_router.get("/users-by-vehicle-type")
def get_users_by_vehicle_type(vehicle_type: str):
    """Get all users assigned to a specific vehicle type (for salesman app)"""
    with _db_lock:
        # Find users whose assigned_vehicle_types includes this vehicle_type
        all_users = users_table.all()

    matching_users = []
    for user in all_users:
        assigned_types = user.get("assigned_vehicle_types", [])
        if vehicle_type in assigned_types:
            matching_users.append({
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "vehicle_types": assigned_types,
                "is_demo": user.get("is_demo_user", False),
            })

    return matching_users

# ── FL routes ─────────────────────────────────────────────────────────────────

@api_router.get("/training-data")
def get_training_data(vehicle_model: str):
    """Return model-specific training dataset for on-device training."""
    datasets_dir = ROOT_DIR / "data" / "datasets"

    # Map vehicle model names to JSON filenames
    model_map = {
        "BMW i3":        "bmw_i3_training.json",
        "Tesla Model 3": "tesla_model_3_training.json",
        "Hyundai Kona":  "hyundai_kona_training.json",
        "Chevy Bolt":    "chevy_bolt_training.json",
        "Nissan Leaf":   "nissan_leaf_training.json",
    }

    filename = model_map.get(vehicle_model, "other_evs_training.json")
    path = datasets_dir / filename

    if not path.exists():
        logger.warning(f"Training data not found for {vehicle_model}: {filename}")
        raise HTTPException(status_code=404, detail=f"Training data not found for {vehicle_model}")

    return json.loads(path.read_text())


@api_router.post("/fl/upload-model")
def upload_fl_model(model_data: FLModelUpload, current_user=Depends(get_current_user)):
    """Receive a local model update (weights only – no raw data)."""
    from project_fl.privacy import add_gaussian_noise

    noisy_weights = [add_gaussian_noise(layer, sigma=0.5) for layer in model_data.weights]
    current_round = _current_fl_round()

    record = {
        "id": new_id(),
        "user_id": current_user["id"],
        "vehicle_id": model_data.vehicle_id,
        "vehicle_model": model_data.vehicle_model,
        "weights": noisy_weights,
        "local_samples": model_data.local_samples,
        "loss": model_data.loss,
        "accuracy": model_data.accuracy,
        "submitted_at": now_str(),
        "round": current_round,
    }

    with _db_lock:
        # Upsert: if this vehicle already submitted this round, replace it.
        # This prevents "Retrain & Contribute" from counting as a new participant.
        existing = fl_models_table.get(
            (Q.vehicle_id == model_data.vehicle_id) & (Q.round == current_round)
        )
        if existing:
            fl_models_table.update(record, (Q.vehicle_id == model_data.vehicle_id) & (Q.round == current_round))
        else:
            fl_models_table.insert(record)

    # ── Sync health_table so /fl/fleet-insights matches the phone prediction ──
    # Detect vehicle type from model name and apply the canonical FL health values.
    # This is the bridge that keeps the salesman app consistent with the mobile app.
    vehicle_type = None
    model_lower = (model_data.vehicle_model or "").lower()
    if "tesla"   in model_lower: vehicle_type = "tesla"
    elif "bmw"   in model_lower: vehicle_type = "bmw"
    elif "kona"  in model_lower or "hyundai" in model_lower: vehicle_type = "hyundai"
    elif "bolt"  in model_lower or "chevy"   in model_lower: vehicle_type = "chevy"
    elif "leaf"  in model_lower or "nissan"  in model_lower: vehicle_type = "nissan"

    if vehicle_type and vehicle_type in FL_VEHICLE_HEALTH:
        fl_health = FL_VEHICLE_HEALTH[vehicle_type]
        health_update = {
            **fl_health,
            "vehicle_id": model_data.vehicle_id,
            "user_id": current_user["id"],
            "charging_status": "OK",
            "last_service_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "updated_at": now_str(),
        }
        with _db_lock:
            existing_h = health_table.get(
                (Q.vehicle_id == model_data.vehicle_id) & (Q.user_id == current_user["id"])
            )
            if existing_h:
                health_table.update(health_update,
                    (Q.vehicle_id == model_data.vehicle_id) & (Q.user_id == current_user["id"]))
            else:
                health_table.insert({"id": new_id(), **health_update})

    _try_aggregate()

    # Create notification
    create_notification(
        current_user["id"],
        model_data.vehicle_id,
        "training_complete",
        "✓ Model Trained",
        f"Successfully trained on {model_data.local_samples} local samples",
        {"accuracy": model_data.accuracy, "loss": model_data.loss}
    )

    return {"message": "Model update received", "model_id": record["id"]}


@api_router.get("/fl/global-model")
def get_global_model():
    """Return the latest aggregated global model."""
    with _db_lock:
        records = fl_global_table.all()
    if not records:
        return {"version": 0, "weights": [], "message": "No global model yet"}
    records.sort(key=lambda r: r.get("version", 0), reverse=True)
    latest = records[0]
    return {
        "version": latest["version"],
        "weights": latest["weights"],
        "aggregated_at": latest.get("aggregated_at", ""),
        "num_participants": latest.get("num_participants", 0),
    }


@api_router.get("/fl/prediction")
def get_fl_prediction(vehicle_id: str, current_user=Depends(get_current_user)):
    """
    Personalised battery-degradation prediction for a vehicle.

    Demo narrative — "Before and After" FL reveal:
      BEFORE training  → naive global estimate: 98% (confident but wrong)
      AFTER training   → local model reveals true health:
                           chevy / nissan  →  65.2%  (severe degradation alert!)
                           tesla / bmw / hyundai → 92.4% (healthy, minor tuning)
    """
    from dateutil.relativedelta import relativedelta

    with _db_lock:
        v = vehicles_table.get((Q.id == vehicle_id) & (Q.user_id == current_user["id"]))
        h = health_table.get((Q.vehicle_id == vehicle_id) & (Q.user_id == current_user["id"]))
        personal_updates = fl_models_table.search(Q.vehicle_id == vehicle_id)

    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    has_personal = len(personal_updates) > 0

    # ── BEFORE training: naive central-server estimate ─────────────────────
    if not has_personal:
        return FLPrediction(
            vehicle_id=vehicle_id,
            battery_health_pred=98.0,
            service_due_date=(date.today() + relativedelta(months=24)).isoformat(),
            confidence=0.65,
            is_personalized=False,
            degradation_rate=0.3,
        )

    # ── AFTER training: local ML reveals the truth ─────────────────────────
    vehicle_type = v.get("vehicle_type", "").lower()

    # Chevy Bolt and Nissan Leaf are designated "degraded" vehicles for demo
    DEGRADED_TYPES = {"chevy", "nissan"}

    if vehicle_type in DEGRADED_TYPES:
        # Severe degradation — service needed urgently
        return FLPrediction(
            vehicle_id=vehicle_id,
            battery_health_pred=65.2,
            service_due_date=date.today().isoformat(),  # TODAY — urgent!
            confidence=0.91,
            is_personalized=True,
            degradation_rate=1.8,
        )
    else:
        # Healthy vehicles — minor tuning from global baseline
        return FLPrediction(
            vehicle_id=vehicle_id,
            battery_health_pred=92.4,
            service_due_date=(date.today() + relativedelta(months=18)).isoformat(),
            confidence=0.89,
            is_personalized=True,
            degradation_rate=0.4,
        )


@api_router.get("/fl/stats")
def get_fl_stats():
    """Real FL metrics for the salesman app — accuracy, loss, rounds, participant counts."""
    with _db_lock:
        uploads     = fl_models_table.all()
        global_recs = fl_global_table.all()

    total_uploads = len(uploads)
    total_rounds  = len(global_recs)

    # Latest global model metrics
    latest_accuracy = 0.0
    latest_loss     = 0.0
    latest_round    = 0
    num_participants = 0
    if global_recs:
        latest = max(global_recs, key=lambda r: r.get("version", 0))
        latest_round     = latest.get("version", 0)
        num_participants = latest.get("num_participants", 0)

    # Average accuracy/loss from device uploads (using weights reported by devices)
    if uploads:
        latest_accuracy = round(sum(u.get("accuracy", 0) for u in uploads) / len(uploads), 4)
        latest_loss     = round(sum(u.get("loss", 0)     for u in uploads) / len(uploads), 4)

    # Per-model breakdown
    model_map: dict = {}
    for u in uploads:
        m = u.get("vehicle_model", "Unknown")
        if m not in model_map:
            model_map[m] = {"uploads": 0, "acc_sum": 0.0, "loss_sum": 0.0}
        model_map[m]["uploads"]  += 1
        model_map[m]["acc_sum"]  += u.get("accuracy", 0)
        model_map[m]["loss_sum"] += u.get("loss", 0)

    by_model = [
        {
            "model":        m,
            "uploads":      v["uploads"],
            "avg_accuracy": round(v["acc_sum"] / v["uploads"], 4) if v["uploads"] else 0,
            "avg_loss":     round(v["loss_sum"] / v["uploads"], 4) if v["uploads"] else 0,
        }
        for m, v in model_map.items()
    ]

    participants_by_model = {m: v["uploads"] for m, v in model_map.items()}

    return {
        "total_rounds":      total_rounds,
        "latest_round":      latest_round,
        "total_uploads":     total_uploads,
        "latest_accuracy":   latest_accuracy,
        "latest_loss":       latest_loss,
        "num_participants":  num_participants,
        "participants":      participants_by_model,
        "by_model":          by_model,
    }


@api_router.get("/fl/fleet-insights")
def get_fleet_insights():
    """Aggregated fleet statistics for the salesman app."""
    with _db_lock:
        all_health   = health_table.all()
        all_vehicles = vehicles_table.all()

    model_stats: dict = {}
    for v in all_vehicles:
        # Fallback for old records without vehicle_type
        v_type = v.get("vehicle_type", v["model"].lower().replace(" ", "_"))
        h = next((h for h in all_health if h["vehicle_id"] == v["id"]), None)
        bh = h["battery_health"] if h else 100
        if v_type not in model_stats:
            model_stats[v_type] = {"count": 0, "total_battery": 0, "degraded": 0, "model": v["model"]}
        model_stats[v_type]["count"] += 1
        model_stats[v_type]["total_battery"] += bh
        if bh < 70:
            model_stats[v_type]["degraded"] += 1

    insights = []
    for v_type, stats in model_stats.items():
        avg_bh = stats["total_battery"] / stats["count"] if stats["count"] else 100
        insights.append({
            "vehicle_type": v_type,
            "vehicle_model": stats["model"],
            "fleet_count": stats["count"],
            "avg_battery_health": round(avg_bh, 1),
            "degraded_count": stats["degraded"],
            "alert": stats["degraded"] > 0,
        })

    return {"fleet_insights": insights, "total_vehicles": len(all_vehicles)}


# ── FL Debug endpoints (NEW) ────────────────────────────────────────────────

@api_router.get("/fl/debug/status")
def debug_fl_status():
    """Complete FL system status for debugging"""
    with _db_lock:
        uploads = fl_models_table.all()
        global_recs = fl_global_table.all()
        users = users_table.all()

    current_round = _current_fl_round()
    round_uploads = [u for u in uploads if u.get("round") == current_round]

    return {
        "current_round": current_round,
        "uploads_this_round": len(round_uploads),
        "total_users": len(users),
        "demo_users": len([u for u in users if u.get("is_demo_user", False)]),
        "total_global_models": len(global_recs),
        "is_ready_for_aggregation": len(round_uploads) >= 3,
        "message": f"Next aggregation: {3 - len(round_uploads)} more uploads needed" if len(round_uploads) < 3 else "Ready to aggregate!"
    }


@api_router.get("/fl/debug/models-uploaded")
def debug_models_uploaded():
    """Show all model uploads for debugging"""
    with _db_lock:
        uploads = fl_models_table.all()

    summary = {}
    for u in uploads:
        model_type = u.get("vehicle_model", "unknown")
        round_num = u.get("round", 0)
        if round_num not in summary:
            summary[round_num] = {}
        if model_type not in summary[round_num]:
            summary[round_num][model_type] = []
        summary[round_num][model_type].append({
            "user_id": u.get("user_id"),
            "samples": u.get("local_samples"),
            "loss": u.get("loss"),
            "accuracy": u.get("accuracy"),
            "submitted_at": u.get("submitted_at"),
        })

    return {
        "total_uploads": len(uploads),
        "by_round": summary,
    }


@api_router.get("/fl/debug/global-models")
def debug_global_models():
    """Show all global model versions for debugging"""
    with _db_lock:
        records = fl_global_table.all()

    records.sort(key=lambda r: r.get("version", 0))
    return [
        {
            "version": r["version"],
            "participants": r.get("num_participants"),
            "weights_shape": f"[{len(r['weights'])}, {len(r['weights'][0]) if r['weights'] else 0}]",
            "aggregated_at": r.get("aggregated_at"),
        }
        for r in records
    ]

# ── FL internal helpers ───────────────────────────────────────────────────────

def _current_fl_round() -> int:
    with _db_lock:
        records = fl_global_table.all()
    return (max(r["version"] for r in records) + 1) if records else 1


def _try_aggregate():
    """Run FedAvg when >=3 *distinct vehicles* have submitted updates this round."""
    current_round = _current_fl_round()
    with _db_lock:
        all_updates = fl_models_table.search(Q.round == current_round)

    # ── Deduplicate: keep only the LATEST upload per vehicle_id ──────────────
    # This ensures that clicking "Retrain & Contribute" multiple times from the
    # same device does not inflate the participant count.
    latest_by_vehicle: dict = {}
    for u in all_updates:
        vid = u.get("vehicle_id")
        if vid is None:
            continue
        existing = latest_by_vehicle.get(vid)
        if existing is None or u.get("submitted_at", "") > existing.get("submitted_at", ""):
            latest_by_vehicle[vid] = u

    updates = list(latest_by_vehicle.values())

    if len(updates) < 3:
        return

    from project_fl.aggregator import FedAvgAggregator
    agg = FedAvgAggregator()
    global_weights = agg.aggregate(
        [u["weights"] for u in updates],
        [u["local_samples"] for u in updates],
    )
    with _db_lock:
        fl_global_table.insert({
            "id": new_id(),
            "version": current_round,
            "weights": global_weights,
            "num_participants": len(updates),
            "aggregated_at": now_str(),
        })


# ── App wiring ────────────────────────────────────────────────────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    # Load demo users before starting server
    load_demo_users()
    # Force flush to disk
    db.storage.flush()
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
