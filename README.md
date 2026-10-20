# Cynaris Internship

This repository contains my Cynaris internship projects, assignments, and practical deliverables.

---

## Week 2 Day 4 — Debug & Performance Sprint: Log Analysis & Query Optimisation

A complete full-stack debugging and performance optimization sprint covering database query tuning, high-precision request logging middleware, timezone-aware metrics, and modern JavaScript asynchronous patterns (**Fetch API**, **Promises**, **`async/await`**, and **`Promise.allSettled`**).

### Core Features & Bug Fixes

1. **Database Query Optimization (Sargability Fix):**
   - **Root Cause Identified:** Using `WHERE DATE(modified) = %s` in MySQL/MariaDB destroys index traversal and forces an $O(N)$ full table scan.
   - **Optimized Fix:** Replaced with an indexed range predicate: `modified >= %s AND modified < %s`.
   - **Composite Index:** Recommended `idx_applicant_modified_stage` on `(modified, pipeline_stage)` for covering index queries.
   - **Diagnostic Tool:** Added `explain_dashboard_query()` to analyze SQL execution plans via `EXPLAIN`.
   - File: `cynaris_recruitment/dashboard.py`.

2. **Timezone Offset & Calendar Date Resolution:**
   - **Bug:** Late afternoon / evening updates in IST (UTC+5:30) crossed UTC boundaries and rolled into the wrong day.
   - **Fix:** Added timezone-aware date parsing supporting `X-Client-Timezone` header and query parameter `client_date`.
   - File: `backend/server.js`.

3. **In-Memory TTL Caching Layer:**
   - Implemented 15-second TTL cache for dashboard queries, reducing repeated query latency from ~25ms to **`<2ms`** (`cache_hit: true`).

4. **Structured Performance Logging Middleware:**
   - Intercepts `res.end` to inject `X-Response-Time` and `X-Request-ID` headers without triggering `ERR_HTTP_HEADERS_SENT`.
   - Tracks average response times, slow requests (>50ms), and exposes telemetry via `GET /api/performance/metrics`.
   - File: `backend/server.js`.

5. **Fetch API, Promise Handling & Async/Await Profiler:**
   - **Fault Tolerance:** Replaced brittle `Promise.all` with **`Promise.allSettled`** in `loadApplicants()`.
   - **Race Condition Prevention:** Integrated **`AbortController`** with `signal` to cleanly cancel in-flight HTTP requests.
   - **Real-Time UI Profiler:** Added live Fetch API telemetry table displaying request methods, Promise lifecycle (`Pending` -> `Fulfilled`), latency (ms), and JSON response schemas.
   - Files: `backend/public/app.js`, `backend/public/index.html`, and `backend/public/styles.css`.

---

## Week 2 Day 3 — AI Resume Analysis: Groq + OpenRouter Integration

- **Dual-Provider Architecture:** Primary Groq (`llama-3.3-70b-versatile`) with automatic OpenRouter fallback (`meta-llama/llama-3.3-70b-instruct`).
- **Structured Prompt Design:** Executive Summary, Technical Competencies, Interview Probe Points, and Recommendation.
- **Form Button:** `frappe.call` button on Job Applicant form.
- **Event Delegation:** Container click listener handling card actions via event bubbling and `e.target.closest()`.

---

## Week 2 Day 2 — Interview Status: Vue.js Pipeline Component & Controller

- **Kanban Board & Stage Management:** `Screening`, `Technical Round 1`, `Technical Round 2`, `HR Round`, `Offered`, `Rejected`.
- **Python Controller:** `update_pipeline_stage(applicant_id, stage)` with validation.
- **Kanban Badges:** CSS + Jinja template override.

---

### How to Run Locally

#### 1. Start the API & Frontend Server
```powershell
cd backend
npm start
```
Open `http://localhost:3000` in your browser.

#### 2. Run All Python Unit Tests
```powershell
# Week 2 Day 4: Performance & Query Optimization Tests
py tests/test_performance_and_debugging.py

# Week 2 Day 3: AI Resume Analysis Tests
py tests/test_ai_resume_analysis.py

# Week 2 Day 2: Interview Controller Tests
py tests/test_interview_controller.py
```

---

### API Endpoints

- `GET /api/health` — Server health and performance telemetry summary
- `GET /api/performance/metrics` — Real-time performance metrics (avg latency, slow requests, cache hit ratio)
- `GET /api/performance/logs` — Recent structured request logs
- `GET /api/performance/explain-query` — Query execution plan and index diagnostics
- `GET /api/stages` — Allowed pipeline stages
- `GET /api/applicants` — Retrieve all candidates
- `GET /api/applicants/:id` — Retrieve candidate profile with AI resume summary
- `POST /api/applicants` — Add a new candidate
- `PATCH /api/applicants/:id/stage` — Update candidate stage
- `POST /api/applicants/:id/ai-summary` — Trigger AI resume analysis (Groq primary + OpenRouter fallback)
- `GET /api/dashboard/stages-today` — Timezone-normalized daily metrics with 15s TTL cache

---

### Test Sprint Endpoints via `curl.exe`

```powershell
# 1. Health check with performance headers
curl.exe -i http://localhost:3000/api/health

# 2. Performance metrics telemetry
curl.exe -s http://localhost:3000/api/performance/metrics

# 3. Query optimization diagnostic
curl.exe -s http://localhost:3000/api/performance/explain-query

# 4. Cache Miss vs Cache Hit verification
curl.exe -s "http://localhost:3000/api/dashboard/stages-today?force_refresh=true"
curl.exe -s http://localhost:3000/api/dashboard/stages-today

# 5. AI resume summary with Groq primary
curl.exe -s -X POST http://localhost:3000/api/applicants/1/ai-summary
```

---

### Documentation & Deliverables

- [CIA Interaction Log](docs/CIA_LOG.md) — Mentor Mode, AI Engineer Mode, QA Engineer Mode, and Code Mode interaction logs.
- [Week 2 Day 4 Submission & Viva Guide](docs/WEEK2_DAY4_SUBMISSION.md) — Complete sprint walkthrough, benchmarks, checklist, and viva answers.
- [Week 2 Day 3 Submission & Viva Guide](docs/WEEK2_DAY3_SUBMISSION.md) — Groq + OpenRouter integration guide.
- [Week 2 Day 2 Submission & Viva Guide](docs/WEEK2_DAY2_SUBMISSION.md) — Interview pipeline implementation guide.
