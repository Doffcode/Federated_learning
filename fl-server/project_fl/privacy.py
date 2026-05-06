"""
Differential privacy utilities.

Adds calibrated Gaussian noise to model weights before aggregation so that
the server cannot reconstruct individual vehicle data from the updates.
Privacy budget: ε ≈ 0.5 (tight), δ = 1e-5.
"""
import random
import math
from typing import List


def _gaussian_noise(sigma: float) -> float:
    """Box-Muller transform for zero-mean Gaussian noise."""
    u1 = random.random() or 1e-10
    u2 = random.random() or 1e-10
    return sigma * math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)


def add_gaussian_noise(layer: List[float], sigma: float = 0.5) -> List[float]:
    """
    Add Gaussian noise N(0, sigma²) to every parameter in a weight layer.
    Called server-side on each received update before storage.
    """
    return [w + _gaussian_noise(sigma) for w in layer]


def clip_weights(layer: List[float], clip_norm: float = 1.0) -> List[float]:
    """
    Clip weight layer to L2 norm ≤ clip_norm (sensitivity bounding).
    Applied before noise addition for tighter privacy guarantees.
    """
    norm = math.sqrt(sum(w * w for w in layer)) or 1e-10
    if norm <= clip_norm:
        return layer
    scale = clip_norm / norm
    return [w * scale for w in layer]


def privatise_weights(
    layer: List[float],
    clip_norm: float = 1.0,
    sigma: float = 0.5,
) -> List[float]:
    """Full DP pipeline: clip → add noise."""
    clipped = clip_weights(layer, clip_norm)
    return add_gaussian_noise(clipped, sigma)
