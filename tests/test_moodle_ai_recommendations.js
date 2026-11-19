/**
 * test_moodle_ai_recommendations.js
 * 
 * Comprehensive Unit Test Suite for Week 6 Day 3:
 * AI Learning Recommendations from Grade + Completion Data
 * 
 * Verifies:
 *   1. Socratic prompt construction & candidate context injection
 *   2. Groq primary provider configuration (llama-3.3-70b-versatile)
 *   3. OpenRouter automated fallback (meta-llama/llama-3.3-70b-instruct)
 *   4. Local deterministic fallback on dual cloud failure
 *   5. Strict JSON schema validation
 *   6. Multi-tier candidate performance evaluation (Advanced vs Needs Support)
 *   7. Moodle PHP service parity (RecommendationService.php)
 *   8. Express REST endpoints (/health, /generate, /users/:id/recommendations, 404)
 *   9. Moodle Block UI deck in block_cynaris_stats.php
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');

const { AiRecommendationService } = require('../backend/modules/ai/AiRecommendationService');
const { moodleService } = require('../backend/modules/moodle/MoodleService');
const app = require('../backend/server');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } catch (error) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         ${error.message}`);
    process.exitCode = 1;
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } catch (error) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         ${error.message}`);
    process.exitCode = 1;
  }
}

// In-Memory Request Dispatcher for Sandbox-Safe Networkless HTTP testing
function dispatchExpressRequest(appInstance, method, urlPath, body = null) {
  return new Promise((resolve) => {
    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const req = new Readable({
      read() {
        if (payload) this.push(payload);
        this.push(null);
      }
    });

    req.method = method;
    req.url = urlPath;
    req.originalUrl = urlPath;
    req.headers = {
      host: 'localhost:3000',
      'user-agent': 'test-moodle-rec-client',
    };
    if (payload) {
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = Buffer.byteLength(payload);
    }

    const dummySocket = new Duplex({
      read() {},
      write(chunk, enc, cb) { cb(); }
    });
    dummySocket.remoteAddress = '127.0.0.1';
    dummySocket.setTimeout = () => {};
    req.connection = dummySocket;
    req.socket = dummySocket;

    const res = new http.ServerResponse(req);
    let rawBody = '';

    const origWrite = res.write;
    res.write = function (chunk, ...args) {
      if (chunk) rawBody += chunk;
      return origWrite.apply(this, [chunk, ...args]);
    };

    const origEnd = res.end;
    res.end = function (chunk, ...args) {
      if (chunk) rawBody += chunk;
      origEnd.apply(this, [chunk, ...args]);

      let parsed = null;
      try {
        if (rawBody.length > 0) parsed = JSON.parse(rawBody);
      } catch (e) {
        parsed = rawBody;
      }

      resolve({
        status: res.statusCode,
        statusCode: res.statusCode,
        headers: res.getHeaders ? res.getHeaders() : {},
        body: parsed,
        rawBody,
      });
    };

    appInstance(req, res);
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 Week 6 Day 3: AI Learning Recommendations Test Suite');
  console.log('================================================================\n');

  const mockHighPerformer = {
    user: { id: 2, name: 'Murali V', department: 'Full Stack Intern' },
    completions: [
      { course: 101, courseName: 'Full Stack Engineering', status: 1, timeenrolled: 1730005000 },
      { course: 102, courseName: 'Enterprise CRM & EspoCRM', status: 1, timeenrolled: 1730105000 },
      { course: 103, courseName: 'Production DevOps & Docker', status: 0, timeenrolled: 1730205000 }
    ],
    grades: [
      { itemid: 501, quizName: 'Node.js & JWT Assessment', finalgrade: 96.50, rawgrademax: 100, feedback: 'Outstanding execution' },
      { itemid: 502, quizName: 'CRM & AI Assessment', finalgrade: 92.00, rawgrademax: 100, feedback: 'Excellent summarizer prompt' },
      { itemid: 503, quizName: 'Docker & CI/CD Assessment', finalgrade: 98.00, rawgrademax: 100, feedback: 'Flawless multi-stage build' }
    ]
  };

  const mockNeedsSupport = {
    user: { id: 6, name: 'Vikram Aditya', department: 'Frontend Intern' },
    completions: [
      { course: 101, courseName: 'Full Stack Engineering', status: 0, timeenrolled: 1730008000 }
    ],
    grades: [
      { itemid: 501, quizName: 'Node.js & JWT Assessment', finalgrade: 68.00, rawgrademax: 100, feedback: 'Needs review on async I/O' }
    ]
  };

  // --- Test Group 1: Prompt Construction ---
  console.log('--- Test 1: Socratic Prompt Construction & Context Injection ---');
  runTest('buildRecommendationPrompt injects candidate name, courses, and grade evidence', () => {
    const service = new AiRecommendationService({ groqApiKey: 'dummy' });
    const prompt = service.buildRecommendationPrompt(mockHighPerformer);

    assert(prompt.systemPrompt.includes('Lead AI Learning Path Architect'), 'System prompt must define authoritative persona');
    assert(prompt.systemPrompt.includes('mdl_grade_grades'), 'System prompt must reference grade tables');
    assert(prompt.systemPrompt.includes('mdl_course_completions'), 'System prompt must reference completion tables');
    assert(prompt.userPrompt.includes('Murali V'), 'User prompt must include candidate name');
    assert(prompt.userPrompt.includes('Node.js & JWT Assessment'), 'User prompt must include quiz names');
    assert(prompt.userPrompt.includes('96.5'), 'User prompt must include actual score');
  });

  // --- Test Group 2: Primary Provider Inference via Groq ---
  console.log('\n--- Test 2: Primary Provider Configuration via Groq ---');
  runTest('Specifies Groq primary model llama-3.3-70b-versatile', () => {
    const service = new AiRecommendationService({ groqApiKey: 'dummy' });
    assert.strictEqual(service.primaryModel, 'llama-3.3-70b-versatile');
    assert(service.timeoutMs >= 5000, 'Timeout must be at least 5000ms');
  });

  await runAsyncTest('Executes primary Groq inference when mocked response is received', async () => {
    const service = new AiRecommendationService({ groqApiKey: 'dummy_key' });
    service.callGroq = async () => ({
      studentSummary: {
        tier: 'Advanced',
        averageGrade: 95.5,
        completionRate: 66.7,
        analysis: 'Outstanding technical velocity across full-stack and devops tracks.'
      },
      strengths: [
        { topic: 'Node.js & Database Architecture', evidence: 'Scored 96.5% on Week 4 assessment' }
      ],
      growthAreas: [
        { topic: 'Production Cloud Deployment', evidence: 'Course #103 pending final submission' }
      ],
      recommendedActions: [
        { priority: 1, action: 'Complete CI/CD deployment pipeline run', targetCourse: 'CYN-OPS-103', estimatedHours: 2 }
      ],
      nextMilestone: {
        goal: 'Full Stack Production Certification',
        targetDateDays: 5,
        readinessScore: 96
      },
      pedagogicalEncouragement: 'Excellent progress, candidate is ready for production workloads.'
    });

    const result = await service.generateRecommendations(mockHighPerformer);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provider, 'groq');
    assert.strictEqual(result.model, 'llama-3.3-70b-versatile');
    assert.strictEqual(result.fallbackUsed, false);
    assert.strictEqual(result.data.studentSummary.tier, 'Advanced');
  });

  // --- Test Group 3: Automated Failover to OpenRouter ---
  console.log('\n--- Test 3: Automated Failover to OpenRouter ---');
  runTest('Specifies OpenRouter fallback model meta-llama/llama-3.3-70b-instruct', () => {
    const service = new AiRecommendationService({ openRouterApiKey: 'dummy_or' });
    assert.strictEqual(service.fallbackModel, 'meta-llama/llama-3.3-70b-instruct');
  });

  await runAsyncTest('Automatically fails over to OpenRouter when Groq fails', async () => {
    const service = new AiRecommendationService({
      groqApiKey: 'failing_key',
      openRouterApiKey: 'mock_openrouter_key'
    });

    service.callGroq = async () => { throw new Error('Simulated Groq 429 Rate Limit Exceeded'); };
    service.callOpenRouter = async () => ({
      studentSummary: {
        tier: 'Advanced',
        averageGrade: 95.5,
        completionRate: 66.7,
        analysis: 'OpenRouter fallback response'
      },
      strengths: [
        { topic: 'Docker Containerization', evidence: '98% score' }
      ],
      growthAreas: [
        { topic: 'Advanced GraphQL', evidence: 'Pending module' }
      ],
      recommendedActions: [
        { priority: 1, action: 'Review query sargability', targetCourse: 'CYN-FS-101', estimatedHours: 2 }
      ],
      nextMilestone: {
        goal: 'Milestone Alpha',
        targetDateDays: 7,
        readinessScore: 92
      },
      pedagogicalEncouragement: 'Keep advancing your cloud skills.'
    });

    const result = await service.generateRecommendations(mockHighPerformer);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provider, 'openrouter');
    assert.strictEqual(result.model, 'meta-llama/llama-3.3-70b-instruct');
    assert.strictEqual(result.fallbackUsed, true);
    assert(result.fallbackReason.includes('Groq API error'), 'Fallback reason must detail Groq failure');
  });

  // --- Test Group 4: Local Deterministic Curriculum Fallback on Dual Cloud Failure ---
  console.log('\n--- Test 4: Local Deterministic Curriculum Fallback on Dual Cloud Failure ---');
  await runAsyncTest('Engages Local Deterministic Engine when both Groq and OpenRouter fail', async () => {
    const service = new AiRecommendationService({
      groqApiKey: null,
      openRouterApiKey: null
    });

    const result = await service.generateRecommendations(mockHighPerformer);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provider, 'local-deterministic');
    assert.strictEqual(result.model, 'deterministic-recommendation-engine-v1');
    assert.strictEqual(result.fallbackUsed, true);
    assert.strictEqual(result.data.studentSummary.tier, 'Advanced');
    assert(result.data.studentSummary.averageGrade > 90, 'Average grade must be accurately calculated');
    assert(result.data.strengths.length > 0, 'Strengths array must not be empty');
    assert(result.data.recommendedActions.length >= 2, 'Recommended actions must contain prioritized steps');
  });

  // --- Test Group 5: Strict Recommendation Schema Validation ---
  console.log('\n--- Test 5: Strict Recommendation Schema Validation ---');
  runTest('validateRecommendationStructure rejects malformed payloads', () => {
    const service = new AiRecommendationService();

    assert.throws(() => service.validateRecommendationStructure(null), /non-null object/);
    assert.throws(() => service.validateRecommendationStructure({}), /Missing or invalid studentSummary/);
    assert.throws(() => service.validateRecommendationStructure({
      studentSummary: { tier: 'InvalidTier', averageGrade: 90 },
      strengths: [],
      growthAreas: [],
      recommendedActions: [],
      nextMilestone: {},
      pedagogicalEncouragement: ''
    }), /tier must be one of/);
    assert.throws(() => service.validateRecommendationStructure({
      studentSummary: { tier: 'Advanced', averageGrade: 90 },
      strengths: [],
      growthAreas: [],
      recommendedActions: [],
      nextMilestone: {},
      pedagogicalEncouragement: ''
    }), /strengths must be a non-empty array/);
  });

  // --- Test Group 6: Student Tier Differentiation ---
  console.log('\n--- Test 6: Student Tier Differentiation (Advanced vs Needs Support) ---');
  runTest('Correctly classifies High Performer as Advanced and Struggling Student as Needs Support', () => {
    const service = new AiRecommendationService();
    const highResult = service.localDeterministicFallback(mockHighPerformer);
    const lowResult = service.localDeterministicFallback(mockNeedsSupport);

    assert.strictEqual(highResult.studentSummary.tier, 'Advanced', 'High scores and completions must yield Advanced tier');
    assert.strictEqual(lowResult.studentSummary.tier, 'Needs Support', 'Low scores (<80) and low completion must yield Needs Support tier');
    assert(highResult.nextMilestone.readinessScore > lowResult.nextMilestone.readinessScore, 'High performer must have higher readiness');
  });

  // --- Test Group 7: Moodle PHP Service Parity ---
  console.log('\n--- Test 7: Moodle PHP Service Parity ---');
  runTest('moodle/local/cynaris_recommendations/RecommendationService.php exists and defines required methods', () => {
    const phpPath = path.resolve(__dirname, '../moodle/local/cynaris_recommendations/RecommendationService.php');
    assert(fs.existsSync(phpPath), 'RecommendationService.php must exist');
    const content = fs.readFileSync(phpPath, 'utf8');
    assert(content.includes('class RecommendationService'), 'Must define class RecommendationService');
    assert(content.includes('function buildPrompt'), 'Must define buildPrompt method');
    assert(content.includes('function generateRecommendations'), 'Must define generateRecommendations method');
    assert(content.includes('function localDeterministicFallback'), 'Must define localDeterministicFallback method');
    assert(content.includes('function validateRecommendationStructure'), 'Must define validateRecommendationStructure method');
  });

  // --- Test Group 8: Express REST API Endpoints ---
  console.log('\n--- Test 8: Express REST API Endpoints Integration ---');

  await runAsyncTest('GET /api/moodle/recommendations/health returns 200 with operational status', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/moodle/recommendations/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'operational');
    assert.strictEqual(res.body.primaryProvider.provider, 'groq');
    assert.strictEqual(res.body.fallbackProvider.provider, 'openrouter');
  });

  await runAsyncTest('POST /api/moodle/recommendations/generate returns 200 with recommendations', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/moodle/recommendations/generate', {
      studentProfile: mockHighPerformer
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.studentSummary.tier, 'Must return student summary tier');
    assert(Array.isArray(res.body.data.recommendedActions), 'Must return recommended actions');
  });

  await runAsyncTest('GET /api/moodle/users/2/recommendations returns 200 with Candidate #2 recommendations', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/moodle/users/2/recommendations');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.student.name, 'Murali V');
    assert(res.body.data.strengths.length > 0, 'Must have strengths');
  });

  await runAsyncTest('GET /api/moodle/users/999/recommendations returns 404 for unknown user', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/moodle/users/999/recommendations');
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
    assert(res.body.error.includes('not found'), 'Must indicate user was not found');
  });

  // --- Test Group 9: Moodle Block Plugin UI Integration ---
  console.log('\n--- Test 9: Moodle Block UI Integration in block_cynaris_stats.php ---');
  runTest('block_cynaris_stats.php includes the AI Learning Recommendations UI container and handler', () => {
    const blockPath = path.resolve(__dirname, '../blocks/cynaris_stats/block_cynaris_stats.php');
    assert(fs.existsSync(blockPath), 'blocks/cynaris_stats/block_cynaris_stats.php must exist');
    const content = fs.readFileSync(blockPath, 'utf8');

    assert(content.includes('id="cynaris-recommendations-section"'), 'Must define recommendations section container');
    assert(content.includes('id="cynaris-get-recommendations-btn"'), 'Must define recommendation trigger button');
    assert(content.includes('id="cynaris-rec-result"'), 'Must define recommendation result container');
    assert(content.includes('aria-live="polite"'), 'Must define ARIA live region for accessibility');
    assert(content.includes('fetchLearningRecommendations'), 'Must define client-side AJAX fetcher function');
  });

  console.log('\n================================================================');
  if (passedTests === totalTests) {
    console.log(`🎉 [SUCCESS] All ${passedTests} Week 6 Day 3 AI Recommendations Tests Passed!`);
  } else {
    console.log(`❌ [FAILURE] ${passedTests}/${totalTests} Tests Passed.`);
  }
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
