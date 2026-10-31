# Week 3 Day 5 — Practical Submission & Viva Assessment Report

**Intern Name:** Murali  
**Date:** October 25, 2026  
**Lesson:** Week 3 Day 5 — AI Conversation Summarizer — Groq Integration in EspoCRM  
**Git Branch:** `feat/cynaris-w3d5-murali`  
**Repository:** `muralivismitha143-oss/cynaris-intership`  

---

## 1. Project Overview & Deliverables Summary

During Week 3 Day 5, I implemented the **AI Conversation Summarizer** within EspoCRM, augmented by a **React Router** frontend client. The feature hooks into EspoCRM Activity persistence, fetches the last 5 customer interactions for an Account, formats a high-signal prompt, and invokes **Groq** (`llama-3.3-70b-versatile`) with automatic failover to **OpenRouter** (`meta-llama/llama-3.3-70b-instruct`). The generated 3-bullet summary is stored directly on the `Account` entity and surfaced through an interactive React SPA with full client-side routing.

### Key Completed Deliverables:
1. **EspoCRM Custom Hook & Service:**
   - [`custom/Espo/Custom/Hooks/Activity/ConversationSummarizerHook.php`](../custom/Espo/Custom/Hooks/Activity/ConversationSummarizerHook.php): Hook triggered `afterSave` on Activity when linked to an Account.
   - [`application/Espo/Core/Ai/ConversationSummarizer.php`](../application/Espo/Core/Ai/ConversationSummarizer.php): Core PHP service with prompt formatting, Groq primary call, OpenRouter fallback, and deterministic rule-based safety net.
   - [`custom/Espo/Custom/Resources/metadata/entityDefs/Account.json`](../custom/Espo/Custom/Resources/metadata/entityDefs/Account.json): Metadata extension adding `aiSummary`, `aiSummaryGeneratedAt`, and `aiSummaryProvider`.
2. **React Router Architecture & Components:**
   - [`client/src/components/AiSummarizer/ReactRouterComponents.jsx`](../client/src/components/AiSummarizer/ReactRouterComponents.jsx): Standard implementation of `BrowserRouter`, `MemoryRouter`, `Routes`, `Route`, `Link`, `useParams`, and `useNavigate`.
   - [`client/src/components/AiSummarizer/AccountsListView.jsx`](../client/src/components/AiSummarizer/AccountsListView.jsx): Accounts directory with `<Link to={`/accounts/${id}`}>` cards.
   - [`client/src/components/AiSummarizer/AccountDetailView.jsx`](../client/src/components/AiSummarizer/AccountDetailView.jsx): Master-detail view extracting `accountId` via `useParams()`, navigating via `useNavigate()`, displaying customer details, activity logs, and the AI panel.
   - [`client/src/components/AiSummarizer/ConversationSummarizerPanel.jsx`](../client/src/components/AiSummarizer/ConversationSummarizerPanel.jsx): Visual panel with live Groq/OpenRouter telemetry badges, 3-bullet cards, and an interactive simulated outage toggle.
   - [`client/src/components/AiSummarizer/AiSummarizerContainer.jsx`](../client/src/components/AiSummarizer/AiSummarizerContainer.jsx): Root routing coordinator.
3. **Automated Testing Suite:**
   - [`tests/test_ai_conversation_summarizer.js`](../tests/test_ai_conversation_summarizer.js): Validates metadata, prompt formatting, Groq primary inference, OpenRouter failover, and entity persistence.
   - [`tests/test_react_router_client.js`](../tests/test_react_router_client.js): Validates pattern matching, `useParams`, `useNavigate`, `Link`, and SPA routing without full page reload.
4. **Documentation & CIA Logs:**
   - [`docs/AI_CONVERSATION_SUMMARIZER.md`](./AI_CONVERSATION_SUMMARIZER.md): Full technical specification.
   - [`docs/WEEK3_FINAL_PR.md`](./WEEK3_FINAL_PR.md): Week 3 Capstone Pull Request template.
   - [`docs/CIA_LOG.md`](./CIA_LOG.md): Logs for AI Engineer Mode and Code Mode interactions.

---

## 2. Simulated UI & Architecture Screenshots

### 2.1 Account Detail View with AI Conversation Summarizer Panel
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  🏢 Accounts Directory / FinTech Innovations India Pvt Ltd      [← Back to Accounts]   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  🏢  FinTech Innovations India Pvt Ltd                          [ CUSTOMER ]           │
│      Industry: Financial Services • Location: Bengaluru, KA • Revenue: ₹ 15,000,000   │
│      Phone: +91-98765-43210 • Email: contact@fintechinnovations.in                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  ✨ AI Conversation Intelligence & Executive Summary   [ Groq (Primary) ] [llama-3.3] │
│                                                                                        │
│  [🔄 Refresh AI Summary]      [ ] Simulate Groq Outage (Trigger Fallback)               │
│                                                                                        │
│  ┌───┐                                                                                 │
│  │ 1 │  Technical & ATS Integration Approved: Client reviewed system architecture,    │
│  └───┘  approving REST API endpoints and data residency protocols.                     │
│  ┌───┐                                                                                 │
│  │ 2 │  High Buying Intent with Security Focus: Decision-makers expressed strong       │
│  └───┘  enthusiasm, pending final verification of SOC2 audit compliance documentation. │
│  ┌───┐                                                                                 │
│  │ 3 │  Commercial Next Steps Agreed: Account Executive to deliver updated Master     │
│  └───┘  Services Agreement by Friday for final leadership sign-off.                    │
│                                                                                        │
│  Account: FinTech Innovations India • Latency: 284ms • Model: llama-3.3-70b-versatile  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Recent Customer Interactions & Logged Activities (5 Recent Touchpoints)               │
│  [📅] Meeting: Architecture & REST API Webhook Deep Dive (2026-10-24)                  │
│  [📞] Call: Security & SOC2 Compliance Verification (2026-10-25)                       │
│  [✉️] Email: Master Services Agreement & SLA Terms (2026-10-26)                        │
│  [📋] Task: Prepare Sandbox API Credentials (2026-10-27)                               │
│  [🤝] Meeting: Executive Sponsor Review & Contract Finalization (2026-10-28)           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Live Fallback Demonstration (Simulating Groq Outage)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  ✨ AI Conversation Intelligence & Executive Summary  [ OpenRouter (Fallback) ]        │
│                                                                                        │
│  [🔄 Refresh AI Summary]      [X] Simulate Groq Outage (Trigger Fallback)               │
│                                                                                        │
│  ⚠️ Fallback Triggered: Primary Groq API Outage Simulated (HTTP 503)                   │
│                                                                                        │
│  ┌───┐                                                                                 │
│  │ 1 │  [OpenRouter Fallback] Architectural Scalability Confirmed: Client confirmed     │
│  └───┘  compatibility with recruitment webhooks and database schemas.                  │
│  ┌───┐                                                                                 │
│  │ 2 │  Positive Leadership Alignment: CTO indicated agreement with proposed           │
│  └───┘  multi-tenant separation and data retention policies.                           │
│  ┌───┐                                                                                 │
│  │ 3 │  Action Items Active: Final commercial proposal queued for procurement review   │
│  └───┘  with scheduled executive touchpoint.                                           │
│                                                                                        │
│  Account: FinTech Innovations India • Latency: 785ms • Model: llama-3.3-70b-instruct   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mandatory Viva Voce Questions & Answers

### Question 1: Explain the prompt you wrote. Why did you structure it that way?

**Answer:**
The prompt was engineered to transform raw, noisy, chronological CRM activity logs into a concise, actionable executive briefing:

```
You are an Executive CRM Intelligence Assistant at Cynaris Solutions.
Below is the chronological log of the last customer interactions with Account: "{accountName}".

### Customer Activity Log:
{logText}

### Instructions:
Summarise these customer interactions in 3 bullet points:
• Bullet 1: Core deal progress, customer requirements, and major discussion topics.
• Bullet 2: Customer sentiment, objections raised, and organizational dynamics.
• Bullet 3: Key action items, scheduled next steps, and mutual commitments.

Maintain professional recruitment and enterprise SaaS executive tone. Do not invent facts or metrics not present in the activity logs.
```

**Why it is structured this way:**
1. **Executive Cognitive Load (Strict 3-Bullet Rule):** Account Executives and Sales Directors scan summaries right before calls or during weekly pipeline reviews. Unstructured prose or 10-bullet lists create friction. Three bullets provide the optimal density-to-brevity ratio.
2. **Deterministic Semantic Allocation:** By explicitly instructing what each of the three bullets must contain:
   - *Bullet 1 focuses on technical/operational progression* (e.g. API approval, product demo).
   - *Bullet 2 captures emotional tone and risks* (e.g. security concerns, budget constraints, enthusiasm).
   - *Bullet 3 locks down execution commitments* (e.g. deadline for MSA, scheduled demo).
3. **Chronological Context Tagging:** In `{logText}`, each item is prefixed with its timestamp and activity type: `[1] (2026-10-24) Meeting: ...`. This allows the LLM to understand temporal order—recognizing if an objection raised in interaction #2 was successfully resolved in interaction #4.
4. **Anti-Hallucination & Tone Guardrails:** Enterprise sales summaries cannot afford fabricated data. The directive *"Do not invent facts or metrics not present in the activity logs"* along with a low temperature (`0.2`) ensures the LLM sticks strictly to ground truth.

---

### Question 2: How does your fallback mechanism work? Demonstrate it by disabling Groq.

**Answer:**
The system uses a **multi-tiered resilient failover architecture**:
1. **Primary Layer — Groq API (`llama-3.3-70b-versatile`):** Groq is prioritized because its custom LPU hardware delivers ultra-fast latency (P50 < 300 ms), making it ideal for synchronous CRM hooks.
2. **Secondary Layer — OpenRouter API (`meta-llama/llama-3.3-70b-instruct`):** If Groq encounters an exception—such as an HTTP 429 (Rate Limit Exceeded), HTTP 500/503 (Server Outage), or a connection timeout (> 4000 ms)—the error is caught in a `try-catch (\Throwable $e)` block. Instead of failing the EspoCRM hook or presenting an error to the user, the service immediately routes the identical prompt payload to OpenRouter.
3. **Safety Net Layer — Deterministic Rule Engine:** If both Groq and OpenRouter are unreachable (e.g. in offline local development or a global internet outage), the system invokes a deterministic rule-based summarizer that parses the last 5 activities locally, guaranteeing zero unhandled exceptions and zero blank records.

**Demonstration Evidence:**
- In [`application/Espo/Core/Ai/ConversationSummarizer.php`](../application/Espo/Core/Ai/ConversationSummarizer.php): Setting `$simulateGroqFailure = true` (or passing invalid credentials) causes `generateSummary()` to bypass Groq, invoke OpenRouter, and record `'fallbackUsed' => true` with `'fallbackReason' => 'Simulated Groq Outage'`.
- In [`client/src/components/AiSummarizer/ConversationSummarizerPanel.jsx`](../client/src/components/AiSummarizer/ConversationSummarizerPanel.jsx): Clicking the *"Simulate Groq Outage"* checkbox flips state, reroutes inference, changes the status badge from green `Groq (Primary)` to orange `OpenRouter (Fallback)`, and updates the latency metric from 284 ms to 785 ms.
- In [`tests/test_ai_conversation_summarizer.js`](../tests/test_ai_conversation_summarizer.js): Automated tests verify Case A (Groq success), Case B (OpenRouter failover), and Case C (deterministic local fallback).

---

### Question 3: What are the risks of relying on an LLM API in a production application?

**Answer:**
Relying on external LLM APIs in enterprise production applications introduces five critical risk categories that must be proactively mitigated:

1. **Availability & Latency Volatility (Downtime & Throttling):**
   - *Risk:* External LLM endpoints experience sporadic outages (HTTP 500/502/503), quota rate-limits (HTTP 429), or cold-start latency spikes exceeding 10+ seconds.
   - *Mitigation:* Implement dual-provider failover (e.g. Groq with OpenRouter fallback), aggressive client timeouts (e.g. 4 seconds), exponential backoff with jitter, and asynchronous background worker processing (queues) rather than blocking web requests.
2. **Hallucinations & Fact Distortion:**
   - *Risk:* LLMs are probabilistic token predictors, not database query engines. In CRM contexts, hallucinating an uncommitted budget, an unagreed closing date, or a fabricated security clearance can lead to severe business embarrassment or contractual liabilities.
   - *Mitigation:* Strict grounding prompts ("only use provided facts"), low temperature (`0.1`–`0.3`), citation requirements, and clear user disclaimers that summaries are AI-assisted.
3. **Data Privacy, Compliance & Leakage (GDPR, SOC2, HIPAA):**
   - *Risk:* Passing sensitive customer data, employee compensation, or personally identifiable information (PII) to public LLM APIs may violate data sovereignty and privacy regulations if the vendor uses prompt data for model training.
   - *Mitigation:* Use enterprise API agreements with explicit zero-data-retention (ZDR) clauses, mask/anonymize PII (emails, phone numbers, employee names) before transmission, and support local/on-premise models (via Ollama or vLLM).
4. **Token Economics & Unpredictable Cost Spikes:**
   - *Risk:* Uncontrolled usage, repeated retry loops, or unbounded conversation histories can lead to exponential token consumption and unexpected monthly cloud bills.
   - *Mitigation:* Enforce input truncations (e.g. only passing the last 5 activities), output token limits (`max_tokens = 350`), user/account rate limits, and Redis response caching for identical inputs.
5. **Model Drift & Non-Deterministic Outputs:**
   - *Risk:* When upstream model providers update model weights or swap underlying checkpoints, the tone, structure, or formatting of outputs can change without notice, breaking frontend UI parsers.
   - *Mitigation:* Pin exact model versions (e.g. `llama-3.3-70b-versatile` rather than generic `latest`), enforce structured schema outputs (JSON Schema or rigid delimiters), and run regression test suites on representative prompts.

---

## 4. Test Execution Summary

Running `npm test` executes the complete project test suite across all 10 test modules:

```bash
> npm test

--- Test 1: docker-compose.espocrm.yml structure verified
--- Test 2: Environment Template Validation
--- Test 3: EspoCRM Core Architecture Files
--- Test 4: JobApplicant Metadata Schema
--- Test 5: EspoCRM REST API Simulation
All 5 EspoCRM Setup Unit Tests Passed!

All 4 React & Virtual DOM Unit Tests Passed!
All 4 Business Process Mapping Tests Passed!
All 3 React Props & Unidirectional Flow Tests Passed!
All 3 CRM Engine & Reporting Unit Tests Passed!
All 4 React State & Controlled Inputs Tests Passed!
All 3 Activity Dashboard SQL Tests Passed!
All 3 React useEffect Unit Tests Passed!

================================================================
🧪 Week 3 Day 5: AI Conversation Summarizer Test Suite
================================================================
  [PASS] Account entity metadata fields correctly registered
  [PASS] EspoCRM Activity afterSave hook verified
  [PASS] Prompt template and LLM models confirmed in PHP service
  [PASS] Prompt builder formats activities chronologically with clear instruction
  [PASS] Case A: Groq primary executed successfully
  [PASS] Case B: Automatic failover to OpenRouter confirmed
  [PASS] Case C: Graceful offline fallback triggered without crashing application
[SUCCESS] All AI Conversation Summarizer tests passed!

================================================================
🧪 Week 3 Day 5: React Router Client-Side Routing Test Suite
================================================================
  [PASS] React Router components and hooks defined
  [PASS] AccountDetailView implementation verified
  [PASS] /accounts matched statically
  [PASS] /accounts/:accountId extracted { accountId: "acc-1" }
  [PASS] /accounts/:accountId extracted arbitrary dynamic param
  [PASS] Non-matching route correctly rejected
  [PASS] Navigated to /accounts/acc-1
  [PASS] Switched to /accounts/acc-2
  [PASS] Returned back to /accounts directory via navigate()
[SUCCESS] All React Router client tests passed!
```

---

## 5. Submission Checklist

- [x] Branch named `feat/cynaris-w3d5-murali` created and checked out
- [x] EspoCRM Activity `afterSave` hook implemented (`ConversationSummarizerHook.php`)
- [x] Dual AI service implemented (`ConversationSummarizer.php` with Groq + OpenRouter)
- [x] Account entity metadata extended (`custom/Espo/Custom/Resources/metadata/entityDefs/Account.json`)
- [x] React Router implemented (`BrowserRouter`, `Routes`, `Route`, `Link`, `useParams`, `useNavigate`)
- [x] Master-detail views implemented (`AccountsListView.jsx` and `AccountDetailView.jsx`)
- [x] AI Summarizer visual panel with outage toggle created (`ConversationSummarizerPanel.jsx`)
- [x] Automated unit tests created (`test_ai_conversation_summarizer.js` and `test_react_router_client.js`)
- [x] Full test suite passing via `npm test` (10/10 test files)
- [x] Minimum 2 CIA interactions logged in `docs/CIA_LOG.md`
- [x] Architecture documented in `docs/AI_CONVERSATION_SUMMARIZER.md`
- [x] All 3 Viva Voce questions thoroughly answered
- [x] End-of-week Capstone Pull Request template created in `docs/WEEK3_FINAL_PR.md`
