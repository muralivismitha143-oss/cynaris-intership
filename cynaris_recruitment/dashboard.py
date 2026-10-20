"""
Dashboard Queries and Analytics API for Cynaris Recruitment Pipeline.
"""

from datetime import date

try:
    import frappe
    from frappe.utils import nowdate
except ImportError:
    frappe = None

VALID_STAGES = [
    "Screening",
    "Technical Round 1",
    "Technical Round 2",
    "HR Round",
    "Offered",
    "Rejected",
]


def _frappe_whitelist(fn):
    """Decorator fallback if running outside Frappe runtime."""
    if frappe and hasattr(frappe, "whitelist"):
        return frappe.whitelist()(fn)
    return fn


@_frappe_whitelist
def get_today_stage_counts():
    """
    Dashboard query: count applicants per pipeline stage for today.

    Exposed as API endpoint:
    GET /api/method/cynaris_recruitment.dashboard.get_today_stage_counts

    Returns:
        dict: {
            "date": "YYYY-MM-DD",
            "counts": {
                "Screening": int,
                "Technical Round 1": int,
                "Technical Round 2": int,
                "HR Round": int,
                "Offered": int,
                "Rejected": int
            },
            "total_today": int
        }
    """
    today_str = frappe.utils.nowdate() if frappe else date.today().isoformat()

    # Initialize count dictionary with 0 for all approved stages
    counts = {stage: 0 for stage in VALID_STAGES}

    if frappe:
        # Frappe SQL Dashboard aggregation query
        # Uses frappe.db.sql with parameterized query for secure execution
        query = """
            SELECT 
                pipeline_stage, 
                COUNT(*) as count
            FROM 
                `tabJob Applicant`
            WHERE 
                DATE(modified) = %s
            GROUP BY 
                pipeline_stage
        """
        results = frappe.db.sql(query, (today_str,), as_dict=True)

        for row in results:
            stage_name = row.get("pipeline_stage")
            if stage_name in counts:
                counts[stage_name] = int(row.get("count", 0))

    total = sum(counts.values())

    return {
        "date": today_str,
        "counts": counts,
        "total_today": total
    }
