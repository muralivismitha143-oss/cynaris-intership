/**
 * test_week8_deployment_and_pr.js
 *
 * Comprehensive Verification Suite for Week 8 Day 5:
 * Deploy + PR to cynaris-portal + Technical Docs + Final Demo
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');

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

function dispatchExpressRequest(appInstance, method, url) {
  return new Promise((resolve, reject) => {
    const reqStream = new Readable({ read() { this.push(null); } });
    reqStream.method = method;
    reqStream.url = url;
    reqStream.originalUrl = url;
    reqStream.headers = { host: 'localhost:3000', 'user-agent': 'test-deploy-client' };

    const dummySocket = new Duplex({ read() {}, write(c, e, cb) { cb(); } });
    dummySocket.remoteAddress = '127.0.0.1';
    dummySocket.encrypted = false;
    reqStream.socket = dummySocket;
    reqStream.connection = dummySocket;

    const res = new http.ServerResponse(reqStream);
    let rawBody = '';
    res.write = (c) => { if (c) rawBody += c.toString(); return true; };
    res.end = (c) => {
      if (c) rawBody += c.toString();
      let body = rawBody;
      try { body = JSON.parse(rawBody); } catch {}
      resolve({ statusCode: res.statusCode, body, rawBody });
    };

    appInstance.handle(reqStream, res, (err) => {
      if (err) reject(err);
      else resolve({ statusCode: 404, body: null });
    });
  });
}

(async () => {
  console.log('================================================================');
  console.log('🧪 Week 8 Day 5: Deploy, PR, Technical Docs & Production Audit');
  console.log('================================================================');

  runTest('1. DEPLOYMENT.md documents Railway/Render platforms, env var names, URLs, and known issues', () => {
    const dep = fs.readFileSync(path.resolve(__dirname, '../DEPLOYMENT.md'), 'utf8');
    assert.ok(dep.includes('Railway') && dep.includes('Render'));
    assert.ok(dep.includes('GROQ_API_KEY') && dep.includes('OPENROUTER_API_KEY'));
    assert.ok(dep.includes('JWT_SECRET') && dep.includes('MYSQL_HOST'));
    assert.ok(dep.includes('https://cynaris-recruitment-production.up.railway.app'));
    assert.ok(dep.includes('Known Issues'));
  });

  runTest('2. .env.example lists all variable names with zero hardcoded real secrets', () => {
    const env = fs.readFileSync(path.resolve(__dirname, '../.env.example'), 'utf8');
    assert.ok(env.includes('GROQ_API_KEY=') && env.includes('OPENROUTER_API_KEY='));
    assert.ok(env.includes('JWT_SECRET=') && env.includes('MYSQL_HOST='));
    assert.ok(!env.includes('gsk_'), 'Must never contain live Groq API key');
    assert.ok(!env.includes('sk-or-'), 'Must never contain live OpenRouter key');
  });

  runTest('3. Dockerfile copies data/ directory alongside backend/ and enforces non-root user', () => {
    const df = fs.readFileSync(path.resolve(__dirname, '../Dockerfile'), 'utf8');
    assert.ok(df.includes('COPY --chown=cynarisuser:cynarisgroup data ./data'));
    assert.ok(df.includes('COPY --chown=cynarisuser:cynarisgroup backend ./backend'));
    assert.ok(df.includes('USER cynarisuser'));
    assert.ok(df.includes('HEALTHCHECK'));
  });

  runTest('4. railway.json, render.yaml, and ci-cd.yml configure /api/health and gated CI/CD', () => {
    const rj = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../railway.json'), 'utf8'));
    assert.strictEqual(rj.deploy.healthcheckPath, '/api/health');

    const ry = fs.readFileSync(path.resolve(__dirname, '../render.yaml'), 'utf8');
    assert.ok(ry.includes('healthCheckPath: /api/health'));

    const ci = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/ci-cd.yml'), 'utf8');
    assert.ok(ci.includes('needs: [test]') && ci.includes('needs: [build-and-push]'));
  });

  await runAsyncTest('5. GET /api/health returns 200 with Week 8 modules_ready and database telemetry', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(Array.isArray(res.body.modules_ready));
    assert.ok(res.body.modules_ready.includes('placement_interview_readiness'));
    assert.ok(res.body.modules_ready.includes('career_report_archetypes'));
    assert.ok(res.body.modules_ready.includes('chromadb_persistent_memory'));
    assert.ok(res.body.database && res.body.database.driver);
  });

  runTest('6. Frontend entry index.html links to all Week 8 Career Intelligence portals', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../backend/public/index.html'), 'utf8');
    assert.ok(html.includes('/readiness.html'));
    assert.ok(html.includes('/career-report.html'));
    assert.ok(html.includes('/chromadb-memory.html'));
  });

  runTest('7. README.md records live Railway and Render URLs and Week 8 documentation', () => {
    const readme = fs.readFileSync(path.resolve(__dirname, '../README.md'), 'utf8');
    assert.ok(readme.includes('https://cynaris-recruitment-production.up.railway.app'));
    assert.ok(readme.includes('https://cynaris-recruitment.onrender.com'));
    assert.ok(readme.includes('docs/WEEK8_FINAL_PR.md'));
    assert.ok(readme.includes('docs/WEEK8_DAY5_SUBMISSION.md'));
  });

  runTest('8. Week 8 PR template and Day 5 submission report exist with complete checklists', () => {
    const pr = fs.readFileSync(path.resolve(__dirname, '../docs/WEEK8_FINAL_PR.md'), 'utf8');
    const sub = fs.readFileSync(path.resolve(__dirname, '../docs/WEEK8_DAY5_SUBMISSION.md'), 'utf8');
    assert.ok(pr.includes('Self-Review Checklist'));
    assert.ok(sub.includes('Viva Questions & Answers'));
    assert.ok(sub.includes('Self-Review Checklist'));
  });

  console.log('================================================================');
  console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
  console.log('================================================================');

  if (passedTests < totalTests) {
    process.exit(1);
  }
})();
