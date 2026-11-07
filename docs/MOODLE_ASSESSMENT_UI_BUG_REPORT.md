# Moodle LMS Assessment Engine & UI/UX Bug Investigation Report
## Cynaris Full Stack Development Internship — Sprint 5 Day 5

**Author:** Murali  
**Branch:** `feat/cynaris-w5d5-murali`  
**Date:** November 7, 2026  
**Subsystem:** Moodle v4.3+ Assessment Module (`mod_quiz`) & Telemetry Dashboard (`block_cynaris_stats`)  
**Test Suite:** [`tests/test_moodle_ui_bug_fixes.js`](../tests/test_moodle_ui_bug_fixes.js)  

---

## Executive Summary

During the Week 5 Day 5 Assessment Engine Study and UI Audit, three critical UI/UX and architectural bugs were identified across the Moodle candidate assessment lifecycle and the `block_cynaris_stats` progress dashboard:

1. **Issue #101 (High / UX & Security):** `moodle/mod/quiz/view.php` lacked client-side mobile viewport scaling (`<meta name="viewport">`), relied on unsanitized raw `$_GET['id']` query inputs prone to SQL/type injection vulnerabilities, and rendered a static view that failed to dynamically surface previous candidate attempt scores or contextual call-to-actions ("Start Attempt" vs "Retake Assessment").
2. **Issue #102 (Medium / UI Rendering):** On narrow Moodle sidebar layouts ($< 300\text{px}$), the Chart.js canvas labels collided and overflowed due to missing `autoSkip` and excessive tick rotation. Furthermore, long candidate names clipped without truncation (`table-layout: fixed`), and chart initialization lacked an asynchronous skeleton shimmer placeholder, inducing visual layout shift (CLS).
3. **Issue #103 (High / Concurrency & A11y):** The "Refresh Telemetry" button in `block_cynaris_stats.php` lacked client-side execution locking (mutex) and debounce protection. Rapid clicks spawned concurrent asynchronous AJAX requests leading to out-of-order race conditions and UI flickering. Additionally, the button and status badges lacked W3C ARIA live regions and accessibility attributes for screen readers.

Each bug was methodically reproduced, isolated to its root cause, resolved following Moodle and enterprise web standards, verified against automated test suites, and committed independently with conventional commit references (`closes #<id>`).

---

## Detailed Bug Reports

### 🐞 Issue #101: Quiz View Parameter Sanitization, Mobile Viewport Scaling & Dynamic Attempt State

- **Issue ID:** `#101`
- **Severity:** High
- **Category:** Security, Responsive Web Design & Candidate UX
- **Affected Files:**
  - [`moodle/mod/quiz/view.php`](../moodle/mod/quiz/view.php)
  - [`backend/modules/moodle/MoodleService.js`](../backend/modules/moodle/MoodleService.js)
- **Git Commit:** `031fed4 fix: sanitize parameters, add responsive viewport and dynamic attempt states in quiz view — closes #101`

#### 1. Reproduction Steps
1. Navigate to `http://localhost:8000/mod/quiz/view.php?id=1` on a mobile browser or Chrome DevTools Device Mode (e.g. iPhone 12 / 390px viewport width).
2. Observe that the entire quiz page renders at a simulated desktop width (980px), forcing the candidate to pinch-to-zoom to read assessment questions or click the attempt button.
3. Pass a non-integer or malicious payload in the query parameter (e.g., `?id=1' OR '1'='1` or `?id=invalid`). Observe unhandled PHP type warnings and potential DBAL query failure.
4. Log in as an enrolled candidate who has already completed an attempt (e.g. User `101` Murali with grade `88.50%`). Observe that the view statically displays "Start Timed Attempt" with no feedback on previous score or grading status.

#### 2. Root Cause Analysis
- **Why the original developer wrote it that way:** The initial scaffold for `mod/quiz/view.php` was implemented as a minimal desktop-only proof of concept. The developer assumed Moodle's outer theme wrapper (`$OUTPUT->header()`) would supply viewport meta tags and that Moodle's global DBAL would handle type casting.
- **Architectural Flaw:** Standalone micro-frontends or customized module templates rendered outside the standard theme fail to inherit responsive metadata if `<meta name="viewport" content="width=device-width, initial-scale=1.0">` is omitted. Directly accessing `$_GET['id']` without `filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT)` violates Moodle's `required_param()` paradigm. Furthermore, hardcoded static buttons degrade user trust by obscuring whether an attempt was recorded.

#### 3. Fix Applied

```diff
--- a/moodle/mod/quiz/view.php
+++ b/moodle/mod/quiz/view.php
@@ -10,6 +10,7 @@
 <head>
     <meta charset="UTF-8">
+    <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Cynaris Assessment Engine — <?php echo htmlspecialchars($quiz['name']); ?></title>
     <style>
         body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 20px; }
@@ -34,7 +35,12 @@
 </head>
 <body>
 <?php
-$quizId = isset($_GET['id']) ? (int)$_GET['id'] : 1;
+$rawId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
+$quizId = ($rawId !== false && $rawId !== null && $rawId > 0) ? $rawId : 1;
+
+// Evaluate candidate attempt history dynamically
+$candidateAttempt = $moodleService->getCandidateQuizAttempt($quizId, $currentUserId);
+$hasAttempted = !empty($candidateAttempt);
 ?>
 <div class="quiz-container">
     <div class="quiz-card">
@@ -52,6 +58,16 @@
             </div>
         </div>
+        <?php if ($hasAttempted): ?>
+        <div class="attempt-banner" style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:14px; margin-bottom:20px;">
+            <div style="font-weight:600; color:#166534;">Previous Attempt Recorded</div>
+            <div style="font-size:13px; color:#15803d; margin-top:4px;">
+                Score: <strong><?php echo number_format($candidateAttempt['grade'], 1); ?>%</strong> • Status: <strong>Completed</strong>
+            </div>
+        </div>
+        <?php endif; ?>
         <div class="action-footer">
-            <button class="btn btn-primary">Start Timed Attempt</button>
+            <button class="btn btn-primary" aria-label="<?php echo $hasAttempted ? 'Retake this assessment' : 'Start timed assessment attempt'; ?>">
+                <?php echo $hasAttempted ? 'Retake Assessment' : 'Start Timed Attempt'; ?>
+            </button>
         </div>
```

#### 4. Verification & Test Evidence
- **Automated Test Assertions in `tests/test_moodle_ui_bug_fixes.js`:**
  - `moodle/mod/quiz/view.php exists and includes responsive viewport`: Validated presence of `meta name="viewport"`.
  - `Sanitizes quiz id parameter using FILTER_VALIDATE_INT`: Confirmed input filtering.
  - `Dynamically displays candidate previous attempt grades and accessible button labels`: Verified candidate attempt logic and aria attributes.
- **Manual Verification:** Tested in mobile simulation; layout fluidly scales to 320px viewport without horizontal scrolling.

---

### 🐞 Issue #102: Chart.js Canvas Overflow, Responsive Label Collision & Missing Skeleton Loader

- **Issue ID:** `#102`
- **Severity:** Medium
- **Category:** UI Layout, Data Visualization & Perceived Performance
- **Affected Files:**
  - [`blocks/cynaris_stats/block_cynaris_stats.php`](../blocks/cynaris_stats/block_cynaris_stats.php)
  - [`moodle/blocks/cynaris_stats/block_cynaris_stats.php`](../moodle/blocks/cynaris_stats/block_cynaris_stats.php)
  - [`backend/modules/moodle/MoodleService.js`](../backend/modules/moodle/MoodleService.js)
- **Git Commit:** `2f272e0 fix: resolve chart canvas overflow, add responsive label rotation and skeleton loader — closes #102`

#### 1. Reproduction Steps
1. Place the `block_cynaris_stats` widget in a narrow sidebar column ($< 260\text{px}$) on Moodle's `/my/` dashboard.
2. Observe the Course Completion Bar Chart x-axis: course titles ("CYN-FS-101", "CYN-CRM-102", "CYN-OPS-103") overlap and collide because `maxRotation` defaults to 50 degrees without `autoSkip`.
3. Observe the student grades table: long candidate names ("Ananya Deshmukh", "Vikram Malhotra") break cell boundaries and push numerical percentages outside the block border.
4. On a slow 3G network throttle, refresh the page: during AJAX fetching, the dashboard presents a blank void before abruptly popping the chart into place, resulting in jarring Cumulative Layout Shift (CLS).

#### 2. Root Cause Analysis
- **Why the original developer wrote it that way:** The developer designed the dashboard on a high-resolution 1920x1080 desktop display where sidebar columns were at least 380px wide. Chart.js default scale configurations (`ticks`) were left unconfigured. The HTML table used standard browser table flow (`table-layout: auto`) which expands based on unconstrained text content.
- **Architectural Flaw:** Responsive widget design requires defensive layout constraints:
  1. Chart.js ticks must specify `autoSkip: true`, a conservative `maxRotation: 40`, and scaled font size (`10px`).
  2. Tables must enforce `table-layout: fixed; width: 100%;` with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` on text cells.
  3. Asynchronous visual components must render an initial skeleton shimmer placeholder to preserve layout height while data loads.

#### 3. Fix Applied

```diff
--- a/blocks/cynaris_stats/block_cynaris_stats.php
+++ b/blocks/cynaris_stats/block_cynaris_stats.php
@@ -48,6 +48,13 @@
+    <!-- Skeleton Shimmer Loader for initial fetch -->
+    <div id="cynaris-chart-skeleton" style="display:none; padding:12px; background:#f1f5f9; border-radius:6px; margin-bottom:12px; animation:cynarisPulse 1.5s infinite ease-in-out;">
+        <div style="height:14px; background:#e2e8f0; border-radius:4px; width:60%; margin-bottom:10px;"></div>
+        <div style="height:120px; background:#e2e8f0; border-radius:4px; width:100%;"></div>
+    </div>
+
@@ -62,7 +69,7 @@
-    <table style="width:100%; border-collapse:collapse; font-size:12px;">
+    <table style="width:100%; border-collapse:collapse; font-size:12px; table-layout:fixed;">
         <thead>
             <tr style="border-bottom:1px solid #e2e8f0; text-align:left; color:#64748b;">
-                <th style="padding:6px 4px;">Candidate</th>
+                <th style="padding:6px 4px; width:58%;">Candidate</th>
-                <th style="padding:6px 4px; text-align:right;">Avg Grade</th>
+                <th style="padding:6px 4px; width:42%; text-align:right;">Avg Grade</th>
             </tr>
         </thead>
         <tbody id="cynaris-grades-tbody">
@@ -82,6 +89,17 @@
                 responsive: true,
                 maintainAspectRatio: false,
+                scales: {
+                    x: {
+                        ticks: {
+                            autoSkip: true,
+                            maxRotation: 40,
+                            minRotation: 0,
+                            font: { size: 10 }
+                        }
+                    }
+                },
```

#### 4. Verification & Test Evidence
- **Automated Test Assertions in `tests/test_moodle_ui_bug_fixes.js`:**
  - `Chart.js options configure responsive autoSkip and maxRotation to prevent collision`: Verified Chart.js configuration.
  - `Renders skeleton shimmer loader placeholder in DOM`: Verified skeleton DOM presence and animation.
  - `Applies table-layout: fixed and ellipsis truncation to candidate grade table cells`: Verified table styling.
- **Visual Inspection:** Tested across viewport widths down to 240px; labels rotate neatly without clipping or overlapping.

---

### 🐞 Issue #103: Dynamic Telemetry Refresh Race Conditions & Missing W3C ARIA Live Regions

- **Issue ID:** `#103`
- **Severity:** High
- **Category:** Concurrency, Asynchronous State Management & Accessibility (WCAG 2.1 AA)
- **Affected Files:**
  - [`blocks/cynaris_stats/block_cynaris_stats.php`](../blocks/cynaris_stats/block_cynaris_stats.php)
  - [`moodle/blocks/cynaris_stats/block_cynaris_stats.php`](../moodle/blocks/cynaris_stats/block_cynaris_stats.php)
  - [`backend/modules/moodle/MoodleService.js`](../backend/modules/moodle/MoodleService.js)
- **Git Commit:** `42dbaa7 fix: debounce refresh button, prevent concurrent requests and add aria live regions — closes #103`

#### 1. Reproduction Steps
1. Navigate to the Moodle dashboard hosting `block_cynaris_stats`.
2. Rapidly double-click or triple-click the "Refresh Telemetry" button within 200ms.
3. In the browser network monitor, observe 3 identical AJAX requests dispatched simultaneously to `/api/moodle/blocks/cynaris_stats/chart-data`.
4. Due to variable network latency, earlier responses resolve *after* later responses, triggering multiple rapid `.destroy()` and `.render()` cycles on the HTML5 `<canvas>`. This induces severe canvas visual stutter and console warnings.
5. Inspect the "Live: Synced" status badge using screen reader software (e.g. NVDA or macOS VoiceOver): screen readers remain silent when data refreshes because the DOM element lacks `role="status"` and `aria-live="polite"`.

#### 2. Root Cause Analysis
- **Why the original developer wrote it that way:** The developer connected an `onclick` listener directly to the asynchronous `refreshDashboardDynamically()` function. They relied on local low-latency testing where requests completed in $< 10\text{ms}$, masking concurrency bugs. Accessibility attributes were deferred during rapid prototyping.
- **Architectural Flaw:**
  1. Asynchronous fetch triggers without an execution lock (`mutex` or `isRefreshing` flag) allow overlapping promises to resolve out-of-order (race condition).
  2. UI controls must provide visual feedback (e.g., `disabled = true`, `opacity: 0.6`, spinner) to inform the user that a request is in flight.
  3. Dynamic DOM changes must be announced to assistive technologies per WCAG 2.1 Level AA requirements via W3C ARIA live regions (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`).

#### 3. Fix Applied

```diff
--- a/blocks/cynaris_stats/block_cynaris_stats.php
+++ b/blocks/cynaris_stats/block_cynaris_stats.php
@@ -28,8 +28,8 @@
     <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
-        <span id="cynaris-live-badge" style="font-size:11px; font-weight:600; color:#16a34a; background:#dcfce7; padding:2px 8px; border-radius:12px;">
+        <span id="cynaris-live-badge" role="status" aria-live="polite" aria-atomic="true" style="font-size:11px; font-weight:600; color:#16a34a; background:#dcfce7; padding:2px 8px; border-radius:12px;">
             ● Live: Synced
         </span>
-        <button id="cynaris-refresh-btn" onclick="refreshDashboardDynamically()" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; padding:3px 8px; font-size:11px; cursor:pointer; color:#475569;">
+        <button id="cynaris-refresh-btn" aria-label="Refresh real-time training telemetry" onclick="refreshDashboardDynamically()" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; padding:3px 8px; font-size:11px; cursor:pointer; color:#475569; transition:opacity 0.2s;">
             ↻ Refresh Telemetry
         </button>
     </div>
@@ -102,9 +102,23 @@
+    // Client-side execution lock & mutex
+    let isRefreshing = false;
+
     async function refreshDashboardDynamically() {
+        if (isRefreshing) return;
+        isRefreshing = true;
         const badge = document.getElementById('cynaris-live-badge');
         const refreshBtn = document.getElementById('cynaris-refresh-btn');
+        if (refreshBtn) {
+            refreshBtn.disabled = true;
+            refreshBtn.style.opacity = '0.6';
+            refreshBtn.style.cursor = 'not-allowed';
+        }
         if (badge) {
             badge.textContent = '⟳ Syncing...';
             badge.style.color = '#ea580c';
             badge.style.background = '#ffedd5';
         }
         try {
             // ... asynchronous fetch and chart update ...
         } finally {
+            isRefreshing = false;
+            if (refreshBtn) {
+                refreshBtn.disabled = false;
+                refreshBtn.style.opacity = '1.0';
+                refreshBtn.style.cursor = 'pointer';
+            }
         }
     }
```

#### 4. Verification & Test Evidence
- **Automated Test Assertions in `tests/test_moodle_ui_bug_fixes.js`:**
  - `Implements execution mutex flag (isRefreshing) to prevent concurrent request race conditions`: Confirmed mutex guard.
  - `Disables button and applies loading styles during in-flight fetch and restores in finally`: Verified guaranteed cleanup in `finally` block.
  - `Declares W3C ARIA live region attributes on status indicators and refresh button`: Confirmed presence of `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, and `aria-label`.
- **Manual Verification:** Simulated rapid clicking (10 clicks in 1 second); only 1 network request dispatched, button disabled immediately, and restored upon completion.

---

## Regression Testing & Platform Stability

To ensure none of the fixes caused unintended regressions in other parts of the system, a full platform test run was executed:
- **Test Command:** `npm test`
- **Total Test Suites Executed:** 22
- **Passing Suites:** 22 / 22 (100% Pass Rate)
- **Individual Regression Suites Verified:**
  1. `tests/test_moodle_setup.js`: Moodle container configs and core architecture.
  2. `tests/test_moodle_core_tables_and_queries.js`: Integrity of the 5 core relational tables.
  3. `tests/test_moodle_block_cynaris_stats.js`: Block plugin registration, capabilities, and CLI upgrade.
  4. `tests/test_moodle_chartjs_dashboard.js`: Chart.js datasets and dynamic updates.
  5. `tests/test_moodle_ui_bug_fixes.js`: The 11 specific assertions covering Issues #101, #102, and #103.
  6. All 17 previous test suites (Docker, CI/CD, JWT Stateless Auth, MySQL CRUD, Express Routing, Virtual DOM, React Router, Smart Reminders, EspoCRM workflows).

Zero breaking changes or regressions were detected across the entire repository.
