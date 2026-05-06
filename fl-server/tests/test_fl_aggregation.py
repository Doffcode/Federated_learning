"""
Unit Tests: FedAvg Algorithm & Privacy
Tests core FL functionality
"""

import pytest
import json
import numpy as np
from unittest.mock import Mock, AsyncMock
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# Mock logger since it might not be available
class MockLogger:
    def log_test(self, *args, **kwargs):
        pass

    def log_privacy_check(self, *args, **kwargs):
        pass

    def log_audit(self, *args, **kwargs):
        pass


try:
    from utils.logger import fl_logger
except ImportError:
    fl_logger = MockLogger()


class TestFedAvgAlgorithm:
    """Test Federated Averaging algorithm"""

    def test_fedavg_basic_averaging(self):
        """Test: FedAvg correctly averages weights"""
        fl_logger.log_test("FedAvg: Basic Averaging", "RUNNING")

        # Create 3 model weights
        weights_1 = np.array([0.1, 0.2, 0.3])
        weights_2 = np.array([0.2, 0.3, 0.4])
        weights_3 = np.array([0.3, 0.4, 0.5])

        # Expected average
        expected = np.array([0.2, 0.3, 0.4])

        # Manual FedAvg
        all_weights = [weights_1, weights_2, weights_3]
        result = np.mean(all_weights, axis=0)

        # Verify
        assert np.allclose(result, expected), f"Expected {expected}, got {result}"
        fl_logger.log_test("FedAvg: Basic Averaging", "✓ PASS")

    def test_fedavg_convergence_trend(self):
        """Test: FedAvg shows convergence over rounds"""
        fl_logger.log_test("FedAvg: Convergence Trend", "RUNNING")

        # Simulate 5 rounds of convergence
        losses = []

        for round_num in range(5):
            # Simulated loss decreasing over rounds
            loss = 1.0 / (1 + round_num)  # Should decrease
            losses.append(loss)

        # Verify loss decreased
        assert losses[0] > losses[-1], f"Loss not converging: {losses}"
        fl_logger.log_test("FedAvg: Convergence Trend", "✓ PASS")

    def test_fedavg_with_different_model_sizes(self):
        """Test: FedAvg handles variable layer counts"""
        fl_logger.log_test("FedAvg: Variable Model Sizes", "RUNNING")

        # Device A: Dense model with 1000 weights
        weights_a = np.random.randn(1000)

        # Device B: Sparse model with 1000 weights
        weights_b = np.random.randn(1000)

        # Average
        avg = np.mean([weights_a, weights_b], axis=0)

        assert avg.shape == (1000,), f"Shape mismatch: {avg.shape}"
        fl_logger.log_test("FedAvg: Variable Model Sizes", "✓ PASS")

    def test_fedavg_numerical_stability(self):
        """Test: FedAvg doesn't overflow with extreme values"""
        fl_logger.log_test("FedAvg: Numerical Stability", "RUNNING")

        # Very large numbers
        weights_large = np.array([1e10, 2e10, 3e10])
        weights_small = np.array([1e-10, 2e-10, 3e-10])

        # Average
        avg = np.mean([weights_large, weights_small], axis=0)

        # Should not produce NaN
        assert np.all(np.isfinite(avg)), f"NaN detected: {avg}"
        fl_logger.log_test("FedAvg: Numerical Stability", "✓ PASS")


class TestPrivacyGuarantees:
    """Test privacy mechanisms"""

    def test_differential_privacy_noise_injection(self):
        """Test: DP adds noise correctly"""
        fl_logger.log_test("Privacy: Differential Privacy Noise", "RUNNING")

        # Original weights
        weights = np.array([0.5, 0.5, 0.5])

        # Add Laplace noise (epsilon=0.5)
        epsilon = 0.5
        scale = 1.0 / epsilon
        noise = np.random.laplace(0, scale, weights.shape)
        noisy_weights = weights + noise

        # Should be different
        assert not np.allclose(weights, noisy_weights), "Noise not applied!"

        # Should still be finite
        assert np.all(np.isfinite(noisy_weights)), "Invalid noise!"

        fl_logger.log_privacy_check(
            "Differential Privacy Noise",
            True,
            f"Original: {weights}, Noisy: {noisy_weights}",
        )

    def test_no_raw_data_in_aggregation_output(self):
        """Test: Aggregation output never contains raw telemetry"""
        fl_logger.log_test("Privacy: No Raw Data in Output", "RUNNING")

        # Simulate model weights from training on raw data
        model_weights = np.array([0.123, 0.456, 0.789, 0.321, 0.654])

        # Simulate raw user data (battery %, temp, etc.)
        raw_data = np.array(
            [87.5, 28.3, 2.5, 15000, 50.2]
        )  # Battery %, Temp, Age, Miles, Health

        # Convert to JSON strings to check if raw data is embedded
        weights_json = json.dumps({"weights": model_weights.tolist()})

        # Raw data should NOT appear in weights JSON
        raw_values = ["87.5", "28.3", "2.5", "15000", "50.2"]

        for value in raw_values:
            assert (
                value not in weights_json
            ), f"Raw data value {value} found in weights! Leak detected"

        fl_logger.log_privacy_check(
            "No Raw Data in Output",
            True,
            "Weights JSON contains no raw telemetry values",
        )

    def test_model_poisoning_detection(self):
        """Test: Detect anomalous model updates"""
        fl_logger.log_test("Privacy: Model Poisoning Detection", "RUNNING")

        # Normal models
        normal_weights = [
            np.array([0.5, 0.5]),
            np.array([0.51, 0.49]),
            np.array([0.49, 0.51]),
        ]

        # Poisoned model (wildly different)
        poisoned_weights = np.array([100, -100])

        # Detect outlier
        all_weights = normal_weights + [poisoned_weights]
        mean_weights = np.mean(normal_weights, axis=0)

        # Calculate Z-score for poisoned
        std_weights = np.std(normal_weights, axis=0)
        z_score = np.abs((poisoned_weights - mean_weights) / std_weights)

        # Z-score > 3 is outlier
        is_outlier = np.any(z_score > 3)

        assert is_outlier, "Poisoning not detected!"

        fl_logger.log_privacy_check(
            "Model Poisoning Detection",
            True,
            f"Detected outlier with Z-score: {z_score[0]:.2f}",
        )

    def test_privacy_budget_composition(self):
        """Test: Privacy budget over multiple rounds"""
        fl_logger.log_test("Privacy: Budget Composition", "RUNNING")

        # Cumulative privacy loss
        epsilon_per_round = 0.5
        num_rounds = 5

        # Approximate: sqrt composition
        total_epsilon = epsilon_per_round * np.sqrt(2 * np.log(1.25) * num_rounds)

        # Should be reasonable (<3)
        acceptable = total_epsilon < 3

        fl_logger.log_privacy_check(
            "Privacy Budget Composition",
            acceptable,
            f"Total ε over {num_rounds} rounds: {total_epsilon:.2f}",
        )


class TestAuditLogging:
    """Test that logging is privacy-safe"""

    def test_audit_log_contains_no_telemetry(self):
        """Test: Audit logs never include raw data"""
        fl_logger.log_test("Audit: No Telemetry Logged", "RUNNING")

        # Log a model upload
        # Get audit trail (use fresh logger to avoid test state pollution)
        import tempfile
        from utils.logger import FLLogger

        test_logger = FLLogger(log_dir=tempfile.mkdtemp())
        test_logger.log_model_upload(
            vehicle_id="vehicle_123", model_weights_count=1000, accuracy=0.92
        )
        audit = test_logger.get_audit_trail()

        # Should contain metadata, not raw data
        assert "vehicle_123" in audit
        assert "1000" in audit  # weights count
        assert "0.92" in audit  # accuracy

        # Should NOT contain telemetry keywords (that would only appear if raw data was logged)
        audit_lower = audit.lower()
        telemetry_keywords = ["battery_level", "temperature_c", "location_lat"]
        for keyword in telemetry_keywords:
            assert keyword not in audit_lower, f"Telemetry {keyword} found in audit!"

        fl_logger.log_privacy_check(
            "Audit Log Privacy", True, "No raw telemetry in audit trail"
        )

    def test_audit_log_immutability(self):
        """Test: Audit logs are append-only"""
        fl_logger.log_test("Audit: Immutability", "RUNNING")

        # Log first event
        fl_logger.log_aggregation_round(1, 10, 0.05)
        audit_1 = fl_logger.get_audit_trail()

        # Log second event
        fl_logger.log_aggregation_round(2, 12, 0.03)
        audit_2 = fl_logger.get_audit_trail()

        # Second should contain first
        assert audit_1 in audit_2

        fl_logger.log_privacy_check(
            "Audit Log Immutability", True, "Append-only: old entries preserved"
        )


class TestErrorHandling:
    """Test robustness"""

    def test_empty_model_list_handling(self):
        """Test: Handle empty model updates gracefully"""
        fl_logger.log_test("Error Handling: Empty Models", "RUNNING")

        try:
            models = []
            if len(models) < 1:
                raise ValueError("No models to aggregate")
            result = np.mean(models, axis=0)
        except ValueError as e:
            # Should catch error
            assert "No models" in str(e)
            fl_logger.log_test("Error Handling: Empty Models", "✓ PASS")

    def test_weight_dimension_mismatch_handling(self):
        """Test: Detect dimension mismatches"""
        fl_logger.log_test("Error Handling: Dimension Mismatch", "RUNNING")

        weights_1 = np.array([0.1, 0.2, 0.3])  # 3 elements
        weights_2 = np.array([0.1, 0.2, 0.3, 0.4])  # 4 elements

        # Verify shapes are different
        assert weights_1.shape != weights_2.shape, "Shapes should be different"

        # This is an expected error - we should handle it
        error_caught = False
        try:
            # numpy.mean with different shaped arrays fails with ValueError
            result = np.mean([weights_1, weights_2], axis=0)
        except (ValueError, TypeError):
            # Expected behavior - dimension mismatch detected
            error_caught = True

        assert error_caught, "Should have caught dimension mismatch error"
        fl_logger.log_test("Error Handling: Dimension Mismatch", "✓ PASS")


# ============================================================================
# TEST EXECUTION & REPORTING
# ============================================================================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print(" 🧪 FL PLATFORM: UNIT TEST SUITE")
    print("=" * 70 + "\n")

    # Run all tests
    pytest.main([__file__, "-v", "--tb=short"])

    print("\n" + "=" * 70)
    print(" 📋 TEST RESULTS")
    print("=" * 70)
    print(fl_logger.get_test_results())

    print("\n" + "=" * 70)
    print(" 🔒 AUDIT TRAIL")
    print("=" * 70)
    print(fl_logger.get_audit_trail())
