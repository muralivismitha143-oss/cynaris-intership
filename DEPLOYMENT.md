# Cynaris Recruitment & Career Intelligence Platform — Production Deployment Guide

## 1. Overview & Platform Selection

The Cynaris Recruitment & Career Intelligence Platform is container-ready and configured for zero-downtime deployment on modern Cloud PaaS providers:
- **Primary Deployment Platform:** [Railway](https://railway.app) (Full-stack Node.js, Python/Frappe, EspoCRM & MySQL workloads via Nixpacks / Docker).
- **Secondary / Staging Platform:** [Render](https://render.com) (Node.js web service defined in [`render.yaml`](render.yaml) with automated `/api/health` probing).

### Live Deployment URLs
- **Production URL (Railway):** [`https://cynaris-recruitment-production.up.railway.app`](https://cynaris-recruitment-production.up.railway.app)
- **Staging / Backup URL (Render):** [`https://cynaris-recruitment.onrender.com`](https://cynaris-recruitment.onrender.com)
- **Week 8 Portal Endpoints:**
  - Recruitment Pipeline: `/`
  - Placement & Interview Readiness Dashboard (Student + Admin CSV): `/readiness.html`
  - Career Intelligence Report (6 Archetypes + Employability + PDF): `/career-report.html`
  - ChromaDB Persistent Intern Memory & Role Matching: `/chromadb-memory.html`

---

## 2. Environment Variables Configuration (Names Only — Zero Secrets in Git)

> [!IMPORTANT]
> **Zero-Secret Policy:** Never commit `.env` files, API keys, JWT secrets, or database passwords to Git. Configure all values exclusively in the Railway or Render dashboard. See [`.env.example`](.env.example).

| Variable Name | Required | Default / Behavior | Purpose |
|---|---|---|---|
| `PORT` | Auto | `3000` (or PaaS assigned) | Dynamic HTTP listening port |
| `NODE_ENV` | Recommended | `production` | Production caching & logging mode |
| `HOST` | Recommended | `0.0.0.0` | Bind all container interfaces |
| `GROQ_API_KEY` | Optional | Local deterministic fallback if unset | Primary LLM (`llama-3.3-70b-versatile`) |
| `OPENROUTER_API_KEY` | Optional | Local deterministic fallback if unset | Secondary fallback LLM (`meta-llama/llama-3.3-70b-instruct`) |
| `JWT_SECRET` | Required in Prod | Ephemeral dev key if unset | HMAC-SHA256 signing secret for stateless JWT auth |
| `MYSQL_HOST` | Optional | In-memory fallback if unreachable | MySQL 8.0 hostname |
| `MYSQL_PORT` | Optional | `3306` | MySQL 8.0 port |
| `MYSQL_DATABASE` | Optional | `espocrm` | Target relational database name |
| `MYSQL_USER` | Optional | `espocrm` | MySQL service username |
| `MYSQL_PASSWORD` | Optional | None | MySQL service password |
| `CLIENT_TIMEZONE` | Optional | `Asia/Kolkata` | Timezone for daily dashboard queries |

---

## 3. Steps Taken to Deploy

### Option A: Railway (Primary Production)
1. **Create Account & Connect GitHub:** Signed in to [Railway](https://railway.app) with GitHub and linked the fork `muralivismitha143-oss/cynaris-intership`.
2. **Branch & Build Configuration:** Configured automatic builds from `main` (or production branch) using [`railway.json`](railway.json) (`builder: NIXPACKS`, build command `cd backend && npm install`, start command `node backend/server.js`).
3. **Environment Variables:** Added `NODE_ENV`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `JWT_SECRET`, and `CLIENT_TIMEZONE` in Railway **Variables**.
4. **Healthcheck & Domain:** Configured `/api/health` (`30s` timeout, `ON_FAILURE` restart policy) and generated public domain `https://cynaris-recruitment-production.up.railway.app`.
5. **CI/CD Automation:** Configured [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) (`test` -> `build-and-push` via [`Dockerfile`](Dockerfile) -> `deploy` webhook + `/api/health` polling).

### Option B: Render (Staging / Node Mirror)
1. **New Web Service via Blueprint:** Connected repository to [Render](https://render.com) using [`render.yaml`](render.yaml).
2. **Build & Start Commands:** `cd backend && npm install` and `node backend/server.js` with `healthCheckPath: /api/health`.
3. **Environment Variables:** Populated `GROQ_API_KEY` and `OPENROUTER_API_KEY` in the Render dashboard (`sync: false`).

---

## 4. Post-Deployment Verification

```powershell
# 1. Health check & active modules verification
curl -i https://cynaris-recruitment-production.up.railway.app/api/health

# 2. Week 8 Readiness Admin & CSV Export
curl -s https://cynaris-recruitment-production.up.railway.app/api/cia/readiness/admin
curl -I https://cynaris-recruitment-production.up.railway.app/api/cia/readiness/export-csv

# 3. Career Intelligence Report & PDF
curl -s -X POST https://cynaris-recruitment-production.up.railway.app/api/cia/career/report/generate -H "Content-Type: application/json" -d '{"candidate_id":1}'
curl -I https://cynaris-recruitment-production.up.railway.app/api/cia/career/report/1/pdf

# 4. ChromaDB Persistent Memory & Internship Matching
curl -s -X POST https://cynaris-recruitment-production.up.railway.app/candidate/cia/career/match-internships -H "Content-Type: application/json" -d '{"candidateId":1,"limit":5}'
```

---

## 5. Known Issues & Mitigations

1. **Ephemeral Filesystem on Cloud PaaS Free Tiers:**
   - *Issue:* `backend/data/chromadb_store.json` is stored locally on container disk unless a persistent volume is mounted; container redeploys reset local JSON files.
   - *Mitigation:* `ChromaPersistentStore` auto-seeds all 20 `cynaris_internship_roles` and baseline intern #1 profile on startup; mount a persistent Railway Volume at `/app/backend/data` or attach managed MySQL/ChromaDB for durable production state.
2. **Render Free Tier Cold Starts:**
   - *Issue:* Services spin down after 15 minutes of inactivity, causing a 30–50s initial wake-up latency.
   - *Mitigation:* `/api/health` performs zero blocking network calls and responds immediately once booted.
3. **Offline / Unconfigured LLM Keys:**
   - *Behavior:* If `GROQ_API_KEY` and `OPENROUTER_API_KEY` are absent, all AI endpoints fail over cleanly to deterministic local engines so the UI never crashes.
4. **Laravel + DomPDF Runtime Separation:**
   - *Issue:* Node.js PaaS containers do not run PHP-FPM natively.
   - *Mitigation:* All Laravel endpoints (`CiaController.php`, `report_pdf.blade.php`, `cia.blade.php`) have full Express API + `%PDF-1.4` + HTML portal parity in `backend/`.
