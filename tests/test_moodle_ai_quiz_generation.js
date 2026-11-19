/**
 * test_moodle_ai_quiz_generation.js
 * 
 * Week 6 Day 2: Automated Test Suite for AI Quiz Generation
 * 
 * Validates:
 * 1. Prompt Construction & MCQ Schema Specifications (JSON array of 7 fields)
 * 2. Primary Provider Inference via Groq (llama-3.3-70b-versatile)
 * 3. Automated Failover to OpenRouter (meta-llama/llama-3.3-70b-instruct)
 * 4. Local Deterministic Curriculum Fallback on Dual Failure / Offline Mode
 * 5. Strict Structure Validation (rejects malformed questions, enforces A/B/C/D)
 * 6. Moodle Question Bank API Parity (imports questions with category and fraction weights)
 * 7. Programmatic Quiz Assembly via quiz_add_quiz / quiz_add_instance
 * 8. Moodle PHP Library Parity (mod/quiz/locallib.php)
 * 9. Express REST API Routes (POST /generate, POST /import-to-bank, POST /create, GET /question-bank)
 * 10. Moodle UI Integration in mod/quiz/view.php
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');

const rootDir = path.resolve(__dirname, '..');
const { 
  AiQuizGeneratorService, 
  aiQuizGeneratorService, 
  GROQ_API_URL, 
  GROQ_MODEL, 
  OPENROUTER_API_URL, 
  OPENROUTER_MODEL 
} = require('../backend/modules/ai/AiQuizGeneratorService');
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
      'user-agent': 'test-moodle-quizgen-client',
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
  console.log('🧪 Week 6 Day 2: AI Quiz Generation & Question Bank Test Suite');
  console.log('================================================================\n');

  // --- Test 1: Prompt Construction & MCQ Schema Specifications ---
  console.log('--- Test 1: Prompt Construction & MCQ Schema Specifications ---');

  it('buildQuizPrompt constructs systemPrompt and userPrompt with course context and schema', () => {
    const course = {
      id: 101,
      fullname: "Full Stack Developer Internship — Induction & Architecture",
      shortname: "CYN-FS-101",
      summary: "Core architectural principles, virtual DOM diffing, and RESTful APIs."
    };
    const { systemPrompt, userPrompt } = aiQuizGeneratorService.buildQuizPrompt(course, 5);

    assert.ok(systemPrompt.includes('Lead Examiner'), 'System prompt defines examiner persona');
    assert.ok(systemPrompt.includes('JSON array of objects'), 'System prompt mandates JSON array');
    assert.ok(userPrompt.includes('CYN-FS-101'), 'User prompt contains course code');
    assert.ok(userPrompt.includes('Generate exactly 5 multiple-choice questions'), 'User prompt specifies count');
    assert.ok(userPrompt.includes('option_a'), 'User prompt mandates option_a');
    assert.ok(userPrompt.includes('option_b'), 'User prompt mandates option_b');
    assert.ok(userPrompt.includes('option_c'), 'User prompt mandates option_c');
    assert.ok(userPrompt.includes('option_d'), 'User prompt mandates option_d');
    assert.ok(userPrompt.includes('correct_answer'), 'User prompt mandates correct_answer');
    assert.ok(userPrompt.includes('explanation'), 'User prompt mandates explanation');
  });

  // --- Test 2: Primary Provider Inference via Groq ---
  console.log('\n--- Test 2: Primary Provider Inference via Groq ---');

  it('Specifies Groq as primary model llama-3.3-70b-versatile', () => {
    assert.strictEqual(GROQ_MODEL, 'llama-3.3-70b-versatile');
    assert.ok(GROQ_API_URL.includes('groq.com/openai/v1/chat/completions'));
  });

  await it('Executes primary Groq inference when valid mock response is received', async () => {
    const service = new AiQuizGeneratorService({ groqApiKey: 'test-groq-key' });
    service.callGroq = async () => ([
      {
        question: "How does libuv implement event-driven I/O in Node.js?",
        option_a: "Multi-threaded JavaScript execution",
        option_b: "Single-threaded event loop with worker thread pool for blocking I/O",
        option_c: "Synchronous polling exclusively",
        option_d: "Kernel bypass networking",
        correct_answer: "B",
        explanation: "Libuv provides a single-threaded event loop backed by a thread pool for blocking tasks."
      }
    ]);

    const res = await service.generateQuizQuestions(101, 1);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.provider, 'Groq');
    assert.strictEqual(res.model, 'llama-3.3-70b-versatile');
    assert.strictEqual(res.fallbackUsed, false);
    assert.strictEqual(res.questions.length, 1);
    assert.strictEqual(res.questions[0].correct_answer, 'B');
  });

  // --- Test 3: Automated Failover to OpenRouter ---
  console.log('\n--- Test 3: Automated Failover to OpenRouter ---');

  it('Specifies OpenRouter model meta-llama/llama-3.3-70b-instruct', () => {
    assert.strictEqual(OPENROUTER_MODEL, 'meta-llama/llama-3.3-70b-instruct');
    assert.ok(OPENROUTER_API_URL.includes('openrouter.ai/api/v1/chat/completions'));
  });

  await it('Automatically fails over to OpenRouter when Groq fails', async () => {
    const service = new AiQuizGeneratorService({
      groqApiKey: 'FAIL_GROQ',
      openRouterApiKey: 'test-openrouter-key',
    });

    service.callOpenRouter = async () => ([
      {
        question: "What is the primary benefit of React Virtual DOM reconciliation?",
        option_a: "Directly writing to GPU buffers",
        option_b: "Batching and minimizing expensive physical DOM manipulations via heuristic O(n) diffing",
        option_c: "Eliminating JavaScript garbage collection",
        option_d: "Enabling server-side memory sharing",
        correct_answer: "B",
        explanation: "React minimizes real DOM repaints by comparing virtual tree representations."
      }
    ]);

    const res = await service.generateQuizQuestions(101, 1, { simulateGroqFailure: true });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.provider, 'OpenRouter');
    assert.strictEqual(res.model, 'meta-llama/llama-3.3-70b-instruct');
    assert.strictEqual(res.fallbackUsed, true);
    assert.ok(res.fallbackReason.includes('Groq'));
    assert.strictEqual(res.questions.length, 1);
  });

  // --- Test 4: Local Deterministic Curriculum Fallback on Dual Failure ---
  console.log('\n--- Test 4: Local Deterministic Curriculum Fallback on Dual Failure ---');

  await it('Engages Local Deterministic Engine when both Groq and OpenRouter fail', async () => {
    const service = new AiQuizGeneratorService({
      groqApiKey: 'FAIL_GROQ',
      openRouterApiKey: 'FAIL_OPENROUTER',
    });

    const res = await service.generateQuizQuestions(101, 5, { simulateBothFailure: true });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.provider, 'LocalRuleEngine');
    assert.strictEqual(res.model, 'deterministic-curriculum-v1');
    assert.strictEqual(res.fallbackUsed, true);
    assert.strictEqual(res.questions.length, 5);
    assert.ok(res.questions[0].question.includes('event loop') || res.questions[0].question.includes('Node.js'));
  });

  it('Local Fallback routes correctly for all 3 courses (CYN-FS-101, CYN-CRM-102, CYN-OPS-103)', () => {
    const service = new AiQuizGeneratorService();
    
    // Course 101: Full Stack
    const q101 = service.localDeterministicQuizFallback({ id: 101 }, 3);
    assert.strictEqual(q101.length, 3);
    assert.ok(q101.some(q => q.question.includes('event loop') || q.question.includes('React')));

    // Course 102: EspoCRM
    const q102 = service.localDeterministicQuizFallback({ id: 102 }, 3);
    assert.strictEqual(q102.length, 3);
    assert.ok(q102.some(q => q.question.includes('EspoCRM') || q.question.includes('Lead Conversion')));

    // Course 103: DevOps / Docker
    const q103 = service.localDeterministicQuizFallback({ id: 103 }, 3);
    assert.strictEqual(q103.length, 3);
    assert.ok(q103.some(q => q.question.includes('Docker') || q.question.includes('CI/CD')));
  });

  // --- Test 5: Strict Question Structure Validation ---
  console.log('\n--- Test 5: Strict Question Structure Validation ---');

  it('validateQuestionStructure rejects questions missing required fields or invalid correct_answer', () => {
    const service = new AiQuizGeneratorService();

    // Missing explanation
    assert.throws(() => {
      service.validateQuestionStructure([
        { question: "Q1", option_a: "A", option_b: "B", option_c: "C", option_d: "D", correct_answer: "A" }
      ]);
    }, /missing or invalid field/);

    // Invalid correct_answer (e.g. 'E')
    assert.throws(() => {
      service.validateQuestionStructure([
        { question: "Q1", option_a: "A", option_b: "B", option_c: "C", option_d: "D", correct_answer: "E", explanation: "Expl" }
      ]);
    }, /invalid correct_answer/);
  });

  // --- Test 6: Moodle Question Bank API (importToQuestionBank) ---
  console.log('\n--- Test 6: Moodle Question Bank API (importToQuestionBank) ---');

  it('importToQuestionBank saves questions with unique IDs and option fraction weights', () => {
    const service = new AiQuizGeneratorService();
    const testQuestions = [
      {
        question: "How do prepared statements prevent SQL injection?",
        option_a: "By parameterizing user input as literal data",
        option_b: "By storing data in cookies",
        option_c: "By encrypting database cables",
        option_d: "By disabling queries",
        correct_answer: "A",
        explanation: "Separating query structure from literal values prevents syntax alteration."
      }
    ];

    const result = service.importToQuestionBank(101, testQuestions);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.importedCount, 1);
    assert.strictEqual(result.questions[0].qtype, 'multichoice');
    assert.strictEqual(result.questions[0].options[0].fraction, 1.0);
    assert.strictEqual(result.questions[0].options[1].fraction, 0.0);

    const bank = service.getCourseQuestionBank(101);
    assert.ok(bank.length >= 1);
  });

  // --- Test 7: Programmatic Quiz Creation (createQuizFromQuestions) ---
  console.log('\n--- Test 7: Programmatic Quiz Creation (createQuizFromQuestions) ---');

  it('createQuizFromQuestions creates a Moodle quiz and maps question bank slots', () => {
    const service = new AiQuizGeneratorService();
    const imported = service.importToQuestionBank(101, service.localDeterministicQuizFallback({ id: 101 }, 3));
    const questionIds = imported.questions.map(q => q.id);

    const quizResult = service.createQuizFromQuestions(101, "AI Assessment: Node.js & React Mastery", questionIds);
    assert.strictEqual(quizResult.success, true);
    assert.strictEqual(quizResult.assignedQuestionCount, 3);
    assert.strictEqual(quizResult.quiz.slots.length, 3);
    assert.strictEqual(quizResult.quiz.slots[0].slot, 1);
    assert.strictEqual(quizResult.quiz.slots[0].questionid, questionIds[0]);

    const quizzes = service.getCourseQuizzes(101);
    assert.ok(quizzes.length >= 1);
  });

  // --- Test 8: Moodle PHP locallib Parity ---
  console.log('\n--- Test 8: Moodle PHP locallib Parity ---');

  it('moodle/mod/quiz/locallib.php exists and defines required functions', () => {
    const locallibPath = path.join(rootDir, 'moodle/mod/quiz/locallib.php');
    assert.ok(fs.existsSync(locallibPath), 'locallib.php must exist');
    const content = fs.readFileSync(locallibPath, 'utf8');

    assert.ok(content.includes('function generate_quiz_questions'), 'Must define generate_quiz_questions()');
    assert.ok(content.includes('class question_bank_api'), 'Must define question_bank_api class');
    assert.ok(content.includes('function quiz_add_quiz'), 'Must define quiz_add_quiz()');
    assert.ok(content.includes('llama-3.3-70b-versatile'), 'Must declare Groq primary model');
    assert.ok(content.includes('meta-llama/llama-3.3-70b-instruct'), 'Must declare OpenRouter fallback model');
  });

  // --- Test 9: Express REST API Endpoints Integration ---
  console.log('\n--- Test 9: Express REST API Endpoints Integration ---');

  await it('POST /api/moodle/quiz/generate returns 200 with generated MCQs', async () => {
    const res = await makeRequest(app, {
      method: 'POST',
      path: '/api/moodle/quiz/generate',
    }, {
      courseId: 101,
      count: 3,
      simulateBothFailure: true
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.questions.length, 3);
    assert.strictEqual(res.body.provider, 'LocalRuleEngine');
  });

  await it('POST /api/moodle/quiz/import-to-bank imports questions into Question Bank', async () => {
    const questions = [
      {
        question: "How does Express middleware handle unhandled errors?",
        option_a: "Using 4-argument error-handling middleware (err, req, res, next)",
        option_b: "By crashing the V8 runtime",
        option_c: "By retrying indefinitely",
        option_d: "By returning HTTP 200 OK",
        correct_answer: "A",
        explanation: "Express identifies error-handling middleware by its 4-parameter signature."
      }
    ];

    const res = await makeRequest(app, {
      method: 'POST',
      path: '/api/moodle/quiz/import-to-bank',
    }, {
      courseId: 101,
      questions,
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.importedCount, 1);
  });

  await it('GET /api/moodle/courses/101/question-bank returns questions list', async () => {
    const res = await makeRequest(app, {
      method: 'GET',
      path: '/api/moodle/courses/101/question-bank',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.courseId, 101);
  });

  // --- Test 10: Moodle UI Integration in mod/quiz/view.php ---
  console.log('\n--- Test 10: Moodle UI Integration in mod/quiz/view.php ---');

  it('moodle/mod/quiz/view.php includes the AI Question Bank generator container and trigger button', () => {
    const quizViewPath = path.join(rootDir, 'moodle/mod/quiz/view.php');
    const content = fs.readFileSync(quizViewPath, 'utf8');

    assert.ok(content.includes('id="cynaris-quiz-generator-container"'), 'Must define generator container');
    assert.ok(content.includes('id="cynaris-quizgen-btn"'), 'Must define generator button');
    assert.ok(content.includes('generateAiQuizQuestions'), 'Must define generateAiQuizQuestions handler');
    assert.ok(content.includes('/api/moodle/quiz/generate'), 'Must dispatch to quiz generate API');
    assert.ok(content.includes('/api/moodle/quiz/import-to-bank'), 'Must dispatch to import-to-bank API');
  });

  // --- Final Summary ---
  console.log('\n================================================================');
  if (passCount === totalCount) {
    console.log(`🎉 [SUCCESS] All ${passCount} Week 6 Day 2 AI Quiz Generation Tests Passed!`);
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
