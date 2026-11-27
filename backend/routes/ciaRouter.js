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

// POST /api/cia/career/skill-gap - LlamaIndex RAG + Groq pipeline skill gap analysis
router.post('/career/skill-gap', async (req, res) => {
  try {
    const {
      candidateId = 1,
      targetRoleId,
      completedLessons,
      quizScores,
      candidateSkills,
      candidate,
      simulateGroqFailure,
      simulateBothFailure
    } = req.body || {};

    if (!targetRoleId) {
      return res.status(400).json({
        success: false,
        error: 'targetRoleId is required for skill gap analysis'
      });
    }

    const options = {
      simulateGroqFailure: Boolean(simulateGroqFailure || req.query.simulate_groq === 'true'),
      simulateBothFailure: Boolean(simulateBothFailure || req.query.simulate_both === 'true')
    };

    const result = await careerIntelligenceService.analyzeSkillGapRAG(
      {
        candidateId,
        targetRoleId,
        completedLessons,
        quizScores,
        candidateSkills,
        candidate
      },
      options
    );

    res.json(result);
  } catch (err) {
    res.status(502).json({
      success: false,
      error: 'Failed to analyze skill gap via LlamaIndex + Groq RAG pipeline',
      details: err.message
    });
  }
});

// POST /api/cia/career/recommend - CrewAI CareerAdvisorAgent 3 Career Paths Engine (Week 7 Day 3)
router.post('/career/recommend', async (req, res) => {
  try {
    const {
      candidateId = 1,
      targetRoleId = 'role_fullstack_lead',
      candidateSkills,
      candidate,
      simulateGroqFailure,
      simulateBothFailure
    } = req.body || {};

    const options = {
      simulateGroqFailure: Boolean(simulateGroqFailure || req.query.simulate_groq === 'true'),
      simulateBothFailure: Boolean(simulateBothFailure || req.query.simulate_both === 'true')
    };

    const result = await careerIntelligenceService.generateCrewAICareerRecommendations(
      {
        candidateId,
        targetRoleId,
        candidateSkills: candidateSkills || {},
        candidate: candidate || {}
      },
      options
    );

    res.json(result);
  } catch (err) {
    res.status(502).json({
      success: false,
      error: 'Failed to generate CrewAI career path recommendations',
      details: err.message
    });
  }
});

// POST /api/cia/career/match-internships - ChromaDB Vector Search across 20 Internship Roles (Week 7 Day 4)
router.post('/career/match-internships', (req, res) => {
  try {
    const {
      candidateSkills = {},
      candidateId = 1,
      limit = 5,
      candidateTitle
    } = req.body || {};

    const result = careerIntelligenceService.matchInternshipsWithChromaDB(candidateSkills, {
      candidateId,
      limit,
      candidateTitle
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to execute ChromaDB vector search for internship matching',
      details: err.message
    });
  }
});

// POST /api/cia/career/learning-path - LangGraph State Machine 8-Week Learning Path Generator (Week 7 Day 5)
router.post('/career/learning-path', async (req, res) => {
  try {
    const {
      candidateId = 1,
      candidateProfile = {},
      candidateSkills = {},
      targetRoleId = 'role_fullstack_lead',
      dailyCommitmentHours = 2.0,
      dailyCommitmentTarget,
      simulateGroqFailure,
      simulateBothFailure
    } = req.body || {};

    const options = {
      simulateGroqFailure: Boolean(simulateGroqFailure || req.query.simulate_groq === 'true'),
      simulateBothFailure: Boolean(simulateBothFailure || req.query.simulate_both === 'true')
    };

    const input = {
      candidateId,
      candidateProfile,
      candidateSkills,
      targetRoleId,
      dailyCommitmentHours: dailyCommitmentHours || dailyCommitmentTarget || 2.0
    };

    const result = await careerIntelligenceService.executeLangGraphLearningPathWorkflow(input, options);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to execute LangGraph learning path workflow',
      details: err.message
    });
  }
});

// POST /api/cia/career/resume-intelligence - Module 5: Resume Intelligence (Docling + Groq ATS Scoring) (Week 8 Day 1)
router.post('/career/resume-intelligence', async (req, res) => {
  try {
    const {
      applicantId = 1,
      applicantName = 'Candidate #1',
      jobTitle,
      experienceYears,
      skills,
      resumeText,
      targetRoleId,
      simulateGroqFailure,
      simulateBothFailure
    } = req.body || {};

    const options = {
      simulateGroqFailure: Boolean(simulateGroqFailure || req.query.simulate_groq === 'true'),
      simulateBothFailure: Boolean(simulateBothFailure || req.query.simulate_both === 'true')
    };

    const input = {
      applicantId,
      applicantName,
      jobTitle,
      experienceYears,
      skills,
      resumeText,
      targetRoleId
    };

    const result = await careerIntelligenceService.analyzeResumeIntelligenceDoclingATS(input, options);
    res.status(200).json(result);
  } catch (err) {
    res.status(502).json({
      success: false,
      error: err.message || 'Unable to generate AI resume summary.',
      details: err.message
    });
  }
});

// =============================================================================
// WEEK 8 DAY 2: MODULE 6 & 7 — PLACEMENT & INTERVIEW READINESS SCORES
// =============================================================================

async function handleCalculateReadiness(req, res) {
  try {
    const body = req.body || {};
    const options = {
      simulateGroqFailure: Boolean(body.simulateGroqFailure || body.simulate_groq_failure || req.query.simulate_groq === 'true'),
      simulateBothFailure: Boolean(body.simulateBothFailure || body.simulate_both_failure || req.query.simulate_both === 'true')
    };

    const result = await careerIntelligenceService.evaluateInternReadiness(body, options);
    if (!result.success) {
      return res.status(502).json(result);
    }
    res.status(200).json(result);
  } catch (err) {
    const status = err.message && (err.message.includes('Invalid') || err.message.includes('must be')) ? 400 : 500;
    res.status(status).json({
      success: false,
      error: err.message
    });
  }
}

router.post('/readiness/calculate', handleCalculateReadiness);
router.post('/career/readiness/calculate', handleCalculateReadiness);

async function handleStudentReadiness(req, res) {
  try {
    const rawId = req.params.internId ?? req.query.intern_id ?? 1;
    const internId = Number(rawId);
    if (!Number.isInteger(internId) || internId < 1) {
      return res.status(400).json({
        success: false,
        error: `Invalid internId '${rawId}'. Must be a positive integer.`
      });
    }

    const card = await careerIntelligenceService.getStudentReadinessCard(internId);
    if (!card) {
      return res.status(404).json({
        success: false,
        error: `Readiness scorecard not found for intern #${internId}`
      });
    }
    res.status(200).json(card);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

router.get('/readiness/student', handleStudentReadiness);
router.get('/readiness/student/:internId', handleStudentReadiness);
router.get('/career/readiness/student/:internId', handleStudentReadiness);

async function handleAdminReadiness(req, res) {
  try {
    const overview = await careerIntelligenceService.getAdminReadinessOverview();
    res.status(200).json(overview);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

router.get('/readiness/admin', handleAdminReadiness);
router.get('/readiness/interns', handleAdminReadiness);
router.get('/career/readiness/admin', handleAdminReadiness);

async function handleExportReadinessCsv(req, res) {
  try {
    const csv = await careerIntelligenceService.exportAdminReadinessCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="intern-readiness-scores.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

router.get('/readiness/export-csv', handleExportReadinessCsv);
router.get('/career/readiness/export-csv', handleExportReadinessCsv);

// =============================================================================
// WEEK 8 DAY 3: CAREER INTELLIGENCE REPORT — ARCHETYPE MAP + EMPLOYABILITY SCORE
// =============================================================================

router.get('/career/archetypes', (req, res) => {
  const archetypes = careerIntelligenceService.getCareerArchetypes();
  res.status(200).json({
    success: true,
    total: archetypes.length,
    archetypes
  });
});

router.post('/career/report/generate', async (req, res) => {
  try {
    const body = req.body || {};
    const options = {
      simulateGroqFailure: Boolean(body.simulateGroqFailure || body.simulate_groq_failure || req.query.simulate_groq === 'true'),
      simulateBothFailure: Boolean(body.simulateBothFailure || body.simulate_both_failure || req.query.simulate_both === 'true')
    };

    const result = await careerIntelligenceService.generateCareerIntelligenceReport(body, options);
    if (!result.success) {
      return res.status(502).json(result);
    }
    res.status(200).json(result);
  } catch (err) {
    const status = err.message && (err.message.includes('Invalid') || err.message.includes('must be')) ? 400 : 500;
    res.status(status).json({
      success: false,
      error: err.message
    });
  }
});

router.get('/career/reports', async (req, res) => {
  try {
    const reports = await careerIntelligenceService.getCandidateReports(null);
    res.status(200).json({
      success: true,
      total: reports.length,
      reports
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/career/reports/:candidateId', async (req, res) => {
  try {
    const candidateId = Number(req.params.candidateId);
    if (!Number.isInteger(candidateId) || candidateId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid candidateId' });
    }
    const reports = await careerIntelligenceService.getCandidateReports(candidateId);
    res.status(200).json({
      success: true,
      candidate_id: candidateId,
      total: reports.length,
      reports
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function handleExportCareerReportPdf(req, res) {
  try {
    const reportId = Number(req.params.reportId ?? req.query.report_id ?? 1);
    if (!Number.isInteger(reportId) || reportId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid reportId' });
    }
    const exported = await careerIntelligenceService.exportCareerReportPdf(reportId);
    if (!exported) {
      return res.status(404).json({ success: false, error: `Career report #${reportId} not found` });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="career-intelligence-report-${reportId}.pdf"`);
    res.status(200).send(exported.pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

router.get('/career/report/pdf', handleExportCareerReportPdf);
router.get('/career/report/:reportId/pdf', handleExportCareerReportPdf);

module.exports = router;
