# Cynaris Recruitment Platform — Full Stack, EspoCRM & AI Pipeline

[![Live Deployment: Railway](https://img.shields.io/badge/Railway-Live%20Production-0B0D0E?style=for-the-badge&logo=railway)](https://cynaris-recruitment-production.up.railway.app)
[![Live Staging: Render](https://img.shields.io/badge/Render-Staging%20Mirror-46E3B7?style=for-the-badge&logo=render)](https://cynaris-recruitment.onrender.com)
[![Build Status](https://img.shields.io/badge/Tests-32%2F32%20Passing-success?style=for-the-badge)](tests/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](package.json)

---

## 🌐 Live Production Deployment

- **Primary Production URL (Railway):** [https://cynaris-recruitment-production.up.railway.app](https://cynaris-recruitment-production.up.railway.app)
- **Backup / Staging URL (Render):** [https://cynaris-recruitment.onrender.com](https://cynaris-recruitment.onrender.com)
- **Production Health Check:** `https://cynaris-recruitment-production.up.railway.app/api/health`

---

## 🚀 Week 3: Project 2 — EspoCRM Architecture, Setup & React Virtual DOM

### Week 3 Day 1 — Fork, Clone & Local Setup: EspoCRM & React Virtual DOM
- **EspoCRM Multi-Container Stack:** Complete Docker Compose environment ([`docker-compose.espocrm.yml`](docker-compose.espocrm.yml)) orchestrating **MySQL 8.0**, **EspoCRM App (Port 8080)**, **EspoCRM Daemon**, and **phpMyAdmin (Port 8081)**.
- **Environment Template:** Zero-secret configuration template in [`.env.espocrm.example`](.env.espocrm.example).
- **Architecture Study & Anatomy:** Deep dive into the 4 core repository components in [`docs/ESPOCRM_ARCHITECTURE.md`](docs/ESPOCRM_ARCHITECTURE.md):
  1. `application/Espo/Core/` — Kernel, Container DI, and MetadataManager
  2. `application/Espo/Modules/` — Modular package extensions and metadata inheritance
  3. `application/Espo/Core/Api/` — REST API layer and Bearer token request handling
  4. `application/Espo/ORM/` — Entity Manager, Repositories, and lifecycle hooks
- **3 Key Architectural Decisions:**
  1. *Metadata-Driven Architecture:* Declarative JSON schemas in `Resources/metadata/` enabling runtime customization without code compilation.
  2. *Decoupled SPA REST API:* Pure JSON REST API (`/api/v1/`) decoupled from the frontend client.
  3. *Custom Lightweight ORM:* High-performance repository pattern with native entity hooks and granular ACL.
- **React Virtual DOM & JSX Client:**
  - Modern React portal component in [`client/src/components/CandidatePortal.jsx`](client/src/components/CandidatePortal.jsx) and [`client/src/components/PipelineCard.jsx`](client/src/components/PipelineCard.jsx).
  - Virtual DOM Engine simulation in [`client/src/utils/virtualDomEngine.js`](client/src/utils/virtualDomEngine.js) demonstrating JSX compilation, $O(n)$ heuristic diffing, and batched real DOM mutations.
- **Documentation & Viva Guide:** Comprehensive day walkthrough in [`docs/WEEK3_DAY1_SUBMISSION.md`](docs/WEEK3_DAY1_SUBMISSION.md).

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
# Run Week 3 Tests (EspoCRM setup + React Virtual DOM)
npm test

# Run individual test suites
npm run test:espocrm
npm run test:react
npm run test:w2
```

---

## 📁 Key Documentation Files

- [docs/WEEK3_DAY1_SUBMISSION.md](docs/WEEK3_DAY1_SUBMISSION.md) — Week 3 Day 1 submission walkthrough, installer verification, and Viva answers.
- [docs/ESPOCRM_ARCHITECTURE.md](docs/ESPOCRM_ARCHITECTURE.md) — In-depth architectural analysis and 3 key decisions.
- [docs/CIA_LOG.md](docs/CIA_LOG.md) — CIA interaction logs across Week 2 and Week 3.
- [DEPLOYMENT.md](DEPLOYMENT.md) — Production deployment guide for Railway & Render.
- [.github/pull_request_template.md](.github/pull_request_template.md) — Standardized PR template for end-of-week submission.
