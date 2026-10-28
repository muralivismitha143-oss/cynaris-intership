# Cynaris Internship — Week 3 Day 2 Submission

## Project: Business Process Mapping — Lead to Closure + API Inspection & React Unidirectional Data Flow

- **Student:** Murali
- **Branch:** `feat/cynaris-w3d2-murali`
- **Module:** Week 3 — Day 2
- **Focus Area:** Enterprise Business Process Mapping, Workflow Rules, BPM Process Flows, Reporting Engine, REST API Inspection, React Functional Components, Props Passing, Component Composition, and Unidirectional Data Flow
- **Technologies:** EspoCRM (v8.3.0), React 18, JavaScript ES6+, RESTful API (`/api/v1/`), Node.js, Mermaid.js

---

## 1. Executive Summary

This submission completes all requirements for **Week 3 Day 2**, providing an enterprise study and technical implementation of CRM business processes and modern React functional component architecture:
1. **Business Process Mapping (Lead to Closure):**
   - Mapped the end-to-end B2B revenue lifecycle: Inbound Lead ingestion → BANT Qualification → Atomic Conversion → B2B Customer Hierarchy (Account & Contact) → Engagement Stream (Activities) → Deal Stage Advancement → `Closed Won`.
   - Created simulated visual UI snapshots for each step in Section 2.
   - Authored the dedicated process specification in [`docs/BUSINESS_PROCESS_MAPPING.md`](BUSINESS_PROCESS_MAPPING.md).
2. **Workflow & Automation Analysis:**
   - Evaluated **3 existing Workflow rules** (`Trigger` &rarr; `Conditions` &rarr; `Actions`).
   - Analyzed **2 BPM automation process flows** with a comprehensive Mermaid BPM flowchart.
   - Deconstructed **2 enterprise reports** across `Entity`, `Filters`, `Columns`, and `Group By`.
3. **REST API Inspection:**
   - Documented and simulated **3 primary `/api/v1/` endpoints** (`Lead`, `Lead/action/convert`, and `Meeting`) with complete curl requests, headers, and JSON responses.
4. **React Functional Components & Unidirectional Data Flow:**
   - Implemented a clean, modular React component hierarchy in [`client/src/components/LeadToClosure/`](../client/src/components/LeadToClosure/):
     - [`LeadPipelineContainer.jsx`](../client/src/components/LeadToClosure/LeadPipelineContainer.jsx): Top-level smart container managing immutable state and unidirectional flow.
     - [`ClosureSummaryMetrics.jsx`](../client/src/components/LeadToClosure/ClosureSummaryMetrics.jsx): Functional KPI presenter receiving computed props.
     - [`LeadCard.jsx`](../client/src/components/LeadToClosure/LeadCard.jsx): Presentation card with props and conversion callbacks.
     - [`OpportunityCard.jsx`](../client/src/components/LeadToClosure/OpportunityCard.jsx): Deal progression card with controlled stage selector.
     - [`ActivityFeed.jsx`](../client/src/components/LeadToClosure/ActivityFeed.jsx): Chronological sales engagement stream.
5. **Testing & CIA Verification:**
   - 16 automated unit tests passing cleanly across 4 test suites.
   - 2 CIA interactions logged in [`docs/CIA_LOG.md`](CIA_LOG.md).

---

## 2. Process Mapping: Lead to Closure Walkthrough (Step-by-Step)

### Step 1: Create Lead (`Kavita Nambiar`)
- **Action:** A new prospect submits an inquiry for our Recruitment and ATS Platform.
- **EspoCRM Entity:** `Lead`
- **Fields:** Name: `Kavita Nambiar`, Company: `FinTech Innovations India Pvt Ltd`, Email: `kavita.nambiar@fintechinnovations.in`, Phone: `+91-98765-43210`, Source: `Web Site`, Status: `New`.

```
+-----------------------------------------------------------------------------------+
| ESPOCRM - CREATE LEAD RECORD                                                      |
+-----------------------------------------------------------------------------------+
| First Name: [ Kavita             ]  Last Name: [ Nambiar                        ] |
| Account:    [ FinTech Innovations India Pvt Ltd                                 ] |
| Email:      [ kavita.nambiar@fintechinnovations.in                              ] |
| Phone:      [ +91-98765-43210    ]  Source:    [ Web Site                     ▼ ] |
| Status:     [ New              ▼ ]  Assigned:  [ Tech Sales Queue             ▼ ] |
|                                                                                   |
| [✓ Save Lead]   [Cancel]                                                          |
+-----------------------------------------------------------------------------------+
```

### Step 2: Convert Lead to Opportunity
- **Action:** Sales Development Representative verifies BANT criteria and triggers the conversion dialog.
- **EspoCRM Action:** `Lead -> Convert` modal.
- **Fields:** Opportunity Name: `FinTech Recruitment Suite Expansion`, Stage: `Proposal/Price Quote`, Amount: `₹1,250,000`, Probability: `75%`, Target Close: `2026-11-15`.

```
+-----------------------------------------------------------------------------------+
| CONVERT LEAD MODAL: Kavita Nambiar                                                |
+-----------------------------------------------------------------------------------+
| [✓] Create Account:     [ FinTech Innovations India Pvt Ltd                     ] |
| [✓] Create Contact:     [ Kavita Nambiar (Title: Chief Technology Officer)      ] |
| [✓] Create Opportunity: [ FinTech Recruitment Suite Expansion                   ] |
|     - Amount:           [ ₹ 1,250,000                    ]                        |
|     - Stage:            [ Proposal/Price Quote         ▼ ]                        |
|     - Probability:      [ 75 %                           ]                        |
|     - Target Close:     [ 2026-11-15                     ]                        |
|                                                                                   |
| [ Convert & Open Records ]   [ Cancel ]                                           |
+-----------------------------------------------------------------------------------+
```

### Step 3: Verified Customer Entities Created (Account & Contact)
- **Result:** Lead status transitions to `Converted`. EspoCRM provisions the normalized B2B records:
  - `Account`: `FinTech Innovations India Pvt Ltd` (Type: Customer, Industry: Financial Services)
  - `Contact`: `Kavita Nambiar` (Linked to Account, Role: Primary Decision Maker)

```
+-----------------------------------------------------------------------------------+
| ACCOUNT: FinTech Innovations India Pvt Ltd [Customer]                             |
+-----------------------------------------------------------------------------------+
| Phone: +91-98765-43210   | Industry: Financial Services  | Billing: Bengaluru     |
| Contacts (1):            | Kavita Nambiar (Chief Technology Officer)              |
| Opportunities (1):       | FinTech Recruitment Suite Expansion (₹1,250,000)       |
+-----------------------------------------------------------------------------------+
```

### Step 4: Add Activity Log (Meeting & Architecture Demo)
- **Action:** Account Executive logs a completed product demonstration and security evaluation meeting.
- **EspoCRM Entity:** `Meeting`
- **Fields:** Subject: `Platform Architecture Demo & Security Compliance`, Status: `Held`, Parent: `Opportunity (FinTech Recruitment Suite Expansion)`.

```
+-----------------------------------------------------------------------------------+
| LOG ACTIVITY: Meeting [Held]                                                      |
+-----------------------------------------------------------------------------------+
| Subject:     [ Platform Architecture Demo & Security Compliance                 ] |
| Parent Deal: [ FinTech Recruitment Suite Expansion                              ] |
| Date:        [ 2026-10-21 14:00 - 15:00 ]   Duration: [ 1 hour                  ] |
| Attendees:   [ Murali (AE), Kavita Nambiar (CTO), Rahul Verma (Security Head)   ] |
| Outcome:     [ Client security council approved SOC2 & data residency.          ] |
|                                                                                   |
| [✓ Save Activity]                                                                 |
+-----------------------------------------------------------------------------------+
```

### Step 5: Mark Opportunity as Closed Won
- **Action:** Commercial terms signed; deal moves to terminal won stage.
- **EspoCRM Entity:** `Opportunity`
- **Fields:** Stage: `Closed Won`, Probability: `100%`, Amount: `₹1,250,000`, Actual Close: `2026-10-21`.

```
+-----------------------------------------------------------------------------------+
| OPPORTUNITY: FinTech Recruitment Suite Expansion                                  |
+-----------------------------------------------------------------------------------+
| Stage:       [ Closed Won                       ▼ ]  Probability: [ 100%        ] |
| Deal Amount: ₹ 1,250,000                             Closed Date: 2026-10-21      |
| Account:     FinTech Innovations India Pvt Ltd       Contact:     Kavita Nambiar  |
|                                                                                   |
| Status:      🎉 DEAL CLOSED WON - Revenue Recognized Successfully!                |
+-----------------------------------------------------------------------------------+
```

---

## 3. Workflow Analysis: 3 Core Workflow Rules

In EspoCRM (`Admin -> Workflow`), automated workflows enforce operational discipline:

| Rule Name | Target Entity | Trigger Event | Evaluated Conditions | Executed Actions |
|---|---|---|---|---|
| **1. Lead Auto-Routing & Welcome Email** | `Lead` | **Record Created** | 1. `Lead.status == 'New'`<br/>2. `Lead.emailAddress != null` | 1. Assign to round-robin `Tech Sales Queue`<br/>2. Send templated email: *"Welcome to Cynaris Solutions"*<br/>3. Create follow-up Task for SDR with due date in 4 hours. |
| **2. High-Value Deal Alert** | `Opportunity` | **Record Saved / Modified** | 1. `amount >= 1000000`<br/>2. `stage in ['Proposal/Price Quote', 'Negotiation/Review']` | 1. Send push notification & email to VP of Sales<br/>2. Schedule automated Executive Sponsorship Check-in meeting. |
| **3. Stale Lead Inactivity Reminder** | `Lead` | **Time-Based (Scheduled)** | 1. `status in ['Assigned', 'In Process']`<br/>2. `modifiedAt < now() - 3 days` | 1. Create High-Priority Task for Lead Owner<br/>2. Update `status` flag to `'Follow-up Required'`. |

---

## 4. Automation Rules: Business Process Management (BPM)

In EspoCRM (`Admin -> BPM`), complex multi-stage business processes are modeled with BPMN 2.0 notation:

### Process 1: Enterprise Lead Qualification & Conversion Lifecycle
This process orchestrates lead intake, BANT qualification, parallel account creation, and deal handoff:

```mermaid
flowchart TD
    Start([Inbound Lead Created]) --> CheckSource{Source Verified?}
    CheckSource -->|No| RejectLead[Flag as Spam / Dead] --> EndReject([End Process])
    CheckSource -->|Yes| AssignSDR[Assign SDR via Round-Robin]
    AssignSDR --> QualifyTask[Task: Conduct BANT Discovery Call]
    QualifyTask --> BANTCheck{BANT Criteria Met?}
    BANTCheck -->|Unqualified| Nurture[Enroll in Marketing Nurture Track] --> EndNurture([End Process])
    BANTCheck -->|Qualified| ForkParallel[/Parallel Split: Conversion/]
    
    ForkParallel --> CreateAccount[Provision Account: B2B Company]
    ForkParallel --> CreateContact[Provision Contact: Decision Maker]
    ForkParallel --> CreateOpp[Create Opportunity: Pipeline Stage 'Prospecting']
    
    CreateAccount --> JoinParallel[\Parallel Join\]
    CreateContact --> JoinParallel
    CreateOpp --> JoinParallel
    
    JoinParallel --> ScheduleDemo[Task: Schedule Architecture Demo with AE]
    ScheduleDemo --> EndSuccess([Process Complete - Opportunity Active])
```

### Process 2: Deal Closure & Customer Onboarding Lifecycle
- **Trigger:** `Opportunity.stage == 'Closed Won'`.
- **Workflow:** Generates Master Services Agreement (MSA), alerts the Finance department for invoice generation, provisions the tenant in the Cynaris Recruitment Platform, and assigns a dedicated Customer Success Manager.

---

## 5. Reporting Engine Study

In EspoCRM (`Reports`), analytical queries summarize pipeline velocity and revenue metrics:

### Report 1: Sales Pipeline Funnel by Stage & Expected Revenue
- **Primary Entity:** `Opportunity`
- **Filters:**
  - `closeDate in currentQuarter()`
  - `stage notIn ['Closed Lost']`
  - `deleted == false`
- **Columns:**
  - `stage` (Grouping key)
  - `COUNT(id)` (Number of active deals)
  - `SUM(amount)` (Gross pipeline value)
  - `AVG(probability)` (Average win probability)
  - `SUM(amount * probability / 100)` (Weighted expected forecast)
- **Group By:** `Opportunity.stage`
- **Visualization:** Horizontal Funnel / Bar Chart.

### Report 2: Lead Conversion Velocity by Source
- **Primary Entity:** `Lead`
- **Filters:**
  - `createdAt >= startOfYear()`
  - `status in ['Converted', 'Dead', 'In Process']`
- **Columns:**
  - `source` (Grouping key: Web Site, Referral, Campaign)
  - `COUNT(id)` (Total leads ingested)
  - `SUM(case when status='Converted' then 1 else 0 end)` (Converted leads count)
  - `AVG(DATEDIFF(modifiedAt, createdAt))` (Average conversion velocity in days)
- **Group By:** `Lead.source`
- **Visualization:** Grouped Column Chart.

---

## 6. API Inspection: 3 Core `/api/v1/` Endpoints

### 6.1 Create Inbound Lead (`POST /api/v1/Lead`)
```bash
curl -X POST "http://localhost:8080/api/v1/Lead" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer crm_token_secret_xyz" \
  -d '{
    "firstName": "Kavita",
    "lastName": "Nambiar",
    "accountName": "FinTech Innovations India Pvt Ltd",
    "emailAddress": "kavita.nambiar@fintechinnovations.in",
    "phoneNumber": "+91-98765-43210",
    "source": "Web Site",
    "status": "New"
  }'
```
**HTTP Response (201 Created):**
```json
{
  "id": "67160a2b918f4a12",
  "name": "Kavita Nambiar",
  "accountName": "FinTech Innovations India Pvt Ltd",
  "status": "New",
  "source": "Web Site",
  "assignedUserId": "user_sdr_01",
  "createdAt": "2026-10-21T10:30:00Z"
}
```

### 6.2 Atomic Lead Conversion (`POST /api/v1/Lead/action/convert`)
```bash
curl -X POST "http://localhost:8080/api/v1/Lead/action/convert" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer crm_token_secret_xyz" \
  -d '{
    "id": "67160a2b918f4a12",
    "records": {
      "Account": { "name": "FinTech Innovations India Pvt Ltd", "industry": "Financial Services" },
      "Contact": { "title": "Chief Technology Officer" },
      "Opportunity": {
        "name": "FinTech Recruitment Suite Expansion",
        "amount": 1250000,
        "stage": "Proposal/Price Quote",
        "probability": 75,
        "closeDate": "2026-11-15"
      }
    }
  }'
```
**HTTP Response (200 OK):**
```json
{
  "success": true,
  "leadId": "67160a2b918f4a12",
  "accountId": "acc_8923b71f",
  "contactId": "cnt_91823a0c",
  "opportunityId": "opp_49102c8e",
  "message": "Lead converted successfully to Account, Contact, and Opportunity."
}
```

### 6.3 Log Follow-up Activity (`POST /api/v1/Meeting`)
```bash
curl -X POST "http://localhost:8080/api/v1/Meeting" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer crm_token_secret_xyz" \
  -d '{
    "name": "Platform Architecture Demo & Security Compliance",
    "status": "Held",
    "parentType": "Opportunity",
    "parentId": "opp_49102c8e",
    "dateStart": "2026-10-21T14:00:00Z",
    "dateEnd": "2026-10-21T15:00:00Z",
    "duration": 3600,
    "description": "Reviewed SOC2 compliance and ATS API integration. Proposal approved."
  }'
```
**HTTP Response (201 Created):**
```json
{
  "id": "meet_582910fa",
  "name": "Platform Architecture Demo & Security Compliance",
  "status": "Held",
  "parentType": "Opportunity",
  "parentId": "opp_49102c8e",
  "createdAt": "2026-10-21T15:05:00Z"
}
```

---

## 7. React Functional Components & Unidirectional Data Flow

### 7.1 Architecture & Concept Breakdown
- **Functional Components:** Built as clean, side-effect-free JavaScript functions without class boilerplate or manual `this` binding.
- **Props Passing:** Data flows **downwards** from parent containers to presentational components as read-only inputs.
- **Component Composition:** Complex views are composed from small, reusable components with distinct single responsibilities.
- **Unidirectional Data Flow:** State is hoisted in a single container (`LeadPipelineContainer`). Child components never mutate props. Instead, they invoke callback props (`onConvert`, `onStageChange`, `onAddActivity`), allowing the parent to produce the next immutable state.

```mermaid
flowchart TD
    Container["LeadPipelineContainer<br/>(State: leads, opportunities, activities)"]
    
    Container -->|Props: metrics| Metrics["ClosureSummaryMetrics<br/>(Pure Presenter)"]
    Container -->|Props: lead, onConvert| LeadCard["LeadCard<br/>(Presentation & Action Dispatch)"]
    Container -->|Props: opp, onStageChange| OppCard["OpportunityCard<br/>(Controlled Stage Selector)"]
    Container -->|Props: activities, onAddActivity| Feed["ActivityFeed<br/>(Engagement Stream)"]

    LeadCard -.->|Callback: onConvert| Container
    OppCard -.->|Callback: onStageChange| Container
    Feed -.->|Callback: onAddActivity| Container
```

### 7.2 Component Implementation Hierarchy

| Component File | Role | Props Received | Callbacks Dispatched |
|---|---|---|---|
| [`LeadPipelineContainer.jsx`](../client/src/components/LeadToClosure/LeadPipelineContainer.jsx) | Smart Container & State Manager | N/A (Root Orchestrator) | Handles state updates immutably |
| [`ClosureSummaryMetrics.jsx`](../client/src/components/LeadToClosure/ClosureSummaryMetrics.jsx) | Functional KPI Presenter | `totalLeads`, `convertedLeads`, `totalWonRevenue`, `totalPipelineValue` | None (Pure Presenter) |
| [`LeadCard.jsx`](../client/src/components/LeadToClosure/LeadCard.jsx) | Functional Lead Card | `lead`, `isSelected` | `onSelect(lead)`, `onConvert(leadId)` |
| [`OpportunityCard.jsx`](../client/src/components/LeadToClosure/OpportunityCard.jsx) | Functional Deal Progression Card | `opportunity`, `stages`, `isSelected` | `onSelect(opp)`, `onStageChange(id, stage)`, `onLogActivity(id)` |
| [`ActivityFeed.jsx`](../client/src/components/LeadToClosure/ActivityFeed.jsx) | Chronological Engagement Stream | `activities`, `selectedEntityName` | `onAddActivity(type, title)` |

---

## 8. Automated Unit Test Verification (16/16 Passing)

```
> npm test

> cynaris-recruitment-platform@1.0.0 test
> node tests/test_espocrm_setup.js && node tests/test_react_virtual_dom.js && node tests/test_business_process_mapping.js && node tests/test_react_props_unidirectional.js

--- Test 1: Docker Compose Configuration ---
  [PASS] docker-compose.espocrm.yml structure verified

--- Test 2: Environment Template Validation ---
  [PASS] All 9 required environment keys validated in template

--- Test 3: EspoCRM Core Architecture Files ---
  [PASS] application/Espo/Core/Application.php
  [PASS] application/Espo/Core/Container.php
  [PASS] application/Espo/Core/Api/Request.php
  [PASS] application/Espo/Core/Api/Response.php
  [PASS] application/Espo/ORM/EntityManager.php
  [PASS] application/Espo/ORM/Entity.php
  [PASS] application/Espo/ORM/Repository.php
  [PASS] application/Espo/Modules/Recruitment/Module.php
  [PASS] application/Espo/Resources/metadata/entityDefs/JobApplicant.json

--- Test 4: JobApplicant Metadata Schema ---
  [PASS] Metadata JSON contains all 6 pipeline stages and valid schema

--- Test 5: EspoCRM REST API Simulation ---
  [PASS] REST API request/response cycle validated
========================================
All 5 EspoCRM Setup Unit Tests Passed!
========================================

--- Test 1: JSX Component File Integrity ---
  [PASS] Verified client/src/components/CandidatePortal.jsx
  [PASS] Verified client/src/components/PipelineCard.jsx
  [PASS] Verified client/src/App.jsx
  [PASS] Verified client/src/utils/virtualDomEngine.js

--- Test 2: Virtual DOM VNode Creation ---
  [PASS] VNode tree matches expected React.createElement representation

--- Test 3: Virtual DOM Heuristic Diffing ---
  [PASS] Identical VNode comparison correctly yields NO_OP
  [PASS] Property and text diffing produces minimal patch object
  [PASS] Type change correctly triggers REPLACE patch
  [PASS] Null new node correctly yields REMOVE patch

--- Test 4: Pipeline State Advancement Transition ---
  [PASS] Pipeline stages advance sequentially and respect terminal boundaries
========================================
All 4 React & Virtual DOM Unit Tests Passed!
========================================

--- Test 1: Business Process Mapping Document Verification ---
  [PASS] BUSINESS_PROCESS_MAPPING.md structure and API contracts verified

--- Test 2: Opportunity Stage Progression & Probabilities ---
  [PASS] All 7 stage rules and probability constraints verified

--- Test 3: Lead Conversion Transaction Logic ---
  [PASS] Atomic conversion correctly maps Account, Contact, and Opportunity entities

--- Test 4: API Payload Simulation & Status Verification ---
  [PASS] API endpoint responses conform to HTTP standards
========================================
All 4 Business Process Mapping Tests Passed!
========================================

--- Test 1: Functional Component Composition Integrity ---
  [PASS] Verified client/src/components/LeadToClosure/ClosureSummaryMetrics.jsx
  [PASS] Verified client/src/components/LeadToClosure/LeadCard.jsx
  [PASS] Verified client/src/components/LeadToClosure/OpportunityCard.jsx
  [PASS] Verified client/src/components/LeadToClosure/ActivityFeed.jsx
  [PASS] Verified client/src/components/LeadToClosure/LeadPipelineContainer.jsx

--- Test 2: Unidirectional State Transition Simulation ---
  [PASS] Conversion event properly immutably updated parent state and created Opportunity
  [PASS] Stage transition correctly enforced 100% win probability

--- Test 3: Computed Metrics Derived from Props ---
  [PASS] Derived metrics accurately calculated from props inputs
========================================
All 3 React Props & Unidirectional Flow Tests Passed!
========================================
```

---

## 9. Review Checklist

- [x] **All tasks completed as specified** — Process mapping, workflow rules, BPM flowchart, reports, API inspection, and React component suite.
- [x] **Code follows existing project conventions** — Clean modular JavaScript/React functional architecture.
- [x] **Meaningful commits** — At least 2 commits following conventional commits (`type(scope): description`).
- [x] **Zero hardcoded secrets** — All configurations parameterized in templates.
- [x] **CIA used at least twice** — Mentor Mode and Code Mode interactions logged in `docs/CIA_LOG.md`.
- [x] **Viva questions answered** — Comprehensive answers documented below.

---

## 10. Viva Questions & Answers

### Q1: Walk me through your implementation — what did you build and why did you structure it that way?
**Answer:**  
In this implementation, I bridged enterprise business process modeling with modern frontend software architecture:
1. On the business domain layer, I mapped the complete **Lead-to-Closure** lifecycle in EspoCRM. I established the schema, relationships, and REST API contracts for `Lead`, `Opportunity`, `Account`, `Contact`, and `Activity`. I studied 3 automated Workflow rules, 2 BPMN process flows, and 2 reporting engine configurations.
2. On the frontend application layer, I modeled this exact pipeline in React using functional components. I structured it using the **Container vs Presentational pattern**:
   - `LeadPipelineContainer` maintains the mutable state as the Single Source of Truth.
   - Child components (`ClosureSummaryMetrics`, `LeadCard`, `OpportunityCard`, `ActivityFeed`) are pure functional components that accept read-only props and emit actions upward via callbacks.
This architecture guarantees strict unidirectional data flow, eliminates prop drilling bugs, and makes individual components trivial to unit test and maintain.

### Q2: What was the most challenging part and how did you solve it?
**Answer:**  
The most challenging part was ensuring transactional consistency during the **Lead Conversion** step across both the database model and the React state. When a Lead converts, multiple interdependent entities must be created synchronously: the `Account` for the company, the `Contact` for the person, and the `Opportunity` for forecasted revenue, while updating the Lead's status to `Converted`.

If these operations occur non-atomically, network hiccups or partial failures could create orphan records or allow duplicate conversions. I solved this by:
1. Designing the backend API contract around an atomic `POST /api/v1/Lead/action/convert` endpoint that wraps the creation in a single database transaction.
2. In the React frontend, implementing an immutable state transition guard (`if (lead.status === 'Converted') return;`) and disabling action buttons once converted, preventing double-clicks and race conditions.

### Q3: If you had one more day, what would you improve?
**Answer:**  
With an extra day, I would focus on three high-impact enhancements:
1. **Drag-and-Drop Kanban Interaction:** Integrate `HTML5 Drag and Drop` or `@hello-pangea/dnd` to allow sales representatives to drag opportunity cards smoothly between stage columns, automatically calculating win probabilities on drop.
2. **Optimistic UI Updates with Rollback:** Implement optimistic UI updates when moving deal stages or logging calls. The frontend immediately updates local state for instant responsiveness and issues the API request in the background; if the server responds with a 4xx/5xx error, it rolls back to the previous state with a clear toast notification.
3. **Real-time WebSocket Activity Feed:** Connect the `ActivityFeed` component to EspoCRM's WebSocket daemon (`daemon.php`), allowing multi-user collaboration where new meetings or stage transitions made by colleagues appear live in the feed without manual page refresh.
