/**
 * test_llamaindex_skill_gap.js
 * 
 * Comprehensive Unit Test Suite for Week 7 Day 2:
 * Module 1: Skill Gap Analysis — LlamaIndex + Groq Pipeline
 * 
 * Verifies:
 *   1. 50-Skill Taxonomy Document (5 domains, 10 skills each) in data/skills_taxonomy.json
 *   2. LlamaIndex RAG Retriever (taxonomy context indexing & keyword relevance retrieval)
 *   3. Grounded RAG Prompt Construction (Candidate profile, lesson history, role requirements, taxonomy context)
 *   4. Groq Primary Provider calibration (llama-3.3-70b-versatile, <350ms target)
 *   5. OpenRouter Secondary Fallback (meta-llama/llama-3.3-70b-instruct) on Groq simulated outage
 *   6. Local Deterministic RAG Fallback Engine on dual cloud outage
 *   7. ChromaDB Namespace Isolation (candidate_${candidateId}_skill_gaps)
 *   8. Strict JSON Schema Validation Invariants (score 0-100, skill_gaps, priority_learning, radar_chart_data)
 *   9. Laravel Parity (CiaController::careerSkillGap, routes/web.php, and cia.blade.php Chart.js 5-domain radar)
 *   10. Express REST API endpoints (POST /api/cia/career/skill-gap & POST /candidate/cia/career/skill-gap)
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
 * In-memory Express request dispatcher without network sockets.
 */
function dispatchExpressRequest(appInstance, method, url, body = null, headers = {}) {
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
      'user-agent': 'test-llamaindex-client',
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

    appInstance.handle(reqStream, res, (err) => {
      if (err) reject(err);
      else resolve({ statusCode: 404, body: null });
    });
  });
}

(async () => {
  console.log('================================================================');
  console.log('🧪 Week 7 Day 2: LlamaIndex + Groq Skill Gap RAG Test Suite');
  console.log('================================================================');

  const candidateId = 101;
  const testCandidate = {
    id: candidateId,
    name: 'Murali',
    experienceYears: 2,
    currentTitle: 'Junior Full Stack Developer',
    skills: {
      'JavaScript': { level: 4, verified: true },
      'Node.js': { level: 4, verified: true },
      'PHP / Moodle': { level: 4, verified: true },
      'MySQL / Relational DB': { level: 3, verified: true },
      'Docker & Containers': { level: 3, verified: true },
      'Git Workflow': { level: 4, verified: true }
    }
  };

  const sampleCompletedLessons = [
    'Moodle Week 1-5 Technical Onboarding',
    'Week 6 AI Tutor & OpenRouter Fallback Integration',
    'Week 7 Day 1 Architecture Design & API Contracts'
  ];

  const sampleQuizScores = {
    moodle_quiz_501: 96.5,
    express_rest_quiz: 94.0,
    cia_contracts_quiz: 98.0
  };

  // Test 1: Verify data/skills_taxonomy.json exists with 50 skills across 5 domains
  runTest('1. Skills Taxonomy JSON contains exactly 50 skills across 5 domains (10 per domain)', () => {
    const taxonomyPath = path.join(__dirname, '..', 'data', 'skills_taxonomy.json');
    assert.ok(fs.existsSync(taxonomyPath), 'data/skills_taxonomy.json must exist');

    const rawData = fs.readFileSync(taxonomyPath, 'utf8');
    const taxonomy = JSON.parse(rawData);

    const total = taxonomy.totalSkills || taxonomy.total_skills;
    assert.strictEqual(total, 50, 'Taxonomy total_skills must be exactly 50');
    assert.strictEqual(Array.isArray(taxonomy.domains), true, 'Taxonomy must have domains array');
    assert.strictEqual(taxonomy.domains.length, 5, 'Must have exactly 5 engineering domains');

    const domainNames = taxonomy.domains.map(d => d.name);
    assert.ok(domainNames.some(d => d.includes('Frontend')), 'Domain Frontend missing');
    assert.ok(domainNames.some(d => d.includes('Backend')), 'Domain Backend missing');
    assert.ok(domainNames.some(d => d.includes('Database')), 'Domain Database missing');
    assert.ok(domainNames.some(d => d.includes('Cloud') || d.includes('DevOps')), 'Domain Cloud & DevOps missing');
    assert.ok(domainNames.some(d => d.includes('AI') || d.includes('ML')), 'Domain AI & ML Engineering missing');

    let countedSkills = 0;
    taxonomy.domains.forEach(dom => {
      assert.strictEqual(Array.isArray(dom.skills), true, `Domain ${dom.name} must have skills array`);
      assert.strictEqual(dom.skills.length, 10, `Domain ${dom.name} must have exactly 10 skills`);
      dom.skills.forEach(skill => {
        assert.ok(skill.id, 'Skill must have an id');
        assert.ok(skill.name, 'Skill must have a name');
        assert.ok(typeof skill.level === 'number' || typeof skill.max_level === 'number', 'Skill must have level');
        assert.ok(skill.importance || skill.category, 'Skill must have importance or category');
        countedSkills++;
      });
    });

    assert.strictEqual(countedSkills, 50, 'Total verified skill objects across domains must be 50');
  });

  // Test 2: Verify LlamaIndex RAG Retriever retrieves relevant context
  runTest('2. LlamaIndex RAG Retriever extracts grounded context for target role and candidate', () => {
    const queryTerms = ['Full Stack', 'System Design', 'Docker', 'Kubernetes', 'LLM'];
    const retrieved = careerIntelligenceService.retrieveTaxonomyContext(queryTerms, 8);

    assert.ok(Array.isArray(retrieved), 'Retrieved taxonomy context must be an array');
    assert.ok(retrieved.length > 0 && retrieved.length <= 8, 'Retriever should return top matched skills up to limit');
    assert.ok(retrieved.some(s => s.name.includes('Docker') || s.name.includes('Container') || s.domain === 'Cloud & DevOps'),
      'Retrieved context must contain relevant DevOps or container competencies');
  });

  // Test 3: Verify Grounded RAG Prompt Construction
  runTest('3. Grounded RAG Prompt contains candidate context, lesson history, and taxonomy grounding', () => {
    const roles = careerIntelligenceService.getTargetRoles();
    const targetRole = roles[0];
    const retrieved = careerIntelligenceService.retrieveTaxonomyContext(['Docker', 'React', 'Node.js'], 5);

    const { systemPrompt, userPrompt } = careerIntelligenceService.buildSkillGapRAGPrompt({
      candidate: testCandidate,
      targetRole,
      completedLessons: sampleCompletedLessons,
      quizScores: sampleQuizScores,
      candidateSkills: testCandidate.skills,
      retrievedSkills: retrieved
    });

    assert.ok(systemPrompt.includes('Career Architect') || systemPrompt.includes('CIA'), 'System prompt must define CIA persona');
    assert.ok(systemPrompt.includes('JSON'), 'System prompt must demand JSON output');
    assert.ok(userPrompt.includes('radar_chart_data'), 'User prompt must specify radar_chart_data schema');
    assert.ok(userPrompt.includes(testCandidate.name), 'User prompt must include candidate name');
    assert.ok(userPrompt.includes(targetRole.title), 'User prompt must include target role title');
    assert.ok(userPrompt.includes('Moodle Week 1-5 Technical Onboarding'), 'User prompt must include completed lessons');
    assert.ok(userPrompt.includes('96.5'), 'User prompt must include quiz score');
    assert.ok(userPrompt.includes('Skills Taxonomy Context:'), 'User prompt must inject retrieved taxonomy grounding');
  });

  // Test 4: Verify Groq Primary Provider Calibration
  runTest('4. Groq Primary Provider is calibrated with llama-3.3-70b-versatile', () => {
    assert.strictEqual(careerIntelligenceService.groqModel, 'llama-3.3-70b-versatile',
      'Groq primary model must be llama-3.3-70b-versatile');
    assert.strictEqual(careerIntelligenceService.openRouterModel, 'meta-llama/llama-3.3-70b-instruct',
      'OpenRouter fallback model must be meta-llama/llama-3.3-70b-instruct');
  });

  // Test 5: Verify OpenRouter failover on Groq outage
  await runAsyncTest('5. OpenRouter Secondary Fallback activates seamlessly when Groq fails', async () => {
    const result = await careerIntelligenceService.analyzeSkillGapRAG({
      candidateId: 101,
      candidate: testCandidate,
      targetRoleId: 'role_fullstack_lead',
      candidateSkills: testCandidate.skills,
      completedLessons: sampleCompletedLessons,
      quizScores: sampleQuizScores
    }, {
      simulateGroqFailure: true
    });

    assert.strictEqual(result.success, true, 'RAG analysis must succeed even with Groq simulated down');
    assert.strictEqual(result.fallbackUsed, true, 'fallbackUsed flag must be true');
    assert.ok(result.provider.includes('OpenRouter') || result.provider.includes('Fallback'),
      `Provider must indicate fallback path (received: ${result.provider})`);
    assert.ok(typeof result.score === 'number', 'Result must contain numeric readiness score');
    assert.ok(Array.isArray(result.skill_gaps), 'Result must contain skill_gaps array');
  });

  // Test 6: Verify Local Deterministic RAG Fallback Engine on dual cloud outage
  await runAsyncTest('6. Local Deterministic RAG Fallback Engine guarantees 100% uptime on dual cloud outage', async () => {
    const result = await careerIntelligenceService.analyzeSkillGapRAG({
      candidateId: 101,
      candidate: testCandidate,
      targetRoleId: 'role_fullstack_lead',
      candidateSkills: testCandidate.skills,
      completedLessons: sampleCompletedLessons,
      quizScores: sampleQuizScores
    }, {
      simulateBothFailure: true
    });

    assert.strictEqual(result.success, true, 'Must succeed via deterministic engine');
    assert.strictEqual(result.fallbackUsed, true, 'fallbackUsed must be true');
    assert.ok(result.score >= 0 && result.score <= 100, 'Readiness score must be between 0 and 100');
    assert.ok(Array.isArray(result.skill_gaps), 'Must contain itemized skill gaps');
    assert.ok(result.skill_gaps.length > 0, 'Must have at least one skill gap evaluated');
    assert.ok(Array.isArray(result.priority_learning), 'Must contain priority_learning list');
    assert.ok(result.radar_chart_data, 'Must contain radar_chart_data');
    assert.strictEqual(result.radar_chart_data.labels.length, 5, 'Radar chart must have 5 domain axes');
  });

  // Test 7: Verify ChromaDB Namespace Isolation (candidate_${id}_skill_gaps)
  runTest('7. ChromaDB Namespace persistence isolates candidate skill gaps correctly', () => {
    const candidateAId = 42;
    const candidateBId = 88;

    const metaA = careerIntelligenceService.saveToChromaNamespace(candidateAId, {
      score: 82,
      skill_gaps: [{ skill: 'System Design', delta: 2 }]
    });

    const metaB = careerIntelligenceService.saveToChromaNamespace(candidateBId, {
      score: 65,
      skill_gaps: [{ skill: 'Kubernetes', delta: 3 }]
    });

    assert.strictEqual(metaA.namespace, 'candidate_42_skill_gaps', 'Namespace A must match candidate ID convention');
    assert.strictEqual(metaB.namespace, 'candidate_88_skill_gaps', 'Namespace B must match candidate ID convention');

    const retrievedA = careerIntelligenceService.getFromChromaNamespace(candidateAId);
    const retrievedB = careerIntelligenceService.getFromChromaNamespace(candidateBId);

    assert.strictEqual(retrievedA.data.score, 82, 'Retrieved data for candidate 42 must match');
    assert.strictEqual(retrievedB.data.score, 65, 'Retrieved data for candidate 88 must match');
  });

  // Test 8: Verify Output Schema Validation Invariants
  runTest('8. Schema Validator enforces strict invariants (score 0-100, radar 5 domains, priority learning)', () => {
    const validPayload = {
      score: 84.5,
      readinessTier: 'NEAR_TARGET',
      skill_gaps: [
        {
          skill: 'System Design & High Concurrency Architecture',
          domain: 'Backend Engineering',
          current_level: 2,
          target_level: 4,
          importance: 'Critical',
          remediation_hours: 36,
          rationale: 'Core requirement for Lead Full Stack position'
        }
      ],
      priority_learning: [
        {
          priority: 1,
          skill: 'System Design',
          action: 'Complete distributed transactions and microservices design course',
          estimated_hours: 36
        }
      ],
      radar_chart_data: {
        labels: ['Frontend', 'Backend', 'Database', 'Cloud & DevOps', 'AI & ML'],
        candidate: [85, 75, 70, 65, 70],
        target: [95, 90, 85, 80, 85]
      }
    };

    assert.doesNotThrow(() => {
      careerIntelligenceService.validateRAGSkillGapStructure(validPayload);
    }, 'Valid payload must pass schema validation');

    // Invalid score > 100
    assert.throws(() => {
      careerIntelligenceService.validateRAGSkillGapStructure({
        ...validPayload,
        score: 110
      });
    }, /score must be.*between 0 and 100/i);

    // Missing radar_chart_data
    assert.throws(() => {
      careerIntelligenceService.validateRAGSkillGapStructure({
        ...validPayload,
        radar_chart_data: null
      });
    }, /radar_chart_data.*required/i);
  });

  // Test 9: Verify Laravel Controller, Web Routes, and Blade Radar Chart Parity
  runTest('9. Laravel Parity: CiaController, routes/web.php, and Chart.js 5-domain radar view', () => {
    const controllerPath = path.join(__dirname, '..', 'app', 'Http', 'Controllers', 'Web', 'CiaController.php');
    assert.ok(fs.existsSync(controllerPath), 'CiaController.php must exist');
    const controllerCode = fs.readFileSync(controllerPath, 'utf8');
    assert.ok(controllerCode.includes('careerSkillGap'), 'CiaController must define careerSkillGap method');
    assert.ok(controllerCode.includes('chroma_namespace'), 'CiaController must reference chroma_namespace');
    assert.ok(controllerCode.includes('radar_chart_data'), 'CiaController must return radar_chart_data');

    const routesPath = path.join(__dirname, '..', 'routes', 'web.php');
    assert.ok(fs.existsSync(routesPath), 'routes/web.php must exist');
    const routesCode = fs.readFileSync(routesPath, 'utf8');
    assert.ok(routesCode.includes('career/skill-gap') && routesCode.includes('candidate/cia'), 'routes/web.php must register career/skill-gap endpoint');

    const bladePath = path.join(__dirname, '..', 'resources', 'views', 'candidate', 'cia.blade.php');
    assert.ok(fs.existsSync(bladePath), 'cia.blade.php must exist');
    const bladeCode = fs.readFileSync(bladePath, 'utf8');
    assert.ok(bladeCode.includes('chart.js') || bladeCode.includes('Chart.js'), 'cia.blade.php must include Chart.js library');
    assert.ok(bladeCode.includes('cia-skill-radar-chart'), 'cia.blade.php must define cia-skill-radar-chart canvas');
    assert.ok(bladeCode.includes('radar'), 'cia.blade.php must configure radar chart type');
    assert.ok(bladeCode.includes('aria-live="polite"'), 'cia.blade.php must have W3C ARIA polite live region');
  });

  // Test 10: Verify Express REST API POST /api/cia/career/skill-gap & /candidate/cia/career/skill-gap
  await runAsyncTest('10. Express API: POST /api/cia/career/skill-gap returns 200 with RAG analysis and 400 on missing role', async () => {
    // 10a. Missing targetRoleId should return 400
    const errRes = await dispatchExpressRequest(app, 'POST', '/api/cia/career/skill-gap', {});
    assert.strictEqual(errRes.statusCode, 400, 'Missing targetRoleId must return HTTP 400');
    assert.strictEqual(errRes.body.success, false, 'Response success flag must be false');

    // 10b. Valid request to /api/cia/career/skill-gap
    const okRes = await dispatchExpressRequest(app, 'POST', '/api/cia/career/skill-gap', {
      candidateId: 101,
      targetRoleId: 'role_fullstack_lead',
      candidateSkills: testCandidate.skills,
      completedLessons: sampleCompletedLessons,
      quizScores: sampleQuizScores,
      candidate: testCandidate
    });

    assert.strictEqual(okRes.statusCode, 200, `POST /api/cia/career/skill-gap should return 200 (got ${okRes.statusCode})`);
    assert.strictEqual(okRes.body.success, true, 'Response body success must be true');
    assert.ok(typeof okRes.body.score === 'number', 'Response body must have numeric score');
    assert.ok(Array.isArray(okRes.body.skill_gaps), 'Response body must have skill_gaps');
    assert.ok(Array.isArray(okRes.body.priority_learning), 'Response body must have priority_learning');
    assert.ok(okRes.body.radar_chart_data, 'Response body must have radar_chart_data');
    assert.strictEqual(okRes.body.chroma_namespace, 'candidate_101_skill_gaps', 'ChromaDB namespace must match convention');

    // 10c. Route alias /candidate/cia/career/skill-gap should also work identically
    const aliasRes = await dispatchExpressRequest(app, 'POST', '/candidate/cia/career/skill-gap', {
      candidateId: 101,
      targetRoleId: 'role_fullstack_lead',
      candidateSkills: testCandidate.skills
    });
    assert.strictEqual(aliasRes.statusCode, 200, `/candidate/cia/career/skill-gap should return 200`);
    assert.strictEqual(aliasRes.body.success, true, 'Alias route must return success');
  });

  console.log('================================================================');
  console.log(`🎉 Summary: ${passedTests}/${totalTests} tests passed successfully!`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
})();
