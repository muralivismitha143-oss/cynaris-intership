/**
 * test_langgraph_learning_path.js
 * 
 * Comprehensive Unit Test Suite for Week 7 Day 5:
 * Module 4: Learning Path Generator — LangGraph Workflow
 * 
 * Verifies:
 *   1. LangGraph State Machine initialization (intern_profile, skill_gaps, target_role, generated_plan)
 *   2. Node 1: AssessCurrentState baseline evaluation and competency analysis
 *   3. Node 2: IdentifyGaps quantitative skill gap extraction and critical gap tagging
 *   4. Node 3: GeneratePlan 8-week structured curriculum synthesis
 *   5. Node 4: ValidatePlan schema enforcement and pedagogical constraints
 *   6. Node 5: OutputPlan Mermaid timeline diagram generation and total hours calculation
 *   7. Sequential 5-Node Execution order invariant: AssessCurrentState -> IdentifyGaps -> GeneratePlan -> ValidatePlan -> OutputPlan
 *   8. Week-by-Week curriculum completeness (week, title, topics >= 2, resources >= 1, daily commitment, milestone)
 *   9. Daily commitment validation and total estimated hours formula
 *   10. Multi-tier resilience: Groq primary provider calibration (llama-3.3-70b-versatile)
 *   11. Multi-tier resilience: OpenRouter secondary fallback activation on simulated Groq failure
 *   12. Multi-tier resilience: Local deterministic state engine guarantees 100% offline reliability
 *   13. Laravel Parity: CiaController::learningPath, routes/web.php, and cia.blade.php Mermaid timeline
 *   14. Express REST API: POST /api/cia/career/learning-path and alias return 200 with full state
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
      'user-agent': 'test-langgraph-client',
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
  console.log('🧪 Week 7 Day 5: LangGraph Workflow Learning Path Generator');
  console.log('================================================================');

  const testCandidateSkills = {
    'JavaScript': { level: 4, verified: true },
    'Node.js': { level: 4, verified: true },
    'React': { level: 4, verified: true },
    'Docker & Containers': { level: 3, verified: true },
    'MySQL': { level: 3, verified: true },
    'Git Workflow': { level: 4, verified: true }
  };

  const testCandidateProfile = {
    id: 101,
    name: 'Murali V',
    email: 'murali@example.com',
    currentTitle: 'Junior Full Stack Developer',
    experienceYears: 2
  };

  // Test 1: LangGraph Initial State Construction
  runTest('1. Initial state correctly encapsulates intern_profile, skill_gaps, target_role, generated_plan', () => {
    const state = careerIntelligenceService.buildLangGraphInitialState({
      candidateId: 101,
      candidateProfile: testCandidateProfile,
      candidateSkills: testCandidateSkills,
      targetRoleId: 'role_fullstack_lead',
      dailyCommitmentHours: 2.0
    });

    assert.ok(state.intern_profile, 'State must contain intern_profile');
    assert.strictEqual(state.intern_profile.id, 101);
    assert.strictEqual(state.intern_profile.name, 'Murali V');
    assert.ok(state.skill_gaps, 'State must contain skill_gaps');
    assert.ok(state.target_role, 'State must contain target_role');
    assert.strictEqual(state.target_role.id, 'role_fullstack_lead');
    assert.strictEqual(state.generated_plan, null, 'generated_plan should be null initially');
    assert.strictEqual(Array.isArray(state.node_history), true);
    assert.strictEqual(state.node_history.length, 0);
    assert.strictEqual(state.status, 'INITIALIZED');
  });

  // Test 2: Node 1 (AssessCurrentState) Execution
  await runAsyncTest('2. Node 1: AssessCurrentState evaluates baseline verified competencies', async () => {
    const initialState = careerIntelligenceService.buildLangGraphInitialState({
      candidateProfile: testCandidateProfile,
      candidateSkills: testCandidateSkills
    });

    const state = await careerIntelligenceService.nodeAssessCurrentState(initialState);
    assert.ok(state.intern_profile.baseline_summary, 'baseline_summary must be defined');
    assert.ok(state.intern_profile.baseline_summary.evaluated_skills_count >= 5);
    assert.ok(Array.isArray(state.intern_profile.baseline_summary.primary_strengths));
    assert.strictEqual(state.node_history[0], 'AssessCurrentState');
  });

  // Test 3: Node 2 (IdentifyGaps) Execution
  await runAsyncTest('3. Node 2: IdentifyGaps calculates quantitative gaps and isolates critical missing skills', async () => {
    const initialState = careerIntelligenceService.buildLangGraphInitialState({
      candidateProfile: testCandidateProfile,
      candidateSkills: testCandidateSkills,
      targetRoleId: 'role_fullstack_lead'
    });

    await careerIntelligenceService.nodeAssessCurrentState(initialState);
    const state = await careerIntelligenceService.nodeIdentifyGaps(initialState);

    assert.ok(state.skill_gaps.gap_score >= 0, 'Gap score must be non-negative');
    assert.ok(state.skill_gaps.readiness_score <= 100, 'Readiness score must be <= 100');
    assert.ok(Array.isArray(state.skill_gaps.itemized_gaps));
    assert.ok(Array.isArray(state.skill_gaps.critical_missing));
    assert.strictEqual(state.node_history[1], 'IdentifyGaps');
  });

  // Test 4: Node 3 (GeneratePlan) Execution
  await runAsyncTest('4. Node 3: GeneratePlan produces 8-week curriculum adhering to schema', async () => {
    const initialState = careerIntelligenceService.buildLangGraphInitialState({
      candidateProfile: testCandidateProfile,
      candidateSkills: testCandidateSkills,
      targetRoleId: 'role_fullstack_lead',
      dailyCommitmentHours: 2.0
    });

    await careerIntelligenceService.nodeAssessCurrentState(initialState);
    await careerIntelligenceService.nodeIdentifyGaps(initialState);
    const state = await careerIntelligenceService.nodeGeneratePlan(initialState, { simulateBothFailure: true });

    assert.ok(state.generated_plan, 'generated_plan must be populated');
    assert.strictEqual(Array.isArray(state.generated_plan.schedule), true);
    assert.strictEqual(state.generated_plan.schedule.length, 8, 'Schedule must contain exactly 8 weeks');
    assert.strictEqual(state.node_history[2], 'GeneratePlan');
  });

  // Test 5: Node 4 (ValidatePlan) Execution
  await runAsyncTest('5. Node 4: ValidatePlan enforces 8-week invariant and daily commitment limits', async () => {
    const initialState = careerIntelligenceService.buildLangGraphInitialState({
      candidateProfile: testCandidateProfile,
      candidateSkills: testCandidateSkills,
      targetRoleId: 'role_fullstack_lead',
      dailyCommitmentHours: 2.0
    });

    await careerIntelligenceService.nodeAssessCurrentState(initialState);
    await careerIntelligenceService.nodeIdentifyGaps(initialState);
    await careerIntelligenceService.nodeGeneratePlan(initialState, { simulateBothFailure: true });
    const state = await careerIntelligenceService.nodeValidatePlan(initialState);

    assert.ok(state.validation_status, 'validation_status must be populated');
    assert.strictEqual(state.validation_status.valid, true);
    assert.strictEqual(state.validation_status.weeks_count, 8);
    assert.ok(state.validation_status.checks_passed.includes('total_weeks_invariant'));
    assert.ok(state.validation_status.checks_passed.includes('daily_commitment_realistic'));
    assert.strictEqual(state.node_history[3], 'ValidatePlan');
  });

  // Test 6: Node 5 (OutputPlan) & Mermaid Timeline Synthesis
  await runAsyncTest('6. Node 5: OutputPlan synthesizes valid Mermaid timeline syntax and hours metrics', async () => {
    const initialState = careerIntelligenceService.buildLangGraphInitialState({
      candidateProfile: testCandidateProfile,
      candidateSkills: testCandidateSkills,
      targetRoleId: 'role_fullstack_lead',
      dailyCommitmentHours: 2.0
    });

    await careerIntelligenceService.nodeAssessCurrentState(initialState);
    await careerIntelligenceService.nodeIdentifyGaps(initialState);
    await careerIntelligenceService.nodeGeneratePlan(initialState, { simulateBothFailure: true });
    await careerIntelligenceService.nodeValidatePlan(initialState);
    const state = await careerIntelligenceService.nodeOutputPlan(initialState);

    assert.strictEqual(state.status, 'COMPLETED');
    assert.strictEqual(state.generated_plan.total_weeks, 8);
    assert.strictEqual(state.generated_plan.daily_commitment_hours, 2.0);
    assert.ok(state.generated_plan.total_estimated_hours > 70, 'Total hours should be realistic (~100h)');
    assert.ok(state.generated_plan.mermaid_timeline, 'Mermaid timeline must exist');
    assert.ok(state.generated_plan.mermaid_timeline.startsWith('timeline'), 'Mermaid timeline must begin with timeline declaration');
    assert.ok(state.generated_plan.mermaid_timeline.includes('title'), 'Mermaid timeline must declare title');
    assert.ok(state.generated_plan.mermaid_timeline.includes('section'), 'Mermaid timeline must define sections');
    assert.ok(state.generated_plan.mermaid_timeline.includes('Week 1'), 'Mermaid timeline must feature Week 1');
    assert.ok(state.generated_plan.mermaid_timeline.includes('Week 8'), 'Mermaid timeline must feature Week 8');
    assert.strictEqual(state.node_history[4], 'OutputPlan');
  });

  // Test 7: Complete Sequential Workflow
  await runAsyncTest('7. executeLangGraphLearningPathWorkflow sequences all 5 nodes strictly', async () => {
    const result = await careerIntelligenceService.executeLangGraphLearningPathWorkflow({
      candidateId: 101,
      candidateProfile: testCandidateProfile,
      candidateSkills: testCandidateSkills,
      targetRoleId: 'role_fullstack_lead',
      dailyCommitmentHours: 2.0
    }, { simulateBothFailure: true });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.workflow, 'LangGraph State Machine (5 Nodes)');
    assert.deepStrictEqual(result.state.node_history, [
      'AssessCurrentState',
      'IdentifyGaps',
      'GeneratePlan',
      'ValidatePlan',
      'OutputPlan'
    ]);
    assert.strictEqual(result.telemetry.nodes_executed, 5);
    assert.strictEqual(result.telemetry.validated, true);
  });

  // Test 8: Week-by-Week Curriculum Completeness
  await runAsyncTest('8. Every week in 8-week schedule contains title, topics, resources, commitment, and milestone', async () => {
    const result = await careerIntelligenceService.executeLangGraphLearningPathWorkflow({
      targetRoleId: 'role_fullstack_lead',
      dailyCommitmentHours: 2.5
    }, { simulateBothFailure: true });

    const schedule = result.state.generated_plan.schedule;
    assert.strictEqual(schedule.length, 8);

    schedule.forEach((wk, idx) => {
      assert.strictEqual(wk.week, idx + 1);
      assert.ok(wk.title && wk.title.length > 5, `Week ${idx + 1} must have title`);
      assert.ok(Array.isArray(wk.topics) && wk.topics.length >= 2, `Week ${idx + 1} must have >= 2 topics`);
      assert.ok(Array.isArray(wk.resources) && wk.resources.length >= 1, `Week ${idx + 1} must have >= 1 resource`);
      assert.ok(wk.daily_time_commitment && wk.daily_time_commitment.includes('hrs/day'), `Week ${idx + 1} commitment`);
      assert.ok(wk.milestone && wk.milestone.length > 10, `Week ${idx + 1} must have descriptive milestone`);
    });
  });

  // Test 9: Daily Commitment Limits & Validation Error Trapping
  await runAsyncTest('9. ValidatePlan rejects unrealistic daily commitments (> 3.5 hrs/day)', async () => {
    const invalidState = careerIntelligenceService.buildLangGraphInitialState({
      dailyCommitmentHours: 4.5
    });
    invalidState.generated_plan = {
      schedule: new Array(8).fill(null).map((_, i) => ({
        week: i + 1,
        title: `Week ${i + 1}`,
        topics: ['Topic A', 'Topic B'],
        resources: ['Doc A'],
        milestone: 'Milestone A'
      }))
    };

    let caughtError = null;
    try {
      await careerIntelligenceService.nodeValidatePlan(invalidState);
    } catch (e) {
      caughtError = e;
    }
    assert.ok(caughtError !== null, 'ValidatePlan must throw error on commitment > 3.5 hrs/day');
    assert.ok(caughtError.message.includes('exceeds pedagogical limit'));
  });

  // Test 10: Multi-Tier Resilience — Groq Primary Calibration
  runTest('10. Groq primary engine configured with llama-3.3-70b-versatile', () => {
    assert.strictEqual(careerIntelligenceService.groqModel, 'llama-3.3-70b-versatile');
    assert.strictEqual(careerIntelligenceService.openRouterModel, 'meta-llama/llama-3.3-70b-instruct');
  });

  // Test 11: Multi-Tier Resilience — OpenRouter Secondary Fallback
  await runAsyncTest('11. OpenRouter secondary fallback activates seamlessly on simulated Groq error', async () => {
    const result = await careerIntelligenceService.executeLangGraphLearningPathWorkflow({
      candidateProfile: testCandidateProfile,
      candidateSkills: testCandidateSkills
    }, { simulateGroqFailure: true });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.telemetry.provider, 'openrouter');
    assert.strictEqual(result.telemetry.model, 'meta-llama/llama-3.3-70b-instruct');
    assert.strictEqual(result.state.status, 'COMPLETED');
  });

  // Test 12: Multi-Tier Resilience — Local Deterministic Safety Net
  await runAsyncTest('12. Local deterministic engine guarantees 100% test reliability on dual cloud outage', async () => {
    const result = await careerIntelligenceService.executeLangGraphLearningPathWorkflow({
      candidateProfile: testCandidateProfile,
      candidateSkills: testCandidateSkills
    }, { simulateBothFailure: true });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.telemetry.provider, 'deterministic-local-engine');
    assert.strictEqual(result.telemetry.model, 'deterministic-langgraph-v1');
    assert.strictEqual(result.state.generated_plan.schedule.length, 8);
  });

  // Test 13: Laravel Parity Check
  runTest('13. Laravel Parity: CiaController::learningPath, routes/web.php, and cia.blade.php', () => {
    const controllerPath = path.join(__dirname, '..', 'app', 'Http', 'Controllers', 'Web', 'CiaController.php');
    assert.ok(fs.existsSync(controllerPath), 'CiaController.php must exist');
    const controllerCode = fs.readFileSync(controllerPath, 'utf8');
    assert.ok(controllerCode.includes('learningPath'), 'CiaController must define learningPath method');
    assert.ok(controllerCode.includes('LangGraph State Machine'), 'CiaController must declare LangGraph workflow');
    assert.ok(controllerCode.includes('mermaidTimeline'), 'CiaController must synthesize mermaidTimeline');

    const routesPath = path.join(__dirname, '..', 'routes', 'web.php');
    assert.ok(fs.existsSync(routesPath), 'routes/web.php must exist');
    const routesCode = fs.readFileSync(routesPath, 'utf8');
    assert.ok(routesCode.includes('career/learning-path'), 'routes/web.php must register /career/learning-path');

    const bladePath = path.join(__dirname, '..', 'resources', 'views', 'candidate', 'cia.blade.php');
    assert.ok(fs.existsSync(bladePath), 'cia.blade.php must exist');
    const bladeCode = fs.readFileSync(bladePath, 'utf8');
    assert.ok(bladeCode.includes('langgraph-learning-path-section'), 'cia.blade.php must contain langgraph-learning-path-section');
    assert.ok(bladeCode.includes('btn-generate-learning-path'), 'cia.blade.php must contain btn-generate-learning-path');
    assert.ok(bladeCode.includes('langgraph-mermaid-timeline-box'), 'cia.blade.php must contain langgraph-mermaid-timeline-box');
    assert.ok(bladeCode.includes('timeline'), 'cia.blade.php must contain Mermaid timeline syntax');
  });

  // Test 14: Express REST API Endpoints
  await runAsyncTest('14. Express API: POST /api/cia/career/learning-path and alias return 200 with full 5-node state', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/cia/career/learning-path', {
      candidateId: 101,
      candidateProfile: testCandidateProfile,
      candidateSkills: testCandidateSkills,
      targetRoleId: 'role_fullstack_lead',
      dailyCommitmentHours: 2.0,
      simulateBothFailure: true
    });

    assert.strictEqual(res.statusCode, 200, `POST /api/cia/career/learning-path should return 200 (got ${res.statusCode})`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.workflow, 'LangGraph State Machine (5 Nodes)');
    assert.ok(res.body.state.intern_profile);
    assert.ok(res.body.state.skill_gaps);
    assert.ok(res.body.state.target_role);
    assert.ok(res.body.state.generated_plan);
    assert.strictEqual(res.body.state.generated_plan.schedule.length, 8);
    assert.strictEqual(res.body.state.node_history.length, 5);

    // Verify alias endpoint /candidate/cia/career/learning-path
    const aliasRes = await dispatchExpressRequest(app, 'POST', '/candidate/cia/career/learning-path', {
      candidateId: 101,
      targetRoleId: 'role_devops_architect',
      simulateBothFailure: true
    });

    assert.strictEqual(aliasRes.statusCode, 200);
    assert.strictEqual(aliasRes.body.success, true);
    assert.strictEqual(aliasRes.body.state.generated_plan.schedule.length, 8);
  });

  console.log('================================================================');
  console.log(`🎉 Summary: ${passedTests}/${totalTests} tests passed successfully!`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
})();
