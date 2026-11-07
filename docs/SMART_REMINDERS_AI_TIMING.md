# Smart Reminders: Automation Rules & AI-Suggested Timing Architecture

**Author:** Murali (Full Stack Intern)  
**Date:** October 31, 2026  
**Module:** `backend/modules/smartReminders/` & `backend/smartReminderServer.js`  
**Branch:** `feat/cynaris-w4d1-murali`  

---

## 1. Executive Summary & Problem Statement

In fast-paced recruitment and CRM environments, candidates and prospective client accounts frequently experience delays across pipeline stages:
- A candidate completes a technical assessment, but no feedback is logged for over 48 hours.
- An offer letter is dispatched, but no acceptance or clarification response is received after 72 hours.
- An enterprise prospect expresses interest, but sales outreach lapses for 4+ days.

Traditional automated reminder systems suffer from two fatal flaws:
1. **Arbitrary Dispatch Times:** Sending email or messaging alerts at arbitrary timestamps (e.g., late evenings, early mornings, or during peak calendar congestion) yields poor open rates (< 20%) and increases candidate drop-off.
2. **Generic, Impersonal Copy:** Boilerplate notifications (*"Your application status has not changed"*) feel cold and trigger negative candidate sentiment.

The **Smart Reminders System** solves this by uniting:
- **Node.js Native Event-Driven Automation:** An extensible rules engine built on pure Node.js architecture (`EventEmitter`, `fs.promises`, `http.createServer`).
- **AI-Suggested Timing Engine:** Leverages **Groq** (`llama-3.3-70b-versatile`) with **OpenRouter** (`meta-llama/llama-3.3-70b-instruct`) fallback to evaluate recipient role, seniority, urgency, and Indian Standard Time (IST) work patterns to compute the **highest-converting dispatch window**, **optimal channel**, and **personalized outreach copy**.

---

## 2. Node.js Architecture & Event Loop Integration

```
   ┌─────────────────────────────────────────────────────────────┐
   │                    Node.js Event Loop                       │
   │                                                             │
   │   ┌───────────────┐     process.nextTick()                  │
   │   │    Timers     │ ──> Promise Microtasks                  │
   │   └───────┬───────┘                                         │
   │           ▼                                                 │
   │   ┌───────────────┐                                         │
   │   │  Pending I/O  │                                         │
   │   └───────┬───────┘                                         │
   │           ▼                                                 │
   │   ┌───────────────┐     Non-blocking file I/O (fs.promises) │
   │   │     Poll      │ ──> Incoming HTTP Streams (http module) │
   │   └───────┬───────┘                                         │
   │           ▼                                                 │
   │   ┌───────────────┐                                         │
   │   │     Check     │ ──> setImmediate() Callbacks            │
   │   └───────┬───────┘                                         │
   │           ▼                                                 │
   │   ┌───────────────┐                                         │
   │   │Close Callbacks│ ──> server.close()                      │
   │   └───────────────┘                                         │
   └─────────────────────────────────────────────────────────────┘
```

### 2.1 Pure Node.js Built-in Modules Utilization
- **`http` (`http.createServer`):** Implements a lightweight, zero-dependency HTTP server handling chunked streaming payloads (`req.on('data')`, `req.on('end')`), payload size protection, CORS headers, and JSON API serialization.
- **`fs` (`fs.promises`):** Employs asynchronous non-blocking file I/O to read and atomically write (`fs.writeFile` to tmp followed by `fs.rename`) to `backend/data/reminders.json`.
- **`path` (`path.join`, `path.resolve`):** Resolves deterministic cross-platform directory boundaries across Windows and Linux environments.
- **`events` (`EventEmitter`):** Facilitates a decoupled pub-sub event architecture. When the `RuleEngine` detects an idle candidate exceeding threshold boundaries, it emits `'rule:matched'` and `'rule:evaluated'` events without blocking the caller.
- **`url` (`new URL`):** Parses URL pathnames and query strings (`?simulate_groq=true`).

---

## 3. Automation Rules Engine Specification

### 3.1 Pre-configured Enterprise Rules

| Rule ID | Rule Name | Target Entity | Trigger Condition | Idle Threshold | Urgency | Preferred Channel |
|---|---|---|---|---|---|---|
| `rule-1` | **Stalled Technical Round Follow-up** | `JobApplicant` | `pipeline_stage == "Technical Round 1"` | > 48 Hours | High | Email |
| `rule-2` | **Offer Decision Check-in** | `JobApplicant` | `pipeline_stage == "Offered"` | > 72 Hours | Critical | WhatsApp |
| `rule-3` | **Screening Feedback Acceleration** | `JobApplicant` | `pipeline_stage == "Screening"` | > 24 Hours | Medium | Email |
| `rule-4` | **High-Value Account Outreach** | `Account` (EspoCRM) | `type == "Prospect"` | > 96 Hours (4 days) | High | Phone |

### 3.2 Evaluation Lifecycle
1. The engine calculates idle hours: `(Date.now() - new Date(updated_at)) / (1000 * 60 * 60)`.
2. Inspects enabled automation rules matching `entityType` and `triggerStage`.
3. Verifies deduplication: if a reminder for `(entityId, ruleId)` is already in `Scheduled` status, redundant triggers are suppressed.
4. Emits `'rule:matched'` with enriched metadata.

---

## 4. AI Timing & Message Prompt Engineering

### 4.1 Prompt Design
```
You are an expert Talent Engagement Strategist and Head of Recruitment Operations at Cynaris Solutions.
Your objective is to optimize candidate and customer follow-up response rates.
Analyze the recipient's pipeline stage, idle time, and professional profile to recommend the optimal contact time window in Indian Standard Time (IST),
select the highest-converting communication channel (Email, WhatsApp, Phone Call, or In-App Notification), and compose a personalized message.
Deliver your recommendation strictly in the requested JSON format.

### Input Parameters:
- Entity Type: Job Applicant
- Recipient Name: Priya Sharma
- Role / Domain: Backend Engineer
- Current Stage: Technical Round 1
- Time Idle Without Update: 54 hours
- Priority / Urgency: High
- Business Timezone: Indian Standard Time (IST, UTC+5:30)

### JSON Output Schema:
{
  "recommendedSlot": "<e.g., Tuesday 10:30 AM - 11:30 AM IST>",
  "recommendedChannel": "<Email | WhatsApp | Phone Call | In-App>",
  "urgencyLevel": "<Immediate | High | Medium | Normal>",
  "rationale": "<2-3 sentence strategic justification explaining why this time slot and channel maximize open and conversion rates>",
  "customizedMessage": "<Polite, concise, high-converting follow-up message under 60 words>"
}
```

### 4.2 Engineering Rationale
- **Timezone Grounding in IST:** Enforces Indian Standard Time (`UTC+5:30`) and restricts recommendations to professional operating hours (9:30 AM to 6:30 PM IST), preventing automated messages from disturbing candidates on weekends or late nights.
- **Recipient Role-Based Psychological Heuristics:**
  - *Engineers / Technical Leads:* Optimal window is mid-morning (10:30 AM - 11:30 AM) on Tuesdays/Wednesdays, right after daily engineering standups, avoiding Monday sprint planning and Friday code freezes.
  - *Candidates in Offer Stage:* High emotional sensitivity requires conversational channels (WhatsApp / Phone) delivered pre-lunch (11:00 AM - 12:30 PM) to enable afternoon family consultations.
- **Strict JSON Schema (`response_format: { type: "json_object" }`):** Enables direct serialization and frontend card binding without fragile regex parsing.

---

## 5. Multi-Tier Dual Provider Failover Matrix

```
                      [ Client Requests AI Timing ]
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │     Groq Primary Engine     │
                     │  (llama-3.3-70b-versatile)  │
                     │       Latency < 300ms       │
                     └──────────────┬──────────────┘
                                    │
                        Success? ───┼─── Exception / Timeout / 429
                                    │               │
                                    ▼               ▼
                              [ Return 200 ] ┌─────────────────────────────┐
                                             │  OpenRouter Fallback Engine │
                                             │ (llama-3.3-70b-instruct)    │
                                             │       Latency ~750ms        │
                                             └──────────────┬──────────────┘
                                                            │
                                                Success? ───┼─── Outage / Offline
                                                            │               │
                                                            ▼               ▼
                                                      [ Return 200 ] ┌─────────────────────────────┐
                                                                     │ Deterministic Safety Net    │
                                                                     │ (Rule-Based Local Engine)   │
                                                                     │       Latency < 5ms         │
                                                                     └─────────────────────────────┘
```

| Tier | Provider | Model | Latency (P50) | Purpose |
|---|---|---|---|---|
| **Tier 1** | **Groq** | `llama-3.3-70b-versatile` | ~250 ms | Primary high-throughput inference engine. |
| **Tier 2** | **OpenRouter** | `meta-llama/llama-3.3-70b-instruct` | ~760 ms | Resilient drop-in fallback on Groq 429 rate limit or 503 outage. |
| **Tier 3** | **Deterministic Local** | Rule-Based Expert Engine | < 5 ms | Zero-dependency safety net guaranteeing 100% uptime in offline environments. |

---

## 6. Microservice API Endpoints

Both the pure Node.js HTTP server (`backend/smartReminderServer.js`, port 3005) and the Express server (`backend/server.js`, port 3000) serve the unified API contract:

- `GET /health`: Server status, Node.js event loop telemetry, uptime, and memory usage.
- `GET /api/reminders/rules`: Returns list of all configured automation rules.
- `POST /api/reminders/rules/toggle`: Toggles an automation rule on or off (`{ ruleId, enabled }`).
- `POST /api/reminders/evaluate`: Evaluates active rules against candidate/account datasets, returning matched candidates with idle hours.
- `POST /api/reminders/suggest-timing`: Computes AI-suggested timing, channel, rationale, and message draft.
- `GET /api/reminders/scheduled`: Returns queue of all scheduled reminders.
- `POST /api/reminders/schedule`: Enqueues a validated smart reminder.
- `POST /api/reminders/dispatch`: Marks a reminder as dispatched and archives it to historical logs.
