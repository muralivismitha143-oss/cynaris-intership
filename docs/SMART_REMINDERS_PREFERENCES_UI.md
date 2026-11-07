# Smart Reminders: Frontend UI & User Preference Settings Architecture

**Author:** Murali (Full Stack Intern)  
**Date:** October 31, 2026  
**Module:** `backend/routes/preferencesRouter.js` & `client/src/components/SmartReminders/`  
**Branch:** `feat/cynaris-w4d2-murali`  

---

## 1. Executive Summary & Problem Statement

In enterprise recruitment and sales organizations, communication preferences vary widely across recruiters, hiring managers, and department heads:
- **Talent Acquisition Leads** need high-volume, multi-channel updates (Email, WhatsApp, In-App).
- **Engineering Leads** prefer asynchronous, non-intrusive alerts (Email only) to preserve coding focus blocks.
- **Corporate Account Executives** prioritize immediate SMS alerts for critical accounts during extended business hours.
- **Anti-Disturbance Boundaries (Quiet Hours):** Recruiters must not be bombarded with automated reminder notifications during late evenings, nights, or weekends.

The **User Preference Settings Engine** establishes a customizable, policy-compliant layer on top of the Smart Reminders system:
1. **Modular Express Routing:** Dedicated `preferencesRouter` managing RESTful preference lifecycles.
2. **Schema Validation Middleware:** `preferenceValidator` enforcing format standards (24-hour `HH:mm`, allowed channels, minimum urgency tiers).
3. **Quiet Hours & Working Day Intelligence:** Algorithms evaluating whether a reminder timestamp falls in a recruiter's Do-Not-Disturb (DND) window, automatically shifting it to the next active working morning in Indian Standard Time (IST).
4. **Static File Serving:** Developer schemas and documentation served efficiently via `express.static()`.
5. **Interactive React Settings Panel:** Modal dialog with instant profile switching, channel toggle boxes, and live DND status banners.

---

## 2. Express Server Architecture & Middleware Pipeline

```
   ┌─────────────────────────────────────────────────────────────┐
   │                    Express Server Pipeline                  │
   │                                                             │
   │  [ Incoming HTTP Request ]                                  │
   │            │                                                │
   │            ▼                                                │
   │  ┌───────────────────┐                                      │
   │  │ Performance Logger│ ──> Sets X-Request-ID, X-Response-Time│
   │  └─────────┬─────────┘                                      │
   │            ▼                                                │
   │  ┌───────────────────┐                                      │
   │  │   express.json()  │ ──> Parses request stream to JSON    │
   │  └─────────┬─────────┘                                      │
   │            │                                                │
   │            ├──> express.static("/static/preferences")       │
   │            │    - Serves preferences-schema.json            │
   │            │    - Serves index.html documentation           │
   │            │                                                │
   │            ▼                                                │
   │  ┌───────────────────────────────────────────────┐          │
   │  │   preferencesRouter (/api/preferences)        │          │
   │  │                                               │          │
   │  │   ├── GET /                   (List Profiles) │          │
   │  │   ├── GET /:userId            (Get Profile)   │          │
   │  │   ├── PUT /:userId            (Update Profile)│          │
   │  │   │     └── [preferenceValidator Middleware] │          │
   │  │   ├── PATCH /:userId/channels/:ch             │          │
   │  │   └── GET /:userId/quiet-hours/check          │          │
   │  └───────────────────────┬───────────────────────┘          │
   │                          │                                  │
   │                          ▼                                  │
   │  ┌───────────────────────────────────────────────┐          │
   │  │        Error-Handling Middleware (4-arity)    │          │
   │  │             (err, req, res, next)             │          │
   │  └───────────────────────────────────────────────┘          │
   └─────────────────────────────────────────────────────────────┘
```

### 2.1 Request & Response Lifecycle
- **`req.params`:** Captures dynamic URL tokens (`:userId`, `:channel`).
- **`req.body`:** Parsed JSON payload containing updated preference structures.
- **`req.validatedPreferences`:** Sanitized, verified object attached by `preferenceValidator` and forwarded down the middleware chain.
- **`res.status().json()`:** Deterministic HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Server Error`).
- **`res.setHeader()`:** Sets metadata headers (`X-Preference-Engine`, `X-Response-Time`).

---

## 3. User Preferences Schema

File: `backend/public/preferences/preferences-schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CynarisUserPreferences",
  "type": "object",
  "required": ["userId", "channels", "quietHours", "workingSchedule", "remindersPolicy"],
  "properties": {
    "userId": { "type": "string" },
    "userName": { "type": "string" },
    "role": { "type": "string" },
    "timezone": { "type": "string", "default": "Asia/Kolkata" },
    "channels": {
      "type": "object",
      "properties": {
        "email": { "type": "boolean" },
        "whatsapp": { "type": "boolean" },
        "inApp": { "type": "boolean" },
        "sms": { "type": "boolean" }
      }
    },
    "quietHours": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "start": { "type": "string", "pattern": "^([01]\\d|2[0-3]):([0-5]\\d)$" },
        "end": { "type": "string", "pattern": "^([01]\\d|2[0-3]):([0-5]\\d)$" }
      }
    },
    "workingSchedule": {
      "type": "object",
      "properties": {
        "days": { "type": "array", "items": { "type": "string" } },
        "startHour": { "type": "string" },
        "endHour": { "type": "string" }
      }
    },
    "remindersPolicy": {
      "type": "object",
      "properties": {
        "minimumUrgency": { "type": "string", "enum": ["All", "Medium", "High", "Critical"] },
        "autoScheduleAiSuggestions": { "type": "boolean" }
      }
    }
  }
}
```

---

## 4. Quiet Hours & Working Window Algorithm

### 4.1 Midnight Crossover Logic
A standard comparison like `currentHour >= startHour && currentHour < endHour` fails when Quiet Hours start in the evening and end the following morning (e.g. `20:00` to `08:30` IST):

```javascript
const currentTotalMin = currentH * 60 + currentM;
const startTotalMin = startH * 60 + startM;
const endTotalMin = endH * 60 + endM;

if (startTotalMin > endTotalMin) {
  // Spans midnight: e.g. 20:00 (1200) to 08:30 (510)
  return currentTotalMin >= startTotalMin || currentTotalMin < endTotalMin;
} else {
  // Same-day: e.g. 13:00 to 14:00
  return currentTotalMin >= startTotalMin && currentTotalMin < endTotalMin;
}
```

### 4.2 Auto-Shifting Reminders Out of DND
When a candidate exceeds idle thresholds at 11:00 PM on a Friday:
1. `isQuietHour` flags the timestamp as Do-Not-Disturb.
2. `adjustToWorkingWindow` advances the date forward past the weekend (Saturday/Sunday) to Monday morning at `09:30` IST.
3. The AI timing engine schedules the notification for `Monday 09:30 AM IST`, preventing unwelcome off-hours alerts.

---

## 5. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/preferences` | Lists all recruiter preference profiles. |
| `GET` | `/api/preferences/:userId` | Retrieves preference settings for a single user. |
| `PUT` | `/api/preferences/:userId` | Updates preference settings (guarded by `preferenceValidator`). |
| `PATCH` | `/api/preferences/:userId/channels/:channel` | Quick toggles an individual notification channel. |
| `POST` | `/api/preferences/:userId/reset` | Resets a recruiter's settings back to enterprise default policy. |
| `GET` | `/api/preferences/:userId/quiet-hours/check` | Tests if a query timestamp falls in DND and returns shifted slot. |
| `GET` | `/static/preferences/preferences-schema.json` | Static JSON schema served via `express.static`. |
| `GET` | `/static/preferences/index.html` | Static HTML documentation guide. |

---

## 6. Verification & Automated Test Evidence

Automated unit test suite `tests/test_express_routing_and_preferences.js` validates all components:
- **Test 1:** Schema validation middleware (`preferenceValidator`) rejecting malformed hours and channel starvation.
- **Test 2:** Preferences store CRUD, multi-profile retrieval, channel patching, and reset.
- **Test 3:** Quiet hours calculation across overnight boundaries and working window adjustments.
- **Test 4:** Express static file serving.
