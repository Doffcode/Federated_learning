"""
Model versioning and storage helpers.

The actual persistence is handled by TinyDB (fl_global_table in server.py).
This module provides utility functions for serialising / deserialising model
weights and computing version metadata.
"""
from typing import List, Dict, Any
from datetime import datetime


def serialise_weights(weights: List[List[float]]) -> List[List[float]]:
    """Round weights to 6 d.p. to reduce JSON payload size."""
    return [[round(w, 6) for w in layer] for layer in weights]


def deserialise_weights(raw: List[List[float]]) -> List[List[float]]:
    return [[float(w) for w in layer] for layer in raw]


def build_model_record(
    version: int,
    weights: List[List[float]],
    num_participants: int,
    extra: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    record = {
        "version": version,
        "weights": serialise_weights(weights),
        "num_participants": num_participants,
        "aggregated_at": datetime.utcnow().isoformat(),
    }
    if extra:
        record.update(extra)
    return record


def compute_weight_delta(
    old_weights: List[List[float]],
    new_weights: List[List[float]],
) -> float:
    """Return mean absolute change between two model versions (convergence metric)."""
    total, count = 0.0, 0
    for old_layer, new_layer in zip(old_weights, new_weights):
        for o, n in zip(old_layer, new_layer):
            total += abs(n - o)
            count += 1
    return total / count if count else 0.0
