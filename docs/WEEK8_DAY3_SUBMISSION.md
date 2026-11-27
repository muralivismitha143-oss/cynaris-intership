# Week 8 Day 3: Internship Submission Report

**Topic:** Career Intelligence Report — Archetype Map + Employability Score  
**Student Name:** Murali  
**Branch:** `feat/cynaris-w8d3-murali`  
**Date:** November 27, 2026  
**Repository:** Cynaris Recruitment Platform  
**Overall Test Status:** 35/35 Test Suites Passing (100% Pass Rate)  
**Day Test Suite:** `tests/test_career_intelligence_report.js` (8/8 Tests Passing)

---

## 1. Deliverables & Task Summary

1. **6 Career Archetypes (`Builder`, `Analyst`, `Leader`, `Innovator`, `Specialist`, `Generalist`)** with 10-attribute trait profiles (0–10) in [`backend/modules/ai/CareerReportEngine.js`](../backend/modules/ai/CareerReportEngine.js).
2. **Archetype Scoring Algorithm:** Maps intern skill scores, learning style, and project performance into a 10-trait vector and computes ranked match scores (`primary_archetype`, `secondary_archetype`, all 6 match percentages).
3. **Composite Career Scores (0–100):** Employability Score (`40/35/25%`), AI Readiness Score (`60/40%` tasks & tools), and Placement Readiness Score (`40/30/10/20%`).
4. **Groq Primary + OpenRouter Fallback Report Generation & `candidate_reports` DB Persistence:** Stored atomically via [`backend/database/candidateReportRepository.js`](../backend/database/candidateReportRepository.js) and [`backend/database/schema.sql`](../backend/database/schema.sql).
5. **PDF Export (DomPDF + Express Binary PDF):** [`composer.json`](../composer.json), [`resources/views/candidate/report_pdf.blade.php`](../resources/views/candidate/report_pdf.blade.php), [`app/Http/Controllers/Web/CiaController.php`](../app/Http/Controllers/Web/CiaController.php), and [`backend/public/career-report.html`](../backend/public/career-report.html) + [`resources/views/candidate/cia.blade.php`](../resources/views/candidate/cia.blade.php).
6. **Business Process Map Document (Lead → Closure):** Maintained and verified in [`docs/BUSINESS_PROCESS_MAPPING.md`](BUSINESS_PROCESS_MAPPING.md).

---

## 2. Evidence of 3 API Calls Made

```text
1) GET /api/cia/career/archetypes -> HTTP 200 OK
   {"success":true,"total":6,"archetypes":["Builder","Analyst","Leader","Innovator","Specialist","Generalist"]}

2) POST /api/cia/career/report/generate -> HTTP 200 OK
   {"success":true,"report_id":2,"primary_archetype":"Builder","employability_score":91.6,"ai_readiness_score":94,"placement_readiness_score":93.1}

3) GET /api/cia/career/report/1/pdf -> HTTP 200 OK
   Content-Type: application/pdf | Content-Disposition: attachment; filename="career-intelligence-report-1.pdf" | Header: %PDF-1.4
```

---

## 3. Notes on 2 Existing Automation Rules

From [`backend/database/schema.sql`](../backend/database/schema.sql) and [`backend/modules/smartReminders/RuleEngine.js`](../backend/modules/smartReminders/RuleEngine.js):
1. **`rule-1` — Stalled Technical Round Follow-up (`JobApplicant`, `Technical Round 1`, threshold `48h`, urgency `High`, channel `Email`):** Fires automatically via the EventEmitter rule engine when a candidate remains in `Technical Round 1` for over 48 hours without scorecard activity, triggering an AI-timed follow-up reminder.
2. **`rule-2` — Offer Decision & Acceptance Check-in (`JobApplicant`, `Offered`, threshold `72h`, urgency `Critical`, channel `WhatsApp`):** Monitors candidates in the `Offered` stage idle beyond 72 hours and schedules an IST-aware WhatsApp check-in reminder respecting recruiter quiet hours.

---

## 4. Viva Voce Questions & Answers

### Question 1: "How does your skill gap analysis calculate the gap score?"
**Answer:**
Our `calculateSkillGap()` engine computes a normalized weighted multi-attribute utility score across every required skill $s$ in the target role:
$$\text{Gap Score} = 100 \times \left(1 - \frac{\sum_{s} w_s \cdot \min\left(1, \frac{L_{\text{candidate}, s}}{L_{\text{target}, s}}\right)}{\sum_{s} w_s}\right)$$
Each skill has a target proficiency level ($1\text{–}5$) and importance weight $w_s \in [1, 3]$ (`Critical = 3.0`, `Important = 2.0`, `Nice-to-have = 1.0`). Clamping $\frac{L_{\text{candidate}}}{L_{\text{target}}}$ at $1.0$ prevents over-qualification in one skill from masking critical gaps in another, while `readinessScore = 100 - gapScore` classifies candidates into `READY_FOR_HIRE`, `NEAR_TARGET`, `MODERATE_GAP`, or `HIGH_UPSKILLING_REQUIRED`.

### Question 2: "Why did you choose ChromaDB for the vector store? What alternatives exist?"
**Answer:**
We chose **ChromaDB** because it is developer-friendly, embeds cleanly alongside Python/Node microservices with zero heavyweight cluster setup, and natively supports **per-candidate namespace/collection isolation** (`candidate_${id}_skill_gaps`, `cynaris_internship_roles`) plus cosine similarity queries on 384-dim (`all-MiniLM-L6-v2`) and 1536-dim embeddings.
- **Alternatives:** **pgvector** (ideal if keeping relational MySQL/Postgres data and vectors in a single ACID database), **Qdrant** (high-throughput Rust engine with rich payload filtering), **Pinecone** (managed serverless cloud vector DB), **Milvus / Zilliz** (distributed billion-scale clusters), and **FAISS** (in-process Meta similarity library without built-in metadata CRUD).

### Question 3: "How would this Career Intelligence module scale to 10,000 users?"
**Answer:**
1. **Database & Connection Pooling:** Keep `mysql2` pooled connections with indexed queries on `(candidate_id, created_at)` in `candidate_reports` and `(intern_id)` in `intern_readiness_scores`, offloading read-heavy Admin cohort views to a read replica and 15s–60s Redis/in-memory TTL caches.
2. **Asynchronous AI & PDF Offloading:** Move Groq/OpenRouter report synthesis and DomPDF rendering off synchronous HTTP threads into a job queue (**BullMQ / Redis** or **Laravel Horizon**), storing rendered PDFs in S3/object storage with signed download URLs.
3. **LLM Throughput & Cost Control:** Pre-compute deterministic scores and vector searches first (reducing prompt tokens), apply per-user rate limiting, and maintain multi-provider circuit breakers (Groq primary $\to$ OpenRouter secondary $\to$ local fallback).
4. **Vector Index Scaling:** Upgrade in-memory cosine scans to an **HNSW** (Hierarchical Navigable Small World) index in ChromaDB/Qdrant/pgvector so nearest-neighbor lookups remain sub-10ms ($O(\log N)$) across 10,000+ candidate profiles.

---

## 5. Self-Review Checklist

- [x] 6 Career Archetypes (Builder, Analyst, Leader, Innovator, Specialist, Generalist) with 10-attribute trait profiles (0–10).
- [x] Archetype scoring algorithm + Employability, AI Readiness, and Placement Readiness scores.
- [x] Groq primary + OpenRouter fallback report generation stored in `candidate_reports`.
- [x] DomPDF export (`barryvdh/laravel-dompdf`, `report_pdf.blade.php`) + Express PDF endpoint + Candidate dashboard UI.
- [x] 3 API call evidence & notes on 2 automation rules documented; Business Process Map verified.
- [x] CIA used minimum twice (Full Stack Mentor Mode + Code Mode) — logged in [`docs/CIA_LOG.md`](CIA_LOG.md).
- [x] All 35 test suites passing (`npm test`).
