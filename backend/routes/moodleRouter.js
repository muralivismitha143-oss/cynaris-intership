/**
 * moodleRouter.js
 * 
 * Express Router exposing Moodle LMS integration endpoints for Cynaris Recruitment Platform.
 * Routes:
 *   GET /api/moodle/status                 - Moodle LMS environment health & counts
 *   GET /api/moodle/courses                - Active Moodle training courses catalog
 *   GET /api/moodle/candidates/:id/progress - Candidate assessment grades & course completions
 *   GET /api/moodle/logs                   - LMS audit logs & user events
 */

const express = require('express');
const { moodleService } = require('../modules/moodle/MoodleService');

const router = express.Router();

// GET /api/moodle/status
router.get('/status', (req, res) => {
  res.json(moodleService.getStatus());
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

module.exports = router;
