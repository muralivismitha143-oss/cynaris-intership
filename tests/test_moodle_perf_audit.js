/**
 * test_moodle_perf_audit.js
 * 
 * Comprehensive Unit Test Suite for Week 6 Day 4:
 * Performance Audit — EXPLAIN Queries + Index Optimisation
 * 
 * Verifies:
 *   1. Socratic prompt construction & DBRE context injection
 *   2. Groq primary provider configuration (llama-3.3-70b-versatile)
 *   3. OpenRouter automated fallback (meta-llama/llama-3.3-70b-instruct)
 *   4. Local deterministic fallback on dual cloud failure
 *   5. Strict JSON schema validation (riskLevel, bottlenecks, indexRecommendations)
 *   6. Query sargability & antipattern detection (CRITICAL vs OPTIMIZED)
 *   7. SQL schema optimizations file (schema_optimizations.sql)
 *   8. Moodle PHP service parity (QueryAuditService.php)
 *   9. Express REST endpoints (/perf/health, /perf/benchmarks, /perf/explain, /perf/audit)
 *   10. Moodle Block UI deck in block_cynaris_stats.php
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');

const { AiQueryOptimizerService, aiQueryOptimizerService } = require('../backend/modules/ai/AiQueryOptimizerService');
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
      'user-agent': 'test-moodle-perf-client',
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
  console.log('🧪 Week 6 Day 4: Performance Audit & Index Optimisation Test Suite');
  console.log('================================================================\n');

  const testUnoptimizedQuery = "SELECT u.id, COUNT(l.id) FROM mdl_user u LEFT JOIN mdl_log l ON u.id = l.userid AND DATE(FROM_UNIXTIME(l.time)) >= DATE(NOW() - INTERVAL 7 DAY) WHERE u.deleted = 0 GROUP BY u.id";
  const testOptimizedQuery = "SELECT u.id, COUNT(l.id) FROM mdl_user u LEFT JOIN mdl_log l ON u.id = l.userid AND l.action = 'login' AND l.time >= UNIX_TIMESTAMP(NOW() - INTERVAL 7 DAY) WHERE u.deleted = 0 GROUP BY u.id";

  // --- Test Group 1: Socratic Prompt Construction ---
  console.log('--- Test 1: Socratic Prompt Construction & DBRE Persona ---');
  runTest('buildAuditPrompt constructs system and user prompt with EXPLAIN diagnostics', () => {
    const service = new AiQueryOptimizerService({ groqApiKey: 'dummy' });
    const prompt = service.buildAuditPrompt({ query: testUnoptimizedQuery });

    assert(prompt.systemPrompt.includes('Principal Database Reliability Engineer'), 'System prompt must define DBRE persona');
    assert(prompt.systemPrompt.includes('Equality-Range-Sort'), 'System prompt must include B-Tree indexing rules');
    assert(prompt.userPrompt.includes('mdl_log'), 'User prompt must include target table name');
    assert(prompt.userPrompt.includes('EXPLAIN Execution Plan Telemetry'), 'User prompt must include EXPLAIN metrics');
  });

  // --- Test Group 2: Primary Provider Configuration via Groq ---
  console.log('\n--- Test 2: Primary Provider Configuration via Groq ---');
  runTest('Specifies Groq primary model llama-3.3-70b-versatile', () => {
    const service = new AiQueryOptimizerService({ groqApiKey: 'dummy' });
    assert.strictEqual(service.primaryModel, 'llama-3.3-70b-versatile');
    assert(service.timeoutMs >= 5000, 'Timeout must be at least 5000ms');
  });

  await runAsyncTest('Executes primary Groq inference when mocked response is received', async () => {
    const service = new AiQueryOptimizerService({ groqApiKey: 'dummy_key' });
    service.callGroq = async () => ({
      querySummary: {
        rawQuery: testUnoptimizedQuery,
        operation: 'SELECT',
        tablesInvolved: ['mdl_log', 'mdl_user']
      },
      explainAnalysis: {
        riskLevel: 'CRITICAL',
        accessType: 'ALL',
        estimatedRowsExamined: 1500000,
        bottlenecks: ['Full table scan on mdl_log']
      },
      sargability: {
        score: 30,
        isSargable: false,
        violations: ['DATE() wrapper on l.time']
      },
      indexRecommendations: [
        {
          tableName: 'mdl_log',
          indexName: 'idx_mdl_log_user_action_time',
          columns: ['userid', 'action', 'time'],
          indexType: 'BTREE',
          ddl: 'CREATE INDEX idx_mdl_log_user_action_time ON mdl_log(userid, action, time);',
          reason: 'Composite index eliminating full table scan'
        }
      ],
      rewrittenQuery: testOptimizedQuery,
      estimatedSpeedup: '98% fewer rows examined; 150x faster',
      pedagogicalExplanation: 'Functions wrapping index columns prevent B-Tree index traversal.'
    });

    const result = await service.auditQueryPerformance({ query: testUnoptimizedQuery });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provider, 'groq');
    assert.strictEqual(result.model, 'llama-3.3-70b-versatile');
    assert.strictEqual(result.fallbackUsed, false);
    assert.strictEqual(result.data.explainAnalysis.riskLevel, 'CRITICAL');
  });

  // --- Test Group 3: Automated Failover to OpenRouter ---
  console.log('\n--- Test 3: Automated Failover to OpenRouter ---');
  runTest('Specifies OpenRouter fallback model meta-llama/llama-3.3-70b-instruct', () => {
    const service = new AiQueryOptimizerService({ openRouterApiKey: 'dummy_or' });
    assert.strictEqual(service.fallbackModel, 'meta-llama/llama-3.3-70b-instruct');
  });

  await runAsyncTest('Automatically fails over to OpenRouter when Groq fails', async () => {
    const service = new AiQueryOptimizerService({
      groqApiKey: 'failing_key',
      openRouterApiKey: 'mock_openrouter_key'
    });

    service.callGroq = async () => { throw new Error('Simulated Groq 429 Rate Limit Exceeded'); };
    service.callOpenRouter = async () => ({
      querySummary: {
        rawQuery: testUnoptimizedQuery,
        operation: 'SELECT',
        tablesInvolved: ['mdl_log']
      },
      explainAnalysis: {
        riskLevel: 'CRITICAL',
        accessType: 'ALL',
        estimatedRowsExamined: 1500000,
        bottlenecks: ['OpenRouter fallback: table scan']
      },
      sargability: {
        score: 35,
        isSargable: false,
        violations: ['Non-sargable timestamp conversion']
      },
      indexRecommendations: [
        {
          tableName: 'mdl_log',
          indexName: 'idx_mdl_log_user_action_time',
          columns: ['userid', 'action', 'time'],
          indexType: 'BTREE',
          ddl: 'CREATE INDEX idx_mdl_log_user_action_time ON mdl_log(userid, action, time);',
          reason: 'Composite index'
        }
      ],
      rewrittenQuery: testOptimizedQuery,
      estimatedSpeedup: '95% reduction in rows',
      pedagogicalExplanation: 'B-tree index traversal requires bare columns on left side of comparison.'
    });

    const result = await service.auditQueryPerformance({ query: testUnoptimizedQuery });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provider, 'openrouter');
    assert.strictEqual(result.model, 'meta-llama/llama-3.3-70b-instruct');
    assert.strictEqual(result.fallbackUsed, true);
    assert(result.fallbackReason.includes('Groq API error'), 'Fallback reason must detail Groq failure');
  });

  // --- Test Group 4: Local Deterministic Fallback on Dual Cloud Failure ---
  console.log('\n--- Test 4: Local Deterministic Fallback on Dual Cloud Failure ---');
  await runAsyncTest('Engages Local Deterministic Engine when both Groq and OpenRouter fail', async () => {
    const service = new AiQueryOptimizerService({
      groqApiKey: null,
      openRouterApiKey: null
    });

    const result = await service.auditQueryPerformance({ query: testUnoptimizedQuery });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.provider, 'local-deterministic');
    assert.strictEqual(result.model, 'deterministic-query-optimizer-v1');
    assert.strictEqual(result.fallbackUsed, true);
    assert.strictEqual(result.data.explainAnalysis.riskLevel, 'CRITICAL');
    assert(result.data.indexRecommendations[0].ddl.includes('idx_mdl_log_user_action_time'), 'Must recommend composite index');
    assert(result.data.estimatedSpeedup.includes('rows examined'), 'Must provide speedup metrics');
  });

  // --- Test Group 5: Strict Audit Schema Validation ---
  console.log('\n--- Test 5: Strict Audit Schema Validation ---');
  runTest('validateAuditStructure rejects malformed payloads', () => {
    const service = new AiQueryOptimizerService();

    assert.throws(() => service.validateAuditStructure(null), /non-null object/);
    assert.throws(() => service.validateAuditStructure({}), /Missing or invalid querySummary/);
    assert.throws(() => service.validateAuditStructure({
      querySummary: {},
      explainAnalysis: { riskLevel: 'INVALID_RISK', bottlenecks: [] },
      sargability: { score: 90 },
      indexRecommendations: [],
      rewrittenQuery: '',
      estimatedSpeedup: '',
      pedagogicalExplanation: ''
    }), /riskLevel must be one of/);
    assert.throws(() => service.validateAuditStructure({
      querySummary: { rawQuery: 'SELECT 1' },
      explainAnalysis: { riskLevel: 'CRITICAL', bottlenecks: [] },
      sargability: { score: 90 },
      indexRecommendations: [],
      rewrittenQuery: 'SELECT 1',
      estimatedSpeedup: 'Fast',
      pedagogicalExplanation: 'Good'
    }), /indexRecommendations must be a non-empty array/);
  });

  // --- Test Group 6: Sargability & Antipattern Analysis ---
  console.log('\n--- Test 6: Query Sargability & Antipattern Analysis ---');
  runTest('Correctly classifies unindexed date wrap query as CRITICAL and clean query as OPTIMIZED', () => {
    const service = new AiQueryOptimizerService();
    const badResult = service.localDeterministicFallback({ query: testUnoptimizedQuery });
    const goodResult = service.localDeterministicFallback({ query: "SELECT u.id, c.fullname FROM mdl_user u JOIN mdl_course c ON u.id = c.id WHERE u.deleted = 0" });

    assert.strictEqual(badResult.explainAnalysis.riskLevel, 'CRITICAL');
    assert.strictEqual(badResult.sargability.isSargable, false);
    assert(badResult.sargability.violations.length > 0);

    assert.strictEqual(goodResult.explainAnalysis.riskLevel, 'OPTIMIZED');
    assert.strictEqual(goodResult.sargability.isSargable, true);
  });

  // --- Test Group 7: SQL Schema Optimizations Migration File ---
  console.log('\n--- Test 7: SQL Schema Optimizations Migration File ---');
  runTest('moodle/database/schema_optimizations.sql exists and defines required composite indexes', () => {
    const sqlPath = path.resolve(__dirname, '../moodle/database/schema_optimizations.sql');
    assert(fs.existsSync(sqlPath), 'schema_optimizations.sql must exist');
    const content = fs.readFileSync(sqlPath, 'utf8');

    assert(content.includes('idx_mdl_log_user_action_time'), 'Must define composite index on mdl_log');
    assert(content.includes('idx_mdl_grade_item_user_final'), 'Must define composite index on mdl_grade_grades');
    assert(content.includes('idx_mdl_completions_user_course_status'), 'Must define composite index on mdl_course_completions');
  });

  // --- Test Group 8: Moodle PHP Service Parity ---
  console.log('\n--- Test 8: Moodle PHP Service Parity ---');
  runTest('moodle/local/cynaris_perf/QueryAuditService.php exists and defines required methods', () => {
    const phpPath = path.resolve(__dirname, '../moodle/local/cynaris_perf/QueryAuditService.php');
    assert(fs.existsSync(phpPath), 'QueryAuditService.php must exist');
    const content = fs.readFileSync(phpPath, 'utf8');

    assert(content.includes('class QueryAuditService'), 'Must define class QueryAuditService');
    assert(content.includes('function explainQuery'), 'Must define explainQuery method');
    assert(content.includes('function buildPrompt'), 'Must define buildPrompt method');
    assert(content.includes('function auditQueryPerformance'), 'Must define auditQueryPerformance method');
    assert(content.includes('function localDeterministicAudit'), 'Must define localDeterministicAudit method');
  });

  // --- Test Group 9: Express REST API Endpoints ---
  console.log('\n--- Test 9: Express REST API Endpoints Integration ---');

  await runAsyncTest('GET /api/moodle/perf/health returns 200 with operational status', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/moodle/perf/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'operational');
    assert.strictEqual(res.body.primaryProvider.provider, 'groq');
    assert.strictEqual(res.body.fallbackProvider.provider, 'openrouter');
  });

  await runAsyncTest('GET /api/moodle/perf/benchmarks returns 200 with benchmark dataset', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/moodle/perf/benchmarks');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.benchmarks));
    assert(res.body.benchmarks.length >= 2);
  });

  await runAsyncTest('POST /api/moodle/perf/explain returns 200 with EXPLAIN execution plan', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/moodle/perf/explain', {
      query: testUnoptimizedQuery
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.explainPlan.table, 'mdl_log');
    assert.strictEqual(res.body.explainPlan.type, 'ALL');
  });

  await runAsyncTest('POST /api/moodle/perf/audit returns 200 with performance audit and indexing advice', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/moodle/perf/audit', {
      query: testUnoptimizedQuery,
      simulateBothFailure: true
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.explainAnalysis.riskLevel, 'CRITICAL');
    assert(res.body.data.indexRecommendations.length > 0);
  });

  await runAsyncTest('POST /api/moodle/perf/audit returns 400 when query is missing', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/moodle/perf/audit', {});
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  // --- Test Group 10: Moodle Block UI Integration ---
  console.log('\n--- Test 10: Moodle Block UI Integration in block_cynaris_stats.php ---');
  runTest('block_cynaris_stats.php includes the SQL Performance & Index Advisor container and handler', () => {
    const blockPath = path.resolve(__dirname, '../blocks/cynaris_stats/block_cynaris_stats.php');
    assert(fs.existsSync(blockPath), 'blocks/cynaris_stats/block_cynaris_stats.php must exist');
    const content = fs.readFileSync(blockPath, 'utf8');

    assert(content.includes('id="cynaris-perf-audit-section"'), 'Must define perf audit section container');
    assert(content.includes('id="cynaris-run-audit-btn"'), 'Must define run audit button');
    assert(content.includes('id="cynaris-perf-result"'), 'Must define perf result container');
    assert(content.includes('aria-live="polite"'), 'Must define ARIA live region');
    assert(content.includes('runQueryPerformanceAudit'), 'Must define client-side audit function');
  });

  console.log('\n================================================================');
  if (passedTests === totalTests) {
    console.log(`🎉 [SUCCESS] All ${passedTests} Week 6 Day 4 Performance Audit Tests Passed!`);
  } else {
    console.log(`❌ [FAILURE] ${passedTests}/${totalTests} Tests Passed.`);
  }
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
