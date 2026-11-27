/**
 * test_career_intelligence_report.js
 *
 * Comprehensive Unit & Integration Test Suite for Week 8 Day 3:
 * Career Intelligence Report — Archetype Map + Employability Score
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');

const { careerIntelligenceService } = require('../backend/modules/ai/CareerIntelligenceService');
const {
  TRAIT_KEYS,
  CAREER_ARCHETYPES,
  buildInternTraitProfile,
  scoreCareerArchetypes,
  calculateCompositeCareerScores,
  generateCareerReportPdfBuffer,
} = require('../backend/modules/ai/CareerReportEngine');
const { candidateReportRepository } = require('../backend/database/candidateReportRepository');
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
      'user-agent': 'test-career-report-client',
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
    const chunks = [];

    res.write = function (chunk) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    };

    res.end = function (chunk) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const fullBuf = Buffer.concat(chunks);
      const rawBody = fullBuf.toString('utf8');
      let parsed = null;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        parsed = rawBody;
      }
      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders ? res.getHeaders() : {},
        body: parsed,
        rawBody,
        buffer: fullBuf,
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
  console.log('🧪 Week 8 Day 3: Career Intelligence Report — Archetype + Score');
  console.log('================================================================');

  // Test 1: 6 Career Archetypes with 10 attributes (0-10)
  runTest('1. Defines all 6 Career Archetypes each with 10 trait attributes scored 0-10', () => {
    const names = CAREER_ARCHETYPES.map((a) => a.name);
    assert.deepStrictEqual(names, ['Builder', 'Analyst', 'Leader', 'Innovator', 'Specialist', 'Generalist']);
    assert.strictEqual(TRAIT_KEYS.length, 10);

    CAREER_ARCHETYPES.forEach((arch) => {
      TRAIT_KEYS.forEach((trait) => {
        const val = arch.traits[trait];
        assert.ok(typeof val === 'number' && val >= 0 && val <= 10, `${arch.name}.${trait} invalid: ${val}`);
      });
    });
  });

  // Test 2: Archetype Scoring Algorithm
  runTest('2. Archetype scoring maps skills, learning style & performance to 6 ranked archetype scores', () => {
    const traits = buildInternTraitProfile({
      skill_scores: { NodeJS: 5, React: 4, Docker: 4, MySQL: 4 },
      learning_style: 'hands_on',
      project_performance: 94,
      assessment_scores: 90,
    });
    assert.strictEqual(Object.keys(traits).length, 10);
    Object.values(traits).forEach((v) => assert.ok(v >= 0 && v <= 10));

    const result = scoreCareerArchetypes({
      skill_scores: { NodeJS: 5, React: 4, Docker: 4, MySQL: 4 },
      learning_style: 'hands_on',
      project_performance: 94,
    });
    assert.strictEqual(result.archetype_scores.length, 6);
    assert.ok(result.primary_archetype);
    assert.ok(result.secondary_archetype);
    for (let i = 1; i < result.archetype_scores.length; i++) {
      assert.ok(result.archetype_scores[i - 1].match_score >= result.archetype_scores[i].match_score);
    }

    const analystRes = scoreCareerArchetypes({
      learning_style: 'analytical',
      trait_overrides: { analytical_rigor: 10, quality_reliability_focus: 9.5, domain_depth: 9.0, strategic_leadership: 4.0, creative_experimentation: 4.0 },
    });
    assert.strictEqual(analystRes.primary_archetype, 'Analyst');
  });

  // Test 3: Composite Employability, AI Readiness & Placement Readiness Scores
  runTest('3. Calculates Employability Score, AI Readiness Score, and Placement Readiness Score (0-100)', () => {
    const scores = calculateCompositeCareerScores({
      skill_completeness: 90,
      project_quality: 80,
      assessment_scores: 100,
      ai_tasks_completed: 8,
      ai_tools_used: ['Groq', 'OpenRouter', 'ChromaDB', 'LangGraph', 'Docling', 'CrewAI'],
      project_completion_pct: 90,
      cia_usage_hours: 20,
      documentation_quality: 85,
    });
    // Employability: 90*0.4 + 80*0.35 + 100*0.25 = 36 + 28 + 25 = 89.0
    assert.strictEqual(scores.employability_score, 89.0);
    // AI Readiness: (8/10*100)*0.6 + (6/6*100)*0.4 = 48 + 40 = 88.0
    assert.strictEqual(scores.ai_readiness_score, 88.0);
    // Placement Readiness: 90*0.4 + 100*0.3 + 100*0.1 + 85*0.2 = 36 + 30 + 10 + 17 = 93.0
    assert.strictEqual(scores.placement_readiness_score, 93.0);
  });

  // Test 4: candidate_reports Schema & Repository Persistence
  await runAsyncTest('4. SQL schema defines candidate_reports and repository persists generated reports', async () => {
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../backend/database/schema.sql'), 'utf8');
    assert.ok(schemaSql.includes('CREATE TABLE IF NOT EXISTS `candidate_reports`'));

    const seeded = await candidateReportRepository.findByCandidateId(1);
    assert.ok(seeded.length >= 1, 'Expected seeded report for candidate #1');

    const generated = await careerIntelligenceService.generateCareerIntelligenceReport({
      candidate_id: 2,
      candidate_name: 'Priya Sharma',
      target_role: 'Backend Systems Architect',
      learning_style: 'deep_dive',
      skill_completeness: 88,
      project_quality: 90,
      assessment_scores: 86,
      ai_tasks_completed: 9,
      ai_tools_used: ['Groq', 'OpenRouter', 'ChromaDB', 'Docling'],
    });
    assert.strictEqual(generated.success, true);
    assert.ok(generated.report_id >= 2);

    const fetched = await candidateReportRepository.findById(generated.report_id);
    assert.ok(fetched);
    assert.strictEqual(fetched.candidate_name, 'Priya Sharma');
    assert.strictEqual(fetched.employability_score, generated.scores.employability_score);
  });

  // Test 5: Groq Primary / OpenRouter Fallback / Dual Failure Error Handling
  await runAsyncTest('5. Report generation supports OpenRouter fallback and graceful dual-failure error', async () => {
    const fallbackRes = await careerIntelligenceService.generateCareerIntelligenceReport({
      candidate_id: 1,
      simulate_groq_failure: true,
    });
    assert.strictEqual(fallbackRes.success, true);
    assert.ok(fallbackRes.provider.includes('OpenRouter'));

    const failRes = await careerIntelligenceService.generateCareerIntelligenceReport({
      candidate_id: 1,
      simulate_both_failure: true,
    });
    assert.strictEqual(failRes.success, false);
    assert.strictEqual(failRes.provider, 'None');
  });

  // Test 6: Binary PDF Generation
  runTest('6. PDF engine generates valid %PDF-1.4 binary buffer', () => {
    const pdfBuf = generateCareerReportPdfBuffer({
      id: 1,
      candidate_name: 'Murali V',
      target_role: 'Senior Full Stack Engineer',
      primary_archetype: 'Builder',
      secondary_archetype: 'Innovator',
      employability_score: 91.6,
      ai_readiness_score: 94.0,
      placement_readiness_score: 93.1,
      archetype_scores: [{ archetype: 'Builder', match_score: 92.4 }],
      report_narrative: 'Strong full stack Builder profile.',
      recommendations: ['Lead architecture reviews'],
      ai_provider: 'Groq',
      ai_model: 'llama-3.3-70b-versatile',
    });
    const text = pdfBuf.toString('utf8');
    assert.ok(text.startsWith('%PDF-1.4'));
    assert.ok(text.includes('Murali V'));
    assert.ok(text.includes('%%EOF'));
  });

  // Test 7: Express API Endpoints (Archetypes, Generate, History, PDF)
  await runAsyncTest('7. Express API exposes /career/archetypes, /career/report/generate, /career/reports, and /pdf', async () => {
    const archRes = await dispatchExpressRequest(app, 'GET', '/api/cia/career/archetypes');
    assert.strictEqual(archRes.statusCode, 200);
    assert.strictEqual(archRes.body.total, 6);

    const genRes = await dispatchExpressRequest(app, 'POST', '/api/cia/career/report/generate', {
      candidate_id: 3,
      candidate_name: 'Rahul Kumar',
      learning_style: 'collaborative',
    });
    assert.strictEqual(genRes.statusCode, 200);
    assert.strictEqual(genRes.body.success, true);
    assert.ok(genRes.body.report_id);

    const listRes = await dispatchExpressRequest(app, 'GET', '/api/cia/career/reports/3');
    assert.strictEqual(listRes.statusCode, 200);
    assert.ok(listRes.body.total >= 1);

    const pdfRes = await dispatchExpressRequest(app, 'GET', `/api/cia/career/report/${genRes.body.report_id}/pdf`);
    assert.strictEqual(pdfRes.statusCode, 200);
    assert.ok(String(pdfRes.headers['content-type']).includes('application/pdf'));
    assert.ok(pdfRes.buffer.toString('utf8').startsWith('%PDF-1.4'));
  });

  // Test 8: Laravel DomPDF & Composer Parity
  runTest('8. Laravel Parity: composer.json, CiaController, routes/web.php, report_pdf.blade.php, and cia.blade.php', () => {
    const composer = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../composer.json'), 'utf8'));
    assert.ok(composer.require['barryvdh/laravel-dompdf'] || composer.require['dompdf/dompdf']);

    const ctrl = fs.readFileSync(path.resolve(__dirname, '../app/Http/Controllers/Web/CiaController.php'), 'utf8');
    assert.ok(ctrl.includes('function generateCareerReport'));
    assert.ok(ctrl.includes('function exportCareerReportPdf'));
    assert.ok(ctrl.includes('DomPDF'));
    assert.ok(ctrl.includes('candidate_reports'));

    const routes = fs.readFileSync(path.resolve(__dirname, '../routes/web.php'), 'utf8');
    assert.ok(routes.includes('/career/report/generate'));
    assert.ok(routes.includes('/career/report/pdf'));

    assert.ok(fs.existsSync(path.resolve(__dirname, '../resources/views/candidate/report_pdf.blade.php')));
    const blade = fs.readFileSync(path.resolve(__dirname, '../resources/views/candidate/cia.blade.php'), 'utf8');
    assert.ok(blade.includes('id="career-intelligence-report-section"'));
    assert.ok(blade.includes('id="btn-export-report-pdf"'));
    assert.ok(fs.existsSync(path.resolve(__dirname, '../backend/public/career-report.html')));
  });

  console.log('================================================================');
  console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
  console.log('================================================================');

  if (passedTests < totalTests) {
    process.exit(1);
  }
})();
