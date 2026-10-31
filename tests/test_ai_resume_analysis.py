"""
Unit Tests for AI Resume Analysis (Groq + OpenRouter Fallback).
Run using: py tests/test_ai_resume_analysis.py
"""

import unittest
import sys
import os
import json

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from cynaris_recruitment.doctype.job_applicant.job_applicant import (
    generate_resume_summary,
    build_analysis_prompt,
    GROQ_MODEL,
    OPENROUTER_MODEL,
)


class TestAIResumeAnalysis(unittest.TestCase):

    def test_prompt_construction(self):
        """Verify prompt is structured with candidate details and evaluation schema."""
        applicant_data = {
            "applicant_name": "Priya Sharma",
            "job_title": "Full Stack Engineer",
            "experience_years": 3,
            "skills": "Python, Vue.js, Node.js, PostgreSQL",
            "education": "Master of Computer Applications",
            "resume_text": "Led development of scalable REST APIs and responsive Vue dashboards."
        }

        system_prompt, user_prompt = build_analysis_prompt(applicant_data)

        # Check system prompt constraints
        self.assertIn("Technical Talent Partner", system_prompt)
        self.assertIn("Cynaris Solutions", system_prompt)

        # Check user prompt variables
        self.assertIn("Priya Sharma", user_prompt)
        self.assertIn("Full Stack Engineer", user_prompt)
        self.assertIn("Python, Vue.js", user_prompt)

        # Check structured output sections
        self.assertIn("Executive Summary", user_prompt)
        self.assertIn("Key Technical Competencies", user_prompt)
        self.assertIn("Interview Probe Points", user_prompt)
        self.assertIn("Hiring Recommendation", user_prompt)

    def test_doctype_contains_ai_resume_summary_field(self):
        """Verify job_applicant.json has the ai_resume_summary Long Text field."""
        schema_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "cynaris_recruitment",
            "doctype",
            "job_applicant",
            "job_applicant.json"
        )
        self.assertTrue(os.path.exists(schema_path))

        with open(schema_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        field_names = [f["fieldname"] for f in data.get("fields", [])]
        self.assertIn("ai_resume_summary", field_names)

        # Check field properties
        summary_field = next(f for f in data["fields"] if f["fieldname"] == "ai_resume_summary")
        self.assertEqual(summary_field["fieldtype"], "Long Text")
        self.assertEqual(summary_field["label"], "AI Resume Summary")

    def test_generate_resume_summary_primary_provider(self):
        """Verify primary AI summary generation succeeds."""
        result = generate_resume_summary(applicant_id=1)
        self.assertTrue(result["success"])
        self.assertIn("Groq", result["provider"])
        self.assertIsNotNone(result["summary"])
        self.assertIn("Executive Summary", result["summary"])
        self.assertIn("Key Technical Competencies", result["summary"])

    def test_generate_resume_summary_fallback_to_openrouter(self):
        """Verify fallback to OpenRouter when Groq fails."""
        result = generate_resume_summary(applicant_id=1, simulate_groq_failure=True)
        self.assertTrue(result["success"])
        self.assertIn("OpenRouter", result["provider"])
        self.assertIsNotNone(result["summary"])
        self.assertTrue(len(result["errors_bypassed"]) >= 0)

    def test_generate_resume_summary_both_providers_fail(self):
        """Verify graceful user-friendly error message when both providers fail."""
        result = generate_resume_summary(applicant_id=1, simulate_both_failure=True)
        self.assertFalse(result["success"])
        self.assertIn("error", result)
        self.assertIn("Both primary provider (Groq) and secondary fallback (OpenRouter) failed", result["error"])

    def test_missing_applicant_id(self):
        """Verify error is returned when applicant_id is missing."""
        result = generate_resume_summary(applicant_id="")
        self.assertFalse(result["success"])
        self.assertIn("Missing required parameter", result["error"])


if __name__ == "__main__":
    unittest.main()
