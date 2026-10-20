# Cynaris Recruitment Platform — Full Stack & AI Pipeline

[![Live Deployment: Railway](https://img.shields.io/badge/Railway-Live%20Production-0B0D0E?style=for-the-badge&logo=railway)](https://cynaris-recruitment-production.up.railway.app)
[![Live Staging: Render](https://img.shields.io/badge/Render-Staging%20Mirror-46E3B7?style=for-the-badge&logo=render)](https://cynaris-recruitment.onrender.com)
[![Build Status](https://img.shields.io/badge/Tests-23%2F23%20Passing-success?style=for-the-badge)](tests/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](package.json)

---

## 🌐 Live Production Deployment

- **Primary Production URL (Railway):** [https://cynaris-recruitment-production.up.railway.app](https://cynaris-recruitment-production.up.railway.app)
- **Backup / Staging URL (Render):** [https://cynaris-recruitment.onrender.com](https://cynaris-recruitment.onrender.com)
- **Production Health Check:** `https://cynaris-recruitment-production.up.railway.app/api/health`

---

## 🚀 Week 2 Capstone Overview: Frappe HR — Features & AI

An enterprise recruitment tracking platform combining modern Vue 3 reactive components, Python/Frappe DocType controllers, dual-engine AI resume screening (**Groq** + **OpenRouter**), performance profiling middleware, and zero-downtime cloud deployment on **Railway** and **Render**.

---

### Week 2 Day 5 — Deploy to Railway + README + Demo Video + Final PR
- **Cloud Deployment:** Container-ready deployment configuration on Railway & Render (`railway.json`, `render.yaml`, `Procfile`, `.env.example`).
- **Modern JavaScript (ES6+):** Dedicated module (`backend/public/modules/pipelineUtils.js`) demonstrating **Destructuring**, **Spread/Rest operators (`...`)**, **Optional Chaining (`?.`)**, **Nullish Coalescing (`??`)**, and **ES Modules**.
- **Deployment Documentation:** Comprehensive guide in [`DEPLOYMENT.md`](DEPLOYMENT.md).
- **PR Template:** Standardized end-of-week pull request template in [`.github/pull_request_template.md`](.github/pull_request_template.md).

### Week 2 Day 4 — Debug & Performance Sprint: Log Analysis & Query Optimisation
- **Sargability Optimization:** Replaced `DATE(modified) = %s` full table scan with indexed range scan `modified >= start AND modified < end`, cutting latency by 98%.
- **In-Memory TTL Caching:** 15-second TTL cache delivering `<2ms` response times for repeated queries.
- **Timezone Normalization:** Fixed IST (UTC+5:30) date rollover mismatch with `X-Client-Timezone`.
- **Performance Middleware:** Structured logging middleware injecting `X-Response-Time` and `X-Request-ID`.
- **Async Robustness:** Integrated `Promise.allSettled` and `AbortController` in `backend/public/app.js`.

### Week 2 Day 3 — AI Resume Analysis: Groq + OpenRouter Integration
- **Dual LLM Architecture:** Primary **Groq** (`llama-3.3-70b-versatile`) with automatic failover to **OpenRouter** (`meta-llama/llama-3.3-70b-instruct`).
- **Structured Prompting:** Generates Executive Summary, Technical Competencies, Interview Probe Points, and Recommendation.
- **DocType Schema:** Added `ai_resume_summary` Long Text field to `Job Applicant` doctype.
- **Form Script:** Custom button with `frappe.call` in `cynaris_recruitment/doctype/job_applicant/job_applicant.js`.
- **Event Delegation:** Container event listener handling candidate actions via bubbling and `e.target.closest()`.

### Week 2 Day 2 — Interview Status: Vue.js Pipeline Component & Controller
- **Kanban Board:** Columns for `Screening`, `Technical Round 1`, `Technical Round 2`, `HR Round`, `Offered`, `Rejected`.
- **Python Controller:** `update_pipeline_stage(applicant_id, stage)` with validation.
- **Status Badges:** CSS + Jinja template override in `cynaris_recruitment/doctype/job_applicant/`.

---

### How to Run Locally

#### 1. Start the API & Frontend Server
```powershell
cd backend
npm start
```
Open `http://localhost:3000` in your browser.

#### 2. Run All Automated Test Suites (23 Tests)
```powershell
# 1. Run Modern JavaScript & Deployment Tests (5 tests)
node tests/test_modern_javascript.js

# 2. Run Query Optimization & Performance Tests (5 tests)
py tests/test_performance_and_debugging.py

# 3. Run AI Resume Analysis & Fallback Tests (6 tests)
py tests/test_ai_resume_analysis.py

# 4. Run Interview Controller & DocType Tests (7 tests)
py tests/test_interview_controller.py
```

---

### API Endpoints

- `GET /api/health` — Server health, active AI providers, and latency telemetry
- `GET /api/performance/metrics` — Aggregate metrics (avg latency, slow requests, cache hit ratio, memory usage)
- `GET /api/performance/logs` — Real-time structured request logs
- `GET /api/performance/explain-query` — Database EXPLAIN plan diagnostics and index recommendations
- `GET /api/stages` — Allowed pipeline stages
- `GET /api/applicants` — Retrieve all candidates
- `GET /api/applicants/:id` — Retrieve candidate profile with AI resume summary
- `POST /api/applicants` — Add a new candidate
- `PATCH /api/applicants/:id/stage` — Update candidate stage
- `POST /api/applicants/:id/ai-summary` — Trigger AI resume analysis (Groq primary + OpenRouter fallback)
- `GET /api/dashboard/stages-today` — Timezone-normalized daily metrics with 15s TTL cache

---

### Test Endpoints via `curl.exe`

```powershell
# 1. Health check with latency headers
curl.exe -i http://localhost:3000/api/health

# 2. Performance metrics telemetry
curl.exe -s http://localhost:3000/api/performance/metrics

# 3. AI resume summary (Groq primary)
curl.exe -s -X POST http://localhost:3000/api/applicants/1/ai-summary

# 4. OpenRouter fallback simulation
curl.exe -s -X POST "http://localhost:3000/api/applicants/2/ai-summary?simulate_groq_failure=true"

# 5. Cache Miss vs Cache Hit verification
curl.exe -s "http://localhost:3000/api/dashboard/stages-today?force_refresh=true"
curl.exe -s http://localhost:3000/api/dashboard/stages-today
```

---

### Documentation & Deliverables

- [DEPLOYMENT.md](DEPLOYMENT.md) — Production deployment guide for Railway & Render.
- [Pull Request Template](.github/pull_request_template.md) — Standardized PR template for end-of-week submission.
- [Week 2 Final PR Document](docs/WEEK2_FINAL_PR.md) — Ready-to-copy PR submission summary.
- [CIA Interaction Log](docs/CIA_LOG.md) — Complete Week 2 CIA interaction logs across all lesson days.
- [Week 2 Day 5 Submission Guide](docs/WEEK2_DAY5_SUBMISSION.md) — Deployment walkthrough, demo video script, and viva answers.
- [Week 2 Day 4 Submission Guide](docs/WEEK2_DAY4_SUBMISSION.md) — Debug & performance sprint guide.
- [Week 2 Day 3 Submission Guide](docs/WEEK2_DAY3_SUBMISSION.md) — AI resume analysis guide.
- [Week 2 Day 2 Submission Guide](docs/WEEK2_DAY2_SUBMISSION.md) — Interview pipeline guide.
