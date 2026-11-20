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
const { aiTutorService } = require('../modules/ai/AiTutorService');
const { aiQuizGeneratorService } = require('../modules/ai/AiQuizGeneratorService');
const { aiRecommendationService } = require('../modules/ai/AiRecommendationService');
const { aiQueryOptimizerService } = require('../modules/ai/AiQueryOptimizerService');

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

// ==============================================================================
// Week 6 Day 1: AI Tutor Integration — Groq Primary, OpenRouter Fallback
// ==============================================================================

// POST /api/moodle/ai-tutor/ask - Query the AI Tutor with automated failover
router.post('/ai-tutor/ask', async (req, res) => {
  try {
    const { 
      studentId, 
      studentName, 
      courseCode, 
      courseName, 
      topic, 
      question, 
      currentGrade, 
      quizName,
      simulateGroqFailure,
      simulateBothFailure,
      groqApiKey,
      openRouterApiKey
    } = req.body || {};

    let resolvedName = studentName;
    let resolvedGrade = currentGrade;

    // Optional dynamic lookup if studentId provided
    if (studentId && (!resolvedName || resolvedGrade === undefined)) {
      const candidate = moodleService.getCandidateProgress(studentId);
      if (candidate) {
        resolvedName = resolvedName || candidate.candidateName;
        resolvedGrade = resolvedGrade !== undefined ? resolvedGrade : candidate.averageGrade;
      }
    }

    const context = {
      studentName: resolvedName || 'Candidate',
      courseCode: courseCode || 'CYN-FS-101',
      courseName: courseName || 'Full Stack Engineering & Enterprise LMS',
      topic: topic || 'Full Stack Architecture',
      question: question || 'How does asynchronous execution work in the Node.js event loop?',
      currentGrade: resolvedGrade,
      quizName: quizName || null,
    };

    const options = {
      simulateGroqFailure: Boolean(simulateGroqFailure || req.query.simulate_groq === 'true'),
      simulateBothFailure: Boolean(simulateBothFailure || req.query.simulate_both === 'true'),
      groqApiKey,
      openRouterApiKey,
    };

    const result = await aiTutorService.askTutor(context, options);
    res.json(result);
  } catch (err) {
    res.status(502).json({
      success: false,
      error: 'AI Tutor service encountered an unhandled exception',
      details: err.message,
    });
  }
});

// GET /api/moodle/ai-tutor/health - AI Tutor health, models, and provider status
router.get('/ai-tutor/health', (req, res) => {
  res.json(aiTutorService.getHealth());
});

// GET /api/moodle/ai-tutor/topics - Curriculum topics for student study
router.get('/ai-tutor/topics', (req, res) => {
  const courseCode = req.query.courseCode || 'CYN-FS-101';
  res.json({
    success: true,
    courseCode,
    topics: aiTutorService.getCurriculumTopics(courseCode),
  });
});

// ==============================================================================
// Week 6 Day 2: AI Quiz Generation — MCQs to Question Bank & Quiz Assembly
// ==============================================================================

// POST /api/moodle/quiz/generate - Generate N MCQs from course content using Groq/OpenRouter
router.post('/quiz/generate', async (req, res) => {
  try {
    const { 
      courseId, 
      count, 
      simulateGroqFailure, 
      simulateBothFailure,
      groqApiKey,
      openRouterApiKey
    } = req.body || {};

    const targetCourseId = Number(courseId) || 101;
    const targetCount = Number(count) || 5;

    const options = {
      simulateGroqFailure: Boolean(simulateGroqFailure || req.query.simulate_groq === 'true'),
      simulateBothFailure: Boolean(simulateBothFailure || req.query.simulate_both === 'true'),
      groqApiKey,
      openRouterApiKey,
    };

    const result = await aiQuizGeneratorService.generateQuizQuestions(targetCourseId, targetCount, options);
    res.json(result);
  } catch (err) {
    res.status(502).json({
      success: false,
      error: 'Failed to generate quiz questions via AI service',
      details: err.message,
    });
  }
});

// POST /api/moodle/quiz/import-to-bank - Import generated questions into course Question Bank
router.post('/quiz/import-to-bank', (req, res) => {
  try {
    const { courseId, questions } = req.body || {};
    if (!courseId || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        error: 'courseId and array of questions are required for Question Bank import',
      });
    }

    const result = aiQuizGeneratorService.importToQuestionBank(Number(courseId), questions);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: 'Failed to import questions to question bank',
      details: err.message,
    });
  }
});

// POST /api/moodle/quiz/create - Programmatically assemble a Moodle Quiz with Question Bank slots
router.post('/quiz/create', (req, res) => {
  try {
    const { courseId, quizName, questionIds } = req.body || {};
    if (!courseId || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'courseId and questionIds array are required to create a quiz',
      });
    }

    const result = aiQuizGeneratorService.createQuizFromQuestions(Number(courseId), quizName, questionIds);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: 'Failed to create quiz from question bank',
      details: err.message,
    });
  }
});

// GET /api/moodle/courses/:id/question-bank - Retrieve Question Bank for course
router.get('/courses/:id/question-bank', (req, res) => {
  const courseId = Number(req.params.id) || 101;
  const questions = aiQuizGeneratorService.getCourseQuestionBank(courseId);
  res.json({
    success: true,
    courseId,
    total: questions.length,
    questions,
  });
});

// GET /api/moodle/courses/:id/quizzes - Retrieve all assembled quizzes for course
router.get('/courses/:id/quizzes', (req, res) => {
  const courseId = Number(req.params.id) || 101;
  const quizzes = aiQuizGeneratorService.getCourseQuizzes(courseId);
  res.json({
    success: true,
    courseId,
    total: quizzes.length,
    quizzes,
  });
});

/**
 * ==============================================================================
 * Week 6 Day 3: AI Learning Recommendations from Grade + Completion Data
 * ==============================================================================
 */

// GET /api/moodle/recommendations/health - Provider & engine health status
router.get('/recommendations/health', (req, res) => {
  res.json(aiRecommendationService.getHealth());
});

// POST /api/moodle/recommendations/generate - Generate recommendations for candidate
router.post('/recommendations/generate', async (req, res) => {
  try {
    const { userId, studentProfile, simulateGroqFailure, simulateBothFailure } = req.body || {};

    let profile = studentProfile;
    if (!profile && userId) {
      profile = moodleService.getCandidateProgress(userId);
    }

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Candidate profile or valid userId is required to generate recommendations',
      });
    }

    const options = {
      simulateGroqFailure: Boolean(simulateGroqFailure || req.query.simulate_groq === 'true'),
      simulateBothFailure: Boolean(simulateBothFailure || req.query.simulate_both === 'true'),
    };

    const result = await aiRecommendationService.generateRecommendations(profile, options);
    res.json(result);
  } catch (err) {
    res.status(502).json({
      success: false,
      error: 'Failed to generate recommendations via AI service',
      details: err.message,
    });
  }
});

// GET /api/moodle/users/:id/recommendations - Generate recommendations for specific user by ID
router.get('/users/:id/recommendations', async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const profile = moodleService.getCandidateProgress(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: `User #${userId} not found in Moodle LMS records`,
      });
    }

    const options = {
      simulateGroqFailure: req.query.simulate_groq === 'true',
      simulateBothFailure: req.query.simulate_both === 'true',
    };

    const result = await aiRecommendationService.generateRecommendations(profile, options);
    res.json(result);
  } catch (err) {
    res.status(502).json({
      success: false,
      error: 'Failed to generate user recommendations',
      details: err.message,
    });
  }
});

/**
 * ==============================================================================
 * Week 6 Day 4: Performance Audit — EXPLAIN Queries + Index Optimisation
 * ==============================================================================
 */

// GET /api/moodle/perf/health - Engine & provider health status
router.get('/perf/health', (req, res) => {
  res.json(aiQueryOptimizerService.getHealth());
});

// GET /api/moodle/perf/benchmarks - Pre-configured query performance benchmarks
router.get('/perf/benchmarks', (req, res) => {
  res.json({
    success: true,
    benchmarks: aiQueryOptimizerService.getBenchmarks()
  });
});

// POST /api/moodle/perf/explain - Generate EXPLAIN execution plan for SQL query
router.post('/perf/explain', (req, res) => {
  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: 'SQL query string is required for EXPLAIN analysis',
    });
  }

  const explainPlan = aiQueryOptimizerService.generateExplainPlan(query);
  res.json({
    success: true,
    query: query.trim(),
    explainPlan
  });
});

// POST /api/moodle/perf/audit - Perform in-depth AI query performance audit & indexing advice
router.post('/perf/audit', async (req, res) => {
  try {
    const { query, explainPlan, simulateGroqFailure, simulateBothFailure } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'SQL query string is required to perform performance audit',
      });
    }

    const options = {
      simulateGroqFailure: Boolean(simulateGroqFailure || req.query.simulate_groq === 'true'),
      simulateBothFailure: Boolean(simulateBothFailure || req.query.simulate_both === 'true'),
    };

    const result = await aiQueryOptimizerService.auditQueryPerformance({ query, explainPlan }, options);
    res.json(result);
  } catch (err) {
    res.status(502).json({
      success: false,
      error: 'Failed to complete query performance audit',
      details: err.message,
    });
  }
});

// GET /api/moodle/capstone/overview - Full deployment manifest & capstone architecture telemetry
router.get('/capstone/overview', (req, res) => {
  res.json({
    success: true,
    platform: 'Cynaris Recruitment & Learning Management System',
    version: '4.3+',
    environment: process.env.NODE_ENV || 'production',
    deployment: {
      webUrl: 'http://localhost:8000',
      database: {
        engine: 'PostgreSQL 14 / MySQL 8.0 Parity',
        host: 'moodle-db',
        port: 5432,
        tablesCount: 5,
        coreTables: ['mdl_course', 'mdl_grade_grades', 'mdl_course_completions', 'mdl_user', 'mdl_log'],
        indexesOptimized: true,
      },
      smtp: {
        catcher: 'MailHog',
        webPort: 8025,
        smtpPort: 1025,
      },
      dataroot: '/var/www/moodledata',
      wwwroot: 'http://localhost:8000',
    },
    subsystems: {
      blocks: ['block_cynaris_tracker', 'block_cynaris_stats'],
      mod: ['mod_quiz'],
      local: ['local_cynaris_ai_tutor', 'local_cynaris_recommendations', 'local_cynaris_perf'],
    },
    aiPipeline: {
      primaryModel: 'llama-3.3-70b-versatile',
      primaryProvider: 'Groq',
      fallbackModel: 'meta-llama/llama-3.3-70b-instruct',
      fallbackProvider: 'OpenRouter',
      localFallback: 'Deterministic Rule Engine',
      capabilities: [
        'AI Socratic Tutor (/api/moodle/ai-tutor)',
        'AI MCQ Quiz Generator (/api/moodle/quiz)',
        'AI Learning Recommendations (/api/moodle/recommendations)',
        'AI Query Optimizer & Index Advisor (/api/moodle/perf)',
      ],
    },
    architecturalDecisions: [
      'Universal Database Abstraction Layer ($DB / moodle_database parameterized DML)',
      'Modular Pluggable Component Architecture (Frankenstyle naming across blocks, mod, and local)',
      'Decoupled Security Dataroot Architecture ($CFG->dataroot isolated outside webroot)',
    ],
    verifiedAt: new Date().toISOString(),
    status: 'OPERATIONAL',
  });
});

module.exports = router;
