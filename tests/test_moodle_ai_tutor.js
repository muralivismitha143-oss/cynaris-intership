/**
 * test_moodle_ai_tutor.js
 * 
 * Week 6 Day 1: Automated Test Suite for AI Tutor Integration
 * Demonstrates:
 * 1. Primary LLM Provider: Groq (llama-3.3-70b-versatile)
 * 2. Automated Failover Provider: OpenRouter (meta-llama/llama-3.3-70b-instruct)
 * 3. Graceful Local Deterministic Curriculum Fallback (100% offline uptime)
 * 4. Structured Pedagogical Socratic Prompt Design & Anti-Hallucination
 * 5. REST API Endpoints (/api/moodle/ai-tutor/ask, /health, /topics)
 * 6. Moodle PHP Parity & Assessment Engine UI Integration
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');

const rootDir = path.resolve(__dirname, '..');
const { 
  AiTutorService, 
  aiTutorService, 
  GROQ_API_URL, 
  GROQ_MODEL, 
  OPENROUTER_API_URL, 
  OPENROUTER_MODEL 
} = require('../backend/modules/ai/AiTutorService');
const app = require('../backend/server');

let passCount = 0;
let totalCount = 0;

function it(description, fn) {
  totalCount++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(() => {
        console.log(`  [PASS] ${description}`);
        passCount++;
      }).catch(err => {
        console.error(`  [FAIL] ${description}`);
        console.error(`         ${err.message}`);
      });
    } else {
      console.log(`  [PASS] ${description}`);
      passCount++;
    }
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
  }
}

// In-memory HTTP request dispatcher for Express routes (no TCP socket required)
function makeRequest(appInstance, { method = 'GET', path = '/', headers = {} }, body = null) {
  return new Promise((resolve) => {
    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const req = new Readable({
      read() {
        if (payload) this.push(payload);
        this.push(null);
      },
    });

    req.method = method;
    req.url = path;
    req.originalUrl = path;
    req.headers = {
      host: 'localhost:3000',
      'user-agent': 'test-moodle-client',
      ...headers,
    };
    if (payload) {
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = Buffer.byteLength(payload);
    }

    const dummySocket = new Duplex({
      read() {},
      write(chunk, enc, cb) { cb(); },
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

async function runTests() {
  console.log('================================================================');
  console.log('🧪 Week 6 Day 1: Moodle AI Tutor Integration Test Suite');
  console.log('================================================================\n');

  // --- Test 1: Socratic Prompt Design & Pedagogical Schema ---
  console.log('--- Test 1: Socratic Prompt Design & Pedagogical Schema ---');

  it('buildPrompt creates systemPrompt and userPrompt with Socratic pedagogical instructions', () => {
    const context = {
      studentName: 'Murali',
      courseName: 'Full Stack Engineering',
      courseCode: 'CYN-FS-101',
      topic: 'Event Loop & Libuv',
      question: 'How do timers interact with the poll phase?',
      currentGrade: 88.5,
      quizName: 'Technical Assessment Quiz #501',
    };
    const { systemPrompt, userPrompt } = aiTutorService.buildPrompt(context);

    assert.ok(systemPrompt.includes('Cynaris AI Tutor'), 'Must define AI Tutor persona');
    assert.ok(systemPrompt.includes('Master Technical Educator') || systemPrompt.includes('Technical Educator'), 'Must define educator role');
    assert.ok(systemPrompt.includes('valid, parseable JSON'), 'Must mandate JSON output');

    assert.ok(userPrompt.includes('Student: Murali'), 'Must inject student name');
    assert.ok(userPrompt.includes('[CYN-FS-101]'), 'Must inject course code');
    assert.ok(userPrompt.includes('88.5%'), 'Must inject current assessment score');
    assert.ok(userPrompt.includes('Quiz Context: Technical Assessment Quiz #501'), 'Must inject quiz context');
    assert.ok(userPrompt.includes('conceptExplanation'), 'Must specify conceptExplanation key');
    assert.ok(userPrompt.includes('stepByStepBreakdown'), 'Must specify stepByStepBreakdown key');
    assert.ok(userPrompt.includes('codeExample'), 'Must specify codeExample key');
    assert.ok(userPrompt.includes('quizHint'), 'Must specify quizHint key');
    assert.ok(userPrompt.includes('recommendedAction'), 'Must specify recommendedAction key');
  });

  // --- Test 2: Primary Provider Configuration (Groq) ---
  console.log('\n--- Test 2: Primary Provider Configuration (Groq) ---');

  it('Specifies Groq as primary provider with llama-3.3-70b-versatile', () => {
    assert.strictEqual(GROQ_MODEL, 'llama-3.3-70b-versatile');
    assert.ok(GROQ_API_URL.includes('groq.com/openai/v1/chat/completions'));
  });

  await it('Executes Primary Groq call when valid key and mock response are present', async () => {
    const service = new AiTutorService({ groqApiKey: 'test-groq-key' });
    // Mock callGroq directly to verify success telemetry
    service.callGroq = async () => ({
      conceptExplanation: 'Event loop manages non-blocking async execution.',
      stepByStepBreakdown: ['1. Timers', '2. Poll', '3. Check'],
      codeExample: 'setTimeout(() => {}, 0);',
      quizHint: 'Remember libuv worker thread limits.',
      recommendedAction: 'Review Node.js documentation.'
    });

    const res = await service.askTutor({ question: 'Explain Event Loop' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.provider, 'Groq');
    assert.strictEqual(res.model, 'llama-3.3-70b-versatile');
    assert.strictEqual(res.fallbackUsed, false);
    assert.strictEqual(res.data.stepByStepBreakdown.length, 3);
  });

  // --- Test 3: Failover to OpenRouter on Groq Error ---
  console.log('\n--- Test 3: Failover to OpenRouter on Groq Error ---');

  it('Specifies OpenRouter as fallback provider with meta-llama/llama-3.3-70b-instruct', () => {
    assert.strictEqual(OPENROUTER_MODEL, 'meta-llama/llama-3.3-70b-instruct');
    assert.ok(OPENROUTER_API_URL.includes('openrouter.ai/api/v1/chat/completions'));
  });

  await it('Seamlessly fails over to OpenRouter when Groq fails or is disabled', async () => {
    const service = new AiTutorService({
      groqApiKey: 'FAIL_GROQ',
      openRouterApiKey: 'test-openrouter-key',
    });

    service.callOpenRouter = async () => ({
      conceptExplanation: 'OpenRouter fallback: Event loop orchestrates asynchronous tasks.',
      stepByStepBreakdown: ['1. Timers phase', '2. I/O Poll phase', '3. Check phase'],
      codeExample: 'setImmediate(() => console.log("check"));',
      quizHint: 'Check phase executes after poll phase.',
      recommendedAction: 'Practice with process.nextTick().'
    });

    const res = await service.askTutor(
      { question: 'Explain Event Loop' },
      { simulateGroqFailure: true }
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.provider, 'OpenRouter');
    assert.strictEqual(res.model, 'meta-llama/llama-3.3-70b-instruct');
    assert.strictEqual(res.fallbackUsed, true);
    assert.ok(res.fallbackReason.includes('Groq'));
    assert.strictEqual(res.data.stepByStepBreakdown.length, 3);
  });

  // --- Test 4: Local Deterministic Offline Fallback ---
  console.log('\n--- Test 4: Local Deterministic Offline Fallback ---');

  await it('Gracefully engages Local Curriculum Engine when both APIs fail or network is offline', async () => {
    const service = new AiTutorService({
      groqApiKey: 'FAIL_GROQ',
      openRouterApiKey: 'FAIL_OPENROUTER',
    });

    const res = await service.askTutor(
      { 
        studentName: 'Murali',
        courseCode: 'CYN-FS-101',
        courseName: 'Full Stack Engineering',
        question: 'Explain the event loop and asynchronous non-blocking I/O in Node.js' 
      },
      { simulateBothFailure: true }
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.provider, 'LocalRuleEngine');
    assert.strictEqual(res.model, 'deterministic-curriculum-v1');
    assert.strictEqual(res.fallbackUsed, true);
    assert.ok(res.data.conceptExplanation.includes('Node.js Event Loop'));
    assert.strictEqual(res.data.stepByStepBreakdown.length, 3);
    assert.ok(res.data.codeExample.includes('fs.readFile'));
    assert.ok(res.data.quizHint.includes('process.nextTick'));
  });

  it('Deterministic Fallback routes curriculum keywords for Chart.js and SQL appropriately', () => {
    const service = new AiTutorService();
    
    // Chart.js query
    const chartRes = service.localDeterministicFallback({ question: 'How do I prevent chart canvas label collision with autoSkip?' });
    assert.ok(chartRes.conceptExplanation.includes('Chart.js'));
    assert.ok(chartRes.codeExample.includes('autoSkip: true'));

    // SQL Moodle query
    const sqlRes = service.localDeterministicFallback({ question: 'Explain Moodle grade SQL joins between mdl_user and mdl_grade_grades' });
    assert.ok(sqlRes.conceptExplanation.includes('Moodle relational queries'));
    assert.ok(sqlRes.codeExample.includes('LEFT JOIN mdl_grade_grades'));
  });

  // --- Test 5: Health & Curriculum Catalog Diagnostics ---
  console.log('\n--- Test 5: Health & Curriculum Catalog Diagnostics ---');

  it('getHealth returns operational status and provider metadata', () => {
    const health = aiTutorService.getHealth();
    assert.strictEqual(health.status, 'operational');
    assert.strictEqual(health.primary.provider, 'Groq');
    assert.strictEqual(health.primary.model, GROQ_MODEL);
    assert.strictEqual(health.fallback.provider, 'OpenRouter');
    assert.strictEqual(health.fallback.model, OPENROUTER_MODEL);
    assert.strictEqual(health.offlineEngine.provider, 'LocalRuleEngine');
  });

  it('getCurriculumTopics returns rich study questions for all 3 courses', () => {
    const fsTopics = aiTutorService.getCurriculumTopics('CYN-FS-101');
    assert.ok(fsTopics.length >= 3);
    assert.ok(fsTopics.some(t => t.topic.includes('Event Loop')));

    const crmTopics = aiTutorService.getCurriculumTopics('CYN-CRM-102');
    assert.ok(crmTopics.some(t => t.topic.includes('EspoCRM')));

    const opsTopics = aiTutorService.getCurriculumTopics('CYN-OPS-103');
    assert.ok(opsTopics.some(t => t.topic.includes('Docker')));
  });

  // --- Test 6: REST API Endpoint Integration ---
  console.log('\n--- Test 6: REST API Endpoint Integration ---');

  await it('POST /api/moodle/ai-tutor/ask returns 200 with structured response', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      path: '/api/moodle/ai-tutor/ask',
    }, {
      studentId: 2,
      studentName: 'Murali',
      courseCode: 'CYN-FS-101',
      question: 'Explain the event loop and asynchronous non-blocking I/O in Node.js',
      simulateBothFailure: true
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.provider, 'LocalRuleEngine');
    assert.ok(res.body.data.conceptExplanation);
    assert.strictEqual(res.body.data.stepByStepBreakdown.length, 3);
  });

  await it('GET /api/moodle/ai-tutor/health returns 200 with health details', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      path: '/api/moodle/ai-tutor/health',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'operational');
    assert.strictEqual(res.body.primary.model, GROQ_MODEL);
  });

  await it('GET /api/moodle/ai-tutor/topics returns 200 with course topics', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      path: '/api/moodle/ai-tutor/topics?courseCode=CYN-FS-101',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.courseCode, 'CYN-FS-101');
    assert.ok(res.body.topics.length >= 3);
  });

  // --- Test 7: Moodle PHP Service & UI Integration ---
  console.log('\n--- Test 7: Moodle PHP Service & UI Integration ---');

  it('moodle/local/cynaris_ai_tutor/AiTutor.php exists and declares Frankenstyle class and fallback', () => {
    const phpPath = path.join(rootDir, 'moodle/local/cynaris_ai_tutor/AiTutor.php');
    assert.ok(fs.existsSync(phpPath), 'AiTutor.php must exist');
    const content = fs.readFileSync(phpPath, 'utf8');
    assert.ok(content.includes('namespace local_cynaris_ai_tutor;'), 'Must declare Frankenstyle namespace');
    assert.ok(content.includes('llama-3.3-70b-versatile'), 'Must declare Groq model constant');
    assert.ok(content.includes('meta-llama/llama-3.3-70b-instruct'), 'Must declare OpenRouter model constant');
    assert.ok(content.includes('LocalRuleEngine'), 'Must declare local fallback provider');
  });

  it('moodle/mod/quiz/view.php includes the AI Tutor preparation widget and AJAX handler', () => {
    const quizViewPath = path.join(rootDir, 'moodle/mod/quiz/view.php');
    assert.ok(fs.existsSync(quizViewPath), 'Quiz view must exist');
    const content = fs.readFileSync(quizViewPath, 'utf8');
    assert.ok(content.includes('id="cynaris-ai-tutor-container"'), 'Must define AI tutor container element');
    assert.ok(content.includes('id="cynaris-tutor-input"'), 'Must define question input field');
    assert.ok(content.includes('/api/moodle/ai-tutor/ask'), 'Must dispatch to AI Tutor endpoint');
  });

  it('blocks/cynaris_stats/block_cynaris_stats.php renders AI Tutor quick drawer', () => {
    const blockPath = path.join(rootDir, 'blocks/cynaris_stats/block_cynaris_stats.php');
    assert.ok(fs.existsSync(blockPath), 'Block file must exist');
    const content = fs.readFileSync(blockPath, 'utf8');
    assert.ok(content.includes('cynaris-block-tutor-q'), 'Must define tutor input');
    assert.ok(content.includes('askBlockAiTutor'), 'Must define askBlockAiTutor function');
  });

  // --- Final Summary ---
  console.log('\n================================================================');
  if (passCount === totalCount) {
    console.log(`🎉 [SUCCESS] All ${passCount} Week 6 Day 1 AI Tutor Integration Tests Passed!`);
  } else {
    console.log(`⚠️ [WARNING] ${passCount}/${totalCount} tests passed.`);
  }
  console.log('================================================================\n');

  process.exit(passCount === totalCount ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
