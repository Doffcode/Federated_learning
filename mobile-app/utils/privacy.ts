/**
 * Client-side privacy utilities.
 *
 * Before model weights leave the device we:
 *  1. Clip each layer's L2 norm (sensitivity bounding)
 *  2. Add Gaussian noise  N(0, σ²)   (local differential privacy)
 *
 * This is defence-in-depth on top of the server-side noise in privacy.py.
 */

// ── Gaussian noise (Box-Muller) ───────────────────────────────────────────────

function gaussianNoise(sigma: number): number {
  const u1 = Math.random() || 1e-10;
  const u2 = Math.random() || 1e-10;
  return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── L2 norm ───────────────────────────────────────────────────────────────────

function l2Norm(layer: number[]): number {
  return Math.sqrt(layer.reduce((acc, w) => acc + w * w, 0)) || 1e-10;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Clip a weight layer so its L2 norm ≤ clipNorm.
 * Prevents any single update from dominating aggregation.
 */
export function clipLayer(layer: number[], clipNorm = 1.0): number[] {
  const norm = l2Norm(layer);
  if (norm <= clipNorm) return layer;
  const scale = clipNorm / norm;
  return layer.map(w => w * scale);
}

/**
 * Add calibrated Gaussian noise to a weight layer.
 * σ = 0.3 by default (lighter than server-side 0.5 to preserve utility).
 */
export function addNoise(layer: number[], sigma = 0.3): number[] {
  return layer.map(w => w + gaussianNoise(sigma));
}

/**
 * Full client-side DP pipeline applied to all weight layers before upload.
 */
export function privatiseWeights(
  weights: number[][],
  clipNorm = 1.0,
  sigma = 0.3
): number[][] {
  return weights.map(layer => addNoise(clipLayer(layer, clipNorm), sigma));
}

/**
 * Verify no raw feature data is present in a payload about to be sent.
 * Returns true if safe, throws if raw data detected.
 */
export function assertNoRawData(payload: Record<string, unknown>): true {
  const forbidden = ['soc_start', 'soc_end', 'temperature_c', 'distance_km', 'user_id_raw'];
  for (const key of forbidden) {
    if (key in payload) {
      throw new Error(`Privacy violation: raw field "${key}" found in upload payload`);
    }
  }
  return true;
}
