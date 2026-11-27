/**
 * test_readiness_scores.js
 *
 * Comprehensive Unit & Integration Test Suite for Week 8 Day 2:
 * Module 6 & 7: Placement Readiness Score + Interview Readiness Score
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');

const { careerIntelligenceService } = require('../backend/modules/ai/CareerIntelligenceService');
const {
  assignReadinessGrade,
  calculatePlacementReadiness,
  calculateInterviewReadiness,
  escapeCsvCell,
  formatReadinessCsv,
} = require('../backend/modules/ai/ReadinessScoringEngine');
const { readinessRepository } = require('../backend/database/readinessRepository');
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

function dispatchExpressRequest(appInstance, method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

    const reqStream = new Readable({
      read() {
        if (payload) this.push(payload);
        this.push(null);
      },
    });

    reqStream.method = method;
    reqStream.url = url;
    reqStream.originalUrl = url;
    reqStream.headers = {
      host: 'localhost:3000',
      'user-agent': 'test-readiness-client',
      ...headers,
    };
    if (payload) {
      reqStream.headers['content-type'] = 'application/json';
      reqStream.headers['content-length'] = Buffer.byteLength(payload);
    }

    const dummySocket = new Duplex({
      read() {},
      write(chunk, enc, cb) {
        cb();
      },
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
      } catch {
        parsed = resBody;
      }
      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders ? res.getHeaders() : {},
        body: parsed,
        rawBody: resBody,
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
  console.log('🧪 Week 8 Day 2: Module 6 & 7 — Placement & Interview Readiness');
  console.log('================================================================');

  // Test 1: Schema DDL
  runTest('1. SQL schema defines intern_readiness_scores table, indexes, and seed data', () => {
    const schemaPath = path.resolve(__dirname, '../backend/database/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS `intern_readiness_scores`'), 'Missing intern_readiness_scores table');
    assert.ok(sql.includes('placement_readiness_score'), 'Missing placement_readiness_score column');
    assert.ok(sql.includes('interview_readiness_score'), 'Missing interview_readiness_score column');
    assert.ok(sql.includes('placement_grade'), 'Missing placement_grade column');
    assert.ok(sql.includes('interview_grade'), 'Missing interview_grade column');
    assert.ok(sql.includes('INSERT IGNORE INTO `intern_readiness_scores`'), 'Missing seed data');
  });

  // Test 2: Placement Readiness 40/30/10/20 weighted calculation
  runTest('2. Placement Readiness Score computes exact 40/30/10/20% weighted score and clamps bounds', () => {
    const res = calculatePlacementReadiness({
      project_completion_pct: 90,
      assessment_score: 80,
      cia_usage_hours: 20, // 100% of 20h benchmark
      documentation_quality: 85,
    });
    // 90*0.4 + 80*0.3 + 100*0.1 + 85*0.2 = 36 + 24 + 10 + 17 = 87.0
    assert.strictEqual(res.score, 87.0);
    assert.strictEqual(res.grade, 'A');
    assert.strictEqual(res.breakdown.length, 4);
    assert.ok(Array.isArray(res.improvement_recommendations) && res.improvement_recommendations.length > 0);

    const clampedHigh = calculatePlacementReadiness({
      project_completion_pct: 150,
      assessment_score: 120,
      cia_usage_hours: 50,
      documentation_quality: 110,
    });
    assert.strictEqual(clampedHigh.score, 100.0);
    assert.strictEqual(clampedHigh.grade, 'A');
  });

  // Test 3: Interview Readiness 40/30/20/10 weighted calculation
  runTest('3. Interview Readiness Score computes exact 40/30/20/10% weighted score', () => {
    const res = calculateInterviewReadiness({
      viva_score: 80,
      code_review_score: 70,
      demo_clarity_score: 60,
      git_workflow_score: 90,
    });
    // 80*0.4 + 70*0.3 + 60*0.2 + 90*0.1 = 32 + 21 + 12 + 9 = 74.0
    assert.strictEqual(res.score, 74.0);
    assert.strictEqual(res.grade, 'B');
    assert.strictEqual(res.breakdown.length, 4);
    assert.ok(Array.isArray(res.improvement_recommendations) && res.improvement_recommendations.length > 0);
  });

  // Test 4: Letter grades A/B/C/D
  runTest('4. Letter grades map deterministically across A/B/C/D boundaries', () => {
    assert.strictEqual(assignReadinessGrade(95), 'A');
    assert.strictEqual(assignReadinessGrade(85), 'A');
    assert.strictEqual(assignReadinessGrade(84.9), 'B');
    assert.strictEqual(assignReadinessGrade(70), 'B');
    assert.strictEqual(assignReadinessGrade(69.9), 'C');
    assert.strictEqual(assignReadinessGrade(55), 'C');
    assert.strictEqual(assignReadinessGrade(54.9), 'D');
    assert.strictEqual(assignReadinessGrade(0), 'D');
  });

  // Test 5: Invalid numeric validation
  runTest('5. Scoring engine rejects non-numeric metric inputs with descriptive error', () => {
    assert.throws(() => {
      calculatePlacementReadiness({ project_completion_pct: 'invalid-num' });
    }, /Invalid numeric value/);
    assert.throws(() => {
      calculateInterviewReadiness({ viva_score: 'NaN' });
    }, /Invalid numeric value/);
  });

  // Test 6: CSV escaping and formula injection protection
  runTest('6. CSV formatter obeys RFC 4180 quoting and neutralizes formula injection', () => {
    assert.strictEqual(escapeCsvCell('=SUM(A1:A5)'), "'=SUM(A1:A5)");
    assert.strictEqual(escapeCsvCell('Hello, "World"'), '"Hello, ""World"""');
    const csv = formatReadinessCsv([
      {
        intern_id: 99,
        intern_name: 'Test, Intern',
        intern_email: 'test@cynaris.dev',
        target_role: 'Full Stack Developer',
        placement_readiness_score: 88.5,
        placement_grade: 'A',
        project_completion_pct: 90,
        assessment_score: 88,
        cia_usage_hours: 18,
        documentation_quality: 87,
        interview_readiness_score: 86.0,
        interview_grade: 'A',
        viva_score: 85,
        code_review_score: 86,
        demo_clarity_score: 88,
        git_workflow_score: 86,
        ai_provider: 'Groq',
        updated_at: '2026-11-27T12:00:00Z',
      },
    ]);
    assert.ok(csv.includes('"Test, Intern"'));
    assert.ok(csv.includes('Placement Readiness Score'));
    assert.ok(csv.includes('Interview Readiness Score'));
  });

  // Test 7: DB Repository persistence & atomic transaction
  await runAsyncTest('7. ReadinessRepository retrieves seeded cohort and atomically upserts scores in DB', async () => {
    const initial = await readinessRepository.findAll();
    assert.ok(initial.length >= 5, `Expected at least 5 seeded interns, got ${initial.length}`);

    const saved = await careerIntelligenceService.evaluateInternReadiness({
      intern_id: 6,
      intern_name: 'Ananya Rao',
      intern_email: 'ananya.rao@cynaris.dev',
      target_role: 'AI Platform Engineer',
      project_completion_pct: 82,
      assessment_score: 79,
      cia_usage_hours: 15,
      documentation_quality: 84,
      viva_score: 81,
      code_review_score: 78,
      demo_clarity_score: 80,
      git_workflow_score: 88,
    });

    assert.strictEqual(saved.success, true);
    assert.strictEqual(saved.top_3_improvement_actions.length, 3);
    assert.ok(saved.vector_benchmarks.length > 0, 'Expected ChromaDB vector benchmark matches');

    const fetched = await readinessRepository.findByInternId(6);
    assert.ok(fetched, 'Persisted intern #6 not found in DB');
    assert.strictEqual(fetched.intern_name, 'Ananya Rao');
    assert.strictEqual(fetched.placement_readiness_score, saved.placement_readiness.score);
    assert.strictEqual(fetched.interview_readiness_score, saved.interview_readiness.score);
  });

  // Test 8: OpenRouter Fallback simulation
  await runAsyncTest('8. Readiness evaluation seamlessly activates OpenRouter fallback on simulated Groq failure', async () => {
    const res = await careerIntelligenceService.evaluateInternReadiness({
      intern_id: 1,
      intern_name: 'Murali V',
      simulate_groq_failure: true,
    });
    assert.strictEqual(res.success, true);
    assert.ok(res.provider.includes('OpenRouter'), `Expected OpenRouter fallback, got ${res.provider}`);
    assert.strictEqual(res.top_3_improvement_actions.length, 3);
  });

  // Test 9: Dual failure handling
  await runAsyncTest('9. Readiness evaluation returns graceful error payload when both providers fail', async () => {
    const res = await careerIntelligenceService.evaluateInternReadiness({
      intern_id: 1,
      simulate_both_failure: true,
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.provider, 'None');
    assert.ok(res.error.includes('Both primary provider (Groq) and secondary fallback (OpenRouter) failed'));
  });

  // Test 10: Express POST /api/cia/readiness/calculate
  await runAsyncTest('10. Express API: POST /api/cia/readiness/calculate stores scores and returns 200', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/cia/readiness/calculate', {
      intern_id: 7,
      intern_name: 'Kiran Patel',
      target_role: 'DevOps Engineer',
      project_completion_pct: 60,
      assessment_score: 58,
      cia_usage_hours: 10,
      documentation_quality: 55,
      viva_score: 48,
      code_review_score: 50,
      demo_clarity_score: 52,
      git_workflow_score: 55,
    });
    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.rawBody}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.placement_readiness.grade, 'C');
    assert.strictEqual(res.body.interview_readiness.grade, 'D');
    assert.strictEqual(res.body.top_3_improvement_actions.length, 3);

    const badRes = await dispatchExpressRequest(app, 'POST', '/api/cia/readiness/calculate', {
      intern_id: 7,
      project_completion_pct: 'bad-data',
    });
    assert.strictEqual(badRes.statusCode, 400);
  });

  // Test 11: Express GET /api/cia/readiness/student/:internId
  await runAsyncTest('11. Express API: GET /api/cia/readiness/student/:internId returns personal scorecard', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/cia/readiness/student/1');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.intern_id, 1);
    assert.strictEqual(res.body.top_3_improvement_actions.length, 3);
    assert.strictEqual(res.body.placement_readiness.breakdown.length, 4);
    assert.strictEqual(res.body.interview_readiness.breakdown.length, 4);

    const notFound = await dispatchExpressRequest(app, 'GET', '/api/cia/readiness/student/9999');
    assert.strictEqual(notFound.statusCode, 404);
  });

  // Test 12: Express GET /api/cia/readiness/admin
  await runAsyncTest('12. Express API: GET /api/cia/readiness/admin returns all interns with both scores', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/cia/readiness/admin');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.total_interns >= 5);
    assert.ok(Array.isArray(res.body.interns));
    assert.ok(res.body.cohort_metrics.average_placement_score > 0);
    assert.ok(res.body.cohort_metrics.average_interview_score > 0);
  });

  // Test 13: Express GET /api/cia/readiness/export-csv
  await runAsyncTest('13. Express API: GET /api/cia/readiness/export-csv exports RFC 4180 CSV attachment', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/cia/readiness/export-csv');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(String(res.headers['content-type']).includes('text/csv'));
    assert.ok(String(res.headers['content-disposition']).includes('intern-readiness-scores.csv'));
    assert.ok(res.rawBody.includes('Placement Readiness Score'));
    assert.ok(res.rawBody.includes('Murali V'));
    assert.ok(res.rawBody.includes('Vikram Nair'));
  });

  // Test 14: Express Static UI Page
  runTest('14. Express readiness.html UI contains Student scorecard, Admin table, and CSV export', () => {
    const uiPath = path.resolve(__dirname, '../backend/public/readiness.html');
    assert.ok(fs.existsSync(uiPath), 'readiness.html not found');
    const html = fs.readFileSync(uiPath, 'utf8');
    assert.ok(html.includes('id="student-view-panel"'));
    assert.ok(html.includes('id="admin-view-panel"'));
    assert.ok(html.includes('id="admin-cohort-table"'));
    assert.ok(html.includes('id="btn-export-csv"'));
    assert.ok(html.includes('id="top3-actions-list"'));
  });

  // Test 15: Laravel Controller & Routes Parity
  runTest('15. Laravel Parity: CiaController and routes/web.php implement Module 6 & 7 endpoints', () => {
    const ctrl = fs.readFileSync(path.resolve(__dirname, '../app/Http/Controllers/Web/CiaController.php'), 'utf8');
    const routes = fs.readFileSync(path.resolve(__dirname, '../routes/web.php'), 'utf8');
    assert.ok(ctrl.includes('function calculateReadiness'));
    assert.ok(ctrl.includes('function adminReadiness'));
    assert.ok(ctrl.includes('function studentReadiness'));
    assert.ok(ctrl.includes('function exportReadinessCsv'));
    assert.ok(routes.includes('/career/readiness/calculate'));
    assert.ok(routes.includes('/career/readiness/admin'));
    assert.ok(routes.includes('/career/readiness/export-csv'));
  });

  // Test 16: Candidate Blade UI Parity
  runTest('16. Candidate Blade UI contains Module 6 & 7 Student Score Card, Top 3 AI Actions, and Admin CSV Table', () => {
    const blade = fs.readFileSync(path.resolve(__dirname, '../resources/views/candidate/cia.blade.php'), 'utf8');
    assert.ok(blade.includes('id="readiness-scores-section"'));
    assert.ok(blade.includes('id="student-readiness-view"'));
    assert.ok(blade.includes('id="admin-readiness-view"'));
    assert.ok(blade.includes('id="admin-readiness-table"'));
    assert.ok(blade.includes('id="btn-export-readiness-csv"'));
    assert.ok(blade.includes('id="readiness-top3-actions"'));
  });

  console.log('================================================================');
  console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
  console.log('================================================================');

  if (passedTests < totalTests) {
    process.exit(1);
  }
})();
