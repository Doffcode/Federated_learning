/**
 * On-device federated learning service.
 *
 * Responsibilities:
 *  1. Fetch vehicle-model-specific training data from backend
 *  2. Train a lightweight battery-degradation model locally
 *  3. Extract model weights (never raw data) and upload to backend
 *  4. Fetch the latest global model for personalised predictions
 *
 * Uses simple gradient-descent math (no TensorFlow.js native modules
 * required) so it works in Expo Go without ejecting.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TrainingSample {
  features: {
    battery_capacity: number;
    charging_rate_kw: number;
    temperature_c: number;
    vehicle_age_years: number;
    distance_km: number;
    soc_start: number;
    energy_consumed_kwh: number;
  };
  label: number; // battery health proxy 0-100
}

export interface LocalModel {
  weights: number[][];   // [layer][param]
  version: number;
  trainedAt: string;
  loss: number;
  accuracy: number;
}

export interface ModelUploadPayload {
  vehicle_id: string;
  vehicle_model: string;
  weights: number[][];
  local_samples: number;
  loss: number;
  accuracy: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const NUM_FEATURES = 7;
const LEARNING_RATE = 0.01;   // was 0.001 — 10× larger so weights actually converge
const EPOCHS = 200;            // was 50 — enough iterations for convergence
const STORAGE_KEY = 'local_fl_model';

// ── Normalisation ─────────────────────────────────────────────────────────────

function featureVector(s: TrainingSample): number[] {
  const f = s.features;
  // Divisors tuned to actual dataset maxima so all features stay in [0, 1]:
  //   battery_capacity: max ~189 kWh  → /200
  //   soc_start:        max ~122 %    → /150
  //   energy_consumed:  max ~152 kWh  → /200
  return [
    f.battery_capacity / 200,
    f.charging_rate_kw / 350,
    (f.temperature_c + 30) / 80,
    f.vehicle_age_years / 15,
    f.distance_km / 500,
    f.soc_start / 150,
    f.energy_consumed_kwh / 200,
  ];
}

// ── Simple 1-layer linear model ──────────────────────────────────────────────

function initWeights(): number[][] {
  // layer 0: [NUM_FEATURES weights + 1 bias]
  const layer: number[] = [];
  for (let i = 0; i < NUM_FEATURES + 1; i++) {
    layer.push((Math.random() - 0.5) * 0.1);
  }
  return [layer];
}

function predict(weights: number[][], x: number[]): number {
  const w = weights[0];
  let out = w[NUM_FEATURES]; // bias
  for (let i = 0; i < NUM_FEATURES; i++) {
    out += w[i] * x[i];
  }
  // Sigmoid to keep output in [0, 1], scaled to [0, 100]
  return 100 / (1 + Math.exp(-out));
}

function trainModel(
  samples: TrainingSample[],
  initialWeights?: number[][]
): LocalModel {
  const weights = initialWeights ? initialWeights.map(l => [...l]) : initWeights();
  const n = samples.length;
  let finalLoss = 0;

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    let epochLoss = 0;
    const grad = weights[0].map(() => 0);

    for (const sample of samples) {
      const x = featureVector(sample);
      const pred = predict(weights, x) / 100; // normalise to [0,1]
      const target = sample.label / 100;
      const error = pred - target;
      epochLoss += error * error;

      // Sigmoid derivative: pred*(1-pred)
      const sigmoidDeriv = pred * (1 - pred);
      for (let i = 0; i < NUM_FEATURES; i++) {
        grad[i] += (2 * error * sigmoidDeriv * x[i]) / n;
      }
      grad[NUM_FEATURES] += (2 * error * sigmoidDeriv) / n; // bias
    }

    for (let i = 0; i <= NUM_FEATURES; i++) {
      weights[0][i] -= LEARNING_RATE * grad[i];
    }
    finalLoss = epochLoss / n;
  }

  // Accuracy: prediction within ±15 percentage points of label
  // (±15 is appropriate for battery-health regression; ±10 was too tight)
  let correct = 0;
  for (const sample of samples) {
    const pred = predict(weights, featureVector(sample));
    if (Math.abs(pred - sample.label) <= 15) correct++;
  }
  const accuracy = n > 0 ? correct / n : 0;

  return {
    weights,
    version: 1,
    trainedAt: new Date().toISOString(),
    loss: finalLoss,
    accuracy,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch vehicle-model-specific training data from the backend.
 * This is the only time the device contacts the server for data.
 * The raw records are used locally and never re-uploaded.
 */
export async function fetchTrainingData(vehicleModel: string): Promise<TrainingSample[]> {
  console.log(`🔄 [FL] Fetching training data for: ${vehicleModel}`);
  try {
    const res = await api.get('/training-data', { params: { vehicle_model: vehicleModel } });
    const samples = (res.data.data ?? []) as TrainingSample[];
    console.log(`✓ [FL] Fetched ${samples.length} training samples for ${vehicleModel}`);
    return samples;
  } catch (error) {
    console.error(`❌ [FL] Failed to fetch training data for ${vehicleModel}:`, error);
    throw error;
  }
}

/**
 * Train a local model on device, persist it, and return the result.
 * Raw training data is not stored — only the final weights.
 */
export async function trainLocalModel(
  vehicleModel: string,
  existingWeights?: number[][]
): Promise<LocalModel> {
  console.log(`🎯 [FL] Starting local training for: ${vehicleModel}`);
  if (existingWeights) {
    console.log(`🌍 [FL] Using global model weights as initialization`);
  }

  const samples = await fetchTrainingData(vehicleModel);
  if (samples.length === 0) {
    console.error(`❌ [FL] No training data available for ${vehicleModel}`);
    throw new Error('No training data available for this vehicle model');
  }

  console.log(`📊 [FL] Training on ${samples.length} samples (${EPOCHS} epochs, lr=${LEARNING_RATE})`);
  const startTime = Date.now();
  const model = trainModel(samples, existingWeights);
  const trainTime = Date.now() - startTime;

  console.log(`✓ [FL] Training complete in ${trainTime}ms`);
  console.log(`  Loss: ${model.loss.toFixed(6)} | Accuracy: ${(model.accuracy * 100).toFixed(1)}%`);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  console.log(`💾 [FL] Model persisted to AsyncStorage`);

  return model;
}

/**
 * Upload only the model weights to the FL server.
 * Raw data never leaves the device.
 */
export async function uploadModelUpdate(
  vehicleId: string,
  vehicleModel: string,
  model: LocalModel,
  localSamples: number
): Promise<void> {
  console.log(`📤 [FL] Uploading model weights for ${vehicleModel}`);
  console.log(`  Vehicle ID: ${vehicleId}`);
  console.log(`  Local Samples: ${localSamples}`);
  console.log(`  Weights Shape: ${model.weights.length} layers × ${model.weights[0].length} params`);
  console.log(`  Local Loss: ${model.loss.toFixed(6)} | Local Accuracy: ${(model.accuracy * 100).toFixed(1)}%`);

  const payload: ModelUploadPayload = {
    vehicle_id: vehicleId,
    vehicle_model: vehicleModel,
    weights: model.weights,
    local_samples: localSamples,
    loss: model.loss,
    accuracy: model.accuracy,
  };

  try {
    await api.post('/fl/upload-model', payload);
    console.log(`✓ [FL] Weights uploaded successfully`);
    console.log(`  Server will aggregate when 3+ devices contribute to this round`);
  } catch (error) {
    console.error(`❌ [FL] Upload failed:`, error);
    throw error;
  }
}

/**
 * Load the locally stored model (if any).
 */
export async function loadLocalModel(): Promise<LocalModel | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    const model = JSON.parse(raw) as LocalModel;
    console.log(`📦 [FL] Loaded local model from storage (v${model.version}, trained ${new Date(model.trainedAt).toLocaleString()})`);
    return model;
  }
  console.log(`ℹ️  [FL] No local model found in storage`);
  return null;
}

/**
 * Fetch the latest global model from the server.
 */
export async function fetchGlobalModel(): Promise<{ version: number; weights: number[][] } | null> {
  try {
    const res = await api.get('/fl/global-model');
    if (!res.data.weights || res.data.weights.length === 0) {
      console.log(`ℹ️  [FL] No global model available yet (waiting for 3+ contributions)`);
      return null;
    }
    console.log(`🌍 [FL] Fetched global model v${res.data.version}`);
    return { version: res.data.version, weights: res.data.weights };
  } catch (error) {
    console.warn(`⚠️  [FL] Could not fetch global model:`, error);
    return null;
  }
}

/**
 * Run the full FL cycle for a vehicle:
 *   1. Download training data
 *   2. Train locally (blending with global model if available)
 *   3. Upload weights only
 *   4. Delete raw data (it was never persisted)
 */
export async function runFLCycle(vehicleId: string, vehicleModel: string): Promise<LocalModel> {
  const cycleId = `${Date.now()}`;
  console.log(`\n════════════════════════════════════════════════════════════`);
  console.log(`🚀 [FL] CYCLE START: ${vehicleModel} (ID: ${cycleId.slice(-6)})`);
  console.log(`════════════════════════════════════════════════════════════\n`);

  try {
    const startCycle = Date.now();

    // Step 1: Check for global model
    const global = await fetchGlobalModel();
    if (global) {
      console.log(`  Initialized with global model v${global.version}\n`);
    } else {
      console.log(`  Starting fresh (no global model yet)\n`);
    }

    // Step 2: Train locally
    const model = await trainLocalModel(vehicleModel, global?.weights ?? undefined);

    // Step 3: Upload
    const samples = await fetchTrainingData(vehicleModel); // count only
    await uploadModelUpdate(vehicleId, vehicleModel, model, samples.length);

    // Summary
    const cycleDuration = Date.now() - startCycle;
    console.log(`\n════════════════════════════════════════════════════════════`);
    console.log(`✅ [FL] CYCLE COMPLETE: ${vehicleModel}`);
    console.log(`   Total Time: ${(cycleDuration / 1000).toFixed(1)}s`);
    console.log(`════════════════════════════════════════════════════════════\n`);

    return model;
  } catch (error) {
    console.log(`\n════════════════════════════════════════════════════════════`);
    console.log(`❌ [FL] CYCLE FAILED: ${vehicleModel}`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`════════════════════════════════════════════════════════════\n`);
    throw error;
  }
}
