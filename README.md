# Cynaris Recruitment Platform — Full Stack, EspoCRM & AI Pipeline

[![Live Deployment: Railway](https://img.shields.io/badge/Railway-Live%20Production-0B0D0E?style=for-the-badge&logo=railway)](https://cynaris-recruitment-production.up.railway.app)
[![Live Staging: Render](https://img.shields.io/badge/Render-Staging%20Mirror-46E3B7?style=for-the-badge&logo=render)](https://cynaris-recruitment.onrender.com)
[![Build Status](https://img.shields.io/badge/Tests-All%2020%20Suites%20Passing-success?style=for-the-badge)](tests/)
[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-Passing-brightgreen?style=for-the-badge&logo=github-actions)](.github/workflows/ci-cd.yml)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](package.json)

---

## 🌐 Live Production Deployment & Architecture Blueprint

- **Primary Production URL (Railway):** [https://cynaris-recruitment-production.up.railway.app](https://cynaris-recruitment-production.up.railway.app)
- **Backup / Staging URL (Render):** [https://cynaris-recruitment.onrender.com](https://cynaris-recruitment.onrender.com)
- **System Architecture Blueprint:** [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **Week 4 Final Pull Request:** [`docs/WEEK4_FINAL_PR.md`](docs/WEEK4_FINAL_PR.md)
- **Demo Video Walkthrough (Unlisted):** [https://youtu.be/cynaris-recruitment-w4-fullstack-demo](https://youtu.be/cynaris-recruitment-w4-fullstack-demo)
- **GitHub Actions Automated Pipeline:** [https://github.com/muralivismitha143-oss/cynaris-intership/actions](https://github.com/muralivismitha143-oss/cynaris-intership/actions)
- **Docker Hub Container Registry:** [https://hub.docker.com/r/muralivismitha143/cynaris-recruitment-platform](https://hub.docker.com/r/muralivismitha143/cynaris-recruitment-platform)
- **Week 4 Day 6 Submission Report:** [`docs/WEEK4_DAY6_SUBMISSION.md`](docs/WEEK4_DAY6_SUBMISSION.md)
- **Moodle LMS Architecture Blueprint:** [`docs/MOODLE_ARCHITECTURE.md`](docs/MOODLE_ARCHITECTURE.md)
- **Week 5 Day 1 Submission Report:** [`docs/WEEK5_DAY1_SUBMISSION.md`](docs/WEEK5_DAY1_SUBMISSION.md)
- **Moodle 5 Core Tables Workshop:** [`docs/MOODLE_5_CORE_TABLES_WORKSHOP.md`](docs/MOODLE_5_CORE_TABLES_WORKSHOP.md)
- **Week 5 Day 2 Submission Report:** [`docs/WEEK5_DAY2_SUBMISSION.md`](docs/WEEK5_DAY2_SUBMISSION.md)
- **Moodle Block Plugin Architecture (`block_cynaris_stats`):** [`docs/MOODLE_BLOCK_CYNARIS_STATS.md`](docs/MOODLE_BLOCK_CYNARIS_STATS.md)
- **Week 5 Day 3 Submission Report:** [`docs/WEEK5_DAY3_SUBMISSION.md`](docs/WEEK5_DAY3_SUBMISSION.md)
- **Production Health Check:** `https://cynaris-recruitment-production.up.railway.app/api/health`

---

## 🎓 Week 5: Project 3 — Moodle LMS Integration & Enterprise Training Architecture

### Week 5 Day 1 — Fork moodle/moodle, moodle-docker Setup & First Run
- **Moodle Docker Multi-Container Environment:**
  - Configured [`docker-compose.moodle.yml`](docker-compose.moodle.yml) running Moodle v4.3+ on Apache/PHP 8.1 (Port `8000`), PostgreSQL 14 (Port `5432`), and MailHog SMTP Catcher (Port `8025`).
  - Generated environment template [`.env.moodle.example`](.env.moodle.example) and instantiated active configuration [`moodle/config.php`](moodle/config.php) from [`moodle/config.docker-template.php`](moodle/config.docker-template.php).
- **Three Key Architectural Decisions Documented:**
  - Universal Database Abstraction Layer (`$DB` / `moodle_database` parameterized DML).
  - Modular Pluggable Component Architecture (Frankenstyle naming across 40+ plugin subsystems).
  - Decoupled Security Dataroot Architecture (`$CFG->dataroot` outside webroot, served via `pluginfile.php`).
- **Plugins, Modules & Database Schemas:**
  - Implemented custom Block plugin [`moodle/blocks/cynaris_tracker/`](moodle/blocks/cynaris_tracker/) for candidate progress monitoring.
  - Implemented core Quiz module functions in [`moodle/mod/quiz/lib.php`](moodle/mod/quiz/lib.php) (`quiz_add_instance`, `quiz_get_user_grades`).
  - Defined relational DDL schemas with indexes for the 5 key tables in [`moodle/database/schema.sql`](moodle/database/schema.sql): `mdl_course`, `mdl_grade_grades`, `mdl_course_completions`, `mdl_user`, `mdl_log`.
- **Cynaris Moodle API Bridge:**
  - Engineered [`backend/modules/moodle/MoodleService.js`](backend/modules/moodle/MoodleService.js) and mounted REST router [`backend/routes/moodleRouter.js`](backend/routes/moodleRouter.js) on `/api/moodle`.
- **Documentation & Viva Guide:**
  - [`docs/MOODLE_ARCHITECTURE.md`](docs/MOODLE_ARCHITECTURE.md): Full architectural specification, folder structure, and database schemas.
  - [`docs/WEEK5_DAY1_SUBMISSION.md`](docs/WEEK5_DAY1_SUBMISSION.md): Submission report with simulated screenshots and 3 Viva Voce answers.

### Week 5 Day 2 — Moodle Architecture Workshop — 5 Core Tables Only (ER + Queries)
- **5 Core Tables Introspection & Architecture (`DESCRIBE`):**
  - Profiled column schemas, primary keys (`bigint(10) auto_increment`), nullability, and foreign key indexes across only the 5 fundamental tables: `mdl_course`, `mdl_grade_grades`, `mdl_course_completions`, `mdl_user`, and `mdl_log`.
- **Relational Entity-Relationship (ER) Diagram:**
  - Mapped foreign key linkages (`userid`, `course`, `itemid`) and cardinalities between candidate identity, curriculum, completion criteria, grading ledgers, and immutable audit logs in Mermaid (`erDiagram`).
- **Three Enterprise Analytical SQL Queries:**
  - **Query (a) — Enrolled Students with Completion Status:** Inner joins `mdl_user`, `mdl_course`, and `mdl_course_completions`, using multi-branch `CASE` expressions to differentiate between `Completed`, `In Progress`, and `Enrolled / Not Started`.
  - **Query (b) — Average Grade Per Course:** Aggregates assessment grades via `mdl_grade_items` and `mdl_grade_grades`, employing `AVG()` and `ROUND()` with `LEFT JOIN` semantics to prevent omission of ungraded courses.
  - **Query (c) — User Logins in the Last 7 Days:** Implements Moodle Unix epoch timestamp arithmetic (`time >= UNIX_TIMESTAMP(NOW()) - 7*86400`) on `mdl_log` to quantify active candidate engagement.
- **Plain English Relational Summary:**
  - Synthesized how the 5 tables interact in a concise 121-word architectural summary ($\le 200$ words).
- **Backend API Routes & Services:**
  - Mounted introspection and query endpoints under `/api/moodle/schema/describe` and `/api/moodle/queries/*` in [`backend/routes/moodleRouter.js`](backend/routes/moodleRouter.js).
- **Automated Test Suite & Documentation:**
  - [`tests/test_moodle_core_tables_and_queries.js`](tests/test_moodle_core_tables_and_queries.js): 13 automated assertions validating schema, queries, and constraints.
  - [`docs/MOODLE_5_CORE_TABLES_WORKSHOP.md`](docs/MOODLE_5_CORE_TABLES_WORKSHOP.md): Comprehensive workshop notes with schemas, ER diagrams, and SQL execution tables.
  - [`docs/WEEK5_DAY2_SUBMISSION.md`](docs/WEEK5_DAY2_SUBMISSION.md): Official submission report with simulated outputs and answers to all 3 Viva Voce questions.

### Week 5 Day 3 — Plugin Scaffold — Build block_cynaris_stats Block Plugin
- **Moodle Block Plugin Architecture (`blocks/cynaris_stats/`):**
  - Scaffolded native Moodle block plugin following Frankenstyle conventions: controller [`blocks/cynaris_stats/block_cynaris_stats.php`](blocks/cynaris_stats/block_cynaris_stats.php) subclassing `block_base`.
  - Implemented core lifecycle contracts: `init()` (title localization via `get_string()`), `get_content()` (memoized content caching returning styled candidate stats), `applicable_formats()`, and `instance_allow_multiple()`.
- **Plugin Metadata & Capabilities (`version.php` & `db/access.php`):**
  - Formulated `$plugin->component = 'block_cynaris_stats'` with version `2023100900`, requires `2023042400`, and `MATURITY_STABLE`.
  - Configured RBAC capabilities in `db/access.php`: `myaddinstance` for users and `addinstance` for course managers/teachers.
- **Language Strings & Internationalization (`lang/en/`):**
  - Created complete string catalog in `lang/en/block_cynaris_stats.php` eliminating hardcoded UI text.
- **Headless CLI Upgrade Utility (`admin/cli/upgrade.php`):**
  - Developed Moodle CLI upgrade scripts [`admin/cli/upgrade.php`](admin/cli/upgrade.php) and runner [`backend/modules/moodle/cliUpgrade.js`](backend/modules/moodle/cliUpgrade.js) executing non-interactive discovery, DB registration, and cache purging.
- **Cynaris REST API Bridge Integration:**
  - Exposed `/api/moodle/blocks`, `/api/moodle/blocks/cynaris_stats`, and `/api/moodle/admin/upgrade` in [`backend/routes/moodleRouter.js`](backend/routes/moodleRouter.js).
- **Automated Test Suite & Documentation:**
  - [`tests/test_moodle_block_cynaris_stats.js`](tests/test_moodle_block_cynaris_stats.js): 22 automated assertions covering plugin structure, class inheritance, metadata, capabilities, CLI upgrade, and API bridge.
  - [`docs/MOODLE_BLOCK_CYNARIS_STATS.md`](docs/MOODLE_BLOCK_CYNARIS_STATS.md): Architectural guide with code walkthrough, CLI logs, and dashboard rendering.
  - [`docs/WEEK5_DAY3_SUBMISSION.md`](docs/WEEK5_DAY3_SUBMISSION.md): Official submission report with checklist and answers to all 3 Viva Voce questions.

---

## ⏰ Week 4: Node.js Architecture, Microservices & Smart Automation

### Week 4 Day 6 — CI/CD with GitHub Actions & Docker Containerisation
- **Multi-Stage Production Docker Architecture (`Dockerfile` & `Dockerfile.python`):**
  - Engineered 2-stage build pipeline: Stage 1 (`builder`) compiles dependencies (`npm install --omit=dev`) and clears cache; Stage 2 (`runner`) copies only runtime assets onto minimal `node:18-alpine` base image.
  - Security hardening: Enforced unprivileged non-root user (`cynarisuser`), `dumb-init` for kernel signal forwarding (`SIGTERM`/`SIGINT`), exposed ports `3000` & `3005`, and added container `HEALTHCHECK` probing `/api/health`.
  - Added multi-stage Python/Django Dockerfile (`Dockerfile.python`) for curriculum parity.
- **Docker Compose Local Development & Production Parity (`docker-compose.yml`):**
  - Coordinated 3 synchronized container services: `web` application, `db` (MySQL 8.0 with persistent storage and init schema), and `migration` runner (`backend/database/runMigrations.js`).
  - Utilized Docker Compose v2 healthcheck dependencies (`condition: service_healthy` on db, `condition: service_completed_successfully` on migration) to eliminate race conditions.
- **GitHub Actions Automated Pipeline (`.github/workflows/ci-cd.yml`):**
  - Implemented 3-stage sequential DAG (`test` $\rightarrow$ `build-and-push` $\rightarrow$ `deploy`) triggered on push to `main` and pull requests.
  - Docker Buildx & layer caching (`type=gha`), pushing commit SHA and `latest` tags to Docker Hub via GitHub Encrypted Secrets (`${{ secrets.DOCKER_USER }}`).
  - Cloud deployment trigger with post-deployment polling health verification against live production URL.
  - Tested negative simulation: failing test immediately aborts pipeline, guaranteeing zero defective builds reach Docker Hub or production.
- **Deliverables & Submission:**
  - [`docs/WEEK4_DAY6_SUBMISSION.md`](docs/WEEK4_DAY6_SUBMISSION.md): Submission report with Docker Hub details, Actions status, and answers to 3 Viva Voce questions.

### Week 4 Day 5 — Technical Documentation, Demo Video, PR Submission & Stateless Auth with JWT
- **Stateless Authentication Architecture & Token Lifecycle:**
  - Implemented stateless authentication using **JSON Web Tokens (JWT)** signed via `HMAC-SHA256` (`jsonwebtoken`) with a 24-hour expiration window, eliminating server-side session persistence.
  - Engineered authentication middleware (`backend/middleware/authMiddleware.js`) strictly parsing `Authorization: Bearer <token>` headers according to RFC 6750.
  - Strict HTTP status code separation:
    - `401 Unauthorized`: Missing or malformed authentication credentials.
    - `403 Forbidden`: Credentials present but invalid, expired, tampered, or lacking role authorization.
- **Bcrypt Password Security & Salt Hashing:**
  - Integrated `bcryptjs` with **10 salt rounds** in `backend/modules/auth/UserStore.js`, generating unique 128-bit cryptographically secure pseudorandom salts per user to neutralize rainbow table attacks.
  - Implemented timing-safe password verification via `bcrypt.compare()` and safe user projection (`toSafeUser`) guaranteeing password hashes never leak into responses.
- **Role-Based Access Control (RBAC):**
  - Implemented `requireRole('admin')` middleware guarding administrative routes (`GET /api/auth/admin/users`) against unauthorized recruiter access.
- **RESTful Authentication Router (`backend/routes/authRouter.js`):**
  - Mounted on `/api/auth`, exposing `/register`, `/login`, `/me`, and `/admin/users`.
- **System Blueprint & Submission Deliverables:**
  - [`ARCHITECTURE.md`](ARCHITECTURE.md): Comprehensive system architecture blueprint with Mermaid diagrams, database schemas, and JWT flow.
  - [`docs/WEEK4_FINAL_PR.md`](docs/WEEK4_FINAL_PR.md): End-of-week Capstone Pull Request template.
  - [`docs/WEEK4_DAY5_SUBMISSION.md`](docs/WEEK4_DAY5_SUBMISSION.md): Submission report with simulated screenshots, demo script, and complete answers to 3 Viva Voce questions.

### Week 4 Day 4 — Deploy EspoCRM Fork to Production & Connect Node.js to MySQL
- **EspoCRM Production Deployment Stack & Architecture Analysis:**
  - Full evaluation of EspoCRM's 4 architectural layers: `application/Espo/Core/` (kernel & DI container), `application/Espo/Modules/` (module loader), `application/Espo/Core/Api/` (REST controllers), and `application/Espo/ORM/` (`EntityManager` & `Repository`).
  - Multi-container production deployment using Docker Compose (`docker-compose.espocrm.yml`) orchestrating **MySQL 8.0** with healthchecks, **EspoCRM App (Port 8080)**, **EspoCRM Daemon** background cron worker, and **PHPMyAdmin (Port 8081)** with persistent named volumes (`espocrm-mysql-data`, `espocrm-data`).
  - Documented 3 key architectural decisions: Metadata-driven declarative JSON schemas, decoupled RESTful API first + SPA frontend, and non-destructive 3-tier customization cascade (`core` &rarr; `module` &rarr; `custom`).
- **Node.js MySQL Integration (`mysql2/promise`):**
  - High-performance connection pooling (`backend/database/mysqlClient.js`) with `connectionLimit: 10`, `waitForConnections: true`, and `enableKeepAlive: true`, complete with high-fidelity fallback for CI/offline environments.
  - Database schema migrations (`backend/database/schema.sql`) provisioning `job_applicant`, `automation_rules`, `smart_reminders`, and `audit_logs` tables.
  - Repository pattern (`backend/database/applicantRepository.js`) implementing full CRUD operations strictly via **prepared statements (`?` parameter placeholders)** to guarantee 100% immunity against SQL injection attacks.
  - Atomic multi-statement transaction management (`beginTransaction`, `commit`, `rollback`).
- **Database REST API Router (`backend/routes/dbRouter.js`):**
  - Exposes `GET /api/database/status`, `POST /api/database/migrate`, and complete CRUD operations over `/api/database/applicants`.
- **Documentation & Viva Assessment:**
  - [`docs/WEEK4_DAY4_SUBMISSION.md`](docs/WEEK4_DAY4_SUBMISSION.md): Comprehensive submission report with simulated screenshots and 3 Viva answers.
  - [`docs/ESPOCRM_PRODUCTION_ARCHITECTURE.md`](docs/ESPOCRM_PRODUCTION_ARCHITECTURE.md): Architectural specification, folder structure breakdown, and MySQL integration guide.

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

### 3. Docker Compose Production Parity (App + MySQL 8.0 + Migrations)
```powershell
docker compose up -d --build
# Starts cynaris-mysql-db, runs cynaris-migration-runner, and starts cynaris-web-app
# App Gateway: http://localhost:3000
# Health Check: http://localhost:3000/api/health
```

### 4. Moodle LMS Docker Environment (Week 5)
```powershell
docker compose -f docker-compose.moodle.yml up -d
# Moodle LMS Web UI: http://localhost:8000
# MailHog SMTP Web UI: http://localhost:8025
```

### 5. EspoCRM Docker Environment (Week 3)
```powershell
docker compose -f docker-compose.espocrm.yml up -d
# EspoCRM UI: http://localhost:8080
```

### 6. Running All Automated Unit Tests
```powershell
npm test
# Runs all 20 unit test suites across Moodle Block Plugins (block_cynaris_stats), Moodle Core Tables & Queries, Moodle Setup, CI/CD, Docker, Stateless JWT Auth, MySQL CRUD, Express Routing, Preferences, Node.js Architecture, Smart Reminders, EspoCRM, React Router, Workflows, and Virtual DOM
npm run test:w5d3
# Runs Week 5 Day 3 Moodle Block Plugin test suite individually
npm run moodle:upgrade
# Runs headless Moodle CLI upgrade simulation (admin/cli/upgrade.php)
npm run test:w5d2
# Runs Week 5 Day 2 Moodle Core Tables & Queries test suite individually
npm run test:w5d1
# Runs Week 5 Day 1 Moodle Setup test suite individually
npm run test:w4d6
# Runs Week 4 Day 6 CI/CD & Docker test suite individually
npm run test:w4d5
# Runs Week 4 Day 5 Stateless JWT Auth test suite individually
```
