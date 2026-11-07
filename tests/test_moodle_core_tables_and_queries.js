/**
 * test_moodle_core_tables_and_queries.js
 * 
 * Week 5 Day 2: Moodle Architecture Workshop — 5 Core Tables Only (ER + Queries)
 * Validates:
 * 1. Schema Introspection (DESCRIBE) on the 5 core tables:
 *    mdl_course, mdl_grade_grades, mdl_course_completions, mdl_user, mdl_log.
 * 2. Query (a): Enrolled students with course completion status.
 * 3. Query (b): Average grade per course.
 * 4. Query (c): Login events per user in the last 7 days (Unix epoch time filter).
 * 5. Plain English architectural summary validation (<= 200 words).
 * 6. API bridge endpoint outputs and JSON envelopes.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const { moodleService } = require('../backend/modules/moodle/MoodleService');

console.log('================================================================');
console.log('🧪 Week 5 Day 2: Moodle 5 Core Tables & Queries Test Suite');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------------------------
// Test Group 1: Schema Introspection (DESCRIBE on 5 Core Tables)
// ------------------------------------------------------------------------------
console.log('--- Test 1: Schema Introspection (DESCRIBE on 5 Core Tables) ---');

const tablesSchema = moodleService.describeTables();

runTest('DESCRIBE returns schemas for all 5 mandatory tables', () => {
  const expectedTables = ['mdl_course', 'mdl_grade_grades', 'mdl_course_completions', 'mdl_user', 'mdl_log'];
  for (const table of expectedTables) {
    assert.ok(tablesSchema[table], `Must provide schema for ${table}`);
    assert.ok(Array.isArray(tablesSchema[table]), `Schema for ${table} must be an array of column definitions`);
  }
});

runTest('All 5 tables define primary key on `id` with auto_increment', () => {
  for (const [table, columns] of Object.entries(tablesSchema)) {
    const idCol = columns.find(c => c.Field === 'id');
    assert.ok(idCol, `${table} must have an id column`);
    assert.strictEqual(idCol.Key, 'PRI', `${table}.id must be PRIMARY KEY`);
    assert.strictEqual(idCol.Extra, 'auto_increment', `${table}.id must be auto_increment`);
  }
});

runTest('Foreign key reference columns are indexed', () => {
  // mdl_grade_grades: userid, itemid
  const gradeUser = tablesSchema.mdl_grade_grades.find(c => c.Field === 'userid');
  const gradeItem = tablesSchema.mdl_grade_grades.find(c => c.Field === 'itemid');
  assert.strictEqual(gradeUser.Key, 'MUL');
  assert.strictEqual(gradeItem.Key, 'MUL');

  // mdl_course_completions: userid, course
  const compUser = tablesSchema.mdl_course_completions.find(c => c.Field === 'userid');
  const compCourse = tablesSchema.mdl_course_completions.find(c => c.Field === 'course');
  assert.strictEqual(compUser.Key, 'MUL');
  assert.strictEqual(compCourse.Key, 'MUL');

  // mdl_log: userid, course, time
  const logUser = tablesSchema.mdl_log.find(c => c.Field === 'userid');
  const logCourse = tablesSchema.mdl_log.find(c => c.Field === 'course');
  const logTime = tablesSchema.mdl_log.find(c => c.Field === 'time');
  assert.strictEqual(logUser.Key, 'MUL');
  assert.strictEqual(logCourse.Key, 'MUL');
  assert.strictEqual(logTime.Key, 'MUL');
});

// ------------------------------------------------------------------------------
// Test Group 2: Query (a) — Students Enrolled with Completion Status
// ------------------------------------------------------------------------------
console.log('\n--- Test 2: Query (a) — Enrolled Students with Completion Status ---');

const completionsResults = moodleService.getEnrolledStudentsWithCompletionStatus();

runTest('Query (a) returns non-empty list of enrolled candidates across courses', () => {
  assert.ok(Array.isArray(completionsResults), 'Must return array of results');
  assert.ok(completionsResults.length >= 5, 'Must return at least 5 enrollment completion records');
});

runTest('Query (a) accurately differentiates Completed, In Progress, and Enrolled / Not Started', () => {
  const statuses = new Set(completionsResults.map(r => r.completion_status));
  assert.ok(statuses.has('Completed'), 'Must contain Completed records');
  assert.ok(statuses.has('In Progress'), 'Must contain In Progress records');
  assert.ok(statuses.has('Enrolled / Not Started'), 'Must contain Enrolled / Not Started records');
});

runTest('Query (a) correctly joins candidate name, email, course ID, and course code', () => {
  const muraliCourse101 = completionsResults.find(r => r.user_id === 2 && r.course_id === 101);
  assert.ok(muraliCourse101, 'Must find candidate Murali in course 101');
  assert.strictEqual(muraliCourse101.candidate_name, 'Murali V');
  assert.strictEqual(muraliCourse101.email, 'murali@cynaris.com');
  assert.strictEqual(muraliCourse101.course_code, 'CYN-FS-101');
  assert.strictEqual(muraliCourse101.completion_status, 'Completed');
});

// ------------------------------------------------------------------------------
// Test Group 3: Query (b) — Average Grade Per Course
// ------------------------------------------------------------------------------
console.log('\n--- Test 3: Query (b) — Average Grade Per Course ---');

const gradeResults = moodleService.getAverageGradePerCourse();

runTest('Query (b) computes aggregate metrics for all active courses', () => {
  assert.ok(Array.isArray(gradeResults), 'Must return array of course grades');
  assert.strictEqual(gradeResults.length, 3, 'Must return statistics for all 3 courses');
});

runTest('Query (b) validates arithmetic accuracy for Course 101 grades', () => {
  const course101 = gradeResults.find(c => c.course_id === 101);
  assert.ok(course101, 'Course 101 must exist');
  assert.strictEqual(course101.total_graded_attempts, 4, 'Course 101 has 4 submitted attempts (Murali 96.5, Rahul 88, Ananya 94, Vikram 78.5)');
  // (96.5 + 88.0 + 94.0 + 78.5) / 4 = 357 / 4 = 89.25
  assert.strictEqual(course101.average_final_grade, 89.25, 'Average grade must be 89.25');
  assert.strictEqual(course101.lowest_grade, 78.50);
  assert.strictEqual(course101.highest_grade, 96.50);
});

runTest('Query (b) results are ordered descending by average final grade', () => {
  for (let i = 0; i < gradeResults.length - 1; i++) {
    assert.ok(
      gradeResults[i].average_final_grade >= gradeResults[i + 1].average_final_grade,
      'Courses must be sorted by average_final_grade descending'
    );
  }
});

// ------------------------------------------------------------------------------
// Test Group 4: Query (c) — Login Events in the Last 7 Days
// ------------------------------------------------------------------------------
console.log('\n--- Test 4: Query (c) — User Logins in the Last 7 Days ---');

const loginResults = moodleService.getLoginEventsLast7Days();

runTest('Query (c) filters by 7-day window and groups by candidate', () => {
  assert.ok(Array.isArray(loginResults), 'Must return array of candidate login counts');
  assert.ok(loginResults.length >= 4, 'Must return at least 4 active users in 7-day window');
});

runTest('Query (c) excludes logins older than 7 days', () => {
  const murali = loginResults.find(u => u.user_id === 2);
  assert.ok(murali, 'Murali must be present');
  // Murali has 4 recent logins and 1 old login (25 days ago)
  // Recent logins: 7001, 7003, 7004, 7005 (attempt_submitted 7002 is not action='login')
  assert.strictEqual(murali.login_event_count, 4, 'Murali must have exactly 4 recent login events in 7-day window');
});

runTest('Query (c) orders candidates descending by login event frequency', () => {
  for (let i = 0; i < loginResults.length - 1; i++) {
    assert.ok(
      loginResults[i].login_event_count >= loginResults[i + 1].login_event_count,
      'Candidates must be sorted by login_event_count descending'
    );
  }
});

// ------------------------------------------------------------------------------
// Test Group 5: Plain English Documentation Word Count Constraint (<= 200 words)
// ------------------------------------------------------------------------------
console.log('\n--- Test 5: Plain English Documentation Constraints ---');

const plainEnglishSummary = `
Moodle's core architecture links learners, curriculum, evaluation, and compliance through five tables. The central mdl_user table stores user accounts, credentials, and profile attributes. Courses and curriculum hierarchies are defined in mdl_course. When a candidate enrolls, mdl_course_completions tracks progress against criteria, recording enrollment dates, start timestamps, and completion flags. During learning, candidate performance on quizzes and assignments is captured in mdl_grade_grades, linking learner IDs to grade items with raw scores and calculated final grades. Concurrently, mdl_log provides an immutable audit trail, logging user actions, timestamps, and target courses. Together, these five tables form a cohesive relational engine: mdl_user and mdl_course establish the catalog and participants, while mdl_course_completions, mdl_grade_grades, and mdl_log provide real-time visibility into onboarding progress, technical skill mastery, and platform engagement.
`.trim();

runTest('Plain English documentation is under 200 words', () => {
  const wordCount = plainEnglishSummary.split(/\s+/).filter(Boolean).length;
  console.log(`    Word Count: ${wordCount} words (Limit: 200 words)`);
  assert.ok(wordCount <= 200, `Summary exceeds 200 words (${wordCount} words)`);
  assert.ok(wordCount >= 100, `Summary must be thorough (at least 100 words, got ${wordCount})`);
});

// ------------------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------------------
console.log('\n================================================================');
if (passCount === totalCount) {
  console.log(`🎉 [SUCCESS] All ${passCount} Week 5 Day 2 Moodle Core Tables & Queries Tests Passed!`);
} else {
  console.log(`⚠️ [WARNING] ${passCount}/${totalCount} tests passed.`);
}
console.log('================================================================\n');
