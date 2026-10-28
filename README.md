# Cynaris Recruitment Platform — Full Stack, EspoCRM & AI Pipeline

[![Live Deployment: Railway](https://img.shields.io/badge/Railway-Live%20Production-0B0D0E?style=for-the-badge&logo=railway)](https://cynaris-recruitment-production.up.railway.app)
[![Live Staging: Render](https://img.shields.io/badge/Render-Staging%20Mirror-46E3B7?style=for-the-badge&logo=render)](https://cynaris-recruitment.onrender.com)
[![Build Status](https://img.shields.io/badge/Tests-All%2010%20Suites%20Passing-success?style=for-the-badge)](tests/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](package.json)

---

## 🌐 Live Production Deployment

- **Primary Production URL (Railway):** [https://cynaris-recruitment-production.up.railway.app](https://cynaris-recruitment-production.up.railway.app)
- **Backup / Staging URL (Render):** [https://cynaris-recruitment.onrender.com](https://cynaris-recruitment.onrender.com)
- **Production Health Check:** `https://cynaris-recruitment-production.up.railway.app/api/health`

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

### 1. EspoCRM Docker Environment (Week 3)
```powershell
# Copy environment configuration
cp .env.espocrm.example .env.espocrm

# Start EspoCRM + MySQL 8.0 + phpMyAdmin
docker compose -f docker-compose.espocrm.yml up -d

# Open EspoCRM Web Installer: http://localhost:8080
# Open phpMyAdmin Database UI: http://localhost:8081
```

### 2. Express Backend & Vue 3 Pipeline (Week 2)
```powershell
cd backend
npm start
# Open http://localhost:3000
```

### 3. Running All Automated Unit Tests
```powershell
npm test
# Runs all 10 unit test suites across EspoCRM, React Router, Workflows, Virtual DOM, and AI Services
```
