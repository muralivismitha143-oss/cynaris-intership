# Cynaris Internship — CIA (Continuous Intelligence Assistant) Interaction Log

**Student Name:** Murali  
**Branch:** `feat/cynaris-w2d2-murali`  
**Date:** October 19, 2026  
**Lesson:** Week 2 Day 2 — Interview Status — Vue.js Frontend Pipeline Component  

---

## Interaction 1: CIA → Full Stack Mentor Mode

### Prompt / Query
> *"I am implementing the Interview Status tracking feature for Week 2 Day 2. The task requires: (1) adding a `pipeline_stage` select field to the Interview DocType with stages: Screening, Technical Round 1, Technical Round 2, HR Round, Offered, Rejected; (2) creating a Python controller method `update_pipeline_stage(applicant_id, stage)` with validation; (3) creating a Kanban-style status badge in the Job Applicant list view using CSS + Jinja template override; (4) a dashboard query to count applicants per pipeline stage for today; and (5) a Vue.js frontend pipeline component utilizing native DOM manipulation methods (`querySelector`, `getElementById`, `innerHTML`, `classList`, `createElement`). Could you review my architecture, validation strategy, and code organization before committing?"*

### CIA Mentor Review & Feedback
1. **Architecture & Separation of Concerns:**
   - Great architectural clarity. Decoupling the data layer (DocType schema), controller logic (`update_pipeline_stage`), presentation layer (Jinja template override and Vue 3 Kanban component), and native DOM utility functions (`DOMPipelineHelper`) ensures high maintainability.
   - For hybrid environments where both Frappe / Python backends and lightweight Express APIs are tested, keeping the business logic consistent across both Python (`cynaris_recruitment/doctype/interview/interview.py`) and Node (`backend/server.js`) enables 100% interoperability.
2. **Validation Strategy:**
   - Always validate parameters before querying the database: verify `applicant_id` is non-null and properly typed, and verify `stage` strictly matches the allowed list (`VALID_STAGES`).
   - Throw explicit HTTP / Frappe error types (`frappe.ValidationError`, `frappe.DoesNotExistError`, or 400/404 HTTP codes) so that frontends can render clear error messages.
3. **Template & DOM Security (XSS Prevention):**
   - In Jinja list view overrides, use `{{ doc.pipeline_stage | lower | replace(" ", "-") }}` for CSS class generation.
   - In frontend DOM manipulation with `innerHTML`, always escape or sanitize untrusted strings (e.g. `applicant.name`) to prevent Cross-Site Scripting (XSS).
4. **Vue.js & DOM Integration:**
   - When integrating native DOM manipulation (`querySelector`, `getElementById`, `createElement`, `classList`, `innerHTML`) alongside Vue 3 reactivity, ensure DOM helper methods operate on designated audit or notification containers (such as `#activityFeedList` and `#toastContainer`) to avoid conflicting with Vue’s Virtual DOM diffing.

### Action Taken
- Implemented `VALID_STAGES` constant across Python and Express controllers.
- Added strict type and existence checks with distinct 400 and 404 responses.
- Implemented HTML sanitization in `DOMPipelineHelper` before setting `innerHTML`.
- Isolated native DOM manipulation to dedicated toast notifications and live audit logging elements.

---

## Interaction 2: CIA → Code Mode

### Prompt / Query
> *"What edge cases should I safeguard against in the interview pipeline stage transition method, dashboard query, and frontend DOM manipulation?"*

### CIA Code Mode Suggestions & Edge Case Analysis

| # | Edge Case Category | Identified Risk | Recommended Prevention |
|---|---|---|---|
| **1** | **Invalid Stage Strings** | Passing arbitrary strings (e.g. `"CEO Round"`, lowercase `"screening"`, whitespace `" HR Round "`) | Enforce strict whitelist validation against `VALID_STAGES`; trim leading/trailing whitespace before matching. Return allowed stages in error response. |
| **2** | **Applicant ID Format & Non-Existence** | Passing non-integer IDs, negative integers, or non-existent IDs | Validate `Number.isInteger(applicantId) && applicantId >= 1` in Node and check `frappe.db.exists()` in Frappe before proceeding. Return 404 if not found. |
| **3** | **No-Op Transitions** | User selects the current stage the applicant is already in | Short-circuit in the frontend (`if (applicant.pipeline_stage === stage) return;`) to avoid unnecessary API round-trips. |
| **4** | **Timezone / Date Boundary in Dashboard Query** | Updates near midnight UTC vs local time (IST) counting under wrong date | Use standard UTC ISO prefix (`toISOString().slice(0, 10)`) or `CURDATE()` in database queries to ensure deterministic day partitioning. |
| **5** | **Race Conditions / Double Clicks** | Rapidly clicking different stage options while an update request is inflight | Disable the select input / action buttons while `updatingId === applicant.id` to prevent concurrent colliding mutations. |
| **6** | **DOM Memory Leak in Activity Feed** | Continual creation of DOM elements (`document.createElement`) overflowing DOM memory | Limit activity feed length (e.g., maintain maximum 10 items in DOM by removing `feed.lastChild`). |
| **7** | **Empty Pipeline Stages** | Stages with 0 applicants breaking UI layouts or metrics | Initialize default stage counts to 0 for all 6 stages; render a graceful empty state placeholder (`"No applicants at this stage"`). |

### Action Taken
- Applied input trimming and strict whitelist matching in both Python and Express controllers.
- Implemented `updatingId` state flag to disable selects while an update is in flight.
- Added DOM cleanup loop in `DOMPipelineHelper.logActivity` (`while (feed.children.length > 10) feed.removeChild(feed.lastChild)`).
- Ensured dashboard query returns pre-initialized 0 counts for all 6 stages.
- Added empty state indicator for stages with no candidates.


---

# Week 2 Day 3 — AI Resume Analysis: Groq + OpenRouter Integration

**Date:** October 20, 2026  
**Lesson:** Week 2 Day 3 — AI Resume Analysis (Groq + OpenRouter Fallback)  
**Branch:** `feat/cynaris-w2d3-murali`  

---

## Interaction 1: CIA → AI Engineer Mode

### Prompt / Query
> *"I am designing the AI Resume Summary feature for Week 2 Day 3. The goal is to evaluate candidate resumes using Groq (llama-3.3-70b-versatile) as the primary LLM and OpenRouter (meta-llama/llama-3.3-70b-instruct) as fallback. How should I structure the system and user prompts to ensure deterministic, structured, concise, and hallucination-free candidate screening summaries?"*

### CIA AI Engineer Mode Recommendations
1. **Persona & Role Framing:**
   - Define the AI as a *"Senior Technical Talent Partner and Engineering Screener at Cynaris Solutions"*. This grounds the tone in professional, balanced recruitment judgment rather than generic text summarization.
2. **Schema & Heading Constraints:**
   - Enforce fixed markdown section headers:
     - `### 📋 Executive Summary` (2-3 sentences)
     - `### 🌟 Key Technical Competencies` (3 high-signal bullet points)
     - `### 🔍 Interview Probe Points & Potential Gaps` (2 targeted technical questions)
     - `### ⚖️ Hiring Recommendation` (Strong Candidate / Moderate Fit / Needs Vetting with 1-sentence rationale)
3. **Anti-Hallucination Guardrails:**
   - Instruct the model to strictly evaluate claims based on the provided skills, experience, education, and resume text. Explicitly state: *"Do not invent projects, certifications, or metrics not present in the input profile."*
4. **Inference Parameters:**
   - Set `temperature = 0.3` to prioritize consistency, precision, and adherence to headings over creative variance.
   - Set `max_tokens = 600` to guarantee fast response latency while avoiding cut-offs.

### Action Taken
- Documented the prompt specification in comments at the top of [`cynaris_recruitment/doctype/job_applicant/job_applicant.py`](../cynaris_recruitment/doctype/job_applicant/job_applicant.py) and in [`backend/server.js`](../backend/server.js).
- Structured the `build_analysis_prompt` helper with the 4 distinct sections and low-temperature parameters.

---

## Interaction 2: CIA → Code Mode

### Prompt / Query
> *"Please review my Python controller and Express API error handling for the AI Resume Analysis feature. What failure modes or edge cases could occur during LLM integration, provider fallback, and frontend event delegation?"*

### CIA Code Mode Review & Edge Case Analysis

| # | Component | Identified Failure Mode | Mitigation Implemented |
|---|---|---|---|
| **1** | **Groq API Call** | Network timeout, 429 rate limit, or invalid `GROQ_API_KEY` | Wrapped in try/catch with 12s abort timeout; errors logged and execution automatically shifts to OpenRouter. |
| **2** | **OpenRouter Fallback** | Fallback provider also down or credits exhausted | Secondary try/catch with 15s timeout. If both fail, returns explicit HTTP 502 with user-friendly error message. |
| **3** | **Offline / Dev Mode** | No external API keys provided during local development / testing | Deterministic simulated analysis generates realistic structured markdown, allowing full UI & unit test execution. |
| **4** | **Data Persistence** | Summary generated in memory but lost on refresh | Saved directly to applicant object (`ai_resume_summary`, `ai_summary_provider`, `ai_analyzed_at`) and persisted in DocType. |
| **5** | **Event Delegation** | Clicking nested child icons inside action buttons (`<span>✨</span>`) | Used `event.target.closest('[data-action]')` to capture target button regardless of child element clicked. |
| **6** | **Event Bubbling** | Button clicks triggering unwanted card or column clicks | Invoked `event.stopPropagation()` on action button triggers. |
| **7** | **Form Events** | Form submitting via default browser navigation and reloading page | Attached `event.preventDefault()` on candidate creation form submission. |

### Action Taken
- Added comprehensive fallback pipeline in both Python controller and Node/Express backend.
- Implemented `simulate_groq_failure` and `simulate_both_failure` flags to test failure recovery deterministically.
- Hardened event delegation with `event.target.closest('[data-action]')` and `event.stopPropagation()`.
