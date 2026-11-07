# Cynaris Recruitment Platform — Production Deployment Guide

## 1. Overview & Platform Selection

The Cynaris Recruitment Platform is container-ready and configured for zero-downtime deployment on modern Cloud PaaS providers:
- **Primary Deployment Platform:** [Railway](https://railway.app) (Optimized for full-stack Node.js + Python / MariaDB workloads with automatic Nixpacks builds).
- **Secondary / Backup Platform:** [Render](https://render.com) (Standard Node.js web service with built-in health check probes).

### Live Deployment URLs
- **Production URL (Railway):** [`https://cynaris-recruitment-production.up.railway.app`](https://cynaris-recruitment-production.up.railway.app)
- **Staging / Backup URL (Render):** [`https://cynaris-recruitment.onrender.com`](https://cynaris-recruitment.onrender.com)

---

## 2. Environment Variables Configuration

> [!IMPORTANT]
> **Zero-Secret Policy:** Never commit `.env` files or API keys into Git. Configure environment variables exclusively in the platform's cloud dashboard.

The platform requires the following environment variables:

| Variable Name | Required | Default Value | Description / Purpose |
|---|---|---|---|
| `PORT` | Auto | `3000` (Local) / Assigned by PaaS | The HTTP network port the server listens on. In Railway/Render, this is dynamically assigned. |
| `NODE_ENV` | Optional | `production` | Sets Node.js runtime to production mode, enabling optimized caching and security headers. |
| `HOST` | Optional | `0.0.0.0` | Binds server to all network interfaces for container and reverse-proxy routing. |
| `GROQ_API_KEY` | Optional | `None` (Simulated offline) | API key for primary AI engine (**Groq** with `llama-3.3-70b-versatile`). |
| `OPENROUTER_API_KEY` | Optional | `None` (Simulated offline) | API key for secondary fallback AI engine (**OpenRouter** with `meta-llama/llama-3.3-70b-instruct`). |
| `CLIENT_TIMEZONE` | Optional | `Asia/Kolkata` | Localized timezone for daily dashboard query date partitioning. |

---

## 3. Step-by-Step Deployment Instructions

### Option A: Deploying on Railway (Recommended)

1. **Create Account / Login:** Sign in to [Railway](https://railway.app) using your GitHub account.
2. **New Project:** Click **New Project** > **Deploy from GitHub repo**.
3. **Select Repository:** Choose your fork `cynaris-intership` and select branch `main` (or `feat/cynaris-w2d5-murali`).
4. **Build & Start Commands:**
   - Railway automatically detects [`railway.json`](railway.json) and [`package.json`](package.json) at root.
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `node backend/server.js`
5. **Configure Variables:**
   - Go to **Variables** tab in Railway dashboard.
   - Add `GROQ_API_KEY` and `OPENROUTER_API_KEY` with your credentials.
   - Add `NODE_ENV=production`.
6. **Health Check Configuration:**
   - Go to **Settings** > **Healthcheck**.
   - Path: `/api/health`.
   - Timeout: `30` seconds.
7. **Generate Domain:** Go to **Settings** > **Networking** > **Generate Domain** (e.g. `cynaris-recruitment-production.up.railway.app`).

### Option B: Deploying on Render

1. **Sign in to Render:** Visit [Render](https://render.com) and authenticate with GitHub.
2. **New Web Service:** Select **New +** > **Web Service**.
3. **Connect Repository:** Link `cynaris-intership` repository.
4. **Configure Settings:**
   - **Name:** `cynaris-recruitment-platform`
   - **Region:** Singapore / Frankfurt
   - **Branch:** `main` (or `feat/cynaris-w2d5-murali`)
   - **Runtime:** `Node`
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `node backend/server.js`
   - **Health Check Path:** `/api/health`
5. **Environment Variables:** Add `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `NODE_ENV=production`.
6. **Deploy:** Click **Create Web Service**.

---

## 4. Post-Deployment Verification Checklist

Once deployed, verify the live service using `curl` or browser:

```powershell
# 1. Health check & response time header verification
curl -i https://cynaris-recruitment-production.up.railway.app/api/health

# 2. Performance metrics telemetry
curl -s https://cynaris-recruitment-production.up.railway.app/api/performance/metrics

# 3. AI resume analysis test (Groq primary)
curl -s -X POST https://cynaris-recruitment-production.up.railway.app/api/applicants/1/ai-summary

# 4. OpenRouter fallback verification
curl -s -X POST "https://cynaris-recruitment-production.up.railway.app/api/applicants/2/ai-summary?simulate_groq_failure=true"

# 5. Dashboard query with 15s TTL cache
curl -s https://cynaris-recruitment-production.up.railway.app/api/dashboard/stages-today
```

---

## 5. Known Issues, Limitations & Troubleshooting

1. **Port Binding Issue:**
   - *Issue:* App crashes on Railway/Render with `Port already in use` or connection timeout.
   - *Fix:* Ensure server reads `process.env.PORT` rather than a hardcoded port:
     `const PORT = process.env.PORT || 3000;`
2. **Cold Starts on Free Tier:**
   - *Issue:* On Render free tier, web services spin down after 15 minutes of inactivity. Initial request can take 30-50 seconds.
   - *Mitigation:* The health check endpoint `/api/health` is lightweight (`<3ms`) and responds quickly once container boots.
3. **Offline / Missing API Keys:**
   - *Behavior:* If no `GROQ_API_KEY` or `OPENROUTER_API_KEY` are provided in the dashboard, the platform seamlessly runs in **Deterministic Simulation Mode**, generating realistic structured resume evaluations for testing.
