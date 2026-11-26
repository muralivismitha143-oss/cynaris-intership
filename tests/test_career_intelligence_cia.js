/**
 * test_career_intelligence_cia.js
 * 
 * Comprehensive Unit Test Suite for Week 7 Day 1:
 * Architecture Design — Career Intelligence CIA Mode + API Contracts
 * 
 * Verifies:
 *   1. Socratic career prompt construction & persona calibration
 *   2. Groq primary provider configuration (llama-3.3-70b-versatile)
 *   3. OpenRouter automated fallback (meta-llama/llama-3.3-70b-instruct)
 *   4. Local deterministic fallback engine on dual cloud failure
 *   5. Quantitative weighted skill gap formula & boundary condition tests
 *   6. ChromaDB vector store simulation & cosine similarity ranking
 *   7. Strict JSON schema validation invariants
 *   8. Laravel controller, blade template, and web routes parity
 *   9. Express REST API endpoints (/api/cia/health, /roles, /analyze-gap, /recommendations, /vector-search)
 *   10. W3C ARIA accessibility compliance in UI deck
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');

const { CareerIntelligenceService, careerIntelligenceService } = require('../backend/modules/ai/CareerIntelligenceService');
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

/**
 * In-memory Express request dispatcher without network sockets
 */
function dispatchExpressRequest(app, method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const reqStream = new Readable({
      read() {
        if (payload) {
          this.push(payload);
        }
        this.push(null);
      }
    });

    reqStream.method = method;
    reqStream.url = url;
    reqStream.originalUrl = url;
    reqStream.headers = {
      host: 'localhost:3000',
      'user-agent': 'test-cia-client',
      ...headers
    };
    if (payload) {
      reqStream.headers['content-type'] = 'application/json';
      reqStream.headers['content-length'] = Buffer.byteLength(payload);
    }

    const dummySocket = new Duplex({
      read() {},
      write(chunk, enc, cb) { cb(); }
    });
    dummySocket.remoteAddress = '127.0.0.1';
    dummySocket.encrypted = false;
    reqStream.socket = dummySocket;
    reqStream.connection = dummySocket;

    const res = new http.ServerResponse(reqStream);
    let resBody = '';

    res.write = function (chunk) {
      if (chunk) resBody += chunk.toString();
      return true;
    };

    res.end = function (chunk) {
      if (chunk) resBody += chunk.toString();
      let parsed = null;
      try {
        parsed = JSON.parse(resBody);
      } catch (e) {
        parsed = resBody;
      }
      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders ? res.getHeaders() : {},
        body: parsed,
        rawBody: resBody
      });
    };

    app.handle(reqStream, res, (err) => {
      if (err) reject(err);
      else resolve({ statusCode: 404, body: null });
    });
  });
}

(async () => {
  console.log('================================================================');
  console.log('🧪 Week 7 Day 1: Career Intelligence CIA Mode Test Suite');
  console.log('================================================================');

  const testCandidate = {
    id: 1,
    name: 'Murali',
    experienceYears: 2,
    currentTitle: 'Junior Full Stack Developer',
    skills: {
      'JavaScript': { level: 4 },
      'React': { level: 4 },
      'Node.js': { level: 4 },
      'MySQL': { level: 3 },
      'Docker': { level: 3 },
      'PHP': { level: 4 }
    }
  };

  // --- Test Group 1: Prompt Construction & Socratic Persona ---
  console.log('\n--- Test 1: Socratic Prompt Construction & Persona ---');
  runTest('buildCareerPrompt enforces Lead Career Intelligence Architect persona and JSON schema', () => {
    const service = new CareerIntelligenceService();
    const gapAnalysis = service.calculateSkillGap(testCandidate.skills, 'role_fullstack_lead');
    const { systemPrompt, userPrompt } = service.buildCareerPrompt({
      candidate: testCandidate,
      targetRole: gapAnalysis.targetRole,
      gapAnalysis
    });

    assert(systemPrompt.includes('Lead Career Intelligence Architect'), 'System prompt must specify persona');
    assert(userPrompt.includes('Murali'), 'User prompt must include candidate name');
    assert(userPrompt.includes('Senior Full Stack Engineer'), 'User prompt must include target role');
    assert(userPrompt.includes('Readiness Score:'), 'User prompt must inject readiness score');
    assert(userPrompt.includes('executiveSummary'), 'User prompt must specify JSON contract');
  });

  // --- Test Group 2: Primary Provider Configuration via Groq ---
  console.log('\n--- Test 2: Primary Provider Configuration via Groq ---');
  runTest('Specifies Groq primary model llama-3.3-70b-versatile', () => {
    const service = new CareerIntelligenceService();
    assert.strictEqual(service.groqModel, 'llama-3.3-70b-versatile');
  });

  // --- Test Group 3: Automated Failover to OpenRouter ---
  console.log('\n--- Test 3: Automated Failover to OpenRouter ---');
  runTest('Specifies OpenRouter fallback model meta-llama/llama-3.3-70b-instruct', () => {
    const service = new CareerIntelligenceService();
    assert.strictEqual(service.openRouterModel, 'meta-llama/llama-3.3-70b-instruct');
  });

  await runAsyncTest('Automatically routes to OpenRouter / Fallback on simulated Groq outage', async () => {
    const service = new CareerIntelligenceService();
    const res = await service.generateRecommendations(
      { candidate: testCandidate, targetRoleId: 'role_fullstack_lead' },
      { simulateGroqFailure: true }
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.fallbackUsed, true);
    assert(res.data.executiveSummary.length > 0);
    assert(res.data.actionPlan.length > 0);
  });

  // --- Test Group 4: Local Deterministic Fallback on Dual Cloud Failure ---
  console.log('\n--- Test 4: Local Deterministic Fallback on Dual Cloud Failure ---');
  await runAsyncTest('Engages Local Deterministic Engine when both Groq and OpenRouter fail', async () => {
    const service = new CareerIntelligenceService();
    const res = await service.generateRecommendations(
      { candidate: testCandidate, targetRoleId: 'role_fullstack_lead' },
      { simulateBothFailure: true }
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.fallbackUsed, true);
    assert.strictEqual(res.provider, 'Local Deterministic Engine');
    assert(Array.isArray(res.data.strengths));
    assert(Array.isArray(res.data.moodleCourseRecommendations));
  });

  // --- Test Group 5: Quantitative Skill Gap Formula & Boundaries ---
  console.log('\n--- Test 5: Quantitative Skill Gap Formula & Boundary Tests ---');
  runTest('Zero skill match results in 100% gapScore and HIGH_UPSKILLING_REQUIRED tier', () => {
    const service = new CareerIntelligenceService();
    const res = service.calculateSkillGap({}, 'role_fullstack_lead');

    assert.strictEqual(res.gapScore, 100);
    assert.strictEqual(res.readinessScore, 0);
    assert.strictEqual(res.readinessTier, 'HIGH_UPSKILLING_REQUIRED');
  });

  runTest('Perfect skill match results in 0% gapScore and READY_FOR_HIRE tier', () => {
    const service = new CareerIntelligenceService();
    const perfectSkills = {
      'JavaScript': 5,
      'React': 5,
      'Node.js': 4,
      'MySQL': 4,
      'Docker': 4,
      'PHP': 4,
      'Kubernetes': 3,
      'System Design': 4
    };
    const res = service.calculateSkillGap(perfectSkills, 'role_fullstack_lead');

    assert.strictEqual(res.gapScore, 0);
    assert.strictEqual(res.readinessScore, 100);
    assert.strictEqual(res.readinessTier, 'READY_FOR_HIRE');
  });

  runTest('Partial skills calculate accurate weighted score and itemized deltas', () => {
    const service = new CareerIntelligenceService();
    const res = service.calculateSkillGap(testCandidate.skills, 'role_fullstack_lead');

    assert(res.gapScore > 0 && res.gapScore < 40, `Gap score should be in realistic range, got ${res.gapScore}`);
    assert(res.readinessScore > 60 && res.readinessScore < 100);
    assert.strictEqual(res.skillsAnalyzedCount, 8);

    const sysDesignGap = res.itemizedGaps.find(g => g.skill === 'System Design');
    assert.ok(sysDesignGap, 'System Design gap must be itemized');
    assert.strictEqual(sysDesignGap.candidateLevel, 0);
    assert.strictEqual(sysDesignGap.severity, 'CRITICAL_MISSING');
    assert(sysDesignGap.estimatedRemediationHours > 0);
  });

  // --- Test Group 6: ChromaDB Vector Store Cosine Similarity ---
  console.log('\n--- Test 6: ChromaDB Vector Store Semantic Search Simulation ---');
  runTest('vectorSearch returns ranked matches with cosine similarity scores between 0 and 1', () => {
    const service = new CareerIntelligenceService();
    const matches = service.vectorSearch('React Node.js Docker full stack', 3);

    assert(Array.isArray(matches));
    assert(matches.length > 0);
    assert(matches[0].similarityScore >= 0.70 && matches[0].similarityScore <= 1.0);
    assert.strictEqual(matches[0].roleId, 'role_fullstack_lead');
  });

  // --- Test Group 7: Strict JSON Schema Validation ---
  console.log('\n--- Test 7: Strict JSON Schema Validation Invariants ---');
  runTest('validateRecommendationStructure accepts valid payloads and rejects malformed objects', () => {
    const service = new CareerIntelligenceService();
    const valid = {
      executiveSummary: 'Great progress',
      readinessTier: 'NEAR_TARGET',
      strengths: ['React'],
      criticalGaps: ['Kubernetes'],
      actionPlan: [{ priority: 1, skill: 'K8s', action: 'Build cluster', estimatedHours: 20 }],
      moodleCourseRecommendations: [{ courseId: 103, title: 'DevOps', rationale: 'Learn CI' }],
      interviewStrategy: ['Explain architecture']
    };
    assert.strictEqual(service.validateRecommendationStructure(valid), true);

    assert.throws(() => service.validateRecommendationStructure(null), /Recommendation payload must be an object/);
    assert.throws(() => service.validateRecommendationStructure({ executiveSummary: 'Test' }), /Missing required key/);
    assert.throws(() => service.validateRecommendationStructure({ ...valid, strengths: [] }), /strengths must be a non-empty array/);
  });

  // --- Test Group 8: Laravel Architecture Parity ---
  console.log('\n--- Test 8: Laravel Controller, Blade Template & Web Routes Parity ---');
  runTest('app/Http/Controllers/Web/CiaController.php exists and defines required controller methods', () => {
    const controllerPath = path.resolve(__dirname, '../app/Http/Controllers/Web/CiaController.php');
    assert(fs.existsSync(controllerPath), 'CiaController.php must exist');
    const content = fs.readFileSync(controllerPath, 'utf8');

    assert(content.includes('class CiaController'), 'Must define CiaController');
    assert(content.includes('function index'), 'Must define index method');
    assert(content.includes('function analyzeGap'), 'Must define analyzeGap method');
    assert(content.includes('function getRecommendations'), 'Must define getRecommendations method');
    assert(content.includes('function vectorSearch'), 'Must define vectorSearch method');
    assert(content.includes('function health'), 'Must define health method');
  });

  runTest('resources/views/candidate/cia.blade.php exists and contains required UI panels & ARIA live region', () => {
    const bladePath = path.resolve(__dirname, '../resources/views/candidate/cia.blade.php');
    assert(fs.existsSync(bladePath), 'cia.blade.php must exist');
    const content = fs.readFileSync(bladePath, 'utf8');

    assert(content.includes('Career Intelligence Advisor (CIA Mode)'), 'Must include header title');
    assert(content.includes('id="target-role-select"'), 'Must include target role selector');
    assert(content.includes('id="cia-readiness-circle"'), 'Must include readiness score circle');
    assert(content.includes('Quantitative Skill Gap Matrix'), 'Must include skill gap matrix');
    assert(content.includes('aria-live="polite"'), 'Must include ARIA live region');
    assert(content.includes('role="status"'), 'Must include status role for accessibility');
  });

  runTest('routes/web.php exists and registers CIA web routes', () => {
    const routesPath = path.resolve(__dirname, '../routes/web.php');
    assert(fs.existsSync(routesPath), 'routes/web.php must exist');
    const content = fs.readFileSync(routesPath, 'utf8');

    assert(content.includes("Route::prefix('candidate/cia')"), 'Must define candidate/cia prefix');
    assert(content.includes("[CiaController::class, 'index']"), 'Must map index route');
    assert(content.includes("[CiaController::class, 'analyzeGap']"), 'Must map analyzeGap route');
    assert(content.includes("[CiaController::class, 'getRecommendations']"), 'Must map recommendations route');
    assert(content.includes("[CiaController::class, 'vectorSearch']"), 'Must map vectorSearch route');
  });

  // --- Test Group 9: Express REST API Endpoints Integration ---
  console.log('\n--- Test 9: Express REST API Endpoints Integration ---');

  await runAsyncTest('GET /api/cia/health returns 200 with operational status and provider telemetry', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/cia/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'operational');
    assert.strictEqual(res.body.primaryProvider.provider, 'Groq');
    assert.strictEqual(res.body.fallbackProvider.provider, 'OpenRouter');
    assert.strictEqual(res.body.vectorStore.provider, 'ChromaDB');
  });

  await runAsyncTest('GET /api/cia/roles returns 200 with available target roles', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/cia/roles');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.roles));
    assert(res.body.roles.length >= 3);
  });

  await runAsyncTest('POST /api/cia/analyze-gap returns 200 with calculated gap metrics', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/cia/analyze-gap', {
      candidateSkills: testCandidate.skills,
      targetRoleId: 'role_fullstack_lead'
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.gapAnalysis.gapScore >= 0);
    assert(res.body.gapAnalysis.itemizedGaps.length > 0);
  });

  await runAsyncTest('POST /api/cia/analyze-gap returns 400 when targetRoleId is missing', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/cia/analyze-gap', {
      candidateSkills: testCandidate.skills
    });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  await runAsyncTest('POST /api/cia/recommendations returns 200 with AI recommendations', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/cia/recommendations', {
      candidate: testCandidate,
      targetRoleId: 'role_fullstack_lead',
      simulateBothFailure: true
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.executiveSummary.length > 0);
    assert(res.body.data.actionPlan.length > 0);
  });

  await runAsyncTest('POST /api/cia/vector-search returns 200 with ChromaDB matches', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/cia/vector-search', {
      query: 'Full Stack React Node.js',
      limit: 2
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.vectorStore, 'ChromaDB');
    assert.strictEqual(res.body.matches.length, 2);
  });

  // Summary
  console.log('\n================================================================');
  if (passedTests === totalTests) {
    console.log(`🎉 [SUCCESS] All ${totalTests} Week 7 Day 1 Career Intelligence Tests Passed!`);
  } else {
    console.error(`❌ [FAILED] ${totalTests - passedTests} of ${totalTests} tests failed.`);
    process.exitCode = 1;
  }
  console.log('================================================================\n');
})();
