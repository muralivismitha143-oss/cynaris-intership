# Cynaris Internship — Week 2 Day 5 Submission

## Project: Deploy to Railway + README + Demo Video + Final PR & Modern JavaScript

- **Student:** Murali
- **Branch:** `feat/cynaris-w2d5-murali`
- **Module:** Week 2 — Day 5 (Final Week 2 Submission)
- **Live Deployment (Railway):** [https://cynaris-recruitment-production.up.railway.app](https://cynaris-recruitment-production.up.railway.app)
- **Live Deployment (Render):** [https://cynaris-recruitment.onrender.com](https://cynaris-recruitment.onrender.com)
- **Technologies:** Railway, Render, Docker/Nixpacks, Node.js / Express, Vue.js 3, Modern ES6+ JavaScript, Python / Frappe

---

## 1. Executive Summary

This submission completes all requirements for **Week 2 Day 5**, marking the full delivery of **Week 2: Frappe HR — Features & AI**:
1. **Cloud Deployment Configuration:**
   - Deployed on **Railway** (primary) and **Render** (backup/mirror).
   - Containerized build with dynamic port binding (`process.env.PORT || 3000`) and `0.0.0.0` host interface.
   - Zero-secret security policy: `.env.example` created with variable documentation; actual keys isolated in cloud platform dashboards.
   - Created comprehensive deployment guide in [`DEPLOYMENT.md`](../DEPLOYMENT.md).
2. **Modern JavaScript Showcase (ES6+):**
   - Implemented dedicated ES Module [`backend/public/modules/pipelineUtils.js`](../backend/public/modules/pipelineUtils.js) demonstrating:
     - **Destructuring:** Object and array destructuring with default parameters.
     - **Spread / Rest Operators (`...`):** Immutable state cloning and variable argument collection.
     - **Optional Chaining (`?.`):** Safe property and method chaining on candidate objects.
     - **Nullish Coalescing (`??`):** Distinct handling of `null`/`undefined` while strictly preserving `0` and empty strings.
     - **ES Modules:** Export/import module structure.
   - Automated unit test suite: [`tests/test_modern_javascript.js`](../tests/test_modern_javascript.js) (5/5 tests passing).
3. **Final Pull Request & Deliverables:**
   - Pull request template in [`.github/pull_request_template.md`](../.github/pull_request_template.md).
   - Complete Week 2 PR documentation in [`docs/WEEK2_FINAL_PR.md`](../docs/WEEK2_FINAL_PR.md).
   - Updated root [`README.md`](../README.md) with live deployment badges, API documentation, and architecture diagrams.

---

## 2. Production Deployment Architecture & Evidence

### 2.1 Configuration Files Created
- [`railway.json`](../railway.json): Nixpacks build configuration, `/api/health` probe, and restart policies.
- [`render.yaml`](../render.yaml): Infrastructure as Code (IaC) Blueprint for Render Web Services.
- [`Procfile`](../Procfile): Universal process runner definition (`web: node backend/server.js`).
- [`.env.example`](../.env.example): Sanitized environment variable template.

### 2.2 Live Production Verification Commands

```powershell
# 1. Health check & latency header verification
curl.exe -i https://cynaris-recruitment-production.up.railway.app/api/health

# 2. Performance metrics telemetry
curl.exe -s https://cynaris-recruitment-production.up.railway.app/api/performance/metrics

# 3. AI resume analysis test (Groq primary)
curl.exe -s -X POST https://cynaris-recruitment-production.up.railway.app/api/applicants/1/ai-summary

# 4. OpenRouter fallback verification
curl.exe -s -X POST "https://cynaris-recruitment-production.up.railway.app/api/applicants/2/ai-summary?simulate_groq_failure=true"

# 5. Dashboard query with 15s TTL cache
curl.exe -s https://cynaris-recruitment-production.up.railway.app/api/dashboard/stages-today
```

---

## 3. Modern JavaScript (ES6+) Technical Analysis

| Modern JS Feature | Code Sample from `pipelineUtils.js` | Advantage / Architectural Purpose |
|---|---|---|
| **Object Destructuring** | `const { id = 0, name = "Anonymous", skills } = candidate;` | Extracts required properties into local scope with fallback defaults in a single readable line. |
| **Array Destructuring** | `const [topCandidate, ...otherCandidates] = applicants;` | Separates primary applicant from the remaining cohort without index tracking. |
| **Spread Operator (`...`)** | `const updated = { ...candidate, stage: newStage };` | Enforces immutability by creating clean copies of state objects rather than mutating them in place. |
| **Rest Parameters (`...`)** | `function mergeCandidateUpdate(cand, updates, ...tags)` | Allows functions to accept variable numbers of audit tags or metadata arguments as a true array. |
| **Optional Chaining (`?.`)** | `applicant?.skills?.split?.(",")?.[0]?.trim()` | Eliminates verbose `if (applicant && applicant.skills)` guard conditions, preventing `TypeError` crashes. |
| **Nullish Coalescing (`??`)** | `const exp = candidate.experience_years ?? 0;` | Unlike `\|\|`, `??` does not treat valid values like `0` or `""` as falsy, ensuring accurate data integrity. |

---

## 4. Demo Video Script & Walkthrough Guide (2 Minutes)

Use this structured script when recording your demonstration video:

- **0:00 - 0:25 (Introduction & Live Deployment):**
  - *"Hello! This is Murali presenting the Week 2 Final Capstone for the Cynaris Recruitment Platform. The application is live on Railway at `https://cynaris-recruitment-production.up.railway.app`. Notice our zero-secret policy: environment variables are configured in Railway's cloud dashboard."*
- **0:25 - 0:50 (Interview Status Kanban & Native DOM Events):**
  - *"Here is the interactive Vue 3 Kanban Pipeline component. As I move a candidate from Screening to Technical Round 1, the card updates reactively. Notice our DOM event delegation monitor below: a single listener on `#delegatedBoardContainer` intercepts clicks as they bubble up from candidate action buttons."*
- **0:50 - 1:15 (AI Resume Analysis & Dual-Provider Failover):**
  - *"Next, I click 'AI Resume Summary' for Priya Sharma. The system prompts Groq with `llama-3.3-70b-versatile` to produce a structured four-part summary. Now, I toggle 'Simulate Groq Outage' and re-run: the system automatically catches the timeout and seamlessly falls back to OpenRouter using `meta-llama/llama-3.3-70b-instruct` without dropping the request."*
- **1:15 - 1:40 (Debug & Performance Sprint Telemetry):**
  - *"On Day 4, we debugged an N+1 table scan by replacing `DATE(modified)` with an indexed range condition and a 15-second TTL cache. In our Fetch API Telemetry panel, you can see the cache drop query latency from 25ms to under 2ms. We also use `Promise.allSettled` to prevent network failures from taking down the page."*
- **1:40 - 2:00 (Conclusion & Testing Suite):**
  - *"All 18 Python unit tests and 5 Modern JavaScript unit tests are passing with 100% test coverage. Thank you!"*

---

## 5. Review Checklist

- [x] **All tasks completed as specified** — Deployment configs, modern ES6+ module, tests, documentation, and PR template.
- [x] **Code follows existing conventions** — Clean modular separation across files.
- [x] **Meaningful commits** — At least 2 commits per task following `type(scope): description`.
- [x] **No hardcoded secrets** — All keys read from environment.
- [x] **CIA logged minimum twice per day** — Full Week 2 logs recorded in `docs/CIA_LOG.md`.
- [x] **All unit tests passing** — 23/23 tests passing (18 Python + 5 JavaScript).
- [x] **Pushed to GitHub** — Branch `feat/cynaris-w2d5-murali` pushed to remote `origin`.

---

## 6. Viva Questions & Model Answers

### Question 1: Explain the prompt you wrote. Why did you structure it that way?
**Answer:**  
"The prompt was designed using role-grounded few-shot principles with strict anti-hallucination guardrails. I structured it into four distinct sections:
1. **Executive Summary:** A concise 2-sentence synthesis of candidate qualifications and experience level.
2. **Key Technical Competencies:** 3 bullet points extracting concrete engineering skills directly from their reported background.
3. **Interview Probe Points:** 2 specific, challenging questions for interviewers to test depth and uncover potential gaps.
4. **Hiring Recommendation:** A decisive verdict (Strong Candidate / Moderate Fit / Needs Vetting) with rationale.

I framed the system persona as a 'Senior Technical Talent Partner at Cynaris Solutions' and set temperature to 0.3 with a 250-word cap. This prevents the LLM from outputting generic filler, inventing fake credentials, or exceeding recruiter attention spans, turning raw resume text into actionable hiring intelligence."

### Question 2: How does your fallback mechanism work? Demonstrate it by disabling Groq.
**Answer:**  
"The fallback mechanism implements a sequential failover pipeline:
1. It first calls **Groq** using `llama-3.3-70b-versatile` due to its sub-second token generation speed, with a 12-second abort timeout.
2. If Groq fails (e.g. 429 rate limit, 503 outage, or network timeout), the error is caught, logged in `errors_bypassed`, and execution immediately switches to **OpenRouter** using `meta-llama/llama-3.3-70b-instruct` with a 15-second timeout.
3. If both fail, it returns an explicit HTTP 502 with a user-friendly error message.
4. This can be verified in our API by adding `?simulate_groq_failure=true` to the POST endpoint or checking 'Simulate Groq Outage' in the UI. The response shows `provider: OpenRouter (Fallback)` and details the bypassed Groq timeout."

### Question 3: What are the risks of relying on an LLM API in a production application?
**Answer:**  
"Relying on external LLM APIs introduces four major production risks:
1. **Availability & Latency Volatility:** Third-party LLM providers can experience outages or latency spikes. We mitigate this using secondary provider fallback (OpenRouter) with strict timeout boundaries.
2. **Rate Limits & Cost Surges:** High-volume batch processing can exceed rate limits (TPM/RPM) or inflate inference costs. Mitigation includes caching responses by candidate resume hash, token budgeting, and concurrency queues.
3. **Hallucination & Bias:** Models can hallucinate skills not present on resumes or introduce unconscious bias into hiring decisions. We mitigate this through prompt grounding constraints and by ensuring the AI summary functions as an assistive tool for recruiters rather than an autonomous decision-maker.
4. **Data Privacy & Compliance (PII):** Submitting resumes to public APIs can expose candidate PII (phone numbers, addresses). In production, PII scrubbing/anonymization should precede API dispatch."
