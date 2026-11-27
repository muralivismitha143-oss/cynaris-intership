# Week 8 Day 4: Internship Submission Report

**Topic:** CIA Memory Layer — ChromaDB Persistent Intern Profile  
**Student Name:** Murali  
**Branch:** `feat/cynaris-w8d4-murali`  
**Date:** November 27, 2026  
**Repository:** Cynaris Recruitment Platform  
**Overall Test Status:** 36/36 Test Suites Passing (100% Pass Rate)  
**Day Test Suite:** `tests/test_cia_memory_layer.js` (6/6 Tests Passing)

---

## 1. Executive Summary & Deliverables

Implemented the persistent **CIA Memory Layer** backed by ChromaDB collections (`cynaris_intern_profiles`, `cynaris_intern_memory_events`, and `cynaris_internship_roles` with 20 seeded 384-dim role embeddings) so the Career Intelligence platform retains and reasons over intern progress, verified skills, and interaction history across restarts.

### Deliverables Completed:
- [`backend/modules/ai/ChromaPersistentStore.js`](../backend/modules/ai/ChromaPersistentStore.js) — atomic disk-backed ChromaDB vector collection manager.
- [`backend/modules/ai/CareerIntelligenceService.js`](../backend/modules/ai/CareerIntelligenceService.js) — `upsertInternMemoryProfile`, `getInternMemoryProfile`, `queryInternMemoryAndReason`, `ensureInternshipRolesSeededInChroma`, and memory-aware `matchInternshipsWithChromaDB`.
- [`backend/routes/ciaRouter.js`](../backend/routes/ciaRouter.js), [`app/Http/Controllers/Web/CiaController.php`](../app/Http/Controllers/Web/CiaController.php), [`routes/web.php`](../routes/web.php) — `/memory/profile`, `/memory/profile/:candidateId`, `/memory/query`, and `/candidate/cia/career/match-internships`.
- [`backend/public/chromadb-memory.html`](../backend/public/chromadb-memory.html) & [`resources/views/candidate/cia.blade.php`](../resources/views/candidate/cia.blade.php) — interactive ChromaDB memory & ranked Top 5 internship matching UI.

---

## 2. Viva Voce Questions & Answers

### Question 1: "Walk me through your implementation — what did you build and why did you structure it that way?"
**Answer:**
I built a three-collection persistent vector memory architecture in `ChromaPersistentStore.js` integrated with `CareerIntelligenceService.js`:
1. **`cynaris_internship_roles`**: Stores all 20 seeded roles from `data/internship_roles.json` with pre-computed 384-dimensional `sentence-transformers` embeddings so `POST /candidate/cia/career/match-internships` never recomputes role vectors unnecessarily.
2. **`cynaris_intern_profiles`**: Stores each intern's canonical profile (skills, progress %, completed modules, assessments, and rolling history) keyed by `intern_${candidateId}`. When `match-internships` is called with only a `candidateId`, the service automatically recalls their persisted skills from ChromaDB.
3. **`cynaris_intern_memory_events`**: Stores timestamped semantic event chunks (progress milestones, match runs) so `POST /api/cia/memory/query` can retrieve the most relevant historical events via cosine similarity and feed them into Groq/OpenRouter for context-aware reasoning.

### Question 2: "What was the most challenging part and how did you solve it?"
**Answer:**
The main challenge was guaranteeing **crash-safe persistence and clean isolation** between restarts and test runs without requiring an external Python Chroma daemon during CI execution.
- I implemented atomic disk writes (`writeFileSync` to a PID-scoped `.tmp` file followed by `renameSync`) in `ChromaPersistentStore.js` so partial writes never corrupt `chromadb_store.json`.
- I also injected `persistentStore` cleanly via constructor options in `CareerIntelligenceService`, allowing unit tests to verify genuine disk rehydration in isolated temp files while production uses `backend/data/chromadb_store.json`.

### Question 3: "If you had one more day, what would you improve?"
**Answer:**
1. **Live Python `chromadb` + `sentence-transformers` Sidecar Sync:** Bridge `ChromaPersistentStore` to a containerized Python `chromadb` HTTP server running `all-MiniLM-L6-v2` ONNX embeddings with HNSW indexing for sub-10ms ANN retrieval at scale.
2. **Memory Compaction / Summarization:** Periodically summarize older `cynaris_intern_memory_events` into monthly milestone digests via Groq so prompt context stays compact over multi-month internships.
3. **Cross-Session Memory Diffing:** Highlight week-over-week skill growth and match percentage deltas directly in the candidate UI.

---

## 3. Self-Review Checklist

- [x] Collection `cynaris_internship_roles` created and seeded with 20 internship role profiles (`data/internship_roles.json`).
- [x] 384-dim `sentence-transformers` local embeddings generated and persisted on disk (`ChromaPersistentStore.js`).
- [x] `POST /candidate/cia/career/match-internships` embeds/recalls candidate skills, performs cosine similarity search, returns Top 5 ranked roles with match % & missing skills, and displays them in CIA UI.
- [x] Persistent intern memory endpoints (`/memory/profile`, `/memory/query`) retain and reason over progress, skills, and history.
- [x] Minimum 2 meaningful conventional commits, no hardcoded secrets, CIA interactions logged in [`docs/CIA_LOG.md`](CIA_LOG.md).
- [x] All 36 test suites passing (`npm test`).
