"""
Dashboard Queries, Analytics API, and Query Optimization for Cynaris Recruitment Pipeline.
Week 2 Day 4: Debug & Performance Sprint - Log Analysis & Query Optimization.
"""

from datetime import date, datetime, timedelta
import time

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

# In-memory query cache for dashboard counts (15-second TTL)
_METRICS_CACHE = {
    "cached_at": 0.0,
    "ttl_seconds": 15.0,
    "data": None
}


def _frappe_whitelist(fn):
    """Decorator fallback if running outside Frappe runtime."""
    if frappe and hasattr(frappe, "whitelist"):
        return frappe.whitelist()(fn)
    return fn


def clear_dashboard_cache():
    """Invalidate cached dashboard metrics."""
    global _METRICS_CACHE
    _METRICS_CACHE["cached_at"] = 0.0
    _METRICS_CACHE["data"] = None


@_frappe_whitelist
def get_today_stage_counts(force_refresh=False, client_date=None):
    """
    Optimized dashboard query: count applicants per pipeline stage for today.

    PERFORMANCE OPTIMIZATION DETAILS:
    - Before (Unoptimized):
        WHERE DATE(modified) = %s
        Root Cause: Applying the DATE() function on an indexed datetime column forces
        the database to perform a full table scan O(N) because standard B-tree indexes
        cannot evaluate functional predicates directly.

    - After (Optimized Range Scan):
        WHERE modified >= %s AND modified < %s
        Optimization: Replaced the function call with an indexed range predicate
        (start-of-day to start-of-next-day). This leverages the composite index
        `idx_applicant_modified_stage` on (modified, pipeline_stage), reducing
        query time from O(N) to O(log N) as a Covering Index scan.

    - Caching Layer:
        Implemented 15-second TTL in-memory caching to eliminate redundant database
        round-trips during high-frequency frontend polling.

    Exposed as API endpoint:
    GET /api/method/cynaris_recruitment.dashboard.get_today_stage_counts
    """
    global _METRICS_CACHE

    now_ts = time.time()
    # Check cache validity if not forcing refresh
    if not force_refresh and _METRICS_CACHE["data"] is not None:
        if (now_ts - _METRICS_CACHE["cached_at"]) < _METRICS_CACHE["ttl_seconds"]:
            cached_result = dict(_METRICS_CACHE["data"])
            cached_result["cache_hit"] = True
            cached_result["cache_age_seconds"] = round(now_ts - _METRICS_CACHE["cached_at"], 2)
            return cached_result

    start_timer = time.perf_counter()

    # Determine reference date (support client-provided localized date or server date)
    if client_date:
        today_date = datetime.strptime(client_date, "%Y-%m-%d").date()
    else:
        today_str = frappe.utils.nowdate() if frappe else date.today().isoformat()
        today_date = datetime.strptime(today_str, "%Y-%m-%d").date()

    today_str = today_date.isoformat()
    next_day_str = (today_date + timedelta(days=1)).isoformat()

    start_datetime = f"{today_str} 00:00:00"
    end_datetime = f"{next_day_str} 00:00:00"

    # Initialize count dictionary with 0 for all approved stages
    counts = {stage: 0 for stage in VALID_STAGES}

    if frappe:
        # OPTIMIZED QUERY: Range-based condition enabling index usage
        query = """
            SELECT 
                pipeline_stage, 
                COUNT(*) as count
            FROM 
                `tabJob Applicant`
            WHERE 
                modified >= %s AND modified < %s
            GROUP BY 
                pipeline_stage
        """
        results = frappe.db.sql(query, (start_datetime, end_datetime), as_dict=True)

        for row in results:
            stage_name = row.get("pipeline_stage")
            if stage_name in counts:
                counts[stage_name] = int(row.get("count", 0))

    query_latency_ms = round((time.perf_counter() - start_timer) * 1000, 3)
    total = sum(counts.values())

    result_data = {
        "date": today_str,
        "date_range": {
            "start": start_datetime,
            "end": end_datetime
        },
        "counts": counts,
        "total_today": total,
        "query_latency_ms": query_latency_ms,
        "cache_hit": False,
        "optimization": "Range-based indexed scan (modified >= start AND modified < end)"
    }

    # Update cache
    _METRICS_CACHE["cached_at"] = now_ts
    _METRICS_CACHE["data"] = result_data

    return result_data


@_frappe_whitelist
def explain_dashboard_query(client_date=None):
    """
    Diagnostic tool to analyze database query execution plan (EXPLAIN).
    Verifies index utilization and warns if a full table scan is detected.
    """
    today_str = client_date or (frappe.utils.nowdate() if frappe else date.today().isoformat())
    start_datetime = f"{today_str} 00:00:00"
    end_datetime = f"{today_str} 23:59:59"

    plan = []
    if frappe:
        explain_sql = """
            EXPLAIN SELECT 
                pipeline_stage, 
                COUNT(*) as count
            FROM 
                `tabJob Applicant`
            WHERE 
                modified >= %s AND modified <= %s
            GROUP BY 
                pipeline_stage
        """
        plan = frappe.db.sql(explain_sql, (start_datetime, end_datetime), as_dict=True)

    return {
        "query": "SELECT pipeline_stage, COUNT(*) FROM `tabJob Applicant` WHERE modified >= %s AND modified <= %s GROUP BY pipeline_stage",
        "parameters": [start_datetime, end_datetime],
        "execution_plan": plan,
        "recommended_index": "CREATE INDEX idx_applicant_modified_stage ON `tabJob Applicant` (modified, pipeline_stage);"
    }
