/**
 * applicantsRouter.js
 * 
 * Demonstrates:
 * - RESTful API Design: HTTP Methods, Status Codes, Route Parameters, Query Strings
 * - Root Cause 1 Fix: Strict route parameter validation (400 Bad Request vs 404 Not Found)
 * - Query String Filtering, Case-Insensitive Search, and Pagination Envelopes
 * - Proper HTTP response codes: 200 OK, 201 Created (with Location header), 400 Bad Request, 404 Not Found
 */

const express = require('express');
const router = express.Router();

const validStages = [
  'Screening',
  'Technical Round 1',
  'Technical Round 2',
  'HR Round',
  'Offered',
  'Rejected',
];

// Reference dataset (shared or initialized)
let applicantsStore = [
  {
    id: 1,
    name: 'Rahul Kumar',
    job_title: 'Full Stack Developer',
    pipeline_stage: 'Screening',
    experience_years: 2,
    skills: 'JavaScript, Node.js, Express, React, MongoDB, Git',
    education: 'B.Tech Computer Science (2024)',
    resume_text: 'Full Stack Engineer with 2 years of experience building web applications using React, Node.js, and Express.',
    ai_resume_summary: null,
    ai_summary_provider: null,
    ai_analyzed_at: null,
    updated_at: new Date(Date.now() - 3600000 * 36).toISOString(),
  },
  {
    id: 2,
    name: 'Priya Sharma',
    job_title: 'Backend Engineer',
    pipeline_stage: 'Technical Round 1',
    experience_years: 3.5,
    skills: 'Python, FastAPI, Django, PostgreSQL, Docker, Redis',
    education: 'M.Tech Software Engineering (2023)',
    resume_text: 'Backend Developer specializing in high-throughput microservices using Python, FastAPI, and PostgreSQL.',
    ai_resume_summary: null,
    ai_summary_provider: null,
    ai_analyzed_at: null,
    updated_at: new Date(Date.now() - 3600000 * 54).toISOString(),
  },
  {
    id: 3,
    name: 'Arun Kumar',
    job_title: 'Frontend Developer',
    pipeline_stage: 'HR Round',
    experience_years: 1.5,
    skills: 'Vue.js 3, TypeScript, Tailwind CSS, Vite',
    education: 'B.Sc Computer Science (2025)',
    resume_text: 'Frontend Engineer passionate about responsive UX and state management. Built real-time Kanban boards.',
    ai_resume_summary: null,
    ai_summary_provider: null,
    ai_analyzed_at: null,
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 4,
    name: 'Neha Gupta',
    job_title: 'Senior DevOps Specialist',
    pipeline_stage: 'Offered',
    experience_years: 5,
    skills: 'Kubernetes, Terraform, AWS, Prometheus',
    education: 'B.Tech IT (2021)',
    resume_text: 'Cloud DevOps Engineer designing resilient multi-region infrastructure.',
    ai_resume_summary: null,
    ai_summary_provider: null,
    ai_analyzed_at: null,
    updated_at: new Date(Date.now() - 3600000 * 84).toISOString(),
  },
];

/**
 * Middleware: Route parameter validator for :applicant_id
 * Root Cause 1 Fix: Explicitly returns 400 Bad Request for non-integer or invalid IDs
 */
function validateApplicantId(req, res, next) {
  const param = req.params.applicant_id;
  const numId = Number(param);

  if (!Number.isInteger(numId) || numId < 1 || String(numId) !== param.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Invalid applicant ID: must be a positive integer',
      receivedParameter: param,
      statusCode: 400,
    });
  }

  req.applicantId = numId;
  next();
}

/**
 * GET /api/applicants
 * RESTful Query Parameters:
 * - stage: Filter by exact pipeline stage (e.g. ?stage=Technical Round 1)
 * - search: Substring search across candidate name or skills (e.g. ?search=python)
 * - min_exp: Minimum experience years filter (e.g. ?min_exp=2)
 * - page: Current page number (default: 1)
 * - limit: Page size limit (default: 10, max: 100)
 * - sort: Sort field (e.g. name, experience_years, updated_at)
 * - order: asc or desc (default: asc)
 */
router.get('/', (req, res) => {
  let result = [...applicantsStore];

  // 1. Filter by Stage
  if (req.query.stage) {
    const stageQuery = req.query.stage.trim();
    result = result.filter((a) => a.pipeline_stage.toLowerCase() === stageQuery.toLowerCase());
  }

  // 2. Search by Name or Skills
  if (req.query.search) {
    const q = req.query.search.trim().toLowerCase();
    result = result.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.skills.toLowerCase().includes(q) ||
        a.job_title.toLowerCase().includes(q)
    );
  }

  // 3. Filter by Minimum Experience
  if (req.query.min_exp) {
    const minExp = Number(req.query.min_exp);
    if (!isNaN(minExp)) {
      result = result.filter((a) => a.experience_years >= minExp);
    }
  }

  // 4. Sorting
  const sortField = req.query.sort || 'id';
  const order = req.query.order === 'desc' ? -1 : 1;
  result.sort((a, b) => {
    if (a[sortField] < b[sortField]) return -1 * order;
    if (a[sortField] > b[sortField]) return 1 * order;
    return 0;
  });

  // 5. Pagination
  const total = result.length;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedData = result.slice(startIndex, startIndex + limit);

  res.status(200).json({
    success: true,
    count: paginatedData.length,
    total,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    data: paginatedData,
  });
});

/**
 * GET /api/applicants/:applicant_id
 * Strict REST endpoint: Returns 400 on malformed ID, 404 if not found, 200 on success
 */
router.get('/:applicant_id', validateApplicantId, (req, res) => {
  const applicant = applicantsStore.find((a) => a.id === req.applicantId);
  if (!applicant) {
    return res.status(404).json({
      success: false,
      error: 'Applicant not found',
      requestedId: req.applicantId,
      statusCode: 404,
    });
  }

  res.status(200).json({
    success: true,
    applicant,
  });
});

/**
 * POST /api/applicants
 * Creates new applicant. Returns 201 Created with Location header.
 */
router.post('/', (req, res) => {
  const { name, stage, job_title, skills, experience_years, resume_text } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Validation error: Applicant name is required and must be non-empty',
      field: 'name',
    });
  }

  const targetStage = stage && validStages.includes(stage) ? stage : 'Screening';
  const newId = applicantsStore.length > 0 ? Math.max(...applicantsStore.map((a) => a.id)) + 1 : 1;

  const newApplicant = {
    id: newId,
    name: name.trim(),
    job_title: job_title || 'Full Stack Developer',
    pipeline_stage: targetStage,
    experience_years: Number(experience_years) || 1,
    skills: skills || 'JavaScript, HTML, CSS, Git',
    education: 'B.Tech Computer Science',
    resume_text: resume_text || `${name.trim()} applying for ${job_title || 'Full Stack Developer'}.`,
    ai_resume_summary: null,
    ai_summary_provider: null,
    ai_analyzed_at: null,
    updated_at: new Date().toISOString(),
  };

  applicantsStore.push(newApplicant);

  // RESTful standard: 201 Created with Location header referencing new resource URI
  res.setHeader('Location', `/api/applicants/${newId}`);
  res.status(201).json({
    success: true,
    message: 'Applicant created successfully',
    applicant: newApplicant,
  });
});

/**
 * PATCH /api/applicants/:applicant_id/stage
 * Updates interview stage. Returns 200 OK.
 */
router.patch('/:applicant_id/stage', validateApplicantId, (req, res) => {
  const { stage } = req.body || {};

  if (!stage || !validStages.includes(stage)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid stage',
      allowedStages: validStages,
      receivedStage: stage,
    });
  }

  const applicant = applicantsStore.find((a) => a.id === req.applicantId);
  if (!applicant) {
    return res.status(404).json({
      success: false,
      error: 'Applicant not found',
      requestedId: req.applicantId,
    });
  }

  applicant.pipeline_stage = stage;
  applicant.updated_at = new Date().toISOString();

  res.status(200).json({
    success: true,
    message: 'Pipeline stage updated successfully',
    applicant,
  });
});

/**
 * DELETE /api/applicants/:applicant_id
 * Deletes applicant resource. Returns 200 OK.
 */
router.delete('/:applicant_id', validateApplicantId, (req, res) => {
  const index = applicantsStore.findIndex((a) => a.id === req.applicantId);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Applicant not found',
      requestedId: req.applicantId,
    });
  }

  const [deleted] = applicantsStore.splice(index, 1);
  res.status(200).json({
    success: true,
    message: `Applicant #${req.applicantId} removed`,
    deleted,
  });
});

module.exports = {
  applicantsRouter: router,
  getApplicantsStore: () => applicantsStore,
  validStages,
};
