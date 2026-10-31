# Cynaris Recruitment Platform — Full Stack, EspoCRM & AI Pipeline

[![Live Deployment: Railway](https://img.shields.io/badge/Railway-Live%20Production-0B0D0E?style=for-the-badge&logo=railway)](https://cynaris-recruitment-production.up.railway.app)
[![Live Staging: Render](https://img.shields.io/badge/Render-Staging%20Mirror-46E3B7?style=for-the-badge&logo=render)](https://cynaris-recruitment.onrender.com)
[![Build Status](https://img.shields.io/badge/Tests-All%2014%20Suites%20Passing-success?style=for-the-badge)](tests/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](package.json)

---

## 🌐 Live Production Deployment

- **Primary Production URL (Railway):** [https://cynaris-recruitment-production.up.railway.app](https://cynaris-recruitment-production.up.railway.app)
- **Backup / Staging URL (Render):** [https://cynaris-recruitment.onrender.com](https://cynaris-recruitment.onrender.com)
- **Production Health Check:** `https://cynaris-recruitment-production.up.railway.app/api/health`

---

## ⏰ Week 4: Node.js Architecture, Microservices & Smart Automation

### Week 4 Day 3 — Debug Sprint: Root Cause 2 Issues + Performance Investigation
- **RESTful API Architecture & Strict Route Parameter Validation:**
  - Root Cause 1 Fix: Corrected route parameter type coercion in `GET /api/applicants/:applicant_id`. Non-integer or malformed parameters (e.g. `"abc"`, `"-5"`, `"1.5"`) previously produced `NaN` and triggered a misleading `404 Not Found`. Implemented `validateApplicantId` middleware returning RFC 9110 compliant `400 Bad Request` with parameter diagnostics.
  - Query String Filtering & Search: Enhanced `GET /api/applicants` with multi-attribute filtering (`?stage=...`), case-insensitive keyword searching (`?search=python`), minimum experience threshold (`?min_exp=3`), and a structured pagination envelope (`total`, `count`, `page`, `totalPages`, `hasNext`, `hasPrev`).
  - Resource Creation Standard: `POST /api/applicants` emits `201 Created` and sets the standard `Location: /api/applicants/:id` header.
- **Smart Reminders Query Filtering & Idempotent PATCH Mutations:**
  - Root Cause 2 Fix: Enhanced `GET /api/reminders/scheduled` to parse `req.query` for `status`, `channel`, `ruleId`, and `limit`, eliminating client-side over-fetching.
  - Replaced non-RESTful `POST /api/reminders/rules/toggle` with standard `PATCH /api/reminders/rules/:ruleId`, supporting idempotent partial state updates with boolean type validation.
- **Performance Investigation & Conditional HTTP 304 Caching:**
  - Event Loop Lag Profiling: Instrumented high-resolution Event Loop delay measurement via `setImmediate` and `process.hrtime.bigint()`, verifying sub-millisecond lag (`0.05ms`, `HEALTHY`).
  - Weak ETag Caching Middleware (`backend/middleware/restCacheMiddleware.js`): Generates MD5 weak ETags on GET responses. Matching incoming `If-None-Match` requests trigger `304 Not Modified` with a **0-byte payload**, slashing network transfer overhead to zero.
  - Diagnostics Telemetry Endpoint: `GET /api/performance/rest-diagnostics` reporting Event Loop lag, HTTP caching hit ratios, and memory footprint.
- **React Diagnostics Dashboard (`client/src/components/RestDiagnostics/RestDiagnosticsDashboard.jsx`):**
  - Interactive parameter tester, query string pagination explorer, rule PATCH toggles, and live 304 caching simulator.
- **Documentation & Viva Assessment:**
  - [`docs/WEEK4_DAY3_SUBMISSION.md`](docs/WEEK4_DAY3_SUBMISSION.md): Comprehensive submission report with full Viva Voce answers.
  - [`docs/REST_API_DEBUG_SPRINT.md`](docs/REST_API_DEBUG_SPRINT.md): Architectural specification and root cause investigation guide.

### Week 4 Day 2 — Smart Reminders: Frontend UI + User Preference Settings
- **Express Server Architecture & Modular Routing:**
  - Dedicated Express router (`backend/routes/preferencesRouter.js`) mounted on `/api/preferences` for RESTful user preference lifecycles.
  - Custom schema validation middleware (`backend/middleware/preferenceValidator.js`) verifying 24-hour time formats (`HH:mm`), channel configurations, minimum urgency tiers, and enforcing active channel guardrails.
  - Atomic persistence in `backend/data/userPreferences.json` with temporary file writes and safe rename semantics.
  - Static file pipeline: `preferences-schema.json` and documentation guide served via `express.static("/static/preferences")` with HTTP cache headers.
- **Quiet Hours & Working Window Intelligence:**
  - Overnight calculation handling midnight crossover windows (e.g. `20:00` to `08:30` IST), automatically deferring evening or weekend reminders to the start of the next business day (`09:30 IST`).
- **React 18 Settings Modal & UI:**
  - `UserPreferencesSettings.jsx`: Interactive modal with recruiter profile switching (`Murali V`, `Priya Sharma`, `Rahul Deshmukh`), delivery channel cards (Email, WhatsApp, In-App, SMS), quiet hours pickers, and live DND status banners.
  - Hero header ribbon in `SmartRemindersDashboard.jsx` reflecting active recruiter preferences and quiet hours state.
- **Documentation & Viva Assessment:**
  - [`docs/WEEK4_DAY2_SUBMISSION.md`](docs/WEEK4_DAY2_SUBMISSION.md): Full walkthrough with simulated screenshots and 3 Viva answers.
  - [`docs/SMART_REMINDERS_PREFERENCES_UI.md`](docs/SMART_REMINDERS_PREFERENCES_UI.md): Technical specification and Express routing details.

### Week 4 Day 1 — Smart Reminders: Automation Rules + AI-Suggested Timing
- **Node.js Core Architecture & Built-in Modules:**
  - Standalone Pure Node.js HTTP Server (`backend/smartReminderServer.js`, Port 3005) built directly with `http.createServer`, handling stream chunking (`req.on('data')`, `req.on('end')`), payload guards, and Event Loop telemetry.
  - Asynchronous non-blocking persistence (`backend/modules/smartReminders/ReminderStore.js`) using `fs.promises` and atomic file write/rename patterns.
  - Event-driven pipeline automation engine (`backend/modules/smartReminders/RuleEngine.js`) extending Node.js `events.EventEmitter` to evaluate idle candidate hours and emit `'rule:matched'` events.
- **Dual AI Provider Architecture & Fallback:**
  - `AiTimingEngine.js`: Recipient behavioral analysis enforcing Indian Standard Time (IST) working hours and strict JSON schema.
  - Primary Provider: **Groq** (`llama-3.3-70b-versatile`) with low latency (< 300ms).
  - Fallback Provider: **OpenRouter** (`meta-llama/llama-3.3-70b-instruct`) engaged upon HTTP 429/503 errors or timeouts.
  - Deterministic offline safety net ensuring 100% test reliability and zero downtime.
- **React 18 Frontend Dashboard:**
  - `SmartRemindersDashboard.jsx`: Interactive UI with automation rule toggles, candidate idle trigger selector, simulated Groq outage toggle, and scheduled reminders queue.
- **Documentation & Viva Assessment:**
  - [`docs/WEEK4_DAY1_SUBMISSION.md`](docs/WEEK4_DAY1_SUBMISSION.md): Full walkthrough with simulated screenshots and 3 Viva answers.
  - [`docs/SMART_REMINDERS_AI_TIMING.md`](docs/SMART_REMINDERS_AI_TIMING.md): Technical specification and prompt engineering details.

---

## 🚀 Week 3: Project 2 — EspoCRM Architecture, Business Processes & React

### Week 3 Day 5 — AI Conversation Summarizer: Groq Integration & React Router Client-Side Routing
- **EspoCRM Custom Hook & Service:**
  - `ConversationSummarizerHook.php`: `afterSave` hook on Activity entity triggering when linked to an Account, fetching the 5 most recent interactions.
  - `ConversationSummarizer.php`: Core PHP service with prompt formatting, Groq primary call (`llama-3.3-70b-versatile`), OpenRouter failover (`meta-llama/llama-3.3-70b-instruct`), and deterministic local fallback.
  - `Account.json`: Custom entity metadata extension persisting `aiSummary`, `aiSummaryGeneratedAt`, and `aiSummaryProvider`.
- **React Router Client-Side Routing:**
  - `ReactRouterComponents.jsx`: Standard implementation of `BrowserRouter`, `MemoryRouter`, `Routes`, `Route`, `Link`, `useParams`, and `useNavigate`.
  - `AccountsListView.jsx`: Accounts directory with declarative `<Link to={`/accounts/${id}`}>` cards.
  - `AccountDetailView.jsx`: Master-detail view using `useParams()` to read `accountId`, `useNavigate()` for programmatic redirection, displaying account metadata, interaction timeline, and the embedded AI summary panel.
  - `ConversationSummarizerPanel.jsx`: Visual panel displaying provider telemetry (latency, provider badge), 3-bullet cards, and an interactive simulated outage toggle.
- **Documentation & Viva Assessment:**
  - [`docs/WEEK3_DAY5_SUBMISSION.md`](docs/WEEK3_DAY5_SUBMISSION.md): Full walkthrough with simulated screenshots and 3 Viva answers.
  - [`docs/AI_CONVERSATION_SUMMARIZER.md`](docs/AI_CONVERSATION_SUMMARIZER.md): Technical specification and prompt engineering details.
  - [`docs/WEEK3_FINAL_PR.md`](docs/WEEK3_FINAL_PR.md): End-of-week Capstone Pull Request template.

### Week 3 Day 4 — Activity Dashboard: SQL Queries + Reporting Engine Extension & React `useEffect` Lifecycle
- **Custom SQL Report & Sargability:** Authored optimized query for "Activities per Account (last 30 days), grouped by type (Call, Meeting, Email)" combining sargable date boundaries (`date_start >= DATE_SUB(NOW(), INTERVAL 30 DAY)`) with non-blocking `UNION ALL` across polymorphic activity tables (`call`, `meeting`, `email`).
- **EspoCRM Dashlet & Report Metadata Registration:**
  - Dashlet: [`custom/Espo/Custom/Resources/metadata/dashlets/ActivitySummary.json`](custom/Espo/Custom/Resources/metadata/dashlets/ActivitySummary.json).
  - Report: [`custom/Espo/Custom/Resources/metadata/reports/ActivitiesPerAccountLast30Days.json`](custom/Espo/Custom/Resources/metadata/reports/ActivitiesPerAccountLast30Days.json).
  - Aggregation Service: [`application/Espo/Core/Reporting/ActivityReportService.php`](application/Espo/Core/Reporting/ActivityReportService.php).
- **React `useEffect` Hook & Lifecycle Management:**
  - `ActivitySummaryDashlet.jsx`: Multi-bar chart component demonstrating data fetching on mount (`[]`), `AbortController` cancellation on unmount, reactive re-fetching via dependency arrays (`[timeRange, filterAccount]`), and auto-refresh timer cleanup via `clearInterval`.
  - `ActivityDashboardContainer.jsx`: Master dashboard integrating the visual bar chart with the live SQL query inspector.
- **Documentation & Viva Guide:** Comprehensive day walkthrough in [`docs/WEEK3_DAY4_SUBMISSION.md`](docs/WEEK3_DAY4_SUBMISSION.md) and SQL specifications in [`docs/ACTIVITY_DASHBOARD_SQL_REPORT.md`](docs/ACTIVITY_DASHBOARD_SQL_REPORT.md).

### Week 3 Day 3 — Enterprise CRM Architecture: Workflow, Automation & Reporting Engine
- **Workflow Rule Engine (`application/Espo/Core/Workflow/WorkflowManager.php`):** Event interception (`afterCreate`, `afterSave`, `scheduled`), declarative condition evaluations (`equals`, `greaterThanOrEqual`, `in`, `contains`), and polymorphic action dispatchers (`sendEmail`, `createTask`, `updateEntity`, `triggerWebhook`).
- **Analytical Reporting Engine (`application/Espo/Core/Reporting/ReportEngine.php`):** Multi-dimensional aggregation queries across dimensions with aggregate mathematical measures (`SUM`, `AVG`, `COUNT`, `MAX`, `MIN`).
- **React Controlled Form Studio (`client/src/components/WorkflowReportingStudio/`):** Controlled form inputs (`value` + `onChange`), dynamic condition array manipulation with `useState`, and conditional rendering of action panels.
- **Documentation & Viva Guide:** [`docs/WEEK3_DAY3_SUBMISSION.md`](docs/WEEK3_DAY3_SUBMISSION.md) and [`docs/ENTERPRISE_CRM_WORKFLOW_REPORTING.md`](docs/ENTERPRISE_CRM_WORKFLOW_REPORTING.md).

### Week 3 Day 2 — Business Process Mapping: Lead to Closure + API Inspection & Unidirectional Data Flow
- **Lead-to-Closure Process Mapping:** Complete enterprise lifecycle specification in [`docs/BUSINESS_PROCESS_MAPPING.md`](docs/BUSINESS_PROCESS_MAPPING.md) tracing `Lead` &rarr; `Opportunity` &rarr; `Account` & `Contact` &rarr; `Activity` &rarr; `Closed Won`.
- **Workflow & Automation Analysis:** Evaluated 3 Workflow rules, 2 BPM process flows with Mermaid BPMN flowchart, and 2 reporting engine configurations.
- **React Functional Components & Unidirectional Data Flow:** Component hierarchy in [`client/src/components/LeadToClosure/`](client/src/components/LeadToClosure/).
- **Documentation & Viva Guide:** [`docs/WEEK3_DAY2_SUBMISSION.md`](docs/WEEK3_DAY2_SUBMISSION.md).

### Week 3 Day 1 — Fork, Clone & Local Setup: EspoCRM & React Virtual DOM
- **EspoCRM Multi-Container Stack:** Docker Compose environment ([`docker-compose.espocrm.yml`](docker-compose.espocrm.yml)) orchestrating **MySQL 8.0**, **EspoCRM App (Port 8080)**, **EspoCRM Daemon**, and **phpMyAdmin (Port 8081)**.
- **React Virtual DOM Client:** Candidate Portal in [`client/src/components/CandidatePortal.jsx`](client/src/components/CandidatePortal.jsx) and Virtual DOM diffing engine in [`client/src/utils/virtualDomEngine.js`](client/src/utils/virtualDomEngine.js).
- **Day 1 Submission Guide:** [`docs/WEEK3_DAY1_SUBMISSION.md`](docs/WEEK3_DAY1_SUBMISSION.md).

---

## 📋 Week 2 Capstone Overview: Frappe HR — Features & AI

An enterprise recruitment tracking platform combining modern Vue 3 reactive components, Python/Frappe DocType controllers, dual-engine AI resume screening (**Groq** + **OpenRouter**), performance profiling middleware, and zero-downtime cloud deployment on **Railway** and **Render**.

- **Week 2 Day 5:** Deploy to Railway + README + Demo Video + Final PR & Modern ES6+ JavaScript.
- **Week 2 Day 4:** Debug & Performance Sprint: Sargable indexing, 15s TTL cache, timezone normalization.
- **Week 2 Day 3:** AI Resume Analysis: Primary Groq (`llama-3.3-70b-versatile`) with OpenRouter fallback.
- **Week 2 Day 2:** Interview Status: Kanban board and Python controller stage transitions.

---

## 🛠️ How to Run Locally

### 1. Full Stack Application & Express Server (Week 4)
```powershell
cd backend
npm start
# Runs Express Server with Smart Reminders & User Preferences on http://localhost:3000
# Static Preferences Guide: http://localhost:3000/static/preferences/
```

### 2. Smart Reminders Microservice (Standalone Pure Node.js HTTP)
```powershell
node backend/smartReminderServer.js
# Runs pure Node.js HTTP server on http://localhost:3005
```

### 3. EspoCRM Docker Environment (Week 3)
```powershell
docker compose -f docker-compose.espocrm.yml up -d
# EspoCRM UI: http://localhost:8080
```

### 4. Running All Automated Unit Tests
```powershell
npm test
# Runs all 13 unit test suites across Express Routing, Preferences, Node.js Architecture, Smart Reminders, EspoCRM, React Router, Workflows, and Virtual DOM
```
