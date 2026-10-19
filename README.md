# Cynaris Internship

This repository contains my Cynaris internship projects, assignments, and practical deliverables.

---

## Week 2 Day 2 — Interview Status: Vue.js Frontend Pipeline Component & Controller

An end-to-end full-stack recruitment tracking system featuring a Python / Frappe Interview controller, Jinja list view override with Kanban status badges, daily metrics dashboard query, and an interactive Vue 3 Kanban Pipeline component with native JavaScript DOM manipulation.

### Core Features

1. **Interview DocType & Schema:**
   - Field `pipeline_stage` Select field (`Screening`, `Technical Round 1`, `Technical Round 2`, `HR Round`, `Offered`, `Rejected`).
   - Located in `cynaris_recruitment/doctype/interview/interview.json`.

2. **Python Controller & Validation:**
   - `update_pipeline_stage(applicant_id, stage)` controller method with validation for applicant existence, stage validity, and audit trail logging.
   - Located in `cynaris_recruitment/doctype/interview/interview.py`.
   - Comprehensive unit tests: `tests/test_interview_controller.py` (Run with `py tests/test_interview_controller.py`).

3. **Kanban Status Badges (Jinja + CSS Override):**
   - Jinja list view template override: `cynaris_recruitment/doctype/job_applicant/job_applicant_list.html`.
   - CSS styling with distinct color coding and dot indicators: `cynaris_recruitment/doctype/job_applicant/job_applicant_list.css`.

4. **Dashboard Aggregation Query:**
   - Aggregates applicants per pipeline stage updated today: `cynaris_recruitment/dashboard.py` and `GET /api/dashboard/stages-today`.

5. **Vue 3 Frontend Pipeline Component & Native DOM Manipulation:**
   - Interactive Kanban board served from `backend/public/`.
   - Demonstrates DOM manipulation methods:
     - `querySelector`: targeting containers and columns for pulse animations.
     - `getElementById`: targeting activity feed and stats counters.
     - `innerHTML`: generating sanitized rich badge and notification markup.
     - `classList`: handling animation states (`toast-leaving`, `column-highlight`, `active`).
     - `createElement`: dynamically constructing toast notifications and live audit entries.

---

### How to Run Locally

#### 1. Start the API & Frontend Server
```powershell
cd backend
npm start
```
Then navigate to `http://localhost:3000` in your browser.

#### 2. Run Python Unit Tests
```powershell
py tests/test_interview_controller.py
```

---

### API Endpoints

- `GET /api/health` — Check server health
- `GET /api/stages` — List allowed pipeline stages
- `GET /api/applicants` — Retrieve all candidates and their current stage
- `POST /api/applicants` — Add a new candidate
- `PATCH /api/applicants/:applicant_id/stage` — Update candidate stage
- `GET /api/dashboard/stages-today` — Aggregated counts by stage for today

---

### Test Endpoints via `curl.exe`

```powershell
# Health check
curl.exe -s http://localhost:3000/api/health

# List stages
curl.exe -s http://localhost:3000/api/stages

# List applicants
curl.exe -s http://localhost:3000/api/applicants

# Add a candidate
curl.exe -s -X POST http://localhost:3000/api/applicants -H "Content-Type: application/json" --% -d "{\"name\":\"Karan Mehta\",\"stage\":\"Offered\"}"

# Update applicant stage
curl.exe -s -X PATCH http://localhost:3000/api/applicants/1/stage -H "Content-Type: application/json" --% -d "{\"stage\":\"Technical Round 1\"}"

# Today's dashboard counts
curl.exe -s http://localhost:3000/api/dashboard/stages-today
```

---

### Additional Documentation

- [CIA Interaction Log](docs/CIA_LOG.md) — Mentor Mode and Code Mode prompts and reviews.
- [Week 2 Day 2 Submission & Viva Guide](docs/WEEK2_DAY2_SUBMISSION.md) — Complete walkthrough, test evidence, checklist, and viva answers.
