"""
FedAvg aggregation algorithm.

Each client trains a local model and sends back only the model weights.
The server performs weighted averaging (by number of local samples) to
produce an improved global model — no raw data ever leaves the device.
"""
from typing import List


class FedAvgAggregator:
    """Federated Averaging (McMahan et al., 2017)."""

    def aggregate(
        self,
        weights_list: List[List[List[float]]],
        samples_list: List[int],
    ) -> List[List[float]]:
        """
        Compute the weighted average of model weight layers.

        Args:
            weights_list: List of per-client weight matrices.
                          Shape: [num_clients][num_layers][num_params]
            samples_list: Number of local training samples per client.

        Returns:
            Aggregated global weights: [num_layers][num_params]
        """
        if not weights_list:
            return []

        total_samples = sum(samples_list)
        if total_samples == 0:
            return weights_list[0]

        num_layers = len(weights_list[0])
        global_weights: List[List[float]] = []

        for layer_idx in range(num_layers):
            layer_size = len(weights_list[0][layer_idx])
            aggregated_layer = [0.0] * layer_size

            for client_idx, (client_weights, n_samples) in enumerate(
                zip(weights_list, samples_list)
            ):
                weight_factor = n_samples / total_samples
                for param_idx in range(layer_size):
                    aggregated_layer[param_idx] += (
                        weight_factor * client_weights[layer_idx][param_idx]
                    )

            global_weights.append(aggregated_layer)

        return global_weights

    def blend_personal_global(
        self,
        personal_weights: List[List[float]],
        global_weights: List[List[float]],
        personal_ratio: float = 0.30,
    ) -> List[List[float]]:
        """
        Blend personal model (30%) with global model (70%) for personalised
        predictions that still benefit from fleet-wide learning.
        """
        if not global_weights:
            return personal_weights
        if not personal_weights:
            return global_weights

        blended = []
        for p_layer, g_layer in zip(personal_weights, global_weights):
            blended_layer = [
                personal_ratio * p + (1 - personal_ratio) * g
                for p, g in zip(p_layer, g_layer)
            ]
            blended.append(blended_layer)
        return blended
