# Pull Request: Week 7 Full Feature Implementation — Career Intelligence (CIA Mode), Multi-Agent Systems & Vector Workflows

**Author:** Murali  
**Branch:** `feat/cynaris-w7d5-murali` -> `main`  
**Repository:** `muralivismitha143-oss/cynaris-intership`  
**Live Production URL (Railway):** [Railway Production](https://cynaris-recruitment-production.up.railway.app)  
**Live Staging URL (Render):** [Render Staging](https://cynaris-recruitment.onrender.com)  
**CIA Candidate Portal:** [http://localhost:3000/candidate/cia](http://localhost:3000/candidate/cia)  
**Overall Test Status:** 32/32 Test Suites Passing (100% Pass Rate)

---

### Description

This pull request delivers the full-stack architecture and AI systems for **Week 7: Project 4 — Career Intelligence (CIA Mode), Vector Embeddings, Multi-Agent Systems & LangGraph Workflows**, completing all 5 milestones:

1. **Day 1: Architecture Design — Career Intelligence CIA Mode + API Contracts**
   - Engineered the foundational multi-tier Generative AI Career Advisor and Quantitative Skill Gap Engine (`backend/modules/ai/CareerIntelligenceService.js`).
   - Integrated dual-provider LLM inference: **Groq** (`llama-3.3-70b-versatile`) as primary LPU engine and **OpenRouter** (`meta-llama/llama-3.3-70b-instruct`) as automatic failover.
   - Formulated normalized multi-attribute utility model calculating weighted skill gaps:
     $$\text{Gap Score} = 100 \times \left(1 - \frac{\sum w_s \cdot \min(1, \frac{L_{\text{candidate}}}{L_{\text{target}}})}{\sum w_t}\right)$$
   - Integrated ChromaDB vector store semantic matching ($\cos \theta \ge 0.85$).
   - Established dual-stack API parity across Laravel (`CiaController.php`, `routes/web.php`) and Express (`backend/routes/ciaRouter.js`).
   - Test Suite: `tests/test_career_intelligence_cia.js` (19/19 passing).

2. **Day 2: Module 1: Skill Gap Analysis — LlamaIndex + Groq Pipeline**
   - Curated canonical skills taxonomy in `data/skills_taxonomy.json` defining 50 technical competencies partitioned across 5 domains (Frontend, Backend, Database, Cloud & DevOps, AI & ML).
   - Engineered LlamaIndex keyword relevance retrieval dynamically extracting grounded benchmark context based on candidate profile and target job role, eliminating hallucinations.
   - Enforced per-candidate namespace isolation (`candidate_${candidateId}_skill_gaps`) in ChromaDB.
   - Implemented interactive Chart.js 5-domain radar visualization (`#cia-skill-radar-chart`) in `cia.blade.php`.
   - Test Suite: `tests/test_llamaindex_skill_gap.js` (10/10 passing).

3. **Day 3: Module 2: Career Recommendation Engine — CrewAI Agent**
   - Configured autonomous `CareerAdvisorAgent` with role `"Senior Career Counsellor with 15 years experience in tech placement"`.
   - Coordinated 3 specialized agent tools:
     - `skill_gap_fetcher`: Ingests candidate skill gaps persisted in ChromaDB namespace.
     - `job_role_matcher`: Evaluates candidate competencies across 3 high-conviction tech pathways.
     - `learning_recommender`: Maps gaps to sequenced Moodle courses (`CYN-FS-101`, `CYN-OPS-103`, `CYN-AI-201`) and outputs 6-month milestones.
   - Enhanced candidate UI with an autonomous recommendation card deck (`#crewai-recommendations-section`) in `cia.blade.php`.
   - Test Suite: `tests/test_crewai_career_recommendations.js` (11/11 passing).

4. **Day 4: Module 3: Internship Matching — ChromaDB Vector Search**
   - Seeded 20 distinct technical internship profiles in `data/internship_roles.json` across 5 departments.
   - Implemented `generateSentenceTransformerEmbedding` projecting corpora into a **384-dimensional dense vector space** (`all-MiniLM-L6-v2` architecture).
   - Enforced mathematical **L2 unit vector normalization** ($\lVert \mathbf{v} \rVert = 1.0$) and exact **cosine similarity** calculations in $[-1.0, 1.0]$.
   - Formulated hybrid matching metric balancing semantic cosine similarity (40%) with discrete required skill match ratio (60%):
     $$S_{\text{hybrid}} = 0.40 \cdot \left(\frac{\cos(\theta) + 1.0}{2.0}\right) + 0.60 \cdot \left(\frac{|S_{\text{matched}}|}{|S_{\text{required}}||}\right)$$
   - Built skill discrimination engine isolating `matchedSkills` (green badges) and `missingSkills` (amber/red badges).
   - Rendered top 5 ranked role cards in `#chromadb-internship-matching-section`.
   - Test Suite: `tests/test_chromadb_internship_matching.js` (10/10 passing).

5. **Day 5: Module 4: Learning Path Generator — LangGraph Workflow**
   - Designed 5-node LangGraph State Machine: `AssessCurrentState` $\to$ `IdentifyGaps` $\to$ `GeneratePlan` $\to$ `ValidatePlan` $\to$ `OutputPlan`.
   - Preserves state carrying `intern_profile`, `skill_gaps`, `target_role`, `generated_plan`, and `node_history`.
   - Synthesizes week-by-week curriculum for 8 weeks with specific technical topics, Moodle course resources, daily commitments, and weekly milestones.
   - Enforces strict pedagogical critic validation (`ValidatePlan` verifying $\le 3.5\text{ hrs/day}$ daily commitment and 8-week completeness).
   - Synthesizes valid interactive **Mermaid timeline diagram** (`timeline`, `section`, `Week 1`..`Week 8`).
   - Mounted `POST /candidate/cia/career/learning-path` in Laravel and Express.
   - Enhanced `cia.blade.php` with `#langgraph-learning-path-section`, interactive trigger button, Mermaid timeline display, and 8 weekly curriculum cards.
   - Test Suite: `tests/test_langgraph_learning_path.js` (14/14 passing).

---

### Verification & Testing

```powershell
npm test
```
**Results:** All **32 test suites passing (100% pass rate)**.
- EspoCRM Setup (5 tests)
- React Virtual DOM Engine (4 tests)
- Business Process Mapping (4 tests)
- React Props & Unidirectional Flow (3 tests)
- CRM Workflow Engine (4 tests)
- React State & Forms (5 tests)
- Activity Dashboard SQL (4 tests)
- React useEffect (4 tests)
- AI Conversation Summarizer (6 tests)
- React Router Client (4 tests)
- Smart Reminders AI Timing (6 tests)
- Node.js Event Loop Architecture (6 tests)
- Express Routing & Preferences (7 tests)
- REST API Debugging & Cache (9 tests)
- MySQL CRUD & Migrations (8 tests)
- Stateless JWT Auth (10 tests)
- Docker & CI/CD Pipeline (8 tests)
- Moodle Setup (8 tests)
- Moodle Core Tables & Queries (13 tests)
- Moodle Block Plugin (22 tests)
- Moodle Chart.js Dashboard (14 tests)
- Moodle UI Bug Fixes (11 tests)
- Moodle AI Tutor (15 tests)
- Moodle AI Quiz Generation (15 tests)
- Moodle AI Recommendations (14 tests)
- Moodle Performance Audit & EXPLAIN (16 tests)
- Moodle Deployment & Capstone (13 tests)
- Career Intelligence CIA Mode (19 tests)
- LlamaIndex Skill Gap RAG (10 tests)
- CrewAI Career Recommendations (11 tests)
- ChromaDB Internship Matching (10 tests)
- LangGraph Learning Path Generator (14 tests)

---

### Checklist
- [x] All 5 Week 7 lessons completed without shortcuts.
- [x] Strict dual-stack parity between Laravel and Express architectures.
- [x] Multi-tier resilience: Groq primary, OpenRouter fallback, local deterministic engine.
- [x] Full test coverage with zero breaking changes across earlier modules.
- [x] Zero hardcoded credentials or API keys.
- [x] Complete documentation in `docs/` and viva answers documented.
