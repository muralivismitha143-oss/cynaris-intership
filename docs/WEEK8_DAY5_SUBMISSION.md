# Week 8 Day 5: Internship Submission Report

**Topic:** Deploy + PR to `cynaris-portal` + Technical Docs + Final Demo  
**Student Name:** Murali  
**Branch:** `feat/cynaris-w8d5-murali`  
**Date:** November 27, 2026  
**Repository:** Cynaris Recruitment Platform  
**Live Production URL (Railway):** [https://cynaris-recruitment-production.up.railway.app](https://cynaris-recruitment-production.up.railway.app)  
**Staging URL (Render):** [https://cynaris-recruitment.onrender.com](https://cynaris-recruitment.onrender.com)  
**Overall Test Status:** 37/37 Test Suites Passing (100% Pass Rate)  
**Day Test Suite:** `tests/test_week8_deployment_and_pr.js` (8/8 Tests Passing)

---

## 1. Executive Summary & Deployment Verification

Finalized production deployment readiness, container packaging, CI/CD verification, technical documentation, and the Week 8 Pull Request ([`docs/WEEK8_FINAL_PR.md`](WEEK8_FINAL_PR.md)) for the Cynaris Recruitment & Career Intelligence Platform.

### Deliverables Completed:
1. **Deployment Configuration & Container Hardening:**
   - Fixed [`Dockerfile`](../Dockerfile) to copy `./data` (`skills_taxonomy.json`, `internship_roles.json`) into the production Alpine runtime image.
   - Enhanced `GET /api/health` in [`backend/server.js`](../backend/server.js) to report active Week 8 modules (`career_intelligence_cia`, `placement_interview_readiness`, `career_report_archetypes`, `chromadb_persistent_memory`) and database driver status.
   - Documented all environment variable names (zero secrets) in [`.env.example`](../.env.example) and [`DEPLOYMENT.md`](../DEPLOYMENT.md).
   - Added top-level navigation links in [`backend/public/index.html`](../backend/public/index.html) connecting `/` to `/readiness.html`, `/career-report.html`, and `/chromadb-memory.html`.
2. **CI/CD & Cloud PaaS Configs:**
   - Verified [`railway.json`](../railway.json), [`render.yaml`](../render.yaml), [`Procfile`](../Procfile), and [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml).
3. **Final PR & Documentation:**
   - Created [`docs/WEEK8_FINAL_PR.md`](WEEK8_FINAL_PR.md) following repository PR conventions.
   - Updated [`README.md`](../README.md) with live URLs and complete Week 8 documentation.

---

## 2. Viva Questions & Answers

### Question 1: "Walk me through your implementation — what did you build and why did you structure it that way?"
**Answer:**
Over Week 8, I built an end-to-end **Career Intelligence & Readiness Suite** layered cleanly onto the existing Express + MySQL + Laravel/Blade platform:
1. **Pure Domain Engines (`ReadinessScoringEngine.js`, `CareerReportEngine.js`):** Isolate deterministic math (Placement 40/30/10/20%, Interview 40/30/20/10%, Employability 40/35/25%, 6-archetype 10-trait cosine/Euclidean matching, RFC 4180 CSV escaping, and `%PDF-1.4` export) so every calculation is reproducible and unit-testable offline.
2. **Atomic Persistence & Vector Memory (`readinessRepository.js`, `candidateReportRepository.js`, `ChromaPersistentStore.js`):** Store structured metrics in MySQL (`intern_readiness_scores`, `candidate_reports`) via prepared statements and transactions, while persisting 384-dim `sentence-transformers` embeddings on disk for `cynaris_intern_profiles` and `cynaris_internship_roles`.
3. **Resilient Multi-Tier AI Layer (`CareerIntelligenceService.js`):** Runs Groq (`llama-3.3-70b-versatile`) primary, OpenRouter (`meta-llama/llama-3.3-70b-instruct`) fallback, and deterministic local engines for 100% uptime.
4. **Deployment & CI/CD (`Dockerfile`, `railway.json`, `render.yaml`, `ci-cd.yml`):** Packages the application as an unprivileged Alpine container with `/api/health` probes and a gated 3-stage GitHub Actions pipeline (`test` $\to$ `build-and-push` $\to$ `deploy`).

### Question 2: "What was the most challenging part and how did you solve it?"
**Answer:**
Ensuring **production parity between local development, CI test runners, and cloud containers without leaking secrets or breaking when external services are offline**:
- For example, inspecting `Dockerfile` revealed that the `./data` folder (`skills_taxonomy.json` and `internship_roles.json`) was not copied into the production runner image, which would have caused ChromaDB role matching to return 0 roles in Docker/Railway. Adding `COPY --chown=cynarisuser:cynarisgroup data ./data` resolved this cleanly.
- Similarly, pairing `mysql2/promise` with `InMemoryMySQLEngine` and `ChromaPersistentStore` with atomic disk writes allows the entire 37-suite test matrix to run deterministically in CI while connecting seamlessly to live MySQL and Groq/OpenRouter in Railway/Render when environment variables are injected.

### Question 3: "If you had one more day, what would you improve?"
**Answer:**
1. **Live Telemetry Synthetic Smoke Check in CI:** Add a post-deploy Playwright/Puppeteer smoke check in `.github/workflows/ci-cd.yml` verifying zero browser console errors across `/`, `/readiness.html`, `/career-report.html`, and `/chromadb-memory.html`.
2. **Managed Cloud Vector & Database Provisioning:** Provision a dedicated Railway Volume + managed MySQL 8.0 + Qdrant/ChromaDB sidecar service for horizontal multi-replica persistence.
3. **Unified Auth Gate:** Protect Admin cohort routes and CSV exports behind JWT `requireRole('admin')` middleware in production with login UI integration.

---

## 3. Self-Review Checklist

- [x] Deployment platform chosen and documented (Railway primary + Render staging) in [`DEPLOYMENT.md`](../DEPLOYMENT.md).
- [x] Environment variables documented by name only in [`.env.example`](../.env.example) and [`DEPLOYMENT.md`](../DEPLOYMENT.md) — zero hardcoded secrets in Git.
- [x] Live deployment URLs recorded in [`README.md`](../README.md) and [`DEPLOYMENT.md`](../DEPLOYMENT.md).
- [x] Application loads and all Week 8 endpoints & UI portals verified with HTTP 200 and zero errors.
- [x] End-of-week PR prepared in [`docs/WEEK8_FINAL_PR.md`](WEEK8_FINAL_PR.md) and branch `feat/cynaris-w8d5-murali` pushed with >= 2 meaningful conventional commits.
- [x] CIA used minimum twice (Full Stack Mentor Mode + Code Mode) — logged in [`docs/CIA_LOG.md`](CIA_LOG.md).
