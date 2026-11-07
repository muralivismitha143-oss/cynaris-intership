/**
 * test_moodle_chartjs_dashboard.js
 * 
 * Week 5 Day 4: Automated Test Suite for Progress Dashboard — Chart.js Visualisation from Grade Data
 * 
 * Validates:
 * 1. Querying 5 approved tables (mdl_course, mdl_grade_grades, mdl_course_completions, mdl_user, mdl_log)
 * 2. Completion % calculation per course
 * 3. Average grade calculation per student (with 3+ students enrolled, some with grades, some without)
 * 4. Last login timestamp and login frequency per user
 * 5. Moodle AJAX endpoint file presence (blocks/cynaris_stats/ajax.php & moodle/blocks/cynaris_stats/ajax.php)
 * 6. Chart.js CDN inclusion and dual canvas rendering (bar chart + line chart)
 * 7. Dynamic update mechanism without page reload (destroy lifecycle, fetch, polling)
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
console.log('🧪 Week 5 Day 4: Moodle Chart.js Progress Dashboard Test Suite');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// --- Test 1: Moodle AJAX Service Files ---
console.log('--- Test 1: Moodle AJAX Service Files ---');

it('blocks/cynaris_stats/ajax.php exists and specifies AJAX_SCRIPT', () => {
  const filePath = path.join(projectRoot, 'blocks/cynaris_stats/ajax.php');
  assert.strictEqual(fs.existsSync(filePath), true);
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes("define('AJAX_SCRIPT', true)"));
  assert.ok(content.includes('application/json'));
});

it('moodle/blocks/cynaris_stats/ajax.php exists as parity endpoint', () => {
  const filePath = path.join(projectRoot, 'moodle/blocks/cynaris_stats/ajax.php');
  assert.strictEqual(fs.existsSync(filePath), true);
});

// --- Test 2: Course Completion % (mdl_course + mdl_course_completions) ---
console.log('\n--- Test 2: Course Completion % (mdl_course + mdl_course_completions) ---');

const dashboardData = moodleService.getChartDashboardData();

it('Calculates completion % for all active courses', () => {
  assert.ok(dashboardData.courseCompletionStats.length >= 3, 'Must track at least 3 courses');
  const course101 = dashboardData.courseCompletionStats.find(c => c.courseId === 101);
  assert.ok(course101, 'Course 101 must exist');
  assert.strictEqual(course101.courseCode, 'CYN-FS-101');
  assert.ok(course101.totalEnrolled >= 3, 'Course 101 must have 3+ enrolled students');
  assert.ok(course101.completedCount > 0, 'Course 101 must have completed students');
  assert.strictEqual(typeof course101.completionPercentage, 'number');
  assert.ok(course101.completionPercentage >= 0 && course101.completionPercentage <= 100);
});

it('Course 101 completion percentage is calculated accurately (3/5 = 60.0%)', () => {
  const course101 = dashboardData.courseCompletionStats.find(c => c.courseId === 101);
  assert.strictEqual(course101.totalEnrolled, 5);
  assert.strictEqual(course101.completedCount, 3);
  assert.strictEqual(course101.completionPercentage, 60.0);
});

// --- Test 3: Student Grade Averages & Multi-Student Dataset ---
console.log('\n--- Test 3: Student Grade Averages & Multi-Student Dataset ---');

it('Evaluates 3+ enrolled students with real data', () => {
  assert.ok(dashboardData.studentGradeStats.length >= 3, 'Must have at least 3 students');
  assert.strictEqual(dashboardData.studentGradeStats.length, 5, 'Must have 5 candidate students');
});

it('Differentiates students with grades from students without grades', () => {
  const studentsWithGrades = dashboardData.studentGradeStats.filter(s => s.hasGrades);
  const studentsWithoutGrades = dashboardData.studentGradeStats.filter(s => !s.hasGrades);

  assert.ok(studentsWithGrades.length >= 2, 'Must have multiple students with submitted grades');
  assert.ok(studentsWithoutGrades.length >= 1, 'Must have at least one student without grades');

  // Verify candidate with grades (Murali)
  const murali = studentsWithGrades.find(s => s.userId === 2);
  assert.ok(murali);
  assert.strictEqual(murali.hasGrades, true);
  assert.strictEqual(murali.gradedAttempts, 3);
  assert.strictEqual(murali.averageGrade, 95.50);

  // Verify candidate without grades (Priya)
  const priya = studentsWithoutGrades.find(s => s.userId === 3);
  assert.ok(priya);
  assert.strictEqual(priya.hasGrades, false);
  assert.strictEqual(priya.gradedAttempts, 0);
  assert.strictEqual(priya.averageGrade, 0.00);
});

// --- Test 4: Last Login & Login Frequency (mdl_user + mdl_log) ---
console.log('\n--- Test 4: Last Login & Login Frequency (mdl_user + mdl_log) ---');

it('Aggregates login frequency and last login timestamp per user', () => {
  assert.ok(dashboardData.loginFrequencyStats.length >= 3);
  const topLoginUser = dashboardData.loginFrequencyStats[0];
  assert.ok(topLoginUser.loginCount >= 1, 'Top user must have login events');
  assert.ok(topLoginUser.lastLoginTime > 0, 'Last login timestamp must be positive');
  assert.notStrictEqual(topLoginUser.lastLoginDate, 'Never');
});

// --- Test 5: Chart.js Configuration Payload ---
console.log('\n--- Test 5: Chart.js Configuration Payload ---');

it('Generates compliant Bar Chart dataset for Course Completion %', () => {
  const barChart = dashboardData.charts.barChart;
  assert.ok(Array.isArray(barChart.labels), 'Bar chart labels must be array');
  assert.ok(barChart.labels.includes('CYN-FS-101'));
  assert.strictEqual(barChart.datasets.length, 1);
  assert.strictEqual(barChart.datasets[0].label, 'Course Completion Rate (%)');
  assert.ok(barChart.datasets[0].data.includes(60.0));
  assert.ok(barChart.datasets[0].backgroundColor);
});

it('Generates compliant Line Chart dataset for Login Frequency', () => {
  const lineChart = dashboardData.charts.lineChart;
  assert.ok(Array.isArray(lineChart.labels), 'Line chart labels must be array');
  assert.strictEqual(lineChart.datasets.length, 1);
  assert.strictEqual(lineChart.datasets[0].label, 'User Login Frequency');
  assert.ok(lineChart.datasets[0].fill, 'Line chart should have area fill enabled');
  assert.ok(lineChart.datasets[0].borderColor);
});

// --- Test 6: Block HTML Output & Chart.js CDN ---
console.log('\n--- Test 6: Block HTML Output & Chart.js CDN ---');

const blockContent = moodleService.getStatsBlockContent('chartjs');

it('Renders Chart.js CDN script tag in block output', () => {
  assert.ok(blockContent.content.text.includes('https://cdn.jsdelivr.net/npm/chart.js'), 'Must load Chart.js CDN');
});

it('Renders both Bar Chart canvas and Line Chart canvas', () => {
  assert.ok(blockContent.content.text.includes('<canvas id="cynaris-completion-chart"'), 'Bar chart canvas missing');
  assert.ok(blockContent.content.text.includes('<canvas id="cynaris-login-chart"'), 'Line chart canvas missing');
});

it('Renders student grades summary table displaying grades and "No Grades" badges', () => {
  assert.ok(blockContent.content.text.includes('cynaris-student-grade-rows'));
  assert.ok(blockContent.content.text.includes('Murali V'));
  assert.ok(blockContent.content.text.includes('95.5%'));
  assert.ok(blockContent.content.text.includes('No Grades'));
});

// --- Test 7: Dynamic Update Engine (Zero Page Reload) ---
console.log('\n--- Test 7: Dynamic Update Engine (Zero Page Reload) ---');

it('Implements Chart.js destruction lifecycle before re-instantiation', () => {
  const text = blockContent.content.text;
  assert.ok(text.includes('completionChartInstance.destroy()'), 'Must destroy existing completion chart');
  assert.ok(text.includes('loginChartInstance.destroy()'), 'Must destroy existing login chart');
});

it('Implements asynchronous fetch and auto-polling without page reload', () => {
  const text = blockContent.content.text;
  assert.ok(text.includes('refreshDashboardDynamically'), 'Must define dynamic refresh function');
  assert.ok(text.includes('fetch('), 'Must perform asynchronous fetch call');
  assert.ok(text.includes('setInterval('), 'Must configure background polling interval');
  assert.ok(text.includes('cynaris-refresh-btn'), 'Must include refresh button');
});

// --- Final Summary ---
console.log('\n================================================================');
if (passCount === totalCount) {
  console.log(`🎉 [SUCCESS] All ${passCount} Week 5 Day 4 Chart.js Dashboard Tests Passed!`);
} else {
  console.log(`⚠️ [WARNING] ${passCount}/${totalCount} tests passed.`);
}
console.log('================================================================\n');

process.exit(passCount === totalCount ? 0 : 1);
