/**
 * moodleRouter.js
 * 
 * Express Router exposing Moodle LMS integration endpoints for Cynaris Recruitment Platform.
 * Routes:
 *   GET /api/moodle/status                     - Moodle LMS environment health & counts
 *   GET /api/moodle/schema/describe            - Schema introspection for 5 core tables
 *   GET /api/moodle/courses                    - Active Moodle training courses catalog
 *   GET /api/moodle/candidates/:id/progress    - Candidate assessment grades & course completions
 *   GET /api/moodle/logs                       - LMS audit logs & user events
 *   GET /api/moodle/queries/enrollment-completions - Query (a): Enrolled students with completion status
 *   GET /api/moodle/queries/course-average-grades  - Query (b): Average grade per course
 *   GET /api/moodle/queries/user-logins-last-7-days- Query (c): User login event counts in last 7 days
 */

const express = require('express');
const { moodleService } = require('../modules/moodle/MoodleService');

const router = express.Router();

// GET /api/moodle/status
router.get('/status', (req, res) => {
  res.json(moodleService.getStatus());
});

// GET /api/moodle/schema/describe
router.get('/schema/describe', (req, res) => {
  const schema = moodleService.describeTables();
  res.json({
    success: true,
    tables: ['mdl_course', 'mdl_grade_grades', 'mdl_course_completions', 'mdl_user', 'mdl_log'],
    schema,
  });
});

// GET /api/moodle/courses
router.get('/courses', (req, res) => {
  const courses = moodleService.getCourses();
  res.json({
    success: true,
    total: courses.length,
    courses,
  });
});

// GET /api/moodle/candidates/:id/progress
router.get('/candidates/:id/progress', (req, res) => {
  const progress = moodleService.getCandidateProgress(req.params.id);
  if (!progress) {
    return res.status(404).json({
      success: false,
      error: `Candidate with Moodle User ID ${req.params.id} not found.`,
    });
  }
  res.json({
    success: true,
    progress,
  });
});

// GET /api/moodle/logs
router.get('/logs', (req, res) => {
  const limit = req.query.limit || 20;
  const logs = moodleService.getLogs(limit);
  res.json({
    success: true,
    count: logs.length,
    logs,
  });
});

// ==============================================================================
// Week 5 Day 2: 3 Core Analytical Queries
// ==============================================================================

// Query (a): List all students enrolled in a course with their completion status
router.get('/queries/enrollment-completions', (req, res) => {
  const courseId = req.query.courseId || null;
  const results = moodleService.getEnrolledStudentsWithCompletionStatus(courseId);
  res.json({
    success: true,
    query: 'List all students enrolled in a course with their completion status',
    sql: `SELECT u.id AS user_id, CONCAT(u.firstname, ' ', u.lastname) AS candidate_name, u.email, c.id AS course_id, c.fullname AS course_name, c.shortname AS course_code, CASE WHEN cc.status = 1 THEN 'Completed' WHEN cc.timestarted > 0 THEN 'In Progress' ELSE 'Enrolled / Not Started' END AS completion_status, cc.timeenrolled, cc.timecompleted FROM mdl_user u JOIN mdl_course_completions cc ON u.id = cc.userid JOIN mdl_course c ON cc.course = c.id WHERE u.deleted = 0 ORDER BY c.id ASC, candidate_name ASC;`,
    total: results.length,
    data: results,
  });
});

// Query (b): Get average grade per course
router.get('/queries/course-average-grades', (req, res) => {
  const results = moodleService.getAverageGradePerCourse();
  res.json({
    success: true,
    query: 'Get average grade per course',
    sql: `SELECT c.id AS course_id, c.fullname AS course_name, c.shortname AS course_code, COUNT(gg.id) AS total_graded_attempts, ROUND(AVG(gg.finalgrade), 2) AS average_final_grade, ROUND(MIN(gg.finalgrade), 2) AS lowest_grade, ROUND(MAX(gg.finalgrade), 2) AS highest_grade FROM mdl_course c JOIN mdl_grade_items gi ON c.id = gi.courseid JOIN mdl_grade_grades gg ON gi.id = gg.itemid GROUP BY c.id, c.fullname, c.shortname ORDER BY average_final_grade DESC;`,
    totalCourses: results.length,
    data: results,
  });
});

// Query (c): Count login events per user in the last 7 days from mdl_log
router.get('/queries/user-logins-last-7-days', (req, res) => {
  const results = moodleService.getLoginEventsLast7Days();
  res.json({
    success: true,
    query: 'Count login events per user in the last 7 days from mdl_log',
    sql: `SELECT u.id AS user_id, CONCAT(u.firstname, ' ', u.lastname) AS candidate_name, u.email, COUNT(l.id) AS login_event_count, MAX(l.time) AS last_login_time FROM mdl_user u JOIN mdl_log l ON u.id = l.userid WHERE l.module = 'login' AND l.action = 'login' AND l.time >= (UNIX_TIMESTAMP(NOW()) - (7 * 86400)) GROUP BY u.id, u.firstname, u.lastname, u.email ORDER BY login_event_count DESC;`,
    totalActiveUsers: results.length,
    data: results,
  });
});

// ==============================================================================
// Week 5 Day 3: Moodle Block Plugins Subsystem & Cynaris Stats Scaffold
// ==============================================================================

// GET /api/moodle/blocks - List all detected block plugins in the Moodle LMS
router.get('/blocks', (req, res) => {
  const blocks = moodleService.getBlockPlugins();
  res.json({
    success: true,
    total: blocks.length,
    blocks,
  });
});

// GET /api/moodle/blocks/cynaris_stats - Rendered block content & telemetry
router.get('/blocks/cynaris_stats', (req, res) => {
  const mode = req.query.mode || 'chartjs';
  const blockStats = moodleService.getStatsBlockContent(mode);
  res.json(blockStats);
});

// ==============================================================================
// Week 5 Day 4: Progress Dashboard — Chart.js Visualisation from Grade Data
// ==============================================================================

// GET /api/moodle/blocks/cynaris_stats/chart-data - Real-time Chart.js JSON telemetry
router.get('/blocks/cynaris_stats/chart-data', (req, res) => {
  const chartData = moodleService.getChartDashboardData();
  res.json(chartData);
});

// GET /blocks/cynaris_stats/ajax.php - Moodle native AJAX script route parity
router.get('/ajax/cynaris_stats', (req, res) => {
  const chartData = moodleService.getChartDashboardData();
  res.json(chartData);
});

// POST /api/moodle/admin/upgrade - Headless Moodle CLI upgrade runner
router.post('/admin/upgrade', (req, res) => {
  const upgradeResult = moodleService.runCliUpgrade();
  res.json({
    success: upgradeResult.success,
    message: 'Moodle CLI upgrade executed successfully',
    details: upgradeResult,
  });
});

module.exports = router;
