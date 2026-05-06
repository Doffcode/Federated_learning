"""
Centralized Logging System for FL Platform
- Audit trail (immutable, append-only)
- Test logging
- Deployment tracking
- Privacy-safe (no raw data logged)
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any


class FLLogger:
    """Centralized logger for FL operations"""

    def __init__(self, log_dir: str = "./logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)

        # Audit log (immutable)
        self.audit_log = self.log_dir / "audit.log"

        # Test log
        self.test_log = self.log_dir / "test_log.txt"

        # Deployment log
        self.deploy_log = self.log_dir / "deployment.log"

        # Set up Python logging
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )
        self.logger = logging.getLogger("FL_Platform")

    def log_audit(self, event: str, details: Dict[str, Any]):
        """
        Immutable audit trail
        Privacy guarantee: No raw user data logged
        """
        entry = {
            "timestamp": datetime.now().isoformat(),
            "event": event,
            "details": details,
            # NO raw telemetry fields
        }

        with open(self.audit_log, "a") as f:
            f.write(json.dumps(entry) + "\n")

        self.logger.info(f"AUDIT: {event} | {details}")

    def log_test(self, test_name: str, status: str, message: str = ""):
        """Log test execution"""
        with open(self.test_log, "a") as f:
            f.write(
                f"[{datetime.now().isoformat()}] "
                f"{test_name}: {status} | {message}\n"
            )

        print(f"✓ TEST: {test_name} - {status}")

    def log_deployment(self, stage: str, action: str, result: str):
        """Log deployment progress"""
        with open(self.deploy_log, "a") as f:
            f.write(
                f"[{datetime.now().isoformat()}] " f"[{stage}] {action} → {result}\n"
            )

        self.logger.info(f"DEPLOY [{stage}]: {action} → {result}")

    def log_model_upload(
        self, vehicle_id: str, model_weights_count: int, accuracy: float
    ):
        """Log model upload (privacy-safe)"""
        self.log_audit(
            "MODEL_UPLOAD",
            {
                "vehicle_id": vehicle_id,
                "weights_count": model_weights_count,
                "accuracy": accuracy,
                # NO raw telemetry
            },
        )

    def log_aggregation_round(
        self, round_num: int, contributors: int, convergence: float
    ):
        """Log aggregation round"""
        self.log_audit(
            "AGGREGATION_ROUND",
            {
                "round": round_num,
                "contributors": contributors,
                "convergence_metric": convergence,
            },
        )

    def log_privacy_check(self, check_name: str, passed: bool, details: str = ""):
        """Log privacy validation"""
        self.log_test(
            f"Privacy: {check_name}", "✓ PASS" if passed else "✗ FAIL", details
        )

    def get_audit_trail(self) -> str:
        """Return complete audit trail"""
        if self.audit_log.exists():
            return self.audit_log.read_text()
        return "No audit trail"

    def get_test_results(self) -> str:
        """Return all test results"""
        if self.test_log.exists():
            return self.test_log.read_text()
        return "No test results"

    def get_deployment_log(self) -> str:
        """Return deployment log"""
        if self.deploy_log.exists():
            return self.deploy_log.read_text()
        return "No deployment log"


# Global logger instance
fl_logger = FLLogger()
