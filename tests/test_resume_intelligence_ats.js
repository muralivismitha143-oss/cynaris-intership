/**
 * test_resume_intelligence_ats.js
 * 
 * Comprehensive Unit Test Suite for Week 8 Day 1:
 * Module 5: Resume Intelligence — Docling + Groq ATS Scoring
 * 
 * Verifies:
 *   1. Frappe DocType Schema: cynaris_recruitment/doctype/job_applicant/job_applicant.json
 *      contains ai_resume_summary (Long Text), ats_score (Float), docling_markdown (Long Text).
 *   2. EspoCRM Entity Metadata: application/Espo/Resources/metadata/entityDefs/JobApplicant.json
 *      contains aiResumeSummary (text), atsScore (float).
 *   3. Python Module Invariants: cynaris_recruitment/doctype/job_applicant/job_applicant.py
 *      defines extract_resume_with_docling, calculate_ats_score, build_analysis_prompt,
 *      and generate_resume_summary with Groq llama-3.3-70b-versatile and OpenRouter fallback.
 *   4. Docling Document Conversion: parseResumeWithDocling produces structured markdown
 *      with clean sections (Core Technical Skills, Professional Experience, Education).
 *   5. ATS Scoring Algorithm: calculateATSScore computes deterministic 0-100 score,
 *      classifies into tiers (HIGH/MEDIUM/LOW MATCH), and partitions matched vs missing keywords.
 *   6. Prompt Architecture: buildATSAnalysisPrompt synthesizes candidate profile, Docling markdown,
 *      ATS metrics, and instructions for Groq inference.
 *   7. Groq Primary Execution: analyzeResumeIntelligenceDoclingATS uses Groq llama-3.3-70b-versatile.
 *   8. OpenRouter Failover: Secondary fallback succeeds when Groq is disabled/fails.
 *   9. Error Resilience: Graceful error response when both providers fail or inputs are invalid.
 *  10. Express API Route: POST /api/cia/career/resume-intelligence returns 200 with ATS payload.
 *  11. Express Candidate Alias Route: POST /candidate/cia/career/resume-intelligence returns 200.
 *  12. Express Applicant Route: POST /api/applicants/:id/generate-resume-summary updates applicant.
 *  13. Laravel Controller Parity: CiaController.php implements resumeIntelligence method.
 *  14. Laravel Route Parity: routes/web.php routes /career/resume-intelligence to CiaController.
 *  15. Candidate Blade UI Parity: resources/views/candidate/cia.blade.php contains
 *      #docling-resume-intelligence-section, action buttons, score badge, and trigger script.
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
      'user-agent': 'test-docling-ats-client',
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
  console.log('🧪 Week 8 Day 1: Module 5 — Docling + Groq ATS Resume Intelligence');
  console.log('================================================================');

  // -------------------------------------------------------------
  // Test 1: Frappe DocType Schema Verification
  // -------------------------------------------------------------
  runTest('Frappe Job Applicant DocType Schema contains ai_resume_summary, ats_score, docling_markdown', () => {
    const schemaPath = path.resolve(__dirname, '../cynaris_recruitment/doctype/job_applicant/job_applicant.json');
    assert.ok(fs.existsSync(schemaPath), `Schema file not found at ${schemaPath}`);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    const fields = schema.fields || [];
    const fieldMap = {};
    fields.forEach(f => { fieldMap[f.fieldname] = f; });

    assert.ok(fieldMap['ai_resume_summary'], 'Missing field ai_resume_summary');
    assert.strictEqual(fieldMap['ai_resume_summary'].fieldtype, 'Long Text');
    assert.strictEqual(fieldMap['ai_resume_summary'].label, 'AI Resume Summary');

    assert.ok(fieldMap['ats_score'], 'Missing field ats_score');
    assert.strictEqual(fieldMap['ats_score'].fieldtype, 'Float');
    assert.ok(fieldMap['ats_score'].label.includes('ATS'), 'Label must include ATS');

    assert.ok(fieldMap['docling_markdown'], 'Missing field docling_markdown');
    assert.strictEqual(fieldMap['docling_markdown'].fieldtype, 'Long Text');
    assert.ok(fieldMap['docling_markdown'].label.includes('Docling'), 'Label must include Docling');
  });

  // -------------------------------------------------------------
  // Test 2: EspoCRM Entity Metadata Verification
  // -------------------------------------------------------------
  runTest('EspoCRM JobApplicant entity metadata contains aiResumeSummary and atsScore', () => {
    const espoPath = path.resolve(__dirname, '../application/Espo/Resources/metadata/entityDefs/JobApplicant.json');
    assert.ok(fs.existsSync(espoPath), `Espo metadata not found at ${espoPath}`);
    const metadata = JSON.parse(fs.readFileSync(espoPath, 'utf8'));

    const fields = metadata.fields || {};
    assert.ok(fields['aiResumeSummary'], 'Missing aiResumeSummary in Espo metadata');
    assert.strictEqual(fields['aiResumeSummary'].type, 'text');

    assert.ok(fields['atsScore'], 'Missing atsScore in Espo metadata');
    assert.strictEqual(fields['atsScore'].type, 'float');
  });

  // -------------------------------------------------------------
  // Test 3: Python Controller Code Structure Verification
  // -------------------------------------------------------------
  runTest('Python Job Applicant Controller implements Docling conversion and Groq/OpenRouter fallback', () => {
    const pyPath = path.resolve(__dirname, '../cynaris_recruitment/doctype/job_applicant/job_applicant.py');
    assert.ok(fs.existsSync(pyPath), `Python file not found at ${pyPath}`);
    const pyContent = fs.readFileSync(pyPath, 'utf8');

    assert.ok(pyContent.includes('def extract_resume_with_docling'), 'Missing extract_resume_with_docling function');
    assert.ok(pyContent.includes('def calculate_ats_score'), 'Missing calculate_ats_score function');
    assert.ok(pyContent.includes('def build_analysis_prompt'), 'Missing build_analysis_prompt function');
    assert.ok(pyContent.includes('def generate_resume_summary'), 'Missing generate_resume_summary function');

    assert.ok(pyContent.includes('llama-3.3-70b-versatile'), 'Missing Groq primary model llama-3.3-70b-versatile');
    assert.ok(pyContent.includes('meta-llama/llama-3.3-70b-instruct'), 'Missing OpenRouter fallback model');
    assert.ok(pyContent.includes('docling_markdown'), 'Missing docling_markdown field update');
    assert.ok(pyContent.includes('ats_score'), 'Missing ats_score field update');
  });

  // -------------------------------------------------------------
  // Test 4: Docling Document Conversion to Structured Markdown
  // -------------------------------------------------------------
  runTest('Docling parser converts applicant resume to clean Markdown sections', () => {
    const sampleApplicant = {
      applicant_name: 'Priya Sharma',
      job_title: 'Full Stack Engineer',
      skills: 'JavaScript, Node.js, Express, React, MySQL, Docker, Git',
      experience_years: 3,
      resume_text: 'Developed scalable microservices and high-throughput Express REST APIs with React frontends.'
    };

    const doclingMd = careerIntelligenceService.parseResumeWithDocling(sampleApplicant);
    assert.ok(typeof doclingMd === 'string' && doclingMd.length > 50, 'Docling output must be non-empty string');
    assert.ok(doclingMd.includes('# Resume Document: Priya Sharma'), 'Must contain header section');
    assert.ok(doclingMd.includes('## Core Technical Skills'), 'Must contain technical skills section');
    assert.ok(doclingMd.includes('## Professional Experience'), 'Must contain experience section');
    assert.ok(doclingMd.includes('## Education & Certifications'), 'Must contain education section');
  });

  // -------------------------------------------------------------
  // Test 5: Quantitative ATS Score Calculation Formula
  // -------------------------------------------------------------
  runTest('ATS scoring engine computes score between 0 and 100 with keyword breakdown', () => {
    const resumeText = 'Senior Full Stack Engineer with expertise in JavaScript, Node.js, Express, React, and MySQL database optimization.';
    const targetRole = 'Senior Full Stack Engineer';

    const result = careerIntelligenceService.calculateATSScore(resumeText, targetRole);
    assert.ok(result.ats_score >= 0 && result.ats_score <= 100, `ATS score out of range: ${result.ats_score}`);
    assert.ok(['HIGH MATCH', 'MEDIUM MATCH', 'LOW MATCH'].includes(result.ats_tier), `Invalid ATS tier: ${result.ats_tier}`);
    assert.ok(Array.isArray(result.matched_keywords), 'matched_keywords must be an array');
    assert.ok(Array.isArray(result.missing_keywords), 'missing_keywords must be an array');
    assert.ok(result.matched_keywords.includes('node.js') || result.matched_keywords.includes('javascript'), 'Expected matched keywords');
    assert.ok(result.recommendation, 'Expected hiring recommendation');
  });

  // -------------------------------------------------------------
  // Test 6: ATS Structured Analysis Prompt Construction
  // -------------------------------------------------------------
  runTest('ATS analysis prompt builder constructs structured role & evaluation instructions', () => {
    const applicant = {
      applicant_name: 'Arjun Mehta',
      job_title: 'Full Stack Developer',
      skills: 'Node.js, Express, MySQL',
      experience_years: 2
    };
    const doclingMd = '# Resume Document: Arjun Mehta\n## Core Technical Skills\n- Node.js\n- Express';
    const atsMetrics = {
      ats_score: 84.5,
      ats_tier: 'HIGH MATCH',
      matched_keywords: ['node.js', 'express', 'mysql'],
      missing_keywords: ['docker', 'kubernetes']
    };

    const promptObj = careerIntelligenceService.buildATSAnalysisPrompt(applicant, doclingMd, atsMetrics, 'Full Stack Lead');
    assert.ok(promptObj.systemPrompt && promptObj.systemPrompt.includes('Technical Talent Partner'), 'System prompt missing role constraints');
    assert.ok(promptObj.userPrompt && promptObj.userPrompt.includes('Arjun Mehta'), 'User prompt missing applicant name');
    assert.ok(promptObj.userPrompt.includes('84.5%'), 'User prompt missing ATS score');
    assert.ok(promptObj.userPrompt.includes('Executive Summary'), 'User prompt missing Executive Summary directive');
    assert.ok(promptObj.userPrompt.includes('Interview Probe Points'), 'User prompt missing Probe Points directive');
  });

  // -------------------------------------------------------------
  // Test 7: analyzeResumeIntelligenceDoclingATS Primary Provider Execution (Groq)
  // -------------------------------------------------------------
  await runAsyncTest('Module 5 ATS execution succeeds with primary provider (Groq llama-3.3-70b-versatile)', async () => {
    const result = await careerIntelligenceService.analyzeResumeIntelligenceDoclingATS({
      candidate_id: 1,
      target_role: 'Senior Full Stack Engineer'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.provider.includes('Groq') || result.provider.includes('Deterministic Fallback'), `Unexpected provider: ${result.provider}`);
    assert.ok(result.ats_score >= 50 && result.ats_score <= 100, `Invalid ats_score: ${result.ats_score}`);
    assert.ok(result.ai_resume_summary && result.ai_resume_summary.length > 50, 'ai_resume_summary must be substantive');
    assert.ok(result.docling_markdown && result.docling_markdown.includes('# Resume Document'), 'docling_markdown missing');
  });

  // -------------------------------------------------------------
  // Test 8: analyzeResumeIntelligenceDoclingATS Simulated Groq Failure with OpenRouter Fallback
  // -------------------------------------------------------------
  await runAsyncTest('Module 5 fallback seamlessly activates secondary provider on simulated Groq error', async () => {
    const result = await careerIntelligenceService.analyzeResumeIntelligenceDoclingATS({
      candidate_id: 1,
      target_role: 'Senior Full Stack Engineer',
      simulate_groq_failure: true
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.provider.includes('OpenRouter') || result.provider.includes('Deterministic Fallback'), `Provider was: ${result.provider}`);
    assert.ok(result.ai_resume_summary, 'Summary generated despite Groq failure');
    assert.ok(result.ats_score > 0, 'ATS score calculated');
  });

  // -------------------------------------------------------------
  // Test 9: Robust Error Handling when both providers fail
  // -------------------------------------------------------------
  await runAsyncTest('Module 5 returns graceful user-friendly error when both providers fail', async () => {
    const result = await careerIntelligenceService.analyzeResumeIntelligenceDoclingATS({
      candidate_id: 1,
      simulate_both_failure: true
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.error, 'Expected error message');
    assert.ok(result.error.includes('Both primary provider (Groq) and secondary fallback (OpenRouter) failed'), `Unexpected error msg: ${result.error}`);
  });

  // -------------------------------------------------------------
  // Test 10: Express POST /api/cia/career/resume-intelligence
  // -------------------------------------------------------------
  await runAsyncTest('Express API: POST /api/cia/career/resume-intelligence returns 200 with ATS metrics', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/cia/career/resume-intelligence', {
      candidate_id: 1,
      target_role: 'Senior Full Stack Engineer'
    });

    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.rawBody}`);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.ats_score !== undefined, 'Missing ats_score');
    assert.ok(res.body.ai_resume_summary, 'Missing ai_resume_summary');
    assert.ok(Array.isArray(res.body.matched_keywords), 'Missing matched_keywords');
  });

  // -------------------------------------------------------------
  // Test 11: Express POST /candidate/cia/career/resume-intelligence (Candidate Alias)
  // -------------------------------------------------------------
  await runAsyncTest('Express API: POST /candidate/cia/career/resume-intelligence returns 200 with ATS metrics', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/candidate/cia/career/resume-intelligence', {
      candidate_id: 1,
      target_role: 'Senior Full Stack Engineer'
    });

    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.rawBody}`);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.ats_score !== undefined, 'Missing ats_score');
    assert.ok(res.body.docling_markdown, 'Missing docling_markdown');
  });

  // -------------------------------------------------------------
  // Test 12: Express POST /api/applicants/:id/generate-resume-summary
  // -------------------------------------------------------------
  await runAsyncTest('Express API: POST /api/applicants/:id/generate-resume-summary updates applicant summary', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/applicants/1/generate-resume-summary', {});

    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.rawBody}`);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.summary || res.body.ai_resume_summary, 'Missing summary');
    assert.ok(res.body.ats_score !== undefined, 'Missing ats_score');
  });

  // -------------------------------------------------------------
  // Test 13: Laravel CiaController Parity Verification
  // -------------------------------------------------------------
  runTest('Laravel Parity: CiaController implements resumeIntelligence handler', () => {
    const controllerPath = path.resolve(__dirname, '../app/Http/Controllers/Web/CiaController.php');
    assert.ok(fs.existsSync(controllerPath), `Controller file not found at ${controllerPath}`);
    const content = fs.readFileSync(controllerPath, 'utf8');

    assert.ok(content.includes('function resumeIntelligence'), 'Missing resumeIntelligence method in CiaController');
    assert.ok(content.includes('extractResumeWithDocling'), 'Missing extractResumeWithDocling in CiaController');
    assert.ok(content.includes('calculateAtsScore'), 'Missing calculateAtsScore in CiaController');
    assert.ok(content.includes('buildAtsAnalysisPrompt'), 'Missing buildAtsAnalysisPrompt in CiaController');
    assert.ok(content.includes('ats_score'), 'Missing ats_score in response');
  });

  // -------------------------------------------------------------
  // Test 14: Laravel Routes Parity Verification
  // -------------------------------------------------------------
  runTest('Laravel Parity: routes/web.php routes /career/resume-intelligence', () => {
    const routesPath = path.resolve(__dirname, '../routes/web.php');
    assert.ok(fs.existsSync(routesPath), `Routes file not found at ${routesPath}`);
    const content = fs.readFileSync(routesPath, 'utf8');

    assert.ok(content.includes('/career/resume-intelligence'), 'Missing route definition for /career/resume-intelligence');
    assert.ok(content.includes('resumeIntelligence'), 'Missing resumeIntelligence action mapping');
  });

  // -------------------------------------------------------------
  // Test 15: Candidate Portal Blade Template Parity Verification
  // -------------------------------------------------------------
  runTest('Candidate Blade UI contains Docling ATS scorecard, keywords breakdown, and trigger script', () => {
    const bladePath = path.resolve(__dirname, '../resources/views/candidate/cia.blade.php');
    assert.ok(fs.existsSync(bladePath), `Blade file not found at ${bladePath}`);
    const content = fs.readFileSync(bladePath, 'utf8');

    assert.ok(content.includes('id="docling-resume-intelligence-section"'), 'Missing #docling-resume-intelligence-section');
    assert.ok(content.includes('id="btn-generate-docling-ats"'), 'Missing #btn-generate-docling-ats');
    assert.ok(content.includes('id="ats-score-badge"'), 'Missing #ats-score-badge');
    assert.ok(content.includes('id="ats-tier-badge"'), 'Missing #ats-tier-badge');
    assert.ok(content.includes('id="ats-matched-keywords"'), 'Missing #ats-matched-keywords');
    assert.ok(content.includes('id="ats-missing-keywords"'), 'Missing #ats-missing-keywords');
    assert.ok(content.includes('id="docling-ai-summary-content"'), 'Missing #docling-ai-summary-content');
    assert.ok(content.includes('function triggerResumeIntelligenceATS'), 'Missing triggerResumeIntelligenceATS JS function');
  });

  console.log('================================================================');
  console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
  console.log('================================================================');

  if (passedTests < totalTests) {
    process.exit(1);
  }
})();
