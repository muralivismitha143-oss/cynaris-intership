/**
 * test_moodle_ui_bug_fixes.js
 * 
 * Week 5 Day 5: Automated Test Suite for Assessment Engine Study + UI Bug Fixes + PR
 * 
 * Verifies fixes for:
 * 1. Issue #101: Quiz view parameter sanitization, responsive viewport, and dynamic attempt state
 * 2. Issue #102: Chart canvas overflow, responsive label rotation, and skeleton loader
 * 3. Issue #103: Debounced refresh button, mutex lock, and W3C ARIA live regions
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { moodleService } = require('../backend/modules/moodle/MoodleService');

let passCount = 0;
let totalCount = 0;

function it(description, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
  }
}

console.log('================================================================');
console.log('🧪 Week 5 Day 5: Moodle Assessment & UI Bug Fixes Test Suite');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// --- Test 1: Issue #101 — Quiz View Sanitization & Viewport ---
console.log('--- Test 1: Issue #101 — Quiz View Sanitization & Viewport ---');

const quizViewPath = path.join(projectRoot, 'moodle/mod/quiz/view.php');
it('moodle/mod/quiz/view.php exists and includes responsive viewport', () => {
  assert.strictEqual(fs.existsSync(quizViewPath), true);
  const content = fs.readFileSync(quizViewPath, 'utf8');
  assert.ok(content.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'), 'Must define mobile viewport');
});

it('Sanitizes quiz id parameter using FILTER_VALIDATE_INT', () => {
  const content = fs.readFileSync(quizViewPath, 'utf8');
  assert.ok(content.includes('FILTER_VALIDATE_INT'), 'Must sanitize quiz id with FILTER_VALIDATE_INT');
  assert.ok(content.includes('$quizId'), 'Must assign sanitized quizId');
});

it('Dynamically displays candidate previous attempt grades and accessible button labels', () => {
  const content = fs.readFileSync(quizViewPath, 'utf8');
  assert.ok(content.includes('candidateAttempt'), 'Must evaluate candidate attempt');
  assert.ok(content.includes('aria-label'), 'Action button must include aria-label');
  assert.ok(content.includes('Retake Assessment') || content.includes('Start Timed Attempt'));
});

// --- Test 2: Issue #102 — Chart Canvas Overflow & Skeleton Loader ---
console.log('\n--- Test 2: Issue #102 — Chart Canvas Overflow & Skeleton Loader ---');

const blockContent = moodleService.getStatsBlockContent('chartjs');

it('Chart.js options configure responsive autoSkip and maxRotation to prevent collision', () => {
  const text = blockContent.content.text;
  assert.ok(text.includes('autoSkip: true'), 'Must enable autoSkip for labels');
  assert.ok(text.includes('maxRotation: 40') || text.includes('maxRotation'), 'Must limit label rotation');
  assert.ok(text.includes('font: { size: 10 }'), 'Must use responsive font size');
});

it('Renders skeleton shimmer loader placeholder in DOM', () => {
  const text = blockContent.content.text;
  assert.ok(text.includes('id="cynaris-chart-skeleton"'), 'Must define chart skeleton loader element');
});

it('Applies table-layout: fixed and ellipsis truncation to candidate grade table cells', () => {
  const text = blockContent.content.text;
  assert.ok(text.includes('table-layout:fixed') || text.includes('table-layout: fixed'), 'Must use fixed table layout');
  assert.ok(text.includes('text-overflow:ellipsis') || text.includes('text-overflow: ellipsis'), 'Must truncate long names');
});

// --- Test 3: Issue #103 — Debounce Mutex & ARIA Accessibility ---
console.log('\n--- Test 3: Issue #103 — Debounce Mutex & ARIA Accessibility ---');

it('Implements execution mutex flag (isRefreshing) to prevent concurrent request race conditions', () => {
  const text = blockContent.content.text;
  assert.ok(text.includes('let isRefreshing = false'), 'Must declare mutex flag');
  assert.ok(text.includes('if (isRefreshing) return;'), 'Must reject concurrent update invocations');
  assert.ok(text.includes('isRefreshing = true;'), 'Must engage mutex during fetch');
});

it('Disables button and applies loading styles during in-flight fetch and restores in finally', () => {
  const text = blockContent.content.text;
  assert.ok(text.includes('refreshBtn.disabled = true'), 'Must disable button during fetch');
  assert.ok(text.includes('refreshBtn.disabled = false'), 'Must re-enable button in finally block');
  assert.ok(text.includes('finally {'), 'Must utilize finally block for state guarantee');
});

it('Declares W3C ARIA live region attributes on status indicators and refresh button', () => {
  const text = blockContent.content.text;
  assert.ok(text.includes('role="status"'), 'Must define role="status"');
  assert.ok(text.includes('aria-live="polite"'), 'Must configure aria-live="polite"');
  assert.ok(text.includes('aria-label="Refresh real-time training telemetry'), 'Button must include descriptive aria-label');
});

// --- Test 4: Regression Check across Full Moodle Service ---
console.log('\n--- Test 4: Regression Check across Full Moodle Service ---');

it('All 5 core tables remain queryable with zero breaking schema changes', () => {
  const describe = moodleService.describeTables();
  assert.ok(describe.mdl_course);
  assert.ok(describe.mdl_grade_grades);
  assert.ok(describe.mdl_course_completions);
  assert.ok(describe.mdl_user);
  assert.ok(describe.mdl_log);
});

it('Chart telemetry endpoint continues returning valid Bar and Line chart datasets', () => {
  const chartData = moodleService.getChartDashboardData();
  assert.strictEqual(chartData.success, true);
  assert.strictEqual(chartData.charts.barChart.datasets[0].data.length, 3);
  assert.strictEqual(chartData.studentGradeStats.length, 5);
});

// --- Final Summary ---
console.log('\n================================================================');
if (passCount === totalCount) {
  console.log(`🎉 [SUCCESS] All ${passCount} Week 5 Day 5 UI Bug Fix Tests Passed!`);
} else {
  console.log(`⚠️ [WARNING] ${passCount}/${totalCount} tests passed.`);
}
console.log('================================================================\n');

process.exit(passCount === totalCount ? 0 : 1);
