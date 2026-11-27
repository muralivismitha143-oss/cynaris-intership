# Week 5 Day 5: Assessment Engine Study + UI Bug Fix + PR
## Cynaris Full Stack Development Internship — Project 3 Submission Report

**Student Name:** Murali  
**Branch:** `feat/cynaris-w5d5-murali`  
**Date:** November 7, 2026  
**Lesson:** Week 5 Day 5 — Assessment Engine Study + UI Bug Fix + PR  
**Theme:** Enterprise Bug Investigation, UI/UX Hardening, Asynchronous Concurrency Control, and Accessibility Standards in Moodle LMS  
**Bug Report Document:** [`docs/MOODLE_ASSESSMENT_UI_BUG_REPORT.md`](./MOODLE_ASSESSMENT_UI_BUG_REPORT.md)  
**Test Suite:** [`tests/test_moodle_ui_bug_fixes.js`](../tests/test_moodle_ui_bug_fixes.js)  

---

## 1. Executive Summary & Sprint Objectives

In Week 5 Day 5, we performed a thorough architectural audit and systematic debugging sprint across the **Moodle Assessment Engine** (`mod_quiz`) and the **Telemetry Progress Dashboard** (`block_cynaris_stats`).

### Key Deliverables Completed:
1. **Systematic Bug Discovery & Reproduction:**
   - Isolated 3 concrete bugs affecting candidate assessment UX, responsive data visualization, and asynchronous AJAX race conditions.
   - Documented formal reproduction workflows, root cause analyses, and verification procedures in [`docs/MOODLE_ASSESSMENT_UI_BUG_REPORT.md`](./MOODLE_ASSESSMENT_UI_BUG_REPORT.md).
2. **Issue #101 Resolution (Assessment Quiz View - `mod/quiz/view.php`):**
   - Added `<meta name="viewport" content="width=device-width, initial-scale=1.0">` to ensure fluid rendering on mobile devices.
   - Sanitized incoming quiz ID parameter using `filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT)`.
   - Connected dynamically to candidate attempt history, surfacing past assessment scores (e.g. Murali: `88.5%`) and rendering contextual call-to-actions ("Retake Assessment" vs "Start Timed Attempt") with W3C ARIA accessibility labels.
   - Committed as `031fed4 fix: sanitize parameters, add responsive viewport and dynamic attempt states in quiz view — closes #101`.
3. **Issue #102 Resolution (Dashboard Layout & Visual Design - `block_cynaris_stats.php`):**
   - Configured Chart.js scale options (`autoSkip: true`, `maxRotation: 40`, `font: { size: 10 }`) to prevent tick overlap on narrow viewports ($< 280\text{px}$).
   - Enforced `table-layout: fixed; width: 100%;` with `text-overflow: ellipsis;` to truncate long candidate names without breaking tabular layout.
   - Added `#cynaris-chart-skeleton` shimmer loader with smooth CSS pulse animation to eliminate Cumulative Layout Shift (CLS).
   - Committed as `2f272e0 fix: resolve chart canvas overflow, add responsive label rotation and skeleton loader — closes #102`.
4. **Issue #103 Resolution (Concurrency Race Conditions & A11y - `block_cynaris_stats.php`):**
   - Engineered client-side execution lock (`isRefreshing` boolean mutex) and disabled button during fetch (`disabled = true`, `opacity: 0.6`).
   - Wrapped state unlocking and UI restoration in a guaranteed `finally {}` block.
   - Added W3C ARIA live region attributes (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) to the live status badge and `aria-label` to the refresh trigger.
   - Committed as `42dbaa7 fix: debounce refresh button, prevent concurrent requests and add aria live regions — closes #103`.
5. **Testing & Platform Regression Check:**
   - Created automated test suite [`tests/test_moodle_ui_bug_fixes.js`](../tests/test_moodle_ui_bug_fixes.js) with 11 unit assertions.
   - Ran complete platform test suite via `npm test` verifying **all 22 test suites pass with 100% success rate**.

---

## 2. Self-Review Checklist

- [x] **All tasks completed as specified — no shortcuts taken:** Identified, reproduced, documented, fixed, and verified 3 distinct UI/UX bugs across Moodle assessment and telemetry dashboard.
- [x] **Each bug committed as a separate commit with descriptive message:**
  - `031fed4`: `fix: sanitize parameters, add responsive viewport and dynamic attempt states in quiz view — closes #101`
  - `2f272e0`: `fix: resolve chart canvas overflow, add responsive label rotation and skeleton loader — closes #102`
  - `42dbaa7`: `fix: debounce refresh button, prevent concurrent requests and add aria live regions — closes #103`
- [x] **Comprehensive bug report document created:** Full technical analysis in [`docs/MOODLE_ASSESSMENT_UI_BUG_REPORT.md`](./MOODLE_ASSESSMENT_UI_BUG_REPORT.md).
- [x] **No hardcoded secrets or credentials in code:** Sanitized parameters, verified no secrets or tokens committed.
- [x] **CIA used minimum twice — interactions logged:** QA Engineer Mode and Code Mode sessions logged in [`docs/CIA_LOG.md`](./CIA_LOG.md).
- [x] **CIA suggestion vs actual fix comparison documented:** Clear comparative analysis showing where CIA was right and where human engineering refined the solution (Section 4).
- [x] **All 3 Viva Voce questions answered thoroughly:** Addressed in Section 6.
- [x] **Regression test suite passes 100%:** All 22 test suites passing via `npm test`.

---

## 3. Bug Fix Commit Summary

| Commit SHA | Commit Message | Files Modified | Issue Closed |
|---|---|---|---|
| `031fed4` | `fix: sanitize parameters, add responsive viewport and dynamic attempt states in quiz view — closes #101` | `moodle/mod/quiz/view.php`, `backend/modules/moodle/MoodleService.js` | Closes #101 |
| `2f272e0` | `fix: resolve chart canvas overflow, add responsive label rotation and skeleton loader — closes #102` | `blocks/cynaris_stats/block_cynaris_stats.php`, `moodle/blocks/cynaris_stats/block_cynaris_stats.php`, `backend/modules/moodle/MoodleService.js` | Closes #102 |
| `42dbaa7` | `fix: debounce refresh button, prevent concurrent requests and add aria live regions — closes #103` | `blocks/cynaris_stats/block_cynaris_stats.php`, `moodle/blocks/cynaris_stats/block_cynaris_stats.php`, `backend/modules/moodle/MoodleService.js` | Closes #103 |

---

## 4. CIA Suggestion vs. Actual Fix Comparison

During the sprint, CIA AI was consulted across **QA Engineer Mode** and **Code Mode**. The table below evaluates where the AI recommendations were accurate and where architectural refinements were applied:

| Issue | CIA Recommendation | Actual Implementation | Evaluation & Engineering Insight |
|---|---|---|---|
| **#101: Quiz View Parameter & Mobile Layout** | Suggested casting `(int)$_GET['id']` and adding standard `<meta name="viewport">`. | Implemented `filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT)` with fallback to default ID `1`. Added dynamic attempt detection (`getCandidateQuizAttempt`) to display past attempt scores and adjust the CTA button to "Retake Assessment" with `aria-label`. | **Refinement:** While CIA's `(int)` typecast prevented type coercion crashes, `filter_input` is safer and complies with Moodle DBAL guidelines. Furthermore, CIA missed the user experience gap: candidates who completed an attempt had no visual feedback of their score. |
| **#102: Chart.js Canvas Overflow & Table Clipping** | Recommended reducing canvas container height from 180px to 140px and setting `responsive: true`. | Left canvas height intact, but configured `scales.x.ticks` (`autoSkip: true`, `maxRotation: 40`, `font: { size: 10 }`). Added CSS `#cynaris-chart-skeleton` shimmer loader, and converted candidate grade table to `table-layout: fixed;` with `text-overflow: ellipsis;`. | **Where CIA was Wrong / Incomplete:** Simply reducing canvas height does not fix x-axis label collision on narrow widths; labels still collide horizontally. The true fix required Chart.js `autoSkip` and `maxRotation` tick controls, plus layout stabilization via skeleton loaders. |
| **#103: Dynamic Refresh Concurrency & A11y** | Suggested wrapping the refresh click handler in a `setTimeout()` debounce utility (e.g. 500ms delay). | Engineered a boolean execution mutex (`isRefreshing`) with immediate rejection (`if (isRefreshing) return;`), disabled the button visually and functionally (`disabled = true`, `opacity = 0.6`), added W3C ARIA live regions (`role="status"`, `aria-live="polite"`), and guaranteed cleanup in a `finally {}` block. | **Where CIA was Inadequate:** In asynchronous network operations, time-based debouncing fails if network latency exceeds the debounce duration (e.g. slow 3G taking 1200ms). A boolean mutex lock combined with UI disabled state and a `finally` block is guaranteed to prevent concurrent requests regardless of network speed. |

---

## 5. Simulated Visual Layout & UI Walkthrough

### Assessment Quiz View (`mod/quiz/view.php`) — Mobile Responsive & Attempt Feedback
```text
+-------------------------------------------------------------+
| 📱 Mobile Viewport (390px)                                  |
| 🎓 Cynaris Assessment Engine — Full Stack Readiness Quiz    |
+-------------------------------------------------------------+
|  Assessment Details                                         |
|  • Time Limit: 45 minutes                                   |
|  • Total Questions: 25                                      |
|  • Passing Grade: 75.0%                                     |
|                                                             |
|  +-------------------------------------------------------+  |
|  | [✓] Previous Attempt Recorded                         |  |
|  | Score: 88.5% • Status: Completed                      |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  [ ↻ Retake Assessment ]                                    |
+-------------------------------------------------------------+
```

### Telemetry Dashboard (`block_cynaris_stats.php`) — Narrow Sidebar (< 280px)
```text
+-------------------------------------------------------------+
| 📊 Real-Time Candidate Analytics                            |
| [● Live: Synced]                   [↻ Refresh Telemetry]   |
+-------------------------------------------------------------+
| Course Completion Rate (%)                                  |
|  100% |                                                     |
|   50% |   [█] 60%      [█] 50%      [█] 50%                 |
|    0% +------------------------------------                 |
|         CYN-FS-101   CYN-CRM-102  CYN-OPS-103  (AutoSkip)   |
|                                                             |
| Candidate Grade Summary                                     |
| Candidate                    Avg Grade                      |
| --------------------------------------                      |
| Murali                       88.50%                         |
| Ananya Deshmukh...           92.00%   (Truncated ellipsis)  |
| Rahul Verma                  74.50%                         |
| Priya Sharma                 [No Grades]                    |
| Vikram Malhotra...           81.00%                         |
+-------------------------------------------------------------+
```

---

## 6. Viva Voce Questions & Answers

### Question 1: Explain the root cause of one bug you fixed. Why did the original developer write it that way?
**Answer:**
> **Bug Examined:** Issue #103 — Dynamic Telemetry Refresh Race Conditions and Mutex Absence.  
> 
> **Root Cause:** In `blocks/cynaris_stats/block_cynaris_stats.php`, the "Refresh Telemetry" button directly invoked an asynchronous function (`refreshDashboardDynamically()`) without any concurrency guard or visual disabling. When a user clicked rapidly (double or triple-click), multiple asynchronous `fetch()` HTTP requests were launched concurrently. Since network requests over the internet do not guarantee First-In-First-Out (FIFO) completion order, an earlier slow request could finish *after* a later fast request. Each completion called `chartInstance.destroy()` and re-initialized the canvas. This caused visual flickering, canvas destruction errors in Chart.js, and wasted server resources.
> 
> **Why the Original Developer Wrote It That Way:** During local development, the Express backend responds in under 10 milliseconds over `localhost:3000`. In that environment, the fetch resolved almost instantaneously, giving the illusion that the button was safe. Furthermore, the developer was focused purely on happy-path feature delivery (getting data onto the screen) and did not test under real-world conditions with slow 3G latency, rapid user interactions, or accessibility screen readers.

---

### Question 2: How did you verify your fix did not break anything else?
**Answer:**
> We verified non-regression through a strict, multi-tiered verification methodology:
> 
> 1. **Automated Regression Suite Execution:** We ran the full repository test suite (`npm test`), which executes **all 22 automated test suites** across the entire platform. This includes:
>    - `test_moodle_setup.js`: Verified Moodle Docker configurations and table schemas remained intact.
>    - `test_moodle_core_tables_and_queries.js`: Verified that none of the 5 core relational tables (`mdl_course`, `mdl_grade_grades`, etc.) or SQL joins were broken.
>    - `test_moodle_block_cynaris_stats.js`: Verified that block capabilities (`db/access.php`), language strings, and CLI upgrades still execute cleanly.
>    - `test_moodle_chartjs_dashboard.js`: Verified that Bar and Line Chart data generation, AJAX endpoints, and candidate grading logic continued functioning.
>    - All earlier platform suites (Stateless JWT Auth, MySQL CRUD, Express Routing, Virtual DOM, React Router, Smart Reminders, EspoCRM).
> 2. **Dedicated Unit Verification:** We created [`tests/test_moodle_ui_bug_fixes.js`](../tests/test_moodle_ui_bug_fixes.js) containing 11 specific assertions that test both the positive fix behaviors (e.g. `isRefreshing` mutex, ARIA live regions, viewport meta tag, parameter sanitization) and potential boundary conditions.
> 3. **Guaranteed Cleanup in `finally` Blocks:** In the code itself, we wrapped the mutex release (`isRefreshing = false`) and button re-enabling in a `finally` block. This guarantees that even if the network endpoint returns a 500 error or drops connection, the UI will not remain permanently frozen in a locked state.

---

### Question 3: What is a regression test and why is it important after a bug fix?
**Answer:**
> **Definition:** A **regression test** is the practice of re-running functional and non-functional tests against an existing codebase after a code change (such as a bug fix, performance optimization, or refactor) to confirm that the change has not introduced new defects or broken previously working functionality ("regressed").
> 
> **Why It is Critical After a Bug Fix:**
> 1. **Software Interconnectedness:** In enterprise systems like Moodle or Cynaris, modules rarely exist in total isolation. For example, modifying `block_cynaris_stats.php` to add Chart.js ticks and skeleton loaders alters the DOM structure and CSS properties. Without regression tests, an engineer might inadvertently break the table layout for students without grades or corrupt the JSON contract expected by the CLI upgrade runner.
> 2. **Preventing Fix-Induced Regressions:** Industry data shows that approximately 20% to 30% of bug fixes inadvertently introduce a secondary defect elsewhere in the codebase.
> 3. **Enforcing Architectural Confidence:** In a continuous integration / continuous deployment (CI/CD) pipeline, automated regression tests act as the ultimate safety net. They allow developers to merge pull requests with mathematical confidence that existing business contracts remain 100% compliant.

---

## 7. Platform Verification Evidence

### Complete Test Execution (`npm test`):
```text
> cynaris-recruitment-platform@1.0.0 test
> node tests/test_espocrm_setup.js && ... && node tests/test_moodle_ui_bug_fixes.js

...
================================================================
🧪 Week 5 Day 5: Moodle Assessment & UI Bug Fixes Test Suite
================================================================

--- Test 1: Issue #101 — Quiz View Sanitization & Viewport ---
  [PASS] moodle/mod/quiz/view.php exists and includes responsive viewport
  [PASS] Sanitizes quiz id parameter using FILTER_VALIDATE_INT
  [PASS] Dynamically displays candidate previous attempt grades and accessible button labels

--- Test 2: Issue #102 — Chart Canvas Overflow & Skeleton Loader ---
  [PASS] Chart.js options configure responsive autoSkip and maxRotation to prevent collision
  [PASS] Renders skeleton shimmer loader placeholder in DOM
  [PASS] Applies table-layout: fixed and ellipsis truncation to candidate grade table cells

--- Test 3: Issue #103 — Debounce Mutex & ARIA Accessibility ---
  [PASS] Implements execution mutex flag (isRefreshing) to prevent concurrent request race conditions
  [PASS] Disables button and applies loading styles during in-flight fetch and restores in finally
  [PASS] Declares W3C ARIA live region attributes on status indicators and refresh button

--- Test 4: Regression Check across Full Moodle Service ---
  [PASS] All 5 core tables remain queryable with zero breaking schema changes
  [PASS] Chart telemetry endpoint continues returning valid Bar and Line chart datasets

================================================================
🎉 [SUCCESS] All 11 Week 5 Day 5 UI Bug Fix Tests Passed!
================================================================
```

**Overall Platform Test Status:** **All 22 Suites Passing (100% Pass Rate)**
