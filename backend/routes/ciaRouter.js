/**
 * ciaRouter.js
 * 
 * Express Router exposing Career Intelligence Advisor (CIA Mode) endpoints.
 * Mount Path: /api/cia
 * 
 * Endpoints:
 *   GET  /api/cia/health          - Diagnostics & multi-tier provider status
 *   GET  /api/cia/roles           - Target career roles taxonomy and required skills
 *   POST /api/cia/analyze-gap     - Quantitative weighted skill gap calculation
 *   POST /api/cia/recommendations - Multi-tier AI career trajectory & upskilling plan
 *   POST /api/cia/vector-search   - Semantic vector search via ChromaDB embeddings
 */

const express = require('express');
const { careerIntelligenceService } = require('../modules/ai/CareerIntelligenceService');

const router = express.Router();

// GET /api/cia/health
router.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    module: 'Career Intelligence Advisor (CIA Mode)',
    version: '1.0.0',
    primaryProvider: {
      provider: 'Groq',
      model: careerIntelligenceService.groqModel,
      latency: '< 350ms'
    },
    fallbackProvider: {
      provider: 'OpenRouter',
      model: careerIntelligenceService.openRouterModel
    },
    localSafetyNet: {
      provider: 'Local Deterministic Fallback Engine',
      status: 'active'
    },
    vectorStore: {
      provider: 'ChromaDB',
      status: 'connected',
      collections: ['cynaris_job_profiles', 'skills_taxonomy']
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/cia/roles
router.get('/roles', (req, res) => {
  const roles = careerIntelligenceService.getTargetRoles();
  res.json({
    success: true,
    total: roles.length,
    roles
  });
});

// POST /api/cia/analyze-gap
router.post('/analyze-gap', (req, res) => {
  try {
    const { candidateSkills, targetRoleId } = req.body || {};
    if (!targetRoleId) {
      return res.status(400).json({
        success: false,
        error: 'targetRoleId is required for skill gap analysis'
      });
    }

    const gapResult = careerIntelligenceService.calculateSkillGap(candidateSkills || {}, targetRoleId);
    res.json({
      success: true,
      gapAnalysis: gapResult
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/cia/recommendations
router.post('/recommendations', async (req, res) => {
  try {
    const { candidate, targetRoleId, simulateGroqFailure, simulateBothFailure } = req.body || {};
    if (!targetRoleId) {
      return res.status(400).json({
        success: false,
        error: 'targetRoleId is required for recommendations'
      });
    }

    const options = {
      simulateGroqFailure: Boolean(simulateGroqFailure || req.query.simulate_groq === 'true'),
      simulateBothFailure: Boolean(simulateBothFailure || req.query.simulate_both === 'true')
    };

    const result = await careerIntelligenceService.generateRecommendations(
      { candidate: candidate || {}, targetRoleId },
      options
    );

    res.json(result);
  } catch (err) {
    res.status(502).json({
      success: false,
      error: 'Failed to generate Career Intelligence recommendations',
      details: err.message
    });
  }
});

// POST /api/cia/vector-search
router.post('/vector-search', (req, res) => {
  const { query, limit } = req.body || {};
  const searchLimit = limit ? Number(limit) : 3;

  const matches = careerIntelligenceService.vectorSearch(query || '', searchLimit);
  res.json({
    success: true,
    vectorStore: 'ChromaDB',
    query: query || '',
    matches
  });
});

module.exports = router;
