# Week 8 Day 2: Internship Submission Report

**Topic:** Module 6 & 7: Placement Readiness Score + Interview Readiness Score  
**Student Name:** Murali  
**Branch:** `feat/cynaris-w8d2-murali`  
**Date:** November 27, 2026  
**Repository:** Cynaris Recruitment Platform  
**Overall Test Status:** 34/34 Test Suites Passing (100% Pass Rate)  
**Day Test Suite:** `tests/test_readiness_scores.js` (16/16 Tests Passing)

---

## 1. Executive Summary & Deliverables

Implemented **Module 6 (Placement Readiness Score)** and **Module 7 (Interview Readiness Score)** end-to-end across MySQL schema, Repository layer, Multi-Tier AI Engine (Groq + OpenRouter + Local Deterministic Engine + ChromaDB vector benchmarks), Express REST API, Laravel parity controller/routes, and interactive Student & Admin UI dashboards.

### Key Deliverables Completed:
1. **Database Schema & Atomic Repository:**
   - Added `intern_readiness_scores` table, indexes, and 5 seeded cohort interns in [`backend/database/schema.sql`](../backend/database/schema.sql) and [`backend/database/mysqlClient.js`](../backend/database/mysqlClient.js).
   - Built [`backend/database/readinessRepository.js`](../backend/database/readinessRepository.js) with parameterized prepared statements and atomic transaction + audit log upserts.
2. **Scoring Engine & AI Improvement Generator:**
   - Built [`backend/modules/ai/ReadinessScoringEngine.js`](../backend/modules/ai/ReadinessScoringEngine.js) and integrated into [`backend/modules/ai/CareerIntelligenceService.js`](../backend/modules/ai/CareerIntelligenceService.js):
     - **Placement Readiness (40/30/10/20%):** Project Completion % (40%), Assessment Scores (30%), CIA Usage Hours normalized to 20h benchmark (10%), Documentation Quality (20%).
     - **Interview Readiness (40/30/20/10%):** Viva Scores (40%), Code Review Scores (30%), Communication Clarity in Demos (20%), Git Workflow Quality (10%).
     - Both scores bounded to `0–100` with deterministic letter grade (`A/B/C/D`), component improvement recommendations, and **Top 3 AI-generated improvement actions** (Groq primary $\to$ OpenRouter fallback $\to$ Local Deterministic Engine).
3. **Admin View & CSV Export + Student Personal Score Card:**
   - Live Express Dashboard at [`backend/public/readiness.html`](../backend/public/readiness.html) (`http://localhost:3000/readiness.html`) and Laravel Blade parity in [`resources/views/candidate/cia.blade.php`](../resources/views/candidate/cia.blade.php).
   - **Admin View:** Cohort table of all interns with Placement & Interview scores, letter grades, sub-metric breakdown, and one-click RFC 4180 **Export as CSV** (`/api/cia/readiness/export-csv`) with formula-injection protection.
   - **Student View:** Personal score card with weighted breakdown bars, letter grade badges, live score recalculation persisted to DB, and Top 3 AI-generated improvement actions.

---

## 2. Viva Questions & Answers

### Question 1: "Walk me through your implementation — what did you build and why did you structure it that way?"
**Answer:**
I structured Module 6 & 7 around a clean 4-layer separation of concerns:
1. **Pure Scoring & Formatting Layer (`ReadinessScoringEngine.js`):** Keeps the 40/30/10/20 and 40/30/20/10 weighted math, 0–100 clamping, A/B/C/D grading, prompt construction, and RFC 4180 CSV escaping pure and side-effect free so unit tests can verify edge cases deterministically without network or database overhead.
2. **Persistence Layer (`ReadinessRepository.js` + `schema.sql`):** Isolates all SQL behind prepared statements (`?`) and wraps score upserts with an `audit_logs` entry inside an atomic transaction (`beginTransaction` / `commit` / `rollback`), ensuring scores and audit history never drift out of sync.
3. **AI Orchestration Layer (`CareerIntelligenceService.js`):** Separates deterministic score calculation from LLM generation. The backend calculates exact scores first, retrieves vector-matched role benchmarks, and asks Groq (`llama-3.3-70b-versatile`) with OpenRouter failover to synthesize strictly **3 prioritized improvement actions** in JSON around verified numbers.
4. **Dual-Stack Presentation & API Layer (`ciaRouter.js`, `CiaController.php`, `readiness.html`, `cia.blade.php`):** Exposes consistent Student scorecard, Admin cohort table, and CSV download endpoints across both Express and Laravel.

### Question 2: "What was the most challenging part and how did you solve it?"
**Answer:**
The most challenging part was ensuring **consistent, safe data handling across three boundaries**:
1. **Unbounded or malformed metric inputs** (e.g., CIA hours > 20 or non-numeric strings): Solved via `parseClampedMetric()` which throws explicit validation errors (`400 Bad Request`) on non-numeric inputs while normalizing CIA hours against a 20-hour benchmark and clamping every score strictly to `[0, 100]`.
2. **Spreadsheet CSV formula injection & special characters** in Admin exports: Solved in `escapeCsvCell()` by neutralizing leading `=`, `+`, `-`, `@`, `\t`, `\r` characters and applying RFC 4180 double-quote escaping.
3. **Offline / LLM outage resilience** while guaranteeing strictly 3 improvement actions: Solved via a 3-tier cascade (Groq $\to$ OpenRouter $\to$ `buildDeterministicTop3Actions` ranked by weighted impact gap `(100 - raw_score) * weight`), plus graceful `502` error reporting when dual cloud outage is explicitly simulated.

### Question 3: "If you had one more day, what would you improve?"
**Answer:**
If I had one more day, I would:
1. **Add historical readiness trend snapshots** (`intern_readiness_history` table) so students and mentors can plot week-over-week score progression on a Chart.js line graph.
2. **Automate metric ingestion** directly from Moodle (`mdl_grade_grades`, `mdl_course_completions`), Git commit hooks (conventional commit linter score), and `docs/CIA_LOG.md` session telemetry rather than relying solely on manual or API-submitted scores.
3. **Add JWT RBAC protection** on `/api/cia/readiness/admin` and `/api/cia/readiness/export-csv` using the existing `requireRole('admin')` middleware while scoping `/readiness/student/:internId` to the authenticated intern's token.

---

## 3. Self-Review Checklist

- [x] All tasks completed as specified — Placement (40/30/10/20), Interview (40/30/20/10), DB persistence, 0–100 + A/B/C/D grades, Admin table + CSV export, Student card + Top 3 AI actions.
- [x] Code follows existing project conventions and patterns (`ReadinessScoringEngine.js`, `ReadinessRepository.js`, `ciaRouter.js`, `CiaController.php`, `cia.blade.php`).
- [x] At least 2 meaningful commits per task with conventional commit format `type(scope): description`.
- [x] No hardcoded secrets, API keys, or passwords in code.
- [x] CIA used minimum twice (Full Stack Mentor Mode + Code Mode) — logged in [`docs/CIA_LOG.md`](CIA_LOG.md).
- [x] All 16 tests in `tests/test_readiness_scores.js` and all 34 suites in `npm test` passing.
