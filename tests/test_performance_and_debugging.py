"""
Unit Tests for Query Optimization, Caching, and Performance Profiling.
Run using: py tests/test_performance_and_debugging.py
"""

import unittest
import sys
import os
import time
import json

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from cynaris_recruitment.dashboard import (
    get_today_stage_counts,
    explain_dashboard_query,
    clear_dashboard_cache,
    VALID_STAGES,
)


class TestPerformanceAndDebugging(unittest.TestCase):

    def setUp(self):
        clear_dashboard_cache()

    def test_query_optimization_range_scan(self):
        """Verify dashboard query uses range-based start and end timestamps rather than DATE() function."""
        result = get_today_stage_counts(force_refresh=True, client_date="2026-10-20")

        self.assertIn("date_range", result)
        self.assertEqual(result["date_range"]["start"], "2026-10-20 00:00:00")
        self.assertEqual(result["date_range"]["end"], "2026-10-21 00:00:00")
        self.assertIn("Range-based indexed scan", result["optimization"])
        self.assertFalse(result["cache_hit"])

    def test_dashboard_query_caching_layer(self):
        """Verify 15-second TTL in-memory caching eliminates redundant queries."""
        # 1st call: Cache Miss
        first_call = get_today_stage_counts(force_refresh=False)
        self.assertFalse(first_call["cache_hit"])

        # 2nd call: Immediate subsequent call -> Cache Hit
        second_call = get_today_stage_counts(force_refresh=False)
        self.assertTrue(second_call["cache_hit"])
        self.assertIn("cache_age_seconds", second_call)

    def test_cache_invalidation(self):
        """Verify clear_dashboard_cache resets the cache."""
        # Prime cache
        get_today_stage_counts(force_refresh=False)

        # Clear cache
        clear_dashboard_cache()

        # Call again -> should be Cache Miss
        post_clear_call = get_today_stage_counts(force_refresh=False)
        self.assertFalse(post_clear_call["cache_hit"])

    def test_explain_dashboard_query_diagnostic(self):
        """Verify explain_dashboard_query returns SQL structure and index advice."""
        diag = explain_dashboard_query(client_date="2026-10-20")
        self.assertIn("query", diag)
        self.assertIn("parameters", diag)
        self.assertIn("recommended_index", diag)
        self.assertIn("idx_applicant_modified_stage", diag["recommended_index"])

    def test_job_applicant_search_index(self):
        """Verify job_applicant.json contains search_index on pipeline_stage for index-only scanning."""
        schema_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "cynaris_recruitment",
            "doctype",
            "job_applicant",
            "job_applicant.json"
        )
        with open(schema_path, "r", encoding="utf-8") as f:
            schema = json.load(f)

        stage_field = next(f for f in schema["fields"] if f["fieldname"] == "pipeline_stage")
        self.assertEqual(stage_field.get("search_index"), 1)


if __name__ == "__main__":
    unittest.main()
