# Real-Time Demo Quickstart

Use these commands to quickly fire up the entire Federated Learning stack from scratch and test the new real-time WebSocket dashboard.

### 1. Start the Backend & Web Dashboard

Open your first terminal tab and run:

```bash
# Navigate to the root of the project
cd "/home/shiva/Desktop/desk/Federated Learning"

# Stop any lingering instances
./scripts/stop-all.sh

# Start the Client Backend, Salesman Backend, and Web Dashboard automatically
./scripts/start-all.sh
```

*(Leave this terminal open. It will stream the logs and automatically open `http://localhost:3000` in your browser!)*

### 3. Start the Mobile App

Open a **third terminal tab** and run:

```bash
cd "/home/shiva/Desktop/desk/Federated Learning/mobile-app"
npx expo start --tunnel -c
```

*Scan the generated QR code using the Expo Go app on your phone, or press `a` to open in an Android emulator / `i` for an iOS simulator.*

---

### How to Test the Real-Time Sync

1. Open the Vite dashboard (`http://localhost:3000`) on your computer monitor.
2. Open the Expo mobile app on your phone.
3. Log in as one of the demo users (e.g., `tesla@example.com` / `demo123`).
4. Tap **"Train Local Model"**.
5. Watch the dashboard! Because it is now connected via WebSockets, the **FL Rounds**, **Global Accuracy**, and **Model Uploads** widgets will update *instantly* the moment your phone finishes uploading its weights—no page refresh required.
