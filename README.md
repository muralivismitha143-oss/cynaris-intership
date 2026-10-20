# Cynaris Internship

This repository contains my Cynaris internship projects, assignments, and practical deliverables.

---

## Week 2 Day 3 — AI Resume Analysis: Groq + OpenRouter Integration

A production-ready full-stack AI resume screening pipeline integrating **Groq** (`llama-3.3-70b-versatile`) as the primary ultra-fast LLM and **OpenRouter** (`meta-llama/llama-3.3-70b-instruct`) as the automatic secondary fallback, complemented by native JavaScript DOM event delegation and bubbling.

### Core Features

1. **Job Applicant DocType Schema:**
   - Field `ai_resume_summary` (`Long Text`) for storing structured AI assessments.
   - Additional tracking fields: `ai_summary_provider` and `ai_analyzed_at`.
   - File: `cynaris_recruitment/doctype/job_applicant/job_applicant.json`.

2. **Python Controller & Structured Prompting:**
   - Method `generate_resume_summary(applicant_id)` with Groq primary and OpenRouter fallback.
   - Structured prompt enforcing 4 clean sections: Executive Summary, Technical Competencies, Interview Probe Points, and Hiring Recommendation.
   - File: `cynaris_recruitment/doctype/job_applicant/job_applicant.py`.
   - Unit tests: `tests/test_ai_resume_analysis.py` (Run via `py tests/test_ai_resume_analysis.py`).

3. **Frappe Form Script Button:**
   - Added "Generate AI Summary" custom button on Job Applicant form using `frappe.call`.
   - File: `cynaris_recruitment/doctype/job_applicant/job_applicant.js`.

4. **REST API & Failover Simulation:**
   - `POST /api/applicants/:applicant_id/ai-summary` — Generates summary with Groq primary and OpenRouter fallback.
   - Supports `?simulate_groq_failure=true` to demonstrate OpenRouter fallback and `?simulate_both_failure=true` to test 502 error handling.
   - `GET /api/applicants/:applicant_id` — Returns candidate profile with persisted AI resume summary.
   - File: `backend/server.js`.

5. **Frontend User Interaction & DOM Event Mastery:**
   - **`addEventListener`:** Attached to delegated board containers, forms, inputs, and modal dismiss buttons.
   - **Event Object (`e`):** Extracting `e.target`, `e.currentTarget`, `e.type`, calling `e.preventDefault()` on forms and `e.stopPropagation()` on buttons.
   - **Event Bubbling:** Visualized in the live Event Delegation Monitor as clicks bubble from card buttons up to the parent container.
   - **Event Delegation:** Single event listener on `#delegatedBoardContainer` handles all card actions via `e.target.closest('[data-action]')`.
   - **Form Events:** Handles `submit` (candidate creation), `input` (real-time candidate search), and `change` (outage simulation checkboxes).
   - **AI Resume Modal:** Clean modal view showing model badges, provider source, timestamp, and one-click clipboard copy.

---

## Week 2 Day 2 — Interview Status: Vue.js Pipeline Component & Controller

- **Kanban Board & Stage Management:** `Screening`, `Technical Round 1`, `Technical Round 2`, `HR Round`, `Offered`, `Rejected`.
- **Python Controller:** `update_pipeline_stage(applicant_id, stage)` in `cynaris_recruitment/doctype/interview/interview.py`.
- **Kanban Status Badges:** Jinja template override and CSS in `cynaris_recruitment/doctype/job_applicant/`.
- **Dashboard Query:** `GET /api/dashboard/stages-today` counting applicants updated today per stage.

---

### How to Run Locally

#### 1. Start the API & Frontend Server
```powershell
cd backend
npm start
```
Open `http://localhost:3000` in your web browser.

#### 2. Run Python Unit Tests
```powershell
# Week 2 Day 3: AI Resume Analysis Tests
py tests/test_ai_resume_analysis.py

# Week 2 Day 2: Interview Controller Tests
py tests/test_interview_controller.py
```

---

### API Endpoints

- `GET /api/health` — Check server health and registered AI providers
- `GET /api/stages` — List allowed pipeline stages
- `GET /api/applicants` — Retrieve all candidates
- `GET /api/applicants/:id` — Retrieve candidate profile with AI resume summary
- `POST /api/applicants` — Add a new candidate
- `PATCH /api/applicants/:id/stage` — Update candidate stage
- `POST /api/applicants/:id/ai-summary` — Trigger AI resume analysis (Groq primary + OpenRouter fallback)
- `GET /api/dashboard/stages-today` — Aggregated counts by stage for today

---

### Test AI Endpoints via `curl.exe`

```powershell
# 1. Health check
curl.exe -s http://localhost:3000/api/health

# 2. Generate AI resume summary (Groq primary)
curl.exe -s -X POST http://localhost:3000/api/applicants/1/ai-summary

# 3. Test OpenRouter fallback by simulating Groq outage
curl.exe -s -X POST "http://localhost:3000/api/applicants/2/ai-summary?simulate_groq_failure=true"

# 4. Test error handling when both providers fail (HTTP 502)
curl.exe -s -X POST "http://localhost:3000/api/applicants/3/ai-summary?simulate_both_failure=true"

# 5. Verify persisted AI resume summary
curl.exe -s http://localhost:3000/api/applicants/1
```

---

### Documentation & Deliverables

- [CIA Interaction Log](docs/CIA_LOG.md) — Mentor Mode, AI Engineer Mode, and Code Mode interaction logs.
- [Week 2 Day 3 Submission & Viva Guide](docs/WEEK2_DAY3_SUBMISSION.md) — Complete walkthrough, test evidence, architecture, checklist, and viva answers.
- [Week 2 Day 2 Submission & Viva Guide](docs/WEEK2_DAY2_SUBMISSION.md) — Interview pipeline implementation guide.
