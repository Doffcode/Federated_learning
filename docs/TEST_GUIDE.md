# Phase 6: Comprehensive Testing Guide
**Status:** Complete Implementation Ready  
**Last Updated:** 2026-04-15

---

## Overview

This guide covers full end-to-end testing of the Federated Learning system with:
- 6 demo users pre-created with different vehicle types
- Multi-vehicle support (user_006 has 2 vehicles)
- Local training + global aggregation
- Notifications on training completion
- Salesman dashboard with user tracking

---

## Test Environment Setup

### Step 1: Start Both Backends

```bash
cd /home/shiva/Desktop/Federated\ Learning
chmod +x start-all.sh
./start-all.sh
```

**Expected Output:**
```
✓ Client Backend started (PID: XXXX)
✓ Salesman Backend started (PID: YYYY)

Demo Users: auto-created
URLs:
  Client API: http://localhost:8001
  Salesman API: http://localhost:3001
```

**Verify backends are running:**
```bash
curl http://localhost:8001/api/fl/debug/status | jq .
curl http://localhost:3001/api/vehicles | jq .
```

---

## Demo Users Reference

| User ID | Name | Email | Vehicle(s) | Password |
|---------|------|-------|-----------|----------|
| user_001 | Tesla User | tesla@example.com | Tesla Model 3 | demo123 |
| user_002 | Hyundai User | hyundai@example.com | Hyundai Kona | demo123 |
| user_003 | BMW User | bmw@example.com | BMW i3 | demo123 |
| user_004 | Chevy User | chevy@example.com | Chevy Bolt | demo123 |
| user_005 | Nissan User | nissan@example.com | Nissan Leaf | demo123 |
| user_006 | Multi Vehicle User | multi@example.com | Chevy + Nissan | demo123 |

---

## Test 1: Verify Demo User Login

### Objective
Confirm demo users can authenticate and receive JWT tokens.

### Commands

```bash
# Test Tesla User
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tesla@example.com","password":"demo123"}' | jq .

# Test Multi-Vehicle User
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"multi@example.com","password":"demo123"}' | jq .
```

### Expected Result
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "user_001",
    "name": "Tesla User",
    "email": "tesla@example.com",
    "assigned_vehicle_types": ["tesla"],
    "is_demo_user": true
  }
}
```

### Verify
- ✅ Token is JWT format
- ✅ user_id matches expected value
- ✅ assigned_vehicle_types is a list
- ✅ is_demo_user is true

---

## Test 2: Verify Training Data Availability

### Objective
Confirm all 5 vehicle types have training data available.

### Commands

```bash
# Check Tesla training data
curl "http://localhost:8001/api/training-data?vehicle_model=Tesla%20Model%203" | jq '.samples | length'

# Check Hyundai training data
curl "http://localhost:8001/api/training-data?vehicle_model=Hyundai%20Kona" | jq '.samples | length'

# Check BMW training data
curl "http://localhost:8001/api/training-data?vehicle_model=BMW%20i3" | jq '.samples | length'

# Check Chevy training data
curl "http://localhost:8001/api/training-data?vehicle_model=Chevy%20Bolt" | jq '.samples | length'

# Check Nissan training data
curl "http://localhost:8001/api/training-data?vehicle_model=Nissan%20Leaf" | jq '.samples | length'
```

### Expected Result
```
Tesla:   244 samples
Hyundai: 218 samples
BMW:     223 samples
Chevy:   300 samples (synthetic)
Nissan:  300 samples (synthetic)
```

### Verify
- ✅ All 5 vehicle types return data
- ✅ Sample counts are in realistic ranges (200-300)
- ✅ Each response includes "service_required" flag

---

## Test 3: Mobile App Login & Single Vehicle Training

### Objective
Test single-vehicle user training on mobile app.

### Steps

#### 3a. Start Mobile App
```bash
cd /home/shiva/Desktop/Federated\ Learning/mobile-app
npx expo start --tunnel -c
```

Press `i` for iOS simulator or `a` for Android emulator.

#### 3b. Login as Tesla User
- Email: `tesla@example.com`
- Password: `demo123`

**Verify:**
- ✅ Login succeeds without errors
- ✅ Home screen shows "My Tesla Model 3"
- ✅ No vehicle tabs appear (single vehicle)
- ✅ Last ride data loads

#### 3c. Load Demo Data
1. Tap **Load Demo Data** button on home screen
2. Should see success message: "Demo data loaded successfully!"

**Verify:**
- ✅ Button appears (no rides yet)
- ✅ After loading, "Your Last Ride" card appears
- ✅ Ride distance and duration shown

#### 3d. Train Local Model
1. Scroll down to "Federated Learning" card
2. Tap **Train to Contribute** button

**Watch Console Output:**
```
🚀 [FL] CYCLE START: Tesla Model 3
🔄 [FL] Fetching training data for: Tesla Model 3
✓ [FL] Fetched 244 training samples for Tesla Model 3
🎯 [FL] Starting local training for: Tesla Model 3
📊 [FL] Training on 244 samples (200 epochs, lr=0.01)
✓ [FL] Training complete in 1234ms
  Loss: 0.123456 | Accuracy: 87.3%
💾 [FL] Model persisted to AsyncStorage
📤 [FL] Uploading model weights for Tesla Model 3
  Vehicle ID: vehicle_xyz
  Local Samples: 244
  Weights Shape: 1 layers × 8 params
  Local Loss: 0.123456 | Local Accuracy: 87.3%
✓ [FL] Weights uploaded successfully
✅ [FL] CYCLE COMPLETE: Tesla Model 3
```

### Verify
- ✅ Training starts without errors
- ✅ Console shows all FL cycle steps
- ✅ Training completes in <5 seconds
- ✅ Weights are uploaded (size ~2 KB)
- ✅ No raw data is logged (privacy-preserving)

---

## Test 4: Verify Server-Side Model Upload

### Objective
Confirm weights reached the server and aggregation is prepared.

### Commands

```bash
# Check uploaded models
curl http://localhost:8001/api/fl/debug/models-uploaded | jq .

# Check system status
curl http://localhost:8001/api/fl/debug/status | jq .
```

### Expected Result

**Models Uploaded:**
```json
{
  "total_uploads": 1,
  "by_vehicle_type": {
    "tesla": 1
  },
  "latest": {
    "vehicle_type": "tesla",
    "accuracy": 0.873,
    "samples": 244,
    "timestamp": "2026-04-15T10:30:45Z"
  }
}
```

**Status:**
```json
{
  "current_round": 1,
  "uploads_this_round": 1,
  "total_users": 6,
  "demo_users": 6,
  "is_ready_for_aggregation": false,
  "message": "Next aggregation: 2 more uploads needed"
}
```

### Verify
- ✅ Upload count incremented
- ✅ Tesla vehicle type tracked
- ✅ Accuracy and samples recorded
- ✅ Aggregation status shows "2 more needed" (threshold is 3)

---

## Test 5: Multi-Vehicle User Training

### Objective
Test user with 2 vehicle types can train both separately.

### Steps

#### 5a. Login as Multi-Vehicle User
- Email: `multi@example.com`
- Password: `demo123`

**Verify:**
- ✅ Login succeeds
- ✅ **Vehicle Tabs appear** (shows Chevy + Nissan)
- ✅ First tab (Chevy) is selected by default

#### 5b. Train Chevy Model
1. Stay on Chevy tab
2. Load demo data (if not already loaded)
3. Scroll to FL card and tap **Train to Contribute**

**Watch for:**
- ✅ Console shows "Fetching training data for: Chevy Bolt"
- ✅ Training completes with ~300 samples
- ✅ Server upload succeeds

#### 5c. Switch to Nissan Tab
1. Tap the **Nissan Leaf** tab

**Verify:**
- ✅ Tab switches cleanly
- ✅ UI updates to show Nissan vehicle info
- ✅ FL card now shows different training stats (if already trained Nissan)
- ✅ Ride data changes to Nissan-appropriate ranges

#### 5d. Train Nissan Model
1. Load demo data (if needed)
2. Tap **Train to Contribute**

**Watch for:**
- ✅ Console shows "Fetching training data for: Nissan Leaf"
- ✅ Training completes with ~300 samples
- ✅ Different accuracy/loss than Chevy (different data)

### Verify
- ✅ Both vehicles trainable separately
- ✅ Each vehicle has independent model stored
- ✅ Tab switching is smooth
- ✅ Data doesn't leak between vehicles

---

## Test 6: Notification System

### Objective
Confirm notifications appear after training.

### Steps

1. Train a model (from any user)
2. Watch for notification badge/alert
3. Navigate to notifications screen (if available)

### Expected Behavior
- ✅ After upload completes, notification created on backend
- ✅ Frontend fetches notifications from `/api/notifications`
- ✅ Notification displays: "✓ Model Trained - Training Complete"
- ✅ Notification includes vehicle type and timestamp

### Manual Verification

```bash
# Get all notifications for a user (requires token)
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tesla@example.com","password":"demo123"}' | jq -r '.access_token')

curl http://localhost:8001/api/notifications \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Expected Result
```json
[
  {
    "id": "notif_xyz",
    "user_id": "user_001",
    "type": "training_complete",
    "title": "✓ Model Trained",
    "message": "Your Tesla Model 3 model trained successfully",
    "is_read": false,
    "created_at": "2026-04-15T10:30:45Z"
  }
]
```

### Verify
- ✅ Notification created after upload
- ✅ Type is "training_complete"
- ✅ User_id matches logged-in user
- ✅ Timestamp is recent
- ✅ is_read starts as false

---

## Test 7: Salesman Dashboard User Tracking

### Objective
Verify salesman app shows which users own which vehicles.

### Steps

#### 7a. Start Salesman Frontend
```bash
cd "/home/shiva/Desktop/desk/Federated Learning/dashboard-app"
npm run dev
# Open http://localhost:3000
```

#### 7b. View Vehicle Cards
1. Dashboard displays 5 vehicle type cards
2. Each card shows active user count and list

**Verify Visual:**
- ✅ **Tesla Card** shows user_001 (and user_006 if multi)
- ✅ **BMW Card** shows user_003
- ✅ **Hyundai Card** shows user_002
- ✅ **Chevy Card** shows user_004 and user_006
- ✅ **Nissan Card** shows user_005 and user_006

#### 7c. Check User List
Each card displays:
```
Tesla User
tesla@example.com

Multi Vehicle User
multi@example.com
```

**Verify:**
- ✅ User names fetched from backend
- ✅ Emails displayed correctly
- ✅ Multi-vehicle user appears on both Chevy and Nissan cards

#### 7d. Click "View Insights"
Should navigate to `/vehicle/tesla` (or relevant type)

**Verify:**
- ✅ Navigation works
- ✅ Vehicle type detail page shows users
- ✅ Fleet statistics displayed

---

## Test 8: Global Model Aggregation

### Objective
Verify FedAvg aggregation triggers when 3+ users contribute.

### Steps

#### 8a. Train 3 Different Users

Train models from:
1. user_001 (Tesla)
2. user_002 (Hyundai)
3. user_003 (BMW)

**For each user:**
- Login to app
- Load demo data
- Train model
- Watch for upload success

#### 8b. Check Aggregation Status

```bash
curl http://localhost:8001/api/fl/debug/status | jq .
```

**First 2 uploads:**
```json
{
  "current_round": 1,
  "uploads_this_round": 2,
  "is_ready_for_aggregation": false,
  "message": "Next aggregation: 1 more uploads needed"
}
```

**After 3rd upload:**
```json
{
  "current_round": 2,
  "uploads_this_round": 0,
  "is_ready_for_aggregation": false,
  "message": "Aggregation completed. Ready for round 2"
}
```

#### 8c. Check Global Model

```bash
curl http://localhost:8001/api/fl/global-model | jq .
```

**Expected:**
```json
{
  "version": 1,
  "weights": [
    [-0.123, 0.456, -0.789, ...]
  ],
  "aggregated_at": "2026-04-15T10:35:20Z"
}
```

### Verify
- ✅ After 3 uploads, aggregation triggers
- ✅ Global model created (v1)
- ✅ Weights are averaged (not copied)
- ✅ Round counter increments
- ✅ System ready for round 2

---

## Test 9: Data Privacy Verification

### Objective
Confirm raw training data never leaves device.

### Steps

#### 9a. Monitor Network Traffic
Using browser dev tools (Network tab):
1. Start app
2. Trigger training
3. Watch network requests

**Only these requests should appear:**
- ✅ `GET /training-data` — Returns 200-300 records (raw training data)
- ✅ `POST /fl/upload-model` — Sends only weights (8 floats)
- ✅ `GET /fl/global-model` — Returns only aggregated weights

**Should NOT appear:**
- ❌ `POST /raw-data` — No raw data upload
- ❌ `POST /features` — No feature extraction upload
- ❌ Any endpoint with "sample", "record", or "data" in POST

#### 9b. Check AsyncStorage on Device
(Using React Native debugger or device storage inspection)

**Should contain:**
- ✅ `local_fl_model` — Only trained weights, no raw data
- ✅ `notifications_cache` — Notification objects (no data)

**Should NOT contain:**
- ❌ Raw training samples
- ❌ Individual ride records
- ❌ Battery health values
- ❌ User feature vectors

### Verify
- ✅ Data stays on device during training
- ✅ Only weights uploaded (size ~2 KB per upload)
- ✅ No raw data in logs or storage

---

## Test 10: Error Handling & Recovery

### Objective
Verify system handles failures gracefully.

### 10a. Backend Offline During Training

**Steps:**
1. Login to app
2. Start training
3. Kill backend: `pkill -f "python.*server.py"`
4. Watch error handling

**Expected:**
- ✅ Training continues locally (uses downloaded data)
- ✅ Upload fails gracefully
- ✅ Error logged: "❌ [FL] Upload failed: Connection refused"
- ✅ User sees alert explaining upload failure
- ✅ Model still saved locally
- ✅ Can retry later with `/fl/upload-model` retry mechanism

**Recovery:**
```bash
# Restart backend
./start-all.sh
# Training upload should retry automatically or on next app refresh
```

### 10b. No Training Data Available

**Setup:**
```bash
# Rename training data file temporarily
mv fl-server/data/datasets/tesla_model_3_training.json tesla_model_3_training.json.bak
# Restart backend
pkill -f "python.*server.py"
./start-all.sh
```

**Steps:**
1. Login as tesla user
2. Try to train

**Expected:**
- ✅ Error message: "No training data available for this vehicle model"
- ✅ FL cycle aborts cleanly
- ✅ No model uploaded
- ✅ Status shows 0 uploads this round

**Recovery:**
```bash
# Restore data
mv tesla_model_3_training.json.bak fl-server/data/datasets/tesla_model_3_training.json
pkill -f "python.*server.py"
./start-all.sh
```

### 10c. Invalid JWT Token

**Steps:**
```bash
# Try API with expired/invalid token
curl http://localhost:8001/api/notifications \
  -H "Authorization: Bearer invalid_token"
```

**Expected:**
- ✅ 401 Unauthorized response
- ✅ Message: "Invalid token" or "Token expired"
- ✅ Frontend redirects to login screen

---

## Test 11: End-to-End Workflow

### Complete User Journey

**Scenario:** New user joins system, trains model, sees contribution

**Timeline:**
1. **T+0m** User logs in (auto-created demo user)
2. **T+1m** User loads demo data (synthetic rides)
3. **T+2m** User taps "Train to Contribute"
4. **T+2m 30s** Model trains locally (no data sent)
5. **T+3m** Weights uploaded to backend
6. **T+3m 5s** Notification created: "✓ Model Trained"
7. **T+4m** 2 more users train (total 3)
8. **T+4m 30s** Aggregation triggers (FedAvg)
9. **T+5m** Global model v1 available
10. **T+5m** Salesman dashboard updates user count
11. **T+10m** User's contribution visible in analytics

### Commands to Verify Each Step

```bash
# T+0 - Check user created
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tesla@example.com","password":"demo123"}' | jq '.user.id'

# T+3m - Check upload recorded
curl http://localhost:8001/api/fl/debug/models-uploaded | jq '.total_uploads'

# T+4m - Check notification created
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tesla@example.com","password":"demo123"}' | jq -r '.access_token')
curl http://localhost:8001/api/notifications -H "Authorization: Bearer $TOKEN" | jq '.[] | .type'

# T+4m30 - Check aggregation
curl http://localhost:8001/api/fl/debug/status | jq '.message'

# T+5m - Check global model exists
curl http://localhost:8001/api/fl/global-model | jq '.version'

# T+5m - Check salesman sees user
curl "http://localhost:8001/api/users-by-vehicle-type?vehicle_type=tesla" | jq '.[] | .name'
```

---

## Troubleshooting Guide

### Problem: "Port 8001 already in use"

**Solution:**
```bash
# Find process using port
lsof -i :8001

# Kill it
kill -9 <PID>

# Or use the script
pkill -f "python.*server.py"

# Verify
sleep 2
./start-all.sh
```

---

### Problem: Demo users not created

**Check:**
1. Does `demo_users.json` exist?
   ```bash
   cat fl-server/demo_users.json
   ```

2. Is `auto_create` enabled?
   ```bash
   grep "auto_create" fl-server/demo_users.json
   ```

3. Check backend logs:
   ```bash
   tail -50 client-backend.log | grep "demo user"
   ```

**Fix:**
```bash
# Verify auto_create is true
sed -i 's/"auto_create": false/"auto_create": true/' fl-server/demo_users.json

# Restart
pkill -f "python.*server.py"
./start-all.sh
```

---

### Problem: "Training data not found"

**Solution:**
```bash
# Check files exist
ls -lah fl-server/data/datasets/

# Should show 5 files:
# - tesla_model_3_training.json
# - bmw_i3_training.json
# - hyundai_kona_training.json
# - chevy_bolt_training.json
# - nissan_leaf_training.json

# If missing, regenerate
python3 << 'EOF'
# [Run the data generation script from LEARNING_GUIDE.md]
EOF
```

---

### Problem: App won't connect to backend

**Check:**
```bash
# Verify backend is running
curl http://localhost:8001/api/fl/debug/status

# Check backend logs
tail -20 client-backend.log

# Verify port is correct in app config
grep -r "8001" mobile-app/services/
```

**Fix:**
```bash
# Restart backend explicitly
pkill -f "python.*server.py"
cd fl-server
python3 server.py
```

---

### Problem: Upload fails with "403 Unauthorized"

**Cause:** JWT token expired or invalid

**Solution:**
```bash
# App should auto-refresh token
# Or logout and login again
```

**Check token validity:**
```bash
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tesla@example.com","password":"demo123"}' | jq -r '.access_token')

# Decode token (requires jq and base64)
echo $TOKEN | cut -d. -f2 | base64 -d | jq .
```

---

### Problem: Notifications not appearing

**Check:**
```bash
# 1. Verify endpoint exists
curl http://localhost:8001/api/notifications \
  -H "Authorization: Bearer <token>"

# 2. Check notification was created
curl http://localhost:8001/api/fl/debug/models-uploaded | jq '.latest'

# 3. Check AsyncStorage on device
# Use React Native debugger to inspect
```

**Fix:**
```bash
# Force notification sync in app by pulling down to refresh
# Or restart app to re-fetch cache
```

---

## Checklist for Completion

### Phase 4: Mobile Frontend ✅
- [ ] Home page loads correctly
- [ ] Single vehicle user sees no tabs
- [ ] Multi-vehicle user (user_006) sees tabs
- [ ] Vehicle tabs are clickable and switch content
- [ ] Training completes without errors
- [ ] Console logs show all FL steps
- [ ] Notifications appear after training
- [ ] mockData.ts varies by vehicle type
- [ ] ml.ts has comprehensive logging

### Phase 5: Salesman Dashboard ✅
- [ ] Dashboard loads at http://localhost:3000
- [ ] Shows 5 vehicle type cards (not 4)
- [ ] Vehicle types are correct: Tesla, BMW, Hyundai, Chevy, Nissan
- [ ] Each card fetches users from backend
- [ ] User list displays name and email
- [ ] Multi-vehicle user appears on 2 cards
- [ ] "View Insights" button works

### Phase 6: Testing & Operations ✅
- [ ] Demo users auto-create on startup
- [ ] All 5 training datasets available
- [ ] Login works for all 6 demo users
- [ ] Training completes without errors
- [ ] Models upload successfully
- [ ] Notifications created after upload
- [ ] Aggregation triggers at 3+ uploads
- [ ] Global model available after aggregation
- [ ] Data privacy maintained (no raw data exposed)
- [ ] Error handling works (offline recovery)
- [ ] Multi-vehicle user can train both vehicles
- [ ] Salesman dashboard shows correct user counts

---

## Success Criteria

✅ **All tests pass when:**

1. **6 demo users** auto-created on backend startup
2. **All 5 vehicle types** have training data (200-300 samples each)
3. **Single-vehicle users** can train and upload weights
4. **Multi-vehicle user** can train both vehicles independently
5. **Notifications** created after training completion
6. **Global model** aggregated after 3+ contributions
7. **Salesman dashboard** shows all users by vehicle type
8. **No raw data** leaves the device (privacy maintained)
9. **All errors** handled gracefully with recovery paths
10. **End-to-end workflow** completes in <10 minutes

---

## Support

If any test fails:
1. Check the troubleshooting section above
2. Review console logs (browser + backend)
3. Verify all files exist (check LEARNING_GUIDE.md for file locations)
4. Restart backends: `pkill -f "python.*server.py" && ./start-all.sh`
5. Check database isn't corrupted: `rm fl-server/db.json && ./start-all.sh`

---

**Status:** Ready for Testing 🚀

All phases 1-6 are now complete and ready for comprehensive testing.
