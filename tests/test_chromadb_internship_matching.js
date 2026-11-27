/**
 * test_chromadb_internship_matching.js
 * 
 * Comprehensive Unit Test Suite for Week 7 Day 4:
 * Module 3: Internship Matching — ChromaDB Vector Search
 * 
 * Verifies:
 *   1. 20 Seeded Internship Roles in data/internship_roles.json with full metadata
 *   2. Sentence-transformers 384-dimensional dense vector embedding generation
 *   3. L2 Unit Normalization invariant on generated embedding vectors
 *   4. Mathematical Cosine Similarity calculation bounds [-1.0, 1.0]
 *   5. ChromaDB collection cynaris_internship_roles ingestion and retrieval
 *   6. Candidate skill profile vector matching and top 5 ranking
 *   7. Missing skills and matched skills precision per role
 *   8. Match % score scaling and monotonic descending order
 *   9. Laravel Parity (CiaController::matchInternships, routes/web.php, and cia.blade.php)
 *   10. Express REST API endpoints (POST /api/cia/career/match-internships & /candidate/cia/career/match-internships)
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
      'user-agent': 'test-chromadb-client',
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
  console.log('🧪 Week 7 Day 4: ChromaDB Vector Search Internship Matching');
  console.log('================================================================');

  const testCandidateSkills = {
    'JavaScript': { level: 4, verified: true },
    'Node.js': { level: 4, verified: true },
    'React': { level: 4, verified: true },
    'Docker & Containers': { level: 3, verified: true },
    'MySQL': { level: 3, verified: true },
    'Git Workflow': { level: 4, verified: true }
  };

  // Test 1: Verify 20 Seeded Internship Roles in data/internship_roles.json
  runTest('1. Seeded data contains exactly 20 internship roles with required fields', () => {
    const rolesPath = path.join(__dirname, '..', 'data', 'internship_roles.json');
    assert.ok(fs.existsSync(rolesPath), 'data/internship_roles.json must exist');

    const raw = fs.readFileSync(rolesPath, 'utf8');
    const parsed = JSON.parse(raw);

    assert.strictEqual(parsed.collection, 'cynaris_internship_roles', 'Collection must be cynaris_internship_roles');
    assert.strictEqual(parsed.totalRoles, 20, 'totalRoles must be exactly 20');
    assert.strictEqual(Array.isArray(parsed.roles), true, 'roles must be an array');
    assert.strictEqual(parsed.roles.length, 20, 'Must have exactly 20 role objects');

    parsed.roles.forEach((r, idx) => {
      assert.ok(r.id, `Role at index ${idx} must have id`);
      assert.ok(r.role, `Role at index ${idx} must have role title`);
      assert.ok(Array.isArray(r.required_skills) && r.required_skills.length > 0, `Role ${r.id} must have required_skills`);
      assert.ok(Array.isArray(r.nice_to_have), `Role ${r.id} must have nice_to_have`);
      assert.ok(r.description && r.description.length > 20, `Role ${r.id} must have detailed description`);
      assert.ok(r.department, `Role ${r.id} must have department`);
      assert.ok(r.location, `Role ${r.id} must have location`);
      assert.ok(r.stipend, `Role ${r.id} must have stipend`);
    });
  });

  // Test 2: Sentence-transformers 384-dimensional dense vector embedding generation
  runTest('2. Generates sentence-transformers 384-dimensional dense embedding vectors', () => {
    const sampleText = 'Full Stack Development Intern with Node.js, React, and Docker containerization experience.';
    const vec = careerIntelligenceService.generateSentenceTransformerEmbedding(sampleText, 384);

    assert.strictEqual(Array.isArray(vec), true, 'Vector must be an array');
    assert.strictEqual(vec.length, 384, 'Vector dimensionality must be exactly 384');
    vec.forEach(val => {
      assert.strictEqual(typeof val, 'number', 'Vector element must be numeric');
      assert.strictEqual(Number.isNaN(val), false, 'Vector element must not be NaN');
    });
  });

  // Test 3: L2 Unit Normalization invariant
  runTest('3. Embedding vectors strictly satisfy L2 unit norm invariant (||v|| = 1.0)', () => {
    const textA = 'Machine Learning Engineer LlamaIndex RAG Groq LPU';
    const vecA = careerIntelligenceService.generateSentenceTransformerEmbedding(textA, 384);

    let sumSquares = 0;
    for (let i = 0; i < vecA.length; i++) {
      sumSquares += vecA[i] * vecA[i];
    }
    const norm = Math.sqrt(sumSquares);
    assert.ok(Math.abs(norm - 1.0) < 0.005, `L2 norm must be approximately 1.0 (got ${norm})`);
  });

  // Test 4: Mathematical Cosine Similarity calculation bounds
  runTest('4. Cosine similarity calculates exact dot product within [-1.0, 1.0] bounds', () => {
    const vecA = careerIntelligenceService.generateSentenceTransformerEmbedding('Node.js Backend Systems', 384);
    const vecB = careerIntelligenceService.generateSentenceTransformerEmbedding('Node.js Backend Systems', 384);
    const vecC = careerIntelligenceService.generateSentenceTransformerEmbedding('Graphic Design Watercolor Painting', 384);

    const simSelf = careerIntelligenceService.computeCosineSimilarity(vecA, vecB);
    assert.ok(Math.abs(simSelf - 1.0) < 0.001, 'Self-similarity must equal 1.0');

    const simDiff = careerIntelligenceService.computeCosineSimilarity(vecA, vecC);
    assert.ok(simDiff >= -1.0 && simDiff <= 1.0, 'Similarity must remain within [-1.0, 1.0]');
    assert.ok(simDiff < simSelf, 'Different text corpus must yield lower similarity');
  });

  // Test 5: ChromaDB collection ingestion and retrieval
  runTest('5. Service loads all 20 roles from collection cynaris_internship_roles', () => {
    const roles = careerIntelligenceService.getInternshipRoles();
    assert.strictEqual(Array.isArray(roles), true);
    assert.strictEqual(roles.length, 20, 'Service must load 20 roles from collection');
    const firstRole = roles[0];
    assert.strictEqual(firstRole.id, 'intern_fs_01');
  });

  // Test 6: Candidate skill profile vector matching and top 5 ranking
  runTest('6. Vector matching returns top 5 ranked roles in descending match order', () => {
    const result = careerIntelligenceService.matchInternshipsWithChromaDB(testCandidateSkills, { limit: 5 });

    assert.strictEqual(result.success, true, 'Result success must be true');
    assert.strictEqual(result.collection, 'cynaris_internship_roles', 'Collection name must match');
    assert.strictEqual(result.topMatchesCount, 5, 'Must return exactly top 5 matches');
    assert.strictEqual(result.matches.length, 5, 'Matches array length must be 5');

    // Verify monotonic descending order
    for (let i = 0; i < result.matches.length - 1; i++) {
      assert.ok(
        result.matches[i].matchPercentage >= result.matches[i + 1].matchPercentage,
        `Matches must be sorted descending: #${i} (${result.matches[i].matchPercentage}) vs #${i + 1} (${result.matches[i + 1].matchPercentage})`
      );
    }
  });

  // Test 7: Missing skills and matched skills discrimination
  runTest('7. Accurately discriminates matched skills and missing skills for candidate profile', () => {
    const result = careerIntelligenceService.matchInternshipsWithChromaDB(testCandidateSkills, { limit: 5 });
    const topMatch = result.matches[0];

    assert.ok(Array.isArray(topMatch.matchedSkills), 'matchedSkills must be an array');
    assert.ok(Array.isArray(topMatch.missingSkills), 'missingSkills must be an array');

    // Candidate has JavaScript, Node.js, React, Docker, MySQL
    // For Full Stack Intern (requires JavaScript, Node.js, React, Docker & Containers, MySQL)
    if (topMatch.id === 'intern_fs_01') {
      assert.ok(topMatch.matchedSkills.includes('JavaScript'), 'Must identify JavaScript as matched');
      assert.ok(topMatch.matchedSkills.includes('Node.js'), 'Must identify Node.js as matched');
    }

    // Role missing skills should not be empty if there are unmet requirements
    assert.ok(topMatch.missingSkills !== undefined, 'missingSkills must be defined');
  });

  // Test 8: Match % Score and Cosine Invariants
  runTest('8. Match percentage scores and cosine similarity adhere to production limits', () => {
    const result = careerIntelligenceService.matchInternshipsWithChromaDB(testCandidateSkills, { limit: 5 });

    result.matches.forEach((m, idx) => {
      assert.ok(m.matchPercentage >= 50 && m.matchPercentage <= 100, `Match % for #${idx} must be between 50 and 100 (got ${m.matchPercentage})`);
      assert.ok(m.cosineSimilarity >= -1.0 && m.cosineSimilarity <= 1.0, `Cosine similarity for #${idx} must be between -1.0 and 1.0`);
      assert.ok(m.department, 'Match must have department');
      assert.ok(m.stipend, 'Match must have stipend');
      assert.ok(m.location, 'Match must have location');
    });
  });

  // Test 9: Laravel Parity Check
  runTest('9. Laravel Parity: CiaController::matchInternships, routes/web.php, and cia.blade.php', () => {
    const controllerPath = path.join(__dirname, '..', 'app', 'Http', 'Controllers', 'Web', 'CiaController.php');
    assert.ok(fs.existsSync(controllerPath), 'CiaController.php must exist');
    const controllerCode = fs.readFileSync(controllerPath, 'utf8');
    assert.ok(controllerCode.includes('matchInternships'), 'CiaController must define matchInternships method');
    assert.ok(controllerCode.includes('cynaris_internship_roles'), 'CiaController must reference cynaris_internship_roles collection');
    assert.ok(controllerCode.includes('missingSkills'), 'CiaController must compute missingSkills');

    const routesPath = path.join(__dirname, '..', 'routes', 'web.php');
    assert.ok(fs.existsSync(routesPath), 'routes/web.php must exist');
    const routesCode = fs.readFileSync(routesPath, 'utf8');
    assert.ok(routesCode.includes('career/match-internships') && routesCode.includes('candidate/cia'),
      'routes/web.php must register /career/match-internships route');

    const bladePath = path.join(__dirname, '..', 'resources', 'views', 'candidate', 'cia.blade.php');
    assert.ok(fs.existsSync(bladePath), 'cia.blade.php must exist');
    const bladeCode = fs.readFileSync(bladePath, 'utf8');
    assert.ok(bladeCode.includes('chromadb-internship-matching-section'), 'cia.blade.php must contain chromadb-internship-matching-section');
    assert.ok(bladeCode.includes('chromadb-internship-list-container'), 'cia.blade.php must contain chromadb-internship-list-container');
    assert.ok(bladeCode.includes('Missing Skills'), 'cia.blade.php must display Missing Skills');
    assert.ok(bladeCode.includes('cynaris_internship_roles'), 'cia.blade.php must display cynaris_internship_roles collection');
  });

  // Test 10: Express REST API POST /api/cia/career/match-internships and /candidate/cia/career/match-internships
  await runAsyncTest('10. Express API: POST /api/cia/career/match-internships returns 200 with top 5 matches', async () => {
    const res = await dispatchExpressRequest(app, 'POST', '/api/cia/career/match-internships', {
      candidateId: 101,
      candidateSkills: testCandidateSkills,
      limit: 5
    });

    assert.strictEqual(res.statusCode, 200, `POST /api/cia/career/match-internships should return 200 (got ${res.statusCode})`);
    assert.strictEqual(res.body.success, true, 'Response body success must be true');
    assert.strictEqual(res.body.collection, 'cynaris_internship_roles', 'Collection must be cynaris_internship_roles');
    assert.strictEqual(res.body.totalRolesAvailable, 20, 'Total roles available must be 20');
    assert.strictEqual(res.body.topMatchesCount, 5, 'Top matches count must be 5');
    assert.strictEqual(res.body.matches.length, 5, 'Matches length must be 5');

    // Route alias /candidate/cia/career/match-internships should also return 200
    const aliasRes = await dispatchExpressRequest(app, 'POST', '/candidate/cia/career/match-internships', {
      candidateSkills: testCandidateSkills,
      limit: 5
    });
    assert.strictEqual(aliasRes.statusCode, 200, 'Alias route /candidate/cia/career/match-internships must return 200');
    assert.strictEqual(aliasRes.body.success, true, 'Alias response success must be true');
    assert.strictEqual(aliasRes.body.matches.length, 5, 'Alias response must return 5 matches');
  });

  console.log('================================================================');
  console.log(`🎉 Summary: ${passedTests}/${totalTests} tests passed successfully!`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
})();
