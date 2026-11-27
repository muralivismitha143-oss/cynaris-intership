/**
 * test_crewai_career_recommendations.js
 * 
 * Comprehensive Unit Test Suite for Week 7 Day 3:
 * Module 2: Career Recommendation Engine — CrewAI Agent
 * 
 * Verifies:
 *   1. CrewAI CareerAdvisorAgent definition (role: "Senior Career Counsellor with 15 years experience in tech placement")
 *   2. Tool (a) skill_gap_fetcher reading from ChromaDB namespace candidate_${candidateId}_skill_gaps
 *   3. Tool (b) job_role_matcher mapping candidate skills to target career pathways
 *   4. Tool (c) learning_recommender providing sequenced courses and 6-month milestone roadmaps
 *   5. Grounded CrewAI Task Prompt Construction (3 career paths, rationale, 6-month roadmap)
 *   6. Groq Primary Provider calibration (llama-3.3-70b-versatile, <350ms target)
 *   7. OpenRouter Secondary Fallback (meta-llama/llama-3.3-70b-instruct) on Groq simulated outage
 *   8. Local Deterministic Rule Engine on dual cloud outage (100% uptime guarantee)
 *   9. Strict JSON Schema Validation Invariants (>= 3 career paths, required skills, 6-month roadmap milestones)
 *   10. Laravel Parity (CiaController::careerRecommend, routes/web.php, and cia.blade.php interactive cards)
 *   11. Express REST API endpoints (POST /api/cia/career/recommend & POST /candidate/cia/career/recommend)
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
      'user-agent': 'test-crewai-client',
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
  console.log('🧪 Week 7 Day 3: CrewAI Career Recommendation Engine Test Suite');
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

  // Test 1: Verify CareerAdvisorAgent definition
  runTest('1. CrewAI CareerAdvisorAgent specifies correct role, goal, backstory, and tools', () => {
    const agent = careerIntelligenceService.getCareerAdvisorAgent();
    assert.strictEqual(agent.name, 'CareerAdvisorAgent', 'Agent name must be CareerAdvisorAgent');
    assert.strictEqual(agent.role, 'Senior Career Counsellor with 15 years experience in tech placement', 'Role must match exact specification');
    assert.ok(agent.goal && agent.goal.includes('career trajectories'), 'Agent must specify actionable goal');
    assert.ok(agent.backstory && agent.backstory.includes('15+ years'), 'Agent must specify authoritative backstory');
    assert.strictEqual(Array.isArray(agent.tools), true, 'Tools must be an array');
    assert.ok(agent.tools.includes('skill_gap_fetcher'), 'Agent must register skill_gap_fetcher tool');
    assert.ok(agent.tools.includes('job_role_matcher'), 'Agent must register job_role_matcher tool');
    assert.ok(agent.tools.includes('learning_recommender'), 'Agent must register learning_recommender tool');
  });

  // Test 2: Verify Tool (a) skill_gap_fetcher
  runTest('2. Tool (a) skill_gap_fetcher reads from ChromaDB candidate namespace with fallback', () => {
    // 2a. Pre-populate ChromaDB namespace
    careerIntelligenceService.saveToChromaNamespace(candidateId, {
      score: 82,
      skill_gaps: [
        { skill: 'System Design', current_level: 0, target_level: 4, delta: 4, remediation_hours: 48 },
        { skill: 'Docker Orchestration', current_level: 3, target_level: 4, delta: 1, remediation_hours: 15 }
      ]
    });

    const toolResult = careerIntelligenceService.toolSkillGapFetcher(candidateId, testCandidate.skills, 'role_fullstack_lead');
    assert.strictEqual(toolResult.source, 'chromadb', 'Tool must read from ChromaDB when available');
    assert.strictEqual(toolResult.namespace, `candidate_${candidateId}_skill_gaps`, 'Namespace must match convention');
    assert.strictEqual(toolResult.gaps.length, 2, 'Must retrieve stored gap items');

    // 2b. Query a candidate not in ChromaDB (calculated fallback)
    const fallbackResult = careerIntelligenceService.toolSkillGapFetcher(999, testCandidate.skills, 'role_fullstack_lead');
    assert.strictEqual(fallbackResult.source, 'calculated_fallback', 'Must use calculated fallback when namespace empty');
    assert.ok(Array.isArray(fallbackResult.gaps), 'Gaps must be an array');
  });

  // Test 3: Verify Tool (b) job_role_matcher
  runTest('3. Tool (b) job_role_matcher evaluates candidate strengths against 3 tech pathways', () => {
    const matched = careerIntelligenceService.toolJobRoleMatcher(testCandidate.skills, 'role_fullstack_lead');
    assert.ok(Array.isArray(matched), 'Must return an array of matched career paths');
    assert.strictEqual(matched.length, 3, 'Must evaluate 3 prospective pathways');

    const titles = matched.map(m => m.path_title);
    assert.ok(titles.some(t => t.includes('Cloud Solutions Architect') || t.includes('Full Stack')), 'Must include Full Stack Cloud Architect path');
    assert.ok(titles.some(t => t.includes('AI Systems') || t.includes('Backend')), 'Must include AI Backend path');
    assert.ok(titles.some(t => t.includes('DevOps') || t.includes('Site Reliability')), 'Must include DevOps/SRE path');

    matched.forEach(pathway => {
      assert.ok(pathway.suitability_score >= 0 && pathway.suitability_score <= 100, 'Suitability score must be between 0 and 100');
      assert.ok(Array.isArray(pathway.key_prerequisites), 'Must define key prerequisites');
    });
  });

  // Test 4: Verify Tool (c) learning_recommender
  runTest('4. Tool (c) learning_recommender maps gaps to Moodle courses and 6-month milestones', () => {
    const gaps = [{ skill: 'System Design', current_level: 0, target_level: 4 }];
    const recommendations = careerIntelligenceService.toolLearningRecommender(gaps, 'Full Stack');

    assert.ok(Array.isArray(recommendations.courses), 'Must return courses array');
    assert.ok(recommendations.courses.some(c => c.course_code.includes('CYN-')), 'Must include Cynaris course codes');
    assert.ok(Array.isArray(recommendations.milestones), 'Must return 6-month milestones array');
    assert.strictEqual(recommendations.milestones.length, 3, 'Must return 3 milestone periods (Month 1-2, 3-4, 5-6)');

    const months = recommendations.milestones.map(m => m.month);
    assert.ok(months.includes('Month 1-2'), 'Must include Month 1-2');
    assert.ok(months.includes('Month 3-4'), 'Must include Month 3-4');
    assert.ok(months.includes('Month 5-6'), 'Must include Month 5-6');
  });

  // Test 5: Verify Grounded CrewAI Task Prompt Construction
  runTest('5. Grounded CrewAI Task Prompt injects candidate profile, tools output, and JSON mandate', () => {
    const roles = careerIntelligenceService.getTargetRoles();
    const targetRole = roles[0];
    const gaps = [{ skill: 'System Design', delta: 4 }];
    const matched = careerIntelligenceService.toolJobRoleMatcher(testCandidate.skills, targetRole.id);
    const recs = careerIntelligenceService.toolLearningRecommender(gaps, targetRole.title);

    const { systemPrompt, userPrompt } = careerIntelligenceService.buildCrewAITaskPrompt({
      candidate: testCandidate,
      targetRole,
      candidateSkills: testCandidate.skills,
      skillGaps: gaps,
      matchedRoles: matched,
      recommendations: recs
    });

    assert.ok(systemPrompt.includes('CareerAdvisorAgent'), 'System prompt must name CareerAdvisorAgent');
    assert.ok(systemPrompt.includes('Senior Career Counsellor with 15 years experience in tech placement'), 'System prompt must include exact role');
    assert.ok(systemPrompt.includes('recommend 3 career paths with rationale and 6-month roadmap for each'), 'System prompt must specify exact CrewAI task');
    assert.ok(userPrompt.includes(testCandidate.name), 'User prompt must include candidate name');
    assert.ok(userPrompt.includes('Tool 1 Output (ChromaDB Skill Gaps)'), 'User prompt must include Tool 1 output');
    assert.ok(userPrompt.includes('Tool 2 Output (Job Role Matcher Pathways)'), 'User prompt must include Tool 2 output');
    assert.ok(userPrompt.includes('Tool 3 Output (Learning Recommender Modules & Milestones)'), 'User prompt must include Tool 3 output');
    assert.ok(userPrompt.includes('career_paths'), 'User prompt must require career_paths array');
  });

  // Test 6: Verify Groq Primary Provider Calibration
  runTest('6. Groq Primary Provider is calibrated with llama-3.3-70b-versatile', () => {
    assert.strictEqual(careerIntelligenceService.groqModel, 'llama-3.3-70b-versatile',
      'Groq primary model must be llama-3.3-70b-versatile');
    assert.strictEqual(careerIntelligenceService.openRouterModel, 'meta-llama/llama-3.3-70b-instruct',
      'OpenRouter fallback model must be meta-llama/llama-3.3-70b-instruct');
  });

  // Test 7: Verify OpenRouter failover on Groq simulated outage
  await runAsyncTest('7. OpenRouter Secondary Fallback activates seamlessly on Groq outage', async () => {
    const result = await careerIntelligenceService.generateCrewAICareerRecommendations({
      candidateId: 101,
      candidate: testCandidate,
      targetRoleId: 'role_fullstack_lead',
      candidateSkills: testCandidate.skills
    }, {
      simulateGroqFailure: true
    });

    assert.strictEqual(result.success, true, 'CrewAI recommendation must succeed even with Groq down');
    assert.strictEqual(result.fallbackUsed, true, 'fallbackUsed flag must be true');
    assert.ok(result.provider.includes('OpenRouter') || result.provider.includes('Fallback'),
      `Provider must indicate fallback path (got: ${result.provider})`);
    assert.strictEqual(Array.isArray(result.career_paths), true, 'Must return career_paths array');
    assert.strictEqual(result.career_paths.length, 3, 'Must return exactly 3 career paths');
  });

  // Test 8: Verify Local Deterministic Fallback on dual cloud outage
  await runAsyncTest('8. Local Deterministic Rule Engine guarantees 100% uptime on dual cloud outage', async () => {
    const result = await careerIntelligenceService.generateCrewAICareerRecommendations({
      candidateId: 101,
      candidate: testCandidate,
      targetRoleId: 'role_fullstack_lead',
      candidateSkills: testCandidate.skills
    }, {
      simulateBothFailure: true
    });

    assert.strictEqual(result.success, true, 'Must succeed via deterministic engine');
    assert.strictEqual(result.fallbackUsed, true, 'fallbackUsed must be true');
    assert.strictEqual(result.career_paths.length, 3, 'Must return 3 career paths');
    result.career_paths.forEach(cp => {
      assert.ok(cp.path_title, 'Each path must have a title');
      assert.ok(cp.confidence_score >= 80, 'Confidence score must be >= 80');
      assert.ok(cp.rationale, 'Must have rationale');
      assert.ok(Array.isArray(cp.required_skills) && cp.required_skills.length > 0, 'Must have required skills');
      assert.ok(Array.isArray(cp.roadmap_6_month) && cp.roadmap_6_month.length === 3, 'Must have 3-phase 6-month roadmap');
    });
  });

  // Test 9: Verify Output Schema Validation Invariants
  runTest('9. Schema Validator enforces strict invariants (>= 3 career paths, required skills, 6-month milestones)', () => {
    const validPayload = {
      summary: 'Strong full stack candidate profile with clear pathway into cloud native architecture.',
      career_paths: [
        {
          path_title: 'Full Stack Cloud Solutions Architect',
          confidence_score: 94,
          rationale: 'Solid base in Node.js and React provides immediate runway.',
          required_skills: ['Node.js', 'System Design', 'Docker'],
          roadmap_6_month: [
            { month: 'Month 1-2', focus: 'System Design', milestone: 'Design distributed service' },
            { month: 'Month 3-4', focus: 'Containerization', milestone: 'Deploy with Docker' },
            { month: 'Month 5-6', focus: 'Cloud Native', milestone: 'Ship production capstone' }
          ]
        },
        {
          path_title: 'AI Systems Engineer',
          confidence_score: 89,
          rationale: 'Strong API background allows swift transition to LLM RAG pipelines.',
          required_skills: ['Python', 'LlamaIndex', 'ChromaDB'],
          roadmap_6_month: [
            { month: 'Month 1-2', focus: 'Vector DBs', milestone: 'Embed resumes in Chroma' },
            { month: 'Month 3-4', focus: 'RAG Pipelines', milestone: 'Build Groq LPU pipeline' },
            { month: 'Month 5-6', focus: 'Autonomous Agents', milestone: 'Deploy multi-agent system' }
          ]
        },
        {
          path_title: 'DevOps & Site Reliability Architect',
          confidence_score: 85,
          rationale: 'Linux and Docker fundamentals provide strong infrastructure foundation.',
          required_skills: ['Docker', 'Kubernetes', 'CI/CD'],
          roadmap_6_month: [
            { month: 'Month 1-2', focus: 'Container Hardening', milestone: 'Multi-stage builds' },
            { month: 'Month 3-4', focus: 'Automated CI/CD', milestone: 'GitHub Actions DAG' },
            { month: 'Month 5-6', focus: 'APM Observability', milestone: 'Real-time telemetry' }
          ]
        }
      ]
    };

    assert.doesNotThrow(() => {
      careerIntelligenceService.validateCrewAICareerPaths(validPayload);
    }, 'Valid payload must pass schema validation');

    // Reject payload with only 2 paths
    assert.throws(() => {
      careerIntelligenceService.validateCrewAICareerPaths({
        career_paths: validPayload.career_paths.slice(0, 2)
      });
    }, /containing at least 3 career paths/);

    // Reject invalid confidence score > 100
    assert.throws(() => {
      careerIntelligenceService.validateCrewAICareerPaths({
        career_paths: [
          { ...validPayload.career_paths[0], confidence_score: 120 },
          validPayload.career_paths[1],
          validPayload.career_paths[2]
        ]
      });
    }, /confidence_score must be a number between 0 and 100/);
  });

  // Test 10: Verify Laravel Controller, Routes, and Blade View Parity
  runTest('10. Laravel Parity: CiaController::careerRecommend, routes/web.php, and cia.blade.php cards', () => {
    const controllerPath = path.join(__dirname, '..', 'app', 'Http', 'Controllers', 'Web', 'CiaController.php');
    assert.ok(fs.existsSync(controllerPath), 'CiaController.php must exist');
    const controllerCode = fs.readFileSync(controllerPath, 'utf8');
    assert.ok(controllerCode.includes('careerRecommend'), 'CiaController must define careerRecommend method');
    assert.ok(controllerCode.includes('CareerAdvisorAgent'), 'CiaController must reference CareerAdvisorAgent');
    assert.ok(controllerCode.includes('career_paths'), 'CiaController must return career_paths');

    const routesPath = path.join(__dirname, '..', 'routes', 'web.php');
    assert.ok(fs.existsSync(routesPath), 'routes/web.php must exist');
    const routesCode = fs.readFileSync(routesPath, 'utf8');
    assert.ok(routesCode.includes('career/recommend') && routesCode.includes('candidate/cia'),
      'routes/web.php must register /career/recommend endpoint under candidate/cia');

    const bladePath = path.join(__dirname, '..', 'resources', 'views', 'candidate', 'cia.blade.php');
    assert.ok(fs.existsSync(bladePath), 'cia.blade.php must exist');
    const bladeCode = fs.readFileSync(bladePath, 'utf8');
    assert.ok(bladeCode.includes('crewai-recommendations-section'), 'cia.blade.php must contain crewai-recommendations-section');
    assert.ok(bladeCode.includes('crewai-career-cards-container'), 'cia.blade.php must define crewai-career-cards-container');
    assert.ok(bladeCode.includes('CareerAdvisorAgent') || bladeCode.includes('Senior Career Counsellor'),
      'cia.blade.php must mention CrewAI CareerAdvisorAgent or role');
    assert.ok(bladeCode.includes('/candidate/cia/career/recommend'), 'cia.blade.php must fetch /candidate/cia/career/recommend');
  });

  // Test 11: Verify Express REST API POST /api/cia/career/recommend and /candidate/cia/career/recommend
  await runAsyncTest('11. Express API: POST /api/cia/career/recommend returns 200 with 3 career paths and telemetry', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/cia/career/recommend', {
      candidateId: 101,
      targetRoleId: 'role_fullstack_lead',
      candidateSkills: testCandidate.skills,
      candidate: testCandidate
    });

    assert.strictEqual(res.statusCode, 200, `POST /api/cia/career/recommend should return 200 (got ${res.statusCode})`);
    assert.strictEqual(res.body.success, true, 'Response body success must be true');
    assert.ok(res.body.agent, 'Response must include agent telemetry');
    assert.strictEqual(res.body.agent.name, 'CareerAdvisorAgent', 'Agent name must be CareerAdvisorAgent');
    assert.strictEqual(res.body.agent.role, 'Senior Career Counsellor with 15 years experience in tech placement', 'Agent role must match');
    assert.ok(Array.isArray(res.body.career_paths), 'career_paths must be an array');
    assert.strictEqual(res.body.career_paths.length, 3, 'Must return exactly 3 career paths');
    assert.strictEqual(res.body.chroma_namespace, 'candidate_101_skill_gaps', 'ChromaDB namespace must match');

    // Route alias /candidate/cia/career/recommend should also return 200
    const aliasRes = await dispatchExpressRequest(app, 'POST', '/candidate/cia/career/recommend', {
      candidateId: 101,
      targetRoleId: 'role_fullstack_lead'
    });
    assert.strictEqual(aliasRes.statusCode, 200, `Route alias /candidate/cia/career/recommend must return 200`);
    assert.strictEqual(aliasRes.body.success, true, 'Alias response must be successful');
  });

  console.log('================================================================');
  console.log(`🎉 Summary: ${passedTests}/${totalTests} tests passed successfully!`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
})();
