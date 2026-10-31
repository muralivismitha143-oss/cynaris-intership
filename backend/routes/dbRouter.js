/**
 * dbRouter.js
 * 
 * Week 4 Day 4: Database Health & MySQL Operations Router
 * 
 * Exposes endpoints for:
 * - GET /api/database/status: Connection pool telemetry and healthcheck
 * - POST /api/database/migrate: Executes database schema DDL migrations
 * - GET /api/database/applicants: Retrieves applicants using MySQL query
 * - POST /api/database/applicants: Inserts applicant using MySQL prepared statement
 * - GET /api/database/applicants/:id: Retrieves single applicant by ID
 * - PATCH /api/database/applicants/:id/stage: Updates stage with atomic transaction
 * - DELETE /api/database/applicants/:id: Deletes applicant
 */

const express = require('express');
const router = express.Router();

const { mysqlClient } = require('../database/mysqlClient');
const { applicantRepository } = require('../database/applicantRepository');

// Health and pool status
router.get('/status', (req, res) => {
  const metrics = mysqlClient.getMetrics();
  res.status(200).json({
    success: true,
    status: 'ONLINE',
    database: metrics.database,
    driver: metrics.activeDriver,
    telemetry: {
      totalQueries: metrics.totalQueries,
      preparedStatementsCount: metrics.preparedStatementsCount,
      transactionsCount: metrics.transactionsCount,
      isLiveConnected: metrics.isLiveConnected,
      connectionLimit: metrics.connectionLimit,
    },
  });
});

// Run DDL migrations
router.post('/migrate', async (req, res) => {
  try {
    const result = await mysqlClient.runMigrations();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all applicants from MySQL
router.get('/applicants', async (req, res) => {
  try {
    const applicants = await applicantRepository.findAll({
      stage: req.query.stage,
      search: req.query.search,
      minExp: req.query.min_exp,
    });
    res.status(200).json({
      success: true,
      count: applicants.length,
      data: applicants,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Insert applicant using prepared statement
router.post('/applicants', async (req, res) => {
  try {
    const { name, job_title, pipeline_stage, experience_years, skills, education, resume_text } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Applicant name is required' });
    }

    const created = await applicantRepository.create({
      name,
      job_title,
      pipeline_stage,
      experience_years,
      skills,
      education,
      resume_text,
    });

    res.setHeader('Location', `/api/database/applicants/${created.id}`);
    res.status(201).json({
      success: true,
      message: 'Applicant created in MySQL via prepared statement',
      applicant: created,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single applicant by ID
router.get('/applicants/:id', async (req, res) => {
  try {
    const numId = Number(req.params.id);
    if (!Number.isInteger(numId) || numId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid applicant ID' });
    }

    const applicant = await applicantRepository.findById(numId);
    if (!applicant) {
      return res.status(404).json({ success: false, error: 'Applicant not found' });
    }

    res.status(200).json({ success: true, applicant });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update stage with atomic transaction
router.patch('/applicants/:id/stage', async (req, res) => {
  try {
    const numId = Number(req.params.id);
    if (!Number.isInteger(numId) || numId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid applicant ID' });
    }

    const { stage } = req.body || {};
    if (!stage) {
      return res.status(400).json({ success: false, error: 'Stage is required' });
    }

    const result = await applicantRepository.updateStageWithAudit(numId, stage, 'Recruiter');
    res.status(200).json({
      success: true,
      message: 'Applicant stage updated atomically with transaction audit',
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete applicant
router.delete('/applicants/:id', async (req, res) => {
  try {
    const numId = Number(req.params.id);
    if (!Number.isInteger(numId) || numId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid applicant ID' });
    }

    const deleted = await applicantRepository.delete(numId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Applicant not found' });
    }

    res.status(200).json({
      success: true,
      message: `Applicant #${numId} deleted successfully`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  dbRouter: router,
};
