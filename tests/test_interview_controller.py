"""
Unit Tests for Interview Controller and Dashboard Queries.
Run using: py tests/test_interview_controller.py
"""

import unittest
import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from cynaris_recruitment.doctype.interview.interview import (
    update_pipeline_stage,
    Interview,
    VALID_STAGES,
)
from cynaris_recruitment.dashboard import get_today_stage_counts


class TestInterviewController(unittest.TestCase):

    def test_valid_stages_list(self):
        """Verify the 6 approved pipeline stages."""
        expected_stages = [
            "Screening",
            "Technical Round 1",
            "Technical Round 2",
            "HR Round",
            "Offered",
            "Rejected"
        ]
        self.assertEqual(VALID_STAGES, expected_stages)

    def test_update_pipeline_stage_success(self):
        """Verify valid pipeline stage update returns success payload."""
        result = update_pipeline_stage(applicant_id="APP-0001", stage="Technical Round 1")
        self.assertTrue(result["success"])
        self.assertEqual(result["applicant_id"], "APP-0001")
        self.assertEqual(result["new_stage"], "Technical Round 1")

    def test_update_pipeline_stage_all_valid_options(self):
        """Verify all valid stage transitions."""
        for stage in VALID_STAGES:
            res = update_pipeline_stage(applicant_id=1, stage=stage)
            self.assertEqual(res["new_stage"], stage)

    def test_update_pipeline_stage_missing_id(self):
        """Verify missing applicant_id raises error."""
        with self.assertRaises(ValueError):
            update_pipeline_stage(applicant_id="", stage="Screening")

    def test_update_pipeline_stage_invalid_stage(self):
        """Verify unrecognized stage raises validation error."""
        with self.assertRaises(ValueError) as ctx:
            update_pipeline_stage(applicant_id="APP-0002", stage="Invalid Stage")
        self.assertIn("Invalid pipeline stage", str(ctx.exception))

    def test_interview_doctype_validation(self):
        """Verify Interview DocType validation method."""
        doc = Interview()
        doc.pipeline_stage = "HR Round"
        # Should not raise
        doc.validate()

        # Should raise on invalid stage
        doc.pipeline_stage = "Random Unapproved Round"
        with self.assertRaises(ValueError):
            doc.validate()

    def test_dashboard_today_stage_counts(self):
        """Verify dashboard query returns counts structure with all 6 stages."""
        data = get_today_stage_counts()
        self.assertIn("date", data)
        self.assertIn("counts", data)
        self.assertIn("total_today", data)

        for stage in VALID_STAGES:
            self.assertIn(stage, data["counts"])
            self.assertIsInstance(data["counts"][stage], int)


if __name__ == "__main__":
    unittest.main()
