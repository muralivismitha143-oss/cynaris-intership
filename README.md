# Cynaris Recruitment Platform — Full Stack, EspoCRM & AI Pipeline

[![Live Deployment: Railway](https://img.shields.io/badge/Railway-Live%20Production-0B0D0E?style=for-the-badge&logo=railway)](https://cynaris-recruitment-production.up.railway.app)
[![Live Staging: Render](https://img.shields.io/badge/Render-Staging%20Mirror-46E3B7?style=for-the-badge&logo=render)](https://cynaris-recruitment.onrender.com)
[![Build Status](https://img.shields.io/badge/Tests-39%2F39%20Passing-success?style=for-the-badge)](tests/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](package.json)

---

## 🌐 Live Production Deployment

- **Primary Production URL (Railway):** [https://cynaris-recruitment-production.up.railway.app](https://cynaris-recruitment-production.up.railway.app)
- **Backup / Staging URL (Render):** [https://cynaris-recruitment.onrender.com](https://cynaris-recruitment.onrender.com)
- **Production Health Check:** `https://cynaris-recruitment-production.up.railway.app/api/health`

---

## 🚀 Week 3: Project 2 — EspoCRM Architecture, Business Processes & React

### Week 3 Day 2 — Business Process Mapping: Lead to Closure + API Inspection & Unidirectional Data Flow
- **Lead-to-Closure Process Mapping:** Complete enterprise lifecycle specification in [`docs/BUSINESS_PROCESS_MAPPING.md`](docs/BUSINESS_PROCESS_MAPPING.md) tracing `Lead` &rarr; `Opportunity` &rarr; `Account` & `Contact` &rarr; `Activity` &rarr; `Closed Won`.
- **Workflow & Automation Analysis:**
  - Evaluated **3 core Workflow rules** (`Lead Auto-Routing`, `High-Value Deal Alert`, `Stale Lead Inactivity Reminder`).
  - Analyzed **2 BPM process flows** with a comprehensive Mermaid BPMN flowchart.
  - Deconstructed **2 enterprise reports** across Entity, Filters, Columns, and Group By.
- **REST API Inspection:** Documented `/api/v1/` endpoints for `POST /api/v1/Lead`, `POST /api/v1/Lead/action/convert`, and `POST /api/v1/Meeting`.
- **React Functional Components & Unidirectional Data Flow:**
  - Composed component hierarchy in [`client/src/components/LeadToClosure/`](client/src/components/LeadToClosure/):
    - `LeadPipelineContainer.jsx`: Smart state orchestrator managing immutable updates.
    - `ClosureSummaryMetrics.jsx`: Functional KPI presenter receiving computed props.
    - `LeadCard.jsx`: Presentational lead card with conversion action triggers.
    - `OpportunityCard.jsx`: Controlled deal progression card with stage transitions.
    - `ActivityFeed.jsx`: Chronological engagement feed for calls, meetings, and tasks.
- **Documentation & Viva Guide:** Comprehensive day walkthrough in [`docs/WEEK3_DAY2_SUBMISSION.md`](docs/WEEK3_DAY2_SUBMISSION.md).

### Week 3 Day 1 — Fork, Clone & Local Setup: EspoCRM & React Virtual DOM
- **EspoCRM Multi-Container Stack:** Docker Compose environment ([`docker-compose.espocrm.yml`](docker-compose.espocrm.yml)) orchestrating **MySQL 8.0**, **EspoCRM App (Port 8080)**, **EspoCRM Daemon**, and **phpMyAdmin (Port 8081)**.
- **Environment Template:** Zero-secret configuration template in [`.env.espocrm.example`](.env.espocrm.example).
- **Architecture Study & Anatomy:** Deep dive into the 4 core repository components in [`docs/ESPOCRM_ARCHITECTURE.md`](docs/ESPOCRM_ARCHITECTURE.md) (`Core/`, `Modules/`, `Core/Api/`, `ORM/`).
- **3 Key Architectural Decisions:** Metadata-driven architecture, decoupled SPA REST API, custom lightweight ORM.
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

### 3. Run Automated Unit Test Suites
```powershell
# Run All Week 3 Unit Tests (16 tests)
npm test

# Run Week 3 Day 2 Tests (Business Process & Unidirectional Flow)
npm run test:w3d2

# Run Week 3 Day 1 Tests (EspoCRM Setup & Virtual DOM)
npm run test:w3d1

# Run Week 2 Modern JavaScript Tests
npm run test:w2
```

---

## 📁 Key Documentation Files

- [docs/WEEK3_DAY2_SUBMISSION.md](docs/WEEK3_DAY2_SUBMISSION.md) — Week 3 Day 2 submission report, visual walkthrough, workflows, and Viva guide.
- [docs/BUSINESS_PROCESS_MAPPING.md](docs/BUSINESS_PROCESS_MAPPING.md) — Enterprise Lead-to-Closure process mapping and API specifications.
- [docs/WEEK3_DAY1_SUBMISSION.md](docs/WEEK3_DAY1_SUBMISSION.md) — Week 3 Day 1 setup walkthrough and installer verification.
- [docs/ESPOCRM_ARCHITECTURE.md](docs/ESPOCRM_ARCHITECTURE.md) — In-depth architectural analysis and 3 key decisions.
- [docs/CIA_LOG.md](docs/CIA_LOG.md) — CIA interaction logs across Week 2 and Week 3.
- [DEPLOYMENT.md](DEPLOYMENT.md) — Production deployment guide for Railway & Render.
- [.github/pull_request_template.md](.github/pull_request_template.md) — Standardized PR template for end-of-week submission.
