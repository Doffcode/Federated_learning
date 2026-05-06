const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const simulator = require('./simulator');

const app = express();
const PORT = 3001;
const FL_BACKEND_URL = process.env.FL_BACKEND_URL || 'http://localhost:8001';

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ── Helper: fetch from FL backend ─────────────────────────────────────────────

function fetchFlData(path) {
  return new Promise((resolve, reject) => {
    const url = `${FL_BACKEND_URL}${path}`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Map FL vehicle_model names → simulator type keys (REMOVED: Now using vehicle_type from FL backend directly)

// ── Fetch real FL stats (accuracy, loss, rounds, participants) ────────────────

async function getRealFlStats() {
  try {
    return await fetchFlData('/api/fl/stats');
  } catch (_) {
    return null;
  }
}

// ── Merge FL fleet-insights with simulator baseline ───────────────────────────

async function getMergedVehicleData() {
  const simData = simulator.getAggregatedData();

  let flInsights = null;
  let flStats    = null;
  try {
    const [insRes, statsRes] = await Promise.all([
      fetchFlData('/api/fl/fleet-insights'),
      fetchFlData('/api/fl/stats'),
    ]);
    flInsights = insRes.fleet_insights || [];
    flStats    = statsRes;
  } catch (_) {}

  if (!flInsights || flInsights.length === 0) return simData;

  const flByType = {};
  for (const ins of flInsights) {
    const key = ins.vehicle_type || ins.vehicle_model.toLowerCase().replace(/\s+/g, '_');
    flByType[key] = ins;
  }

  const statsByType = {};
  if (flStats && flStats.by_model) {
    for (const m of flStats.by_model) {
      // Fallback: the stats endpoint might still return model name strings, attempt normalized type conversion
      let key = m.model.toLowerCase().replace(/\s+/g, '_');
      if (key.includes('tesla')) key = 'tesla';
      if (key.includes('hyundai') || key.includes('kona')) key = 'hyundai';
      if (key.includes('bmw')) key = 'bmw';
      if (key.includes('chevy') || key.includes('bolt')) key = 'chevy';
      if (key.includes('nissan') || key.includes('leaf')) key = 'nissan';
      
      statsByType[key] = m;
    }
  }

  return simData.map(v => {
    const fl    = flByType[v.type];
    const stats = statsByType[v.type];
    if (!fl) return v;

    // Only trust the FL backend's battery health reading if it shows real degradation.
    // A fresh DB always seeds vehicles at 100%, which would overwrite our realistic baselines.
    const flHealthMeaningful = fl.avg_battery_health < 95;

    return {
      ...v,
      avgBatteryHealth: flHealthMeaningful ? fl.avg_battery_health : v.avgBatteryHealth,
      count:            fl.fleet_count > 0 ? fl.fleet_count : v.count,
      // Real FL metrics (from actual device uploads)
      accuracy:         stats ? stats.avg_accuracy : null,
      loss:             stats ? stats.avg_loss     : null,
      currentRound:     flStats ? flStats.latest_round : v.currentRound,
      flDataLive:       true,
      degradedCount:    flHealthMeaningful ? fl.degraded_count : v.degradedCount,
      alert:            flHealthMeaningful ? fl.alert : v.alert,
    };
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

// List all vehicle types with real battery health + real FL accuracy
app.get('/api/vehicles', async (req, res) => {
  const data = await getMergedVehicleData();
  res.json(data);
});

// Full analytics for one vehicle type
app.get('/api/vehicles/:type', async (req, res) => {
  const { type } = req.params;
  const allData = await getMergedVehicleData();
  const typeData = allData.find(v => v.type === type);
  if (!typeData) return res.status(404).json({ error: 'Vehicle type not found' });

  // Battery health distribution uses real vehicle health data from FL backend
  let batteryDist = simulator.getDistributions(type).battery; // fallback
  try {
    const ins = await fetchFlData('/api/fl/fleet-insights');
    const match = (ins.fleet_insights || []).find(
      i => (i.vehicle_type || i.vehicle_model.toLowerCase().replace(/\s+/g, '_')) === type
    );
    if (match && match.fleet_count > 0) {
      const healthy   = match.fleet_count - match.degraded_count;
      const degraded  = match.degraded_count;
      batteryDist = [
        { name: '> 70% health', value: healthy },
        { name: '< 70% health', value: degraded },
      ];
    }
  } catch (_) {}

  res.json({
    ...typeData,
    distributions: { battery: batteryDist },
    history: simulator.rounds[type].history,
  });
});

// Dashboard summary — real FL metrics where available
app.get('/api/dashboard', async (req, res) => {
  const [data, flStats] = await Promise.all([
    getMergedVehicleData(),
    getRealFlStats(),
  ]);

  const activeDevices    = data.reduce((sum, v) => sum + v.count, 0);
  const avgBatteryHealth = data.reduce((sum, v) => sum + v.avgBatteryHealth, 0) / data.length;

  res.json({
    activeDevices,
    avgBatteryHealth:   Math.round(avgBatteryHealth * 10) / 10,
    totalRounds:        flStats ? flStats.latest_round    : 0,
    totalUploads:       flStats ? flStats.total_uploads   : 0,
    globalAccuracy:     flStats ? flStats.latest_accuracy : null,
    globalLoss:         flStats ? flStats.latest_loss     : null,
    numParticipants:    flStats ? flStats.num_participants : 0,
    flLive:             flStats !== null,
  });
});

// Real FL model stats
app.get('/api/model', async (req, res) => {
  const [data, flStats] = await Promise.all([
    getMergedVehicleData(),
    getRealFlStats(),
  ]);

  res.json({
    global: {
      totalRounds:    flStats ? flStats.latest_round    : 0,
      totalUploads:   flStats ? flStats.total_uploads   : 0,
      accuracy:       flStats ? flStats.latest_accuracy : null,
      loss:           flStats ? flStats.latest_loss     : null,
      numParticipants:flStats ? flStats.num_participants : 0,
      byModel:        flStats ? flStats.by_model         : [],
      flLive:         flStats !== null,
    },
    perType: data.map(v => ({
      type:        v.type,
      name:        v.name,
      round:       v.currentRound,
      accuracy:    v.accuracy,
      loss:        v.loss,
      flDataLive:  v.flDataLive || false,
    })),
  });
});

// Alerts — real battery degradation from FL backend
app.get('/api/alerts', async (req, res) => {
  const data = await getMergedVehicleData();
  const alerts = data.map(v => ({
    type:            v.type,
    name:            v.name,
    avgBatteryHealth:Math.round(v.avgBatteryHealth * 10) / 10,
    degradedCount:   v.degradedCount || 0,
    flAlert:         v.alert || false,
    serviceRisk:     v.avgBatteryHealth < 80 ? 'High' : v.avgBatteryHealth < 90 ? 'Moderate' : 'Low',
    flDataLive:      v.flDataLive || false,
  }));
  res.json(alerts);
});

// System health
app.get('/api/system', async (req, res) => {
  const [data, flStats] = await Promise.all([
    getMergedVehicleData(),
    getRealFlStats(),
  ]);
  res.json({
    activeDevices:   data.reduce((sum, v) => sum + v.count, 0),
    lastUpdate:      new Date().toISOString(),
    flBackendOnline: flStats !== null,
    totalUploads:    flStats ? flStats.total_uploads  : 0,
    totalRounds:     flStats ? flStats.latest_round   : 0,
  });
});

// Direct FL stats passthrough
app.get('/api/fl-stats', async (req, res) => {
  try {
    const data = await fetchFlData('/api/fl/stats');
    res.json(data);
  } catch (err) {
    res.status(503).json({ error: 'FL backend unavailable', detail: err.message });
  }
});

// Direct fleet-insights passthrough
app.get('/api/fl-insights', async (req, res) => {
  try {
    const data = await fetchFlData('/api/fl/fleet-insights');
    res.json(data);
  } catch (err) {
    res.status(503).json({ error: 'FL backend unavailable', detail: err.message });
  }
});

// ── WebSocket Real-Time Broadcast ─────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  // Instantly send data on connect
  broadcastDashboardData();

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Poll the FL backend every 5 seconds and broadcast state to all connected clients
async function broadcastDashboardData() {
  try {
    const [vehicles, flStats] = await Promise.all([
      getMergedVehicleData(),
      getRealFlStats(),
    ]);

    const activeDevices = vehicles.reduce((sum, v) => sum + v.count, 0);
    const avgBatteryHealth = vehicles.reduce((sum, v) => sum + v.avgBatteryHealth, 0) / vehicles.length;

    const payload = {
      vehicles,
      dashboard: {
        activeDevices,
        avgBatteryHealth: Math.round(avgBatteryHealth * 10) / 10,
        totalRounds: flStats ? flStats.latest_round : 0,
        totalUploads: flStats ? flStats.total_uploads : 0,
        globalAccuracy: flStats ? flStats.latest_accuracy : null,
        globalLoss: flStats ? flStats.latest_loss : null,
        numParticipants: flStats ? flStats.num_participants : 0,
        flLive: flStats !== null,
      }
    };

    io.emit('dashboard_update', payload);
  } catch (error) {
    console.error('Error broadcasting dashboard data:', error.message);
  }
}

setInterval(broadcastDashboardData, 5000);

server.listen(PORT, () => {
  console.log(`Salesman backend (WebSocket enabled) running at http://localhost:${PORT}`);
  console.log(`FL backend: ${FL_BACKEND_URL}`);
});
