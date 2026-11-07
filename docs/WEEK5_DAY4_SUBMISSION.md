# Week 5 Day 4: Progress Dashboard — Chart.js Visualisation from Grade Data
## Cynaris Full Stack Development Internship — Project 3 Submission Report

**Student Name:** Murali  
**Branch:** `feat/cynaris-w5d4-murali`  
**Date:** November 7, 2026  
**Lesson:** Week 5 Day 4 — Progress Dashboard — Chart.js Visualisation from Grade Data  
**Theme:** Implement real-time, interactive data visualisations in Moodle LMS from core relational database tables — using Chart.js and asynchronous AJAX polling  
**Architecture Specification:** [`docs/MOODLE_CHARTJS_PROGRESS_DASHBOARD.md`](./MOODLE_CHARTJS_PROGRESS_DASHBOARD.md)  
**Test Suite:** [`tests/test_moodle_chartjs_dashboard.js`](../tests/test_moodle_chartjs_dashboard.js)  

---

## 1. Executive Summary & Sprint Objectives

In Week 5 Day 4, we upgraded `block_cynaris_stats` from an initial static scaffold into a production-grade **Progress Dashboard** displaying interactive Chart.js visualizations directly on the Moodle dashboard (`/my/`).

### Key Deliverables Completed:
1. **Relational Data Extraction from the 5 Approved Tables:**
   - Evaluated `mdl_course` + `mdl_course_completions` to calculate completion % per course (CYN-FS-101: 60%, CYN-CRM-102: 50%, CYN-OPS-103: 50%).
   - Evaluated `mdl_user` + `mdl_grade_grades` to calculate average grade per candidate across 5 enrolled candidates, seamlessly handling **both candidates with grades and candidates without submitted grades**.
   - Evaluated `mdl_user` + `mdl_log` to calculate login frequency and last login timestamps (Murali: 4 logins, Ananya: 4 logins, Rahul: 3 logins, Priya: 2 logins, Vikram: 1 login).
2. **Asynchronous Moodle AJAX Service (`ajax.php`):**
   - Built [`blocks/cynaris_stats/ajax.php`](../blocks/cynaris_stats/ajax.php) and [`moodle/blocks/cynaris_stats/ajax.php`](../moodle/blocks/cynaris_stats/ajax.php) complying with Moodle's `define('AJAX_SCRIPT', true);` standard to deliver lightweight, CORS-friendly JSON payloads.
   - Mounted REST proxy endpoint `/api/moodle/blocks/cynaris_stats/chart-data` in the Cynaris Express backend.
3. **Dual Chart.js Visualizations (CDN):**
   - Integrated Chart.js v4.x via CDN `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`.
   - Rendered **Bar Chart** (`#cynaris-completion-chart`) displaying course completion rates.
   - Rendered **Line Chart** (`#cynaris-login-chart`) displaying user login frequency trends with area fills and bezier smoothing.
4. **Dynamic Update Engine (Zero Page Reload):**
   - Implemented an asynchronous client-side JavaScript engine (`refreshDashboardDynamically`) with explicit Chart.js `.destroy()` cleanup to prevent canvas redraw glitches and memory leaks.
   - Added on-demand dynamic polling via a "Refresh Telemetry" button and automatic 30-second background polling.
5. **Testing & Verification:**
   - Built test suite [`tests/test_moodle_chartjs_dashboard.js`](../tests/test_moodle_chartjs_dashboard.js) with 14 automated assertions.
   - Confirmed 100% pass rate across **all 21 test suites** in the Cynaris Recruitment Platform via `npm test`.

---

## 2. Self-Review Checklist

- [x] **All tasks completed as specified — no shortcuts taken:** Queried the 5 approved tables, calculated course completion %, candidate average grades, and last login timestamps.
- [x] **Return data as JSON from Moodle AJAX service:** Created `blocks/cynaris_stats/ajax.php` and backend route `/api/moodle/blocks/cynaris_stats/chart-data`.
- [x] **Add Chart.js CDN to block output:** Loaded Chart.js CDN and rendered both a Bar Chart (completion %) and a Line Chart (login frequency).
- [x] **The block updates dynamically with no page reload required:** Asynchronous fetch function with `.destroy()` lifecycle and live status badge.
- [x] **Tested with 3+ students enrolled, some with grades, some without:** Tested with 5 candidate users (4 with grades, 1 without grades), verifying accurate calculations and graceful "No Grades" badge formatting.
- [x] **Code follows existing project conventions and patterns:** Strict Frankenstyle Moodle component architecture and safe DBAL queries.
- [x] **At least 2 meaningful commits with descriptive messages:** Conventional commits executed (`feat(moodle): ...`, `feat(test): ...`, `docs(w5d4): ...`).
- [x] **No hardcoded secrets or credentials in code:** Environment variables and parameter-safe queries used throughout.
- [x] **CIA used minimum twice — interactions logged:** Full Stack Mentor Mode and Code Mode sessions logged in [`docs/CIA_LOG.md`](./CIA_LOG.md).
- [x] **All 3 Viva Voce questions answered:** Addressed thoroughly in Section 6.

---

## 3. Simulated Visual Rendering on Moodle Dashboard (`/my/`)

```text
+---------------------------------------------------------------------------------------------------------+
|  🎓 Cynaris Recruitment & Learning Management System                             [👤 Murali | ⚙️ Setup]  |
+---------------------------------------------------------------------------------------------------------+
|  [ Dashboard ]  [ 📚 My Courses ]  [ 👥 Candidates ]  [ 📝 Assessments ]  [ 📊 Reports ]  [ ⚙️ Admin ]     |
+--------------------------------------------------------------------+------------------------------------+
|  MAIN DASHBOARD CONTENT                                            |  SIDEBAR PROGRESS DASHBOARD        |
|                                                                    |                                    |
|  📚 WELCOME BACK, MURALI                                           |  +------------------------------+  |
|  You are enrolled in 3 core training modules.                      |  | Cynaris Recruitment & Stats  |  |
|                                                                    |  +------------------------------+  |
|  Current Module Highlights:                                        |  | 📊 Telemetry   🟢 Live      |  |
|  • Induction & Architecture: Completed (Grade: 96.5%)              |  |                              |  |
|  • Enterprise CRM: Completed (Grade: 92.0%)                        |  | 📈 Course Completion Rates   |  |
|  • Production DevOps: In Progress                                  |  |  60% | [██████] CYN-FS-101   |  |
|                                                                    |  |  50% | [█████ ] CYN-CRM-102   |  |
|                                                                    |  |  50% | [█████ ] CYN-OPS-103   |  |
|                                                                    |  |                              |  |
|                                                                    |  | ⚡ Login Frequency Trend    |  |
|                                                                    |  |  4 |    /\                        |  |
|                                                                    |  |  3 |   /  \    /\                 |  |
|                                                                    |  |  2 |  /    \  /  \                |  |
|                                                                    |  |  1 | /      \/    \               |  |
|                                                                    |  |    +---------------------     |  |
|                                                                    |  |     Mur Ana Rah Pri Vik       |  |
|                                                                    |  |                              |  |
|                                                                    |  | 👥 Candidate Grade Table     |  |
|                                                                    |  | • Murali V:     [95.50%]     |  |
|                                                                    |  | • Ananya Iyer:  [92.75%]     |  |
|                                                                    |  | • Rahul D:      [86.25%]     |  |
|                                                                    |  | • Vikram A:     [78.50%]     |  |
|                                                                    |  | • Priya S:      [No Grades]  |  |
|                                                                    |  |                              |  |
|                                                                    |  | [ 🔄 Refresh ]   Live: 20:35  |  |
|                                                                    |  +------------------------------+  |
+--------------------------------------------------------------------+------------------------------------+
```

---

## 4. Multi-Student Dataset & Metric Verification

The system was evaluated against 5 candidate accounts (exceeding the 3+ student requirement):

| User ID | Candidate Name | Email | Graded Attempts | Calculated Average | Status Flag |
|:---:|:---|:---|:---:|:---:|:---:|
| 2 | Murali V | murali@cynaris.com | 3 | **95.50%** | Submitted & Graded |
| 5 | Ananya Iyer | ananya.iyer@cynaris.com | 2 | **92.75%** | Submitted & Graded |
| 4 | Rahul Deshmukh | rahul.deshmukh@cynaris.com | 2 | **86.25%** | Submitted & Graded |
| 6 | Vikram Aditya | vikram.aditya@cynaris.com | 1 | **78.50%** | Submitted & Graded |
| 3 | Priya Sharma | priya.sharma@cynaris.com | 0 | **0.00%** | **No Grades Submitted** |

---

## 5. Moodle AJAX JSON Stream (`GET /blocks/cynaris_stats/ajax.php`)

```json
{
  "success": true,
  "timestamp": "2026-11-07T20:50:00.000Z",
  "courseCompletionStats": [
    { "courseId": 101, "courseCode": "CYN-FS-101", "courseName": "Full Stack Developer Internship", "totalEnrolled": 5, "completedCount": 3, "completionPercentage": 60.0 },
    { "courseId": 102, "courseCode": "CYN-CRM-102", "courseName": "Enterprise CRM & EspoCRM", "totalEnrolled": 2, "completedCount": 1, "completionPercentage": 50.0 },
    { "courseId": 103, "courseCode": "CYN-OPS-103", "courseName": "Production DevOps — Docker & CI/CD", "totalEnrolled": 2, "completedCount": 1, "completionPercentage": 50.0 }
  ],
  "charts": {
    "barChart": {
      "labels": ["CYN-FS-101", "CYN-CRM-102", "CYN-OPS-103"],
      "datasets": [{
        "label": "Course Completion Rate (%)",
        "data": [60.0, 50.0, 50.0],
        "backgroundColor": "rgba(2, 132, 199, 0.75)",
        "borderColor": "rgba(2, 132, 199, 1)",
        "borderWidth": 1.5,
        "borderRadius": 4
      }]
    },
    "lineChart": {
      "labels": ["Murali V", "Ananya Iyer", "Rahul Deshmukh", "Priya Sharma", "Vikram Aditya"],
      "datasets": [{
        "label": "User Login Frequency",
        "data": [4, 4, 3, 2, 1],
        "borderColor": "rgba(16, 185, 129, 1)",
        "backgroundColor": "rgba(16, 185, 129, 0.2)",
        "fill": true,
        "tension": 0.35,
        "pointRadius": 5,
        "pointBackgroundColor": "rgba(16, 185, 129, 1)"
      }]
    }
  }
}
```

---

## 6. Viva Voce Questions & Comprehensive Answers

### Question 1: Walk me through your implementation — what did you build and why did you structure it that way?

> **Answer:**  
> In this sprint, I transformed the `block_cynaris_stats` Moodle block plugin into an interactive, real-time Progress Dashboard powered by Chart.js.
> 
> I structured the implementation across three decoupled layers:
> 1. **Data Aggregation Layer (5 Approved Core Tables):**  
>    I formulated queries strictly across the five foundational Moodle tables:
>    - `mdl_course` and `mdl_course_completions` compute course completion percentages.
>    - `mdl_user` and `mdl_grade_grades` compute student grade averages, explicitly supporting students with submitted assessment grades and students with zero submissions.
>    - `mdl_user` and `mdl_log` aggregate login frequency and most recent login dates.
> 2. **Asynchronous Endpoint Layer (`ajax.php` & REST API):**  
>    In accordance with Moodle's AJAX guidelines, I created `blocks/cynaris_stats/ajax.php` declaring `define('AJAX_SCRIPT', true);`. This bypasses HTML header rendering and streams structured JSON payloads containing pre-formatted Chart.js datasets (`labels`, `backgroundColor`, `borderColor`, `data`).
> 3. **Presentation & Dynamic Polling Layer (Chart.js):**  
>    In `block_cynaris_stats.php`, I included the Chart.js CDN and created two canvas viewports: a Bar Chart for completion rates and a Line Chart for login trends. I implemented an asynchronous JavaScript engine (`refreshDashboardDynamically`) with explicit `.destroy()` lifecycle management that queries the AJAX endpoint and smoothly re-renders the charts without full-page reloads.

---

### Question 2: What was the most challenging part and how did you solve it?

> **Answer:**  
> The most challenging part was **handling Chart.js canvas state lifecycles during dynamic updates and safely joining heterogeneous candidate datasets (some candidates with grades, some without)**.
> 
> Specifically:
> 1. **Chart.js Canvas Collision & Memory Leaks:**  
>    When an asynchronous AJAX poll arrives, instantiating `new Chart(ctx, ...)` on an existing HTML5 canvas throws an exception or leaves ghost layers where hovering triggers flickering redraws of previous states. I resolved this by storing references to `completionChartInstance` and `loginChartInstance` and explicitly checking and calling `.destroy()` before rendering fresh telemetry.
> 2. **Ungraded Students in SQL Aggregations:**  
>    Using a standard `INNER JOIN` between `mdl_user` and `mdl_grade_grades` silently excludes candidates who have not yet submitted any quiz attempts (like Priya Sharma). Conversely, a naive `AVG(finalgrade)` on a `LEFT JOIN` yields `NULL`, which can break client-side arithmetic. I solved this by using `COUNT(gg.id)` with `COALESCE(ROUND(AVG(gg.finalgrade), 2), 0.00)` and adding an explicit `hasGrades: Boolean(count > 0)` flag. This allows the UI to render a clean "No Grades" badge while keeping the candidate in the dashboard roster.
> 3. **Responsive Container Sizing:**  
>    In Moodle sidebar blocks, unconstrained canvases expand infinitely on window resize. I wrapped each canvas inside a fixed-height container (`height: 180px; width: 100%; position: relative;`) with Chart.js options `responsive: true, maintainAspectRatio: false`.

---

### Question 3: If you had one more day, what would you improve?

> **Answer:**  
> If granted an additional day, I would focus on three advanced enhancements:
> 1. **Moodle AMD Module Modularization:**  
>    Currently, the JavaScript updater is rendered directly in the block markup for atomic delivery. In a full production rollout, I would refactor the client-side logic into an asynchronous AMD module (`amd/src/dashboard_chart.js`) and load it via Moodle's `$PAGE->requires->js_call_amd('block_cynaris_stats/dashboard_chart', 'init', [$payload]);`.
> 2. **Interactive Chart Drill-Downs:**  
>    I would add Chart.js `onClick` event handlers so clicking a course bar opens the detailed course completion roster, and clicking a candidate point on the login frequency line displays their recent activity log modal.
> 3. **WebSocket Live Streaming via Redis:**  
>    Rather than client-side polling every 30 seconds, I would connect the Moodle event observer (`\core\event\user_loggedin` and `\mod_quiz\event\attempt_submitted`) to a Redis Pub/Sub channel, pushing instant updates to connected browser sessions via WebSockets.

---

## 7. Evidence of Automated Test Execution

All **21 unit and integration test suites** pass cleanly via `npm test` with 100% success rate:

```bash
npm run test:w5d4   # Runs Week 5 Day 4 Chart.js Progress Dashboard test suite
npm test            # Runs all 21 platform test suites across Weeks 1 to 5
```

### Test Suite Execution Output:
```text
================================================================
🧪 Week 5 Day 4: Moodle Chart.js Progress Dashboard Test Suite
================================================================

--- Test 1: Moodle AJAX Service Files ---
  [PASS] blocks/cynaris_stats/ajax.php exists and specifies AJAX_SCRIPT
  [PASS] moodle/blocks/cynaris_stats/ajax.php exists as parity endpoint

--- Test 2: Course Completion % (mdl_course + mdl_course_completions) ---
  [PASS] Calculates completion % for all active courses
  [PASS] Course 101 completion percentage is calculated accurately (3/5 = 60.0%)

--- Test 3: Student Grade Averages & Multi-Student Dataset ---
  [PASS] Evaluates 3+ enrolled students with real data
  [PASS] Differentiates students with grades from students without grades

--- Test 4: Last Login & Login Frequency (mdl_user + mdl_log) ---
  [PASS] Aggregates login frequency and last login timestamp per user

--- Test 5: Chart.js Configuration Payload ---
  [PASS] Generates compliant Bar Chart dataset for Course Completion %
  [PASS] Generates compliant Line Chart dataset for Login Frequency

--- Test 6: Block HTML Output & Chart.js CDN ---
  [PASS] Renders Chart.js CDN script tag in block output
  [PASS] Renders both Bar Chart canvas and Line Chart canvas
  [PASS] Renders student grades summary table displaying grades and "No Grades" badges

--- Test 7: Dynamic Update Engine (Zero Page Reload) ---
  [PASS] Implements Chart.js destruction lifecycle before re-instantiation
  [PASS] Implements asynchronous fetch and auto-polling without page reload

================================================================
🎉 [SUCCESS] All 14 Week 5 Day 4 Chart.js Dashboard Tests Passed!
================================================================
```

---

## 8. Conclusion

Week 5 Day 4 successfully delivers the interactive **Chart.js Progress Dashboard**:
- Extracted telemetry strictly from the 5 approved tables (`mdl_course`, `mdl_grade_grades`, `mdl_course_completions`, `mdl_user`, `mdl_log`).
- Built asynchronous Moodle AJAX endpoint `blocks/cynaris_stats/ajax.php`.
- Integrated Chart.js CDN rendering a Bar Chart (completion %) and a Line Chart (login frequency).
- Engineered a dynamic update engine refreshing charts without page reloads.
- Evaluated against a multi-student dataset with students with grades and without grades.
- All 21 automated test suites passing with 100% success rate across the Cynaris platform.
