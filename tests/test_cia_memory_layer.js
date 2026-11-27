/**
 * test_cia_memory_layer.js
 *
 * Comprehensive Unit & Integration Test Suite for Week 8 Day 4:
 * CIA Memory Layer — ChromaDB Persistent Intern Profile
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');

const { ChromaPersistentStore } = require('../backend/modules/ai/ChromaPersistentStore');
const { CareerIntelligenceService } = require('../backend/modules/ai/CareerIntelligenceService');
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
      'user-agent': 'test-cia-memory-client',
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
  console.log('🧪 Week 8 Day 4: CIA Memory Layer — ChromaDB Persistent Profile');
  console.log('================================================================');

  const tmpStorePath = path.join(os.tmpdir(), `cynaris-chromadb-test-${process.pid}.json`);
  if (fs.existsSync(tmpStorePath)) fs.unlinkSync(tmpStorePath);

  try {
    // Test 1: Persistent Store writes to disk and survives rehydration
    runTest('1. ChromaPersistentStore persists collections to disk and reloads across restarts', () => {
      const store1 = new ChromaPersistentStore(tmpStorePath);
      const svc1 = new CareerIntelligenceService({ persistentStore: store1 });

      const roles = svc1.ensureInternshipRolesSeededInChroma();
      assert.strictEqual(roles.length, 20, 'Must seed all 20 roles into cynaris_internship_roles');
      assert.strictEqual(roles[0].embedding.length, 384, 'Embeddings must be 384-dim');

      svc1.upsertInternMemoryProfile({
        candidate_id: 42,
        name: 'Ananya Rao',
        target_role: 'AI Systems Engineer',
        progress_pct: 86,
        skills: { Python: 5, ChromaDB: 4, Docker: 4, JavaScript: 4 },
        note: 'Finished RAG pipeline and ChromaDB persistence workshop',
      });

      // Simulate restart by constructing new store & service reading from same disk path
      const store2 = new ChromaPersistentStore(tmpStorePath);
      const svc2 = new CareerIntelligenceService({ persistentStore: store2 });

      assert.strictEqual(store2.count('cynaris_internship_roles'), 20);
      const recalled = svc2.getInternMemoryProfile(42);
      assert.ok(recalled, 'Intern #42 must survive store re-instantiation');
      assert.strictEqual(recalled.name, 'Ananya Rao');
      assert.strictEqual(recalled.progress_pct, 86);
      assert.ok(recalled.history.length >= 1);
    });

    // Test 2: matchInternshipsWithChromaDB recalls persisted skills when omitted
    runTest('2. matchInternshipsWithChromaDB recalls persisted intern skills from ChromaDB memory', () => {
      const store = new ChromaPersistentStore(tmpStorePath);
      const svc = new CareerIntelligenceService({ persistentStore: store });

      const result = svc.matchInternshipsWithChromaDB({}, { candidateId: 42, limit: 5 });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.collection, 'cynaris_internship_roles');
      assert.strictEqual(result.totalRolesAvailable, 20);
      assert.strictEqual(result.matches.length, 5);
      assert.ok(result.matches[0].matchedSkills.length > 0, 'Must match skills recalled from ChromaDB memory');
    });

    // Test 3: Semantic memory query & reasoning with Groq/OpenRouter fallback
    await runAsyncTest('3. queryInternMemoryAndReason recalls semantic events and handles fallbacks', async () => {
      const store = new ChromaPersistentStore(tmpStorePath);
      const svc = new CareerIntelligenceService({ persistentStore: store });

      const res = await svc.queryInternMemoryAndReason({
        candidate_id: 42,
        query: 'RAG pipeline progress',
      });
      assert.strictEqual(res.success, true);
      assert.ok(res.recalled_memories.length >= 1);
      assert.ok(res.reasoning && res.reasoning.includes('Ananya Rao'));

      const fallbackRes = await svc.queryInternMemoryAndReason({
        candidate_id: 42,
        simulate_groq_failure: true,
      });
      assert.strictEqual(fallbackRes.success, true);
      assert.ok(fallbackRes.provider.includes('OpenRouter'));

      const failRes = await svc.queryInternMemoryAndReason({
        candidate_id: 42,
        simulate_both_failure: true,
      });
      assert.strictEqual(failRes.success, false);
      assert.strictEqual(failRes.provider, 'None');
    });

    // Test 4: Express POST /api/cia/memory/profile & GET /api/cia/memory/profile/:id
    await runAsyncTest('4. Express API persists and retrieves intern profiles via /api/cia/memory/profile', async () => {
      const postRes = await dispatchExpressRequest(app, 'POST', '/api/cia/memory/profile', {
        candidate_id: 1,
        name: 'Murali V',
        target_role: 'Senior Full Stack Engineer',
        progress_pct: 95,
        note: 'Verified ChromaDB memory persistence',
      });
      assert.strictEqual(postRes.statusCode, 200);
      assert.strictEqual(postRes.body.success, true);
      assert.strictEqual(postRes.body.embeddingDimensions, 384);

      const getRes = await dispatchExpressRequest(app, 'GET', '/api/cia/memory/profile/1');
      assert.strictEqual(getRes.statusCode, 200);
      assert.strictEqual(getRes.body.profile.progress_pct, 95);

      const badRes = await dispatchExpressRequest(app, 'GET', '/api/cia/memory/profile/abc');
      assert.strictEqual(badRes.statusCode, 400);
    });

    // Test 5: Express POST /candidate/cia/career/match-internships & POST /api/cia/memory/query
    await runAsyncTest('5. Express API executes /candidate/cia/career/match-internships and /api/cia/memory/query', async () => {
      const matchRes = await dispatchExpressRequest(app, 'POST', '/candidate/cia/career/match-internships', {
        candidateId: 1,
        limit: 5,
      });
      assert.strictEqual(matchRes.statusCode, 200);
      assert.strictEqual(matchRes.body.collection, 'cynaris_internship_roles');
      assert.strictEqual(matchRes.body.totalRolesAvailable, 20);
      assert.strictEqual(matchRes.body.matches.length, 5);

      const queryRes = await dispatchExpressRequest(app, 'POST', '/api/cia/memory/query', {
        candidate_id: 1,
        query: 'What gaps remain?',
      });
      assert.strictEqual(queryRes.statusCode, 200);
      assert.strictEqual(queryRes.body.success, true);
      assert.ok(queryRes.body.reasoning);
    });

    // Test 6: Laravel & UI Parity
    runTest('6. Laravel Parity & UI: CiaController, routes/web.php, cia.blade.php, and chromadb-memory.html', () => {
      const ctrl = fs.readFileSync(path.resolve(__dirname, '../app/Http/Controllers/Web/CiaController.php'), 'utf8');
      assert.ok(ctrl.includes('function upsertInternMemoryProfile'));
      assert.ok(ctrl.includes('function getInternMemoryProfile'));
      assert.ok(ctrl.includes('function queryInternMemory'));
      assert.ok(ctrl.includes('cynaris_intern_profiles'));

      const routes = fs.readFileSync(path.resolve(__dirname, '../routes/web.php'), 'utf8');
      assert.ok(routes.includes('/memory/profile'));
      assert.ok(routes.includes('/memory/query'));

      const blade = fs.readFileSync(path.resolve(__dirname, '../resources/views/candidate/cia.blade.php'), 'utf8');
      assert.ok(blade.includes('id="chromadb-memory-layer-section"'));
      assert.ok(blade.includes('id="btn-query-cia-memory"'));
      assert.ok(fs.existsSync(path.resolve(__dirname, '../backend/public/chromadb-memory.html')));
    });
  } finally {
    if (fs.existsSync(tmpStorePath)) fs.unlinkSync(tmpStorePath);
  }

  console.log('================================================================');
  console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
  console.log('================================================================');

  if (passedTests < totalTests) {
    process.exit(1);
  }
})();
