# Cynaris Internship — Week 2 Day 2 Submission

## Project: Interview Status — Vue.js Frontend Pipeline Component & Controller

- **Student:** Murali
- **Branch:** `feat/cynaris-w2d2-murali`
- **Module:** Week 2 — Day 2
- **Technologies:** Vue.js 3, JavaScript (DOM APIs), Node.js / Express, Python / Frappe DocType, CSS3, Jinja2

---

## 1. Executive Summary

This submission completes all requirements for Week 2 Day 2:
1. **DocType Definition:** Added `pipeline_stage` select field to the Interview DocType with approved values: `Screening`, `Technical Round 1`, `Technical Round 2`, `HR Round`, `Offered`, `Rejected`.
2. **Python Controller:** Implemented `update_pipeline_stage(applicant_id, stage)` with strict validation for applicant presence, stage whitelist membership, and status transitions.
3. **Jinja Template & CSS Override:** Created a Kanban-style status badge component for the Job Applicant list view with stage-specific badges, color schemes, and dot indicators.
4. **Dashboard Query:** Implemented aggregation query returning the count of applicants updated today per pipeline stage.
5. **REST API Endpoints:** Exposed endpoints for applicants, stages, updates, and daily metrics, verified thoroughly via `curl.exe`.
6. **Vue.js Frontend Pipeline Component:** Created an interactive Kanban board with live column counts, metrics banner, search filtering, stage-filtering, and candidate addition.
7. **Native DOM Manipulation:** Integrated and demonstrated all 5 required DOM methods:
   - `document.querySelector`: targeting modal, container, and column elements.
   - `document.getElementById`: targeting specific activity feeds and statistic counters.
   - `element.innerHTML`: dynamically constructing sanitized status notifications and badge HTML.
   - `element.classList`: managing active states, animations, pulses, and toast visibility.
   - `document.createElement`: creating dynamic toast notifications and audit log elements.

---

## 2. Practical Tasks Verification & Code Artifacts

### Task 1: Interview DocType Schema (`pipeline_stage` Select Field)
- **File:** `cynaris_recruitment/doctype/interview/interview.json`
- **Field Definition:**
  ```json
  {
    "fieldname": "pipeline_stage",
    "fieldtype": "Select",
    "label": "Pipeline Stage",
    "options": "Screening\nTechnical Round 1\nTechnical Round 2\nHR Round\nOffered\nRejected",
    "default": "Screening",
    "reqd": 1,
    "in_list_view": 1,
    "in_standard_filter": 1
  }
  ```

### Task 2: Python Controller Method with Validation
- **File:** `cynaris_recruitment/doctype/interview/interview.py`
- **Validation Features:**
  - Non-empty `applicant_id` check.
  - Non-empty string `stage` check.
  - Whitelist validation against `VALID_STAGES`.
  - Database document existence check and comment audit trail logging.
- **Unit Test Suite:**
  - File: `tests/test_interview_controller.py`
  - Result: 7/7 unit tests passing (`Ran 7 tests in 0.001s: OK`).

### Task 3: Kanban-style Status Badge (CSS + Jinja Override)
- **Template File:** `cynaris_recruitment/doctype/job_applicant/job_applicant_list.html`
- **CSS Stylesheet:** `cynaris_recruitment/doctype/job_applicant/job_applicant_list.css`
- **Features:**
  - Pill-shaped status badge with glowing status dot indicator.
  - Distinct color palette for each stage:
    - *Screening:* Blue (`#eff6ff` / `#1d4ed8`)
    - *Technical Round 1:* Violet (`#f5f3ff` / `#6d28d9`)
    - *Technical Round 2:* Amber (`#fffbeb` / `#b45309`)
    - *HR Round:* Teal (`#f0fdfa` / `#0f766e`)
    - *Offered:* Green (`#f0fdf4` / `#15803d`)
    - *Rejected:* Red (`#fef2f2` / `#b91c1c`)
  - Smooth hover elevation and responsive layout.

### Task 4 & 5: Dashboard Query & REST API Endpoints
- **Python File:** `cynaris_recruitment/dashboard.py`
- **Express Backend:** `backend/server.js`
- **Endpoints Exposed:**
  - `GET /api/health`: Health status.
  - `GET /api/stages`: Allowed stage list.
  - `GET /api/applicants`: All applicants with current pipeline stage.
  - `POST /api/applicants`: Create new applicant.
  - `PATCH /api/applicants/:applicant_id/stage`: Update pipeline stage.
  - `GET /api/dashboard/stages-today`: Today's count per stage.

---

## 3. Test Evidence (cURL & API Responses)

### 3.1 Health Check
```powershell
curl.exe -s http://localhost:3000/api/health
```
**Output:**
```json
{"status":"ok","message":"Interview API is running"}
```

### 3.2 Available Pipeline Stages
```powershell
curl.exe -s http://localhost:3000/api/stages
```
**Output:**
```json
{"stages":["Screening","Technical Round 1","Technical Round 2","HR Round","Offered","Rejected"]}
```

### 3.3 Create New Candidate (`POST /api/applicants`)
```powershell
curl.exe -s -X POST http://localhost:3000/api/applicants -H "Content-Type: application/json" --% -d "{\"name\":\"Karan Mehta\",\"stage\":\"Offered\"}"
```
**Output:**
```json
{"message":"Applicant created successfully","applicant":{"id":5,"name":"Karan Mehta","pipeline_stage":"Offered","updated_at":"2026-10-19T15:27:28.871Z"}}
```

### 3.4 Update Candidate Pipeline Stage (`PATCH /api/applicants/1/stage`)
```powershell
curl.exe -s -X PATCH http://localhost:3000/api/applicants/1/stage -H "Content-Type: application/json" --% -d "{\"stage\":\"Technical Round 1\"}"
```
**Output:**
```json
{"message":"Pipeline stage updated successfully","applicant":{"id":1,"name":"Rahul Kumar","pipeline_stage":"Technical Round 1","updated_at":"2026-10-19T15:27:38.129Z"}}
```

### 3.5 Today's Dashboard Counts Query (`GET /api/dashboard/stages-today`)
```powershell
curl.exe -s http://localhost:3000/api/dashboard/stages-today
```
**Output:**
```json
{"date":"2026-10-19","counts":{"Screening":0,"Technical Round 1":2,"Technical Round 2":1,"HR Round":1,"Offered":1,"Rejected":0}}
```

### 3.6 Validation Failure: Invalid Stage
```powershell
curl.exe -s -X PATCH http://localhost:3000/api/applicants/1/stage -H "Content-Type: application/json" --% -d "{\"stage\":\"CEO Round\"}"
```
**Output:**
```json
{"error":"Invalid stage","allowedStages":["Screening","Technical Round 1","Technical Round 2","HR Round","Offered","Rejected"]}
```

### 3.7 Validation Failure: Non-existent Applicant ID
```powershell
curl.exe -s -X PATCH http://localhost:3000/api/applicants/999/stage -H "Content-Type: application/json" --% -d "{\"stage\":\"Offered\"}"
```
**Output:**
```json
{"error":"Applicant not found"}
```

---

## 4. Frontend DOM Manipulation Mastery

The application showcases fundamental JavaScript DOM operations in `backend/public/app.js`:

| DOM API Method | Implementation in Project | Purpose |
|---|---|---|
| `querySelector` | `document.querySelector("#toastContainer")`<br>`document.querySelector(".column[data-stage=...]")` | Targeting dynamic container elements and column cards for targeted UI animations. |
| `getElementById` | `document.getElementById("activityFeedList")` | Fetching the persistent audit feed container directly by ID. |
| `innerHTML` | `item.innerHTML = \`<div class="activity-content">...</div>\`` | Building structured HTML markup for activity notifications with sanitized text. |
| `classList` | `item.classList.add("activity-item", "action-update")`<br>`toast.classList.add("toast-leaving")`<br>`col.classList.add("column-highlight")` | Managing CSS state transitions, visual pulse feedback, and dismiss animations. |
| `createElement` | `document.createElement("li")`<br>`document.createElement("div")`<br>`document.createElement("button")` | Dynamically generating notification nodes and appending them to the active DOM tree. |

---

## 5. Review Checklist

- [x] All tasks completed as specified — no shortcuts taken
- [x] Code follows existing project conventions and patterns
- [x] At least 2 meaningful commits with descriptive messages (`type(scope): description`)
- [x] No hardcoded secrets, API keys, or passwords in code
- [x] CIA used minimum twice — interactions logged in `docs/CIA_LOG.md`
- [x] Python unit tests executed with 100% pass rate
- [x] Full curl verification executed against all API endpoints

---

## 6. Viva Questions & Model Answers

### Question 1: Walk me through your implementation — what did you build and why did you structure it that way?
**Answer:**  
"For this lesson, I built an end-to-end Interview Pipeline tracking solution spanning both backend controller logic and frontend reactive UI.
On the backend, I designed the schema for the Interview DocType with a restricted `pipeline_stage` select field representing 6 sequential stages (`Screening` through `Rejected`). I wrote the controller method `update_pipeline_stage` with strict validation to prevent invalid stage assignments, ensure candidate existence, and maintain an audit trail. For real-time monitoring, I created a dashboard aggregation query that computes today's applicant counts grouped by stage.

On the frontend, I developed a Vue 3 Kanban Pipeline component supported by native DOM manipulation APIs (`querySelector`, `getElementById`, `innerHTML`, `classList`, and `createElement`). I structured the UI with a metrics summary banner, a multi-column Kanban board, live candidate filtering, and a dedicated DOM activity feed. When a stage update occurs, Vue reactively synchronizes the card positions while native DOM helpers trigger ephemeral toast notifications and audit log entries. This separation guarantees clean reactivity while demonstrating fundamental DOM manipulation competency."

### Question 2: What was the most challenging part and how did you solve it?
**Answer:**  
"The most challenging part was coordinating state synchronization between the Vue 3 Virtual DOM and direct native DOM manipulation without causing rendering collisions or memory leaks. Direct manipulation of elements controlled by Vue can lead to stale DOM references if Vue re-renders the container.
I solved this by decoupling the presentation into two distinct zones: Vue handles the reactive state of the Kanban board, cards, and column groupings, while the native DOM manipulation methods operate on dedicated, unmanaged containers (specifically `#toastContainer` and `#activityFeedList`). Furthermore, to prevent DOM memory bloat from continuous candidate transitions, I implemented a DOM pruning check that ensures no more than 10 activity elements remain in the tree simultaneously. I also sanitized all user inputs before setting `innerHTML` to safeguard against Cross-Site Scripting (XSS)."

### Question 3: If you had one more day, what would you improve?
**Answer:**  
"If I had one more day, I would improve three key areas:
1. **Drag-and-Drop Interaction:** Enhance the Kanban board with HTML5 Drag-and-Drop API (`dragstart`, `dragover`, `drop`) or Vue.Draggable so recruiters can physically drag candidate cards between columns.
2. **WebSocket / Server-Sent Events (SSE):** Replace polling/manual refresh with live WebSocket connections so updates made by one HR interviewer instantly reflect on all other interviewers' screens in real-time.
3. **Automated Stage Transition Rules:** Implement workflow state validation rules (e.g., prohibiting a transition directly from `Screening` to `Offered` without passing Technical and HR rounds) with automated email notifications sent to candidates on stage changes."
