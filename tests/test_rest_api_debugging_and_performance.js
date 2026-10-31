/**
 * test_rest_api_debugging_and_performance.js
 * 
 * Comprehensive Unit & Integration Test Suite for Week 4 Day 3:
 * "Debug Sprint — Root Cause 2 Issues + Performance Investigation"
 * 
 * Demonstrates:
 * 1. Root Cause 1: Route Parameter Type Coercion & Status Code Consistency
 *    - GET /api/applicants/:applicant_id
 *    - Validates 400 Bad Request for non-integer or malformed IDs ('abc', '-5', '1.5')
 *    - Validates 404 Not Found for non-existent IDs ('999')
 *    - Validates 200 OK for valid integer ID ('1')
 * 
 * 2. RESTful Query String Filtering, Sorting & Pagination
 *    - GET /api/applicants?stage=Technical%20Round%201
 *    - GET /api/applicants?search=python
 *    - GET /api/applicants?min_exp=3
 *    - GET /api/applicants?page=1&limit=2 (Pagination envelope)
 *    - POST /api/applicants -> 201 Created + Location Header
 *    - PATCH /api/applicants/:id/stage -> 200 OK
 * 
 * 3. Root Cause 2: Query String Filtering & RESTful Methods in Smart Reminders
 *    - GET /api/reminders/scheduled?status=Scheduled
 *    - GET /api/reminders/scheduled?channel=Email
 *    - GET /api/reminders/scheduled?ruleId=rule-1
 *    - PATCH /api/reminders/rules/:ruleId -> 200 OK (Idempotent state update)
 *    - PATCH /api/reminders/rules/unknown-rule -> 404 Not Found
 *    - PATCH /api/reminders/rules/:ruleId (malformed payload) -> 400 Bad Request
 * 
 * 4. Performance Investigation: Conditional HTTP Caching (ETag & 304 Not Modified)
 *    - Initial GET returns 200 OK with ETag & Cache-Control headers
 *    - Subsequent conditional GET with If-None-Match returns 304 Not Modified
 *    - Verifies 0-byte body transfer & restCacheMetrics telemetry
 * 
 * 5. REST Performance Diagnostics Endpoint
 *    - GET /api/performance/rest-diagnostics
 *    - Event Loop lag measurement (setImmediate hrtime)
 *    - Bandwidth reduction analytics & HTTP contracts
 */

const assert = require('assert');
const http = require('http');
const { Readable, Duplex } = require('stream');
const path = require('path');

const app = require(path.resolve(__dirname, '../backend/server'));
const { restCacheMetrics } = require(path.resolve(__dirname, '../backend/middleware/restCacheMiddleware'));

// In-memory request dispatcher for reliable, zero-socket unit testing
function makeRequest(appInstance, { method = 'GET', path = '/', headers = {} }, body = null) {
  return new Promise((resolve) => {
    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const req = new Readable({
      read() {
        if (payload) {
          this.push(payload);
        }
        this.push(null);
      },
    });

    req.method = method;
    req.url = path;
    req.originalUrl = path;
    req.headers = {
      host: 'localhost:3000',
      'user-agent': 'test-client',
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
  console.log('🧪 Week 4 Day 3: REST API Debug Sprint & Performance Test Suite');
  console.log('================================================================');

  // =========================================================================
  // Test 1: Root Cause 1 — Route Parameter Type Coercion & Status Codes
  // =========================================================================
  console.log('\n--- Test 1: Route Parameter Type Coercion & Error Status Codes ---');

  // Case 1A: Non-numeric route parameter ('abc') should return 400 Bad Request
  const resAlpha = await makeRequest(app, {
    method: 'GET',
    path: '/api/applicants/abc',
  });
  assert.strictEqual(
    resAlpha.statusCode,
    400,
    'Non-numeric parameter must return 400 Bad Request'
  );
  assert.strictEqual(resAlpha.body.success, false);
  assert.ok(
    resAlpha.body.error.toLowerCase().includes('invalid applicant id'),
    'Must contain explicit invalid parameter error message'
  );
  console.log('  [PASS] GET /api/applicants/abc correctly returns 400 Bad Request');

  // Case 1B: Negative ID ('-5') should return 400 Bad Request
  const resNegative = await makeRequest(app, {
    method: 'GET',
    path: '/api/applicants/-5',
  });
  assert.strictEqual(resNegative.statusCode, 400, 'Negative ID must return 400 Bad Request');
  console.log('  [PASS] GET /api/applicants/-5 correctly returns 400 Bad Request');

  // Case 1C: Floating point ID ('1.5') should return 400 Bad Request
  const resFloat = await makeRequest(app, {
    method: 'GET',
    path: '/api/applicants/1.5',
  });
  assert.strictEqual(resFloat.statusCode, 400, 'Decimal ID must return 400 Bad Request');
  console.log('  [PASS] GET /api/applicants/1.5 correctly returns 400 Bad Request');

  // Case 1D: Non-existent integer ID ('999') should return 404 Not Found
  const resNotFound = await makeRequest(app, {
    method: 'GET',
    path: '/api/applicants/999',
  });
  assert.strictEqual(
    resNotFound.statusCode,
    404,
    'Valid integer but missing resource must return 404 Not Found'
  );
  assert.strictEqual(resNotFound.body.success, false);
  assert.ok(
    resNotFound.body.error.toLowerCase().includes('not found'),
    'Must contain resource not found message'
  );
  console.log('  [PASS] GET /api/applicants/999 correctly returns 404 Not Found');

  // Case 1E: Valid integer ID ('1') should return 200 OK with applicant object
  const resValid = await makeRequest(app, {
    method: 'GET',
    path: '/api/applicants/1',
  });
  assert.strictEqual(resValid.statusCode, 200, 'Valid ID must return 200 OK');
  assert.strictEqual(resValid.body.success, true);
  assert.strictEqual(resValid.body.applicant.id, 1);
  assert.strictEqual(resValid.body.applicant.name, 'Rahul Kumar');
  console.log('  [PASS] GET /api/applicants/1 correctly returns 200 OK with applicant entity');

  // =========================================================================
  // Test 2: RESTful Query String Filtering, Searching & Pagination
  // =========================================================================
  console.log('\n--- Test 2: RESTful Query String Filtering, Search & Pagination ---');

  // Case 2A: Filter by Pipeline Stage (?stage=Technical Round 1)
  const resStage = await makeRequest(app, {
    method: 'GET',
    path: '/api/applicants?stage=' + encodeURIComponent('Technical Round 1'),
  });
  assert.strictEqual(resStage.statusCode, 200);
  assert.ok(resStage.body.data.length >= 1);
  assert.ok(
    resStage.body.data.every((a) => a.pipeline_stage === 'Technical Round 1'),
    'All returned applicants must match filtered stage'
  );
  console.log('  [PASS] Query string ?stage=Technical Round 1 filters records correctly');

  // Case 2B: Search by Keyword (?search=python)
  const resSearch = await makeRequest(app, {
    method: 'GET',
    path: '/api/applicants?search=python',
  });
  assert.strictEqual(resSearch.statusCode, 200);
  assert.ok(resSearch.body.data.length >= 1);
  assert.ok(
    resSearch.body.data.some((a) => a.name === 'Priya Sharma'),
    'Search should find Priya Sharma by skills'
  );
  console.log('  [PASS] Query string ?search=python performs case-insensitive match');

  // Case 2C: Filter by Minimum Experience (?min_exp=3)
  const resExp = await makeRequest(app, {
    method: 'GET',
    path: '/api/applicants?min_exp=3',
  });
  assert.strictEqual(resExp.statusCode, 200);
  assert.ok(
    resExp.body.data.every((a) => a.experience_years >= 3),
    'All returned applicants must have experience >= 3'
  );
  console.log('  [PASS] Query string ?min_exp=3 filters by numeric threshold');

  // Case 2D: Pagination envelope (?page=1&limit=2)
  const resPage = await makeRequest(app, {
    method: 'GET',
    path: '/api/applicants?page=1&limit=2',
  });
  assert.strictEqual(resPage.statusCode, 200);
  assert.strictEqual(resPage.body.page, 1);
  assert.strictEqual(resPage.body.count, 2);
  assert.ok(resPage.body.totalPages >= 2);
  assert.strictEqual(resPage.body.hasNext, true);
  assert.strictEqual(resPage.body.hasPrev, false);
  console.log('  [PASS] Pagination envelope returns structured count, totalPages, and navigation flags');

  // Case 2E: Create Resource: POST /api/applicants -> 201 Created with Location header
  const newCandidate = {
    name: 'Aditya Sen',
    job_title: 'Full Stack Developer',
    skills: 'TypeScript, Next.js, Express, PostgreSQL',
    experience_years: 3,
    stage: 'Screening',
  };
  const resCreate = await makeRequest(
    app,
    {
      method: 'POST',
      path: '/api/applicants',
    },
    newCandidate
  );
  assert.strictEqual(resCreate.statusCode, 201, 'Resource creation must return 201 Created');
  assert.ok(resCreate.headers.location, 'Must provide Location response header');
  assert.ok(
    resCreate.headers.location.startsWith('/api/applicants/'),
    'Location header must point to resource URI'
  );
  const createdId = resCreate.body.applicant.id;
  console.log(`  [PASS] POST /api/applicants returns 201 Created with Location header: ${resCreate.headers.location}`);

  // Case 2F: Update Stage: PATCH /api/applicants/:applicant_id/stage
  const resPatchStage = await makeRequest(
    app,
    {
      method: 'PATCH',
      path: `/api/applicants/${createdId}/stage`,
    },
    { stage: 'Technical Round 1' }
  );
  assert.strictEqual(resPatchStage.statusCode, 200);
  assert.strictEqual(resPatchStage.body.applicant.pipeline_stage, 'Technical Round 1');
  console.log('  [PASS] PATCH /api/applicants/:id/stage updates resource status');

  // Case 2G: Delete Resource: DELETE /api/applicants/:applicant_id
  const resDelete = await makeRequest(app, {
    method: 'DELETE',
    path: `/api/applicants/${createdId}`,
  });
  assert.strictEqual(resDelete.statusCode, 200);
  console.log('  [PASS] DELETE /api/applicants/:id cleanly removes resource');

  // =========================================================================
  // Test 3: Root Cause 2 — Smart Reminders Query Filtering & RESTful Methods
  // =========================================================================
  console.log('\n--- Test 3: Smart Reminders Query Filtering & RESTful Methods ---');

  // Case 3A: Filter by Status (?status=Scheduled)
  const resRemStatus = await makeRequest(app, {
    method: 'GET',
    path: '/api/reminders/scheduled?status=Scheduled',
  });
  assert.strictEqual(resRemStatus.statusCode, 200);
  assert.strictEqual(resRemStatus.body.success, true);
  assert.ok(
    resRemStatus.body.scheduledReminders.every((r) => r.status.toLowerCase() === 'scheduled'),
    'All returned reminders must have status=Scheduled'
  );
  console.log('  [PASS] GET /api/reminders/scheduled?status=Scheduled filters properly');

  // Case 3B: Filter by Channel (?channel=Email)
  const resRemChannel = await makeRequest(app, {
    method: 'GET',
    path: '/api/reminders/scheduled?channel=Email',
  });
  assert.strictEqual(resRemChannel.statusCode, 200);
  assert.ok(
    resRemChannel.body.scheduledReminders.every(
      (r) => (r.suggestedTiming?.recommendedChannel || r.channel).toLowerCase() === 'email'
    ),
    'All returned reminders must use channel=Email'
  );
  console.log('  [PASS] GET /api/reminders/scheduled?channel=Email filters by recommended channel');

  // Case 3C: Filter by RuleId (?ruleId=rule-1)
  const resRemRule = await makeRequest(app, {
    method: 'GET',
    path: '/api/reminders/scheduled?ruleId=rule-1',
  });
  assert.strictEqual(resRemRule.statusCode, 200);
  assert.ok(
    resRemRule.body.scheduledReminders.every((r) => r.ruleId === 'rule-1'),
    'All returned reminders must match ruleId=rule-1'
  );
  console.log('  [PASS] GET /api/reminders/scheduled?ruleId=rule-1 filters by automation rule');

  // Case 3D: RESTful Partial Update: PATCH /api/reminders/rules/:ruleId
  const resPatchRule = await makeRequest(
    app,
    {
      method: 'PATCH',
      path: '/api/reminders/rules/rule-1',
    },
    { enabled: false }
  );
  assert.strictEqual(resPatchRule.statusCode, 200);
  assert.strictEqual(resPatchRule.body.rule.enabled, false);
  console.log('  [PASS] PATCH /api/reminders/rules/rule-1 updates rule enabled flag to false');

  // Revert rule enabled to true (Idempotent update)
  const resRevertRule = await makeRequest(
    app,
    {
      method: 'PATCH',
      path: '/api/reminders/rules/rule-1',
    },
    { enabled: true }
  );
  assert.strictEqual(resRevertRule.statusCode, 200);
  assert.strictEqual(resRevertRule.body.rule.enabled, true);
  console.log('  [PASS] PATCH /api/reminders/rules/rule-1 idempotently restores enabled flag to true');

  // Case 3E: Missing RuleId -> 404 Not Found
  const resRuleNotFound = await makeRequest(
    app,
    {
      method: 'PATCH',
      path: '/api/reminders/rules/non-existent-rule-999',
    },
    { enabled: true }
  );
  assert.strictEqual(resRuleNotFound.statusCode, 404);
  console.log('  [PASS] PATCH /api/reminders/rules/non-existent returns 404 Not Found');

  // Case 3F: Malformed payload -> 400 Bad Request
  const resRuleMalformed = await makeRequest(
    app,
    {
      method: 'PATCH',
      path: '/api/reminders/rules/rule-1',
    },
    { enabled: 'string-instead-of-boolean' }
  );
  assert.strictEqual(resRuleMalformed.statusCode, 400);
  console.log('  [PASS] PATCH /api/reminders/rules/rule-1 with invalid type returns 400 Bad Request');

  // =========================================================================
  // Test 4: Performance Optimization — Conditional Caching (ETag & 304)
  // =========================================================================
  console.log('\n--- Test 4: Performance Optimization (ETag & HTTP 304 Not Modified) ---');

  // Step 4A: Initial GET request (Cache Miss -> 200 OK with ETag)
  const resInitialGet = await makeRequest(app, {
    method: 'GET',
    path: '/api/applicants/1',
  });
  assert.strictEqual(resInitialGet.statusCode, 200);
  assert.ok(resInitialGet.headers.etag, 'Response must include ETag header');
  assert.strictEqual(resInitialGet.headers['x-cache-status'], 'MISS-200');
  assert.ok(
    resInitialGet.headers['cache-control'].includes('must-revalidate'),
    'Cache-Control must instruct client to revalidate'
  );
  const assignedEtag = resInitialGet.headers.etag;
  console.log(`  [PASS] Initial GET /api/applicants/1 generates ETag: ${assignedEtag}`);

  // Step 4B: Subsequent Conditional GET request (Cache Hit -> 304 Not Modified)
  const resConditionalGet = await makeRequest(app, {
    method: 'GET',
    path: '/api/applicants/1',
    headers: {
      'if-none-match': assignedEtag,
    },
  });
  assert.strictEqual(
    resConditionalGet.statusCode,
    304,
    'Matching If-None-Match header must trigger HTTP 304 Not Modified'
  );
  assert.strictEqual(resConditionalGet.headers['x-cache-status'], 'HIT-304');
  assert.strictEqual(
    resConditionalGet.rawBody.length,
    0,
    'HTTP 304 response body must be 0 bytes (zero-bandwidth transfer)'
  );
  console.log('  [PASS] Conditional GET with matching If-None-Match returns HTTP 304 with 0-byte payload');

  // Step 4C: Cache metrics verification
  assert.ok(restCacheMetrics.totalEvaluated >= 2);
  assert.ok(restCacheMetrics.cached304Count >= 1);
  assert.ok(restCacheMetrics.bytesSaved > 0);
  console.log(`  [PASS] restCacheMetrics recorded: ${restCacheMetrics.cached304Count} cache hits, ${restCacheMetrics.bytesSaved} bytes saved`);

  // =========================================================================
  // Test 5: REST Performance Diagnostics Endpoint
  // =========================================================================
  console.log('\n--- Test 5: REST Performance Diagnostics Endpoint ---');

  const resDiag = await makeRequest(app, {
    method: 'GET',
    path: '/api/performance/rest-diagnostics',
  });
  assert.strictEqual(resDiag.statusCode, 200);
  assert.strictEqual(resDiag.body.success, true);

  const diag = resDiag.body.diagnostics;
  assert.ok(diag.eventLoop);
  assert.strictEqual(typeof diag.eventLoop.currentLagMs, 'number');
  assert.ok(diag.eventLoop.currentLagMs < 25.0, 'Event loop lag must be below 25ms threshold');
  assert.strictEqual(diag.eventLoop.status, 'HEALTHY');

  assert.ok(diag.httpCaching);
  assert.ok(diag.httpCaching.etagEvaluationCount >= 1);
  assert.ok(diag.httpCaching.cacheHits304 >= 1);

  assert.ok(diag.restfulContracts);
  assert.ok(diag.restfulContracts.methodsSupported.includes('PATCH'));
  assert.ok(diag.restfulContracts.standardStatusCodes.caching.includes(304));

  console.log(`  [PASS] Event loop lag measured at: ${diag.eventLoop.currentLagMs}ms (Status: ${diag.eventLoop.status})`);
  console.log(`  [PASS] Diagnostic metrics: ${diag.httpCaching.cacheHits304} 304 hits (${diag.httpCaching.bandwidthReductionRatio} bandwidth reduction)`);

  console.log('\n================================================================');
  console.log('🎉 [SUCCESS] All 5 REST API Debug Sprint & Performance Tests Passed!');
  console.log('================================================================\n');
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
