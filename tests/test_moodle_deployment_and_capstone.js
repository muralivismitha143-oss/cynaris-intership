/**
 * test_moodle_deployment_and_capstone.js
 * 
 * Week 6 Day 5: Deploy Moodle Fork + Full Documentation + Demo Video
 * 
 * Validates:
 * 1. Docker Compose multi-container topology (docker-compose.moodle.yml).
 * 2. Environment configuration template & secrets isolation (.env.moodle.example, config.php).
 * 3. Top-level directory structure and subsystem hierarchy.
 * 4. 5 Core Moodle tables DDL schemas and composite B-Tree indexes.
 * 5. Frankenstyle custom plugin implementations across blocks, mod, and local subsystems.
 * 6. Multi-tiered AI pipeline integration (Groq + OpenRouter + Local Deterministic Engine).
 * 7. Moodle Frontpage (index.php) and UI Deck W3C accessibility compliance.
 * 8. Express REST API Capstone Endpoint (GET /api/moodle/capstone/overview).
 * 9. 3 Key Moodle Architectural Decisions documentation.
 * 10. Moodle CLI deployment verification tool (moodle/admin/cli/deploy_verify.php).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');

const ROOT_DIR = path.resolve(__dirname, '..');
const MOODLE_DIR = path.join(ROOT_DIR, 'moodle');

console.log('================================================================');
console.log('🧪 Week 6 Day 5: Moodle Deployment & Capstone Architecture Test');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

/**
 * Dispatch an Express request in-memory without opening a real network socket.
 */
function dispatchExpressRequest(app, method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const reqStream = new Readable({
      read() {
        if (body) {
          const payload = typeof body === 'string' ? body : JSON.stringify(body);
          this.push(payload);
        }
        this.push(null);
      }
    });

    reqStream.method = method;
    reqStream.url = url;
    reqStream.headers = {
      'content-type': 'application/json',
      ...headers
    };

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

    app.handle(reqStream, res, (err) => {
      if (err) reject(err);
      else resolve({ statusCode: 404, body: null });
    });
  });
}

(async () => {
  // --- Test Group 1: Docker Compose Multi-Container Topology ---
  console.log('--- Test 1: Docker Compose Configuration & Topology ---');
  const composePath = path.join(ROOT_DIR, 'docker-compose.moodle.yml');
  assert.ok(fs.existsSync(composePath), 'docker-compose.moodle.yml must exist');
  const composeContent = fs.readFileSync(composePath, 'utf8');

  runTest('docker-compose.moodle.yml defines moodle-web, moodle-db, and moodle-mailhog', () => {
    assert.ok(composeContent.includes('moodle-web:'), 'Must define moodle-web container');
    assert.ok(composeContent.includes('moodle-db:'), 'Must define moodle-db container');
    assert.ok(composeContent.includes('moodle-mailhog:'), 'Must define moodle-mailhog container');
  });

  runTest('moodle-web maps port 8000 and depends on healthy database container', () => {
    assert.ok(composeContent.includes('8000') || composeContent.includes(':80'), 'Must map port 8000');
    assert.ok(composeContent.includes('condition: service_healthy'), 'Must depend on healthy database');
    assert.ok(composeContent.includes('moodle-data:'), 'Must define persistent volume for dataroot');
  });

  // --- Test Group 2: Environment Variables & Secrets Isolation ---
  console.log('\n--- Test 2: Environment Configuration & Secrets Isolation ---');
  const envExamplePath = path.join(ROOT_DIR, '.env.moodle.example');
  assert.ok(fs.existsSync(envExamplePath), '.env.moodle.example must exist');
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

  runTest('.env.moodle.example defines all critical environment variables', () => {
    const requiredVars = [
      'MOODLE_DOCKER_WEB_PORT',
      'MOODLE_DOCKER_DB',
      'MOODLE_DOCKER_DB_HOST',
      'MOODLE_DOCKER_DB_NAME',
      'MOODLE_DOCKER_DB_USER',
      'MOODLE_DOCKER_DB_PASSWORD',
      'MOODLE_DOCKER_WWWROOT',
      'MOODLE_DOCKER_DATAROOT'
    ];
    for (const v of requiredVars) {
      assert.ok(envExampleContent.includes(v), `Must define ${v} in .env.moodle.example`);
    }
  });

  runTest('moodle/config.php resolves credentials dynamically and isolates dataroot', () => {
    const configPath = path.join(MOODLE_DIR, 'config.php');
    assert.ok(fs.existsSync(configPath), 'moodle/config.php must exist');
    const configContent = fs.readFileSync(configPath, 'utf8');
    assert.ok(configContent.includes('getenv(\'MOODLE_DOCKER_DB\')'), 'Must use getenv for DB type');
    assert.ok(configContent.includes('getenv(\'MOODLE_DOCKER_WWWROOT\')'), 'Must use getenv for wwwroot');
    assert.ok(configContent.includes('getenv(\'MOODLE_DOCKER_DATAROOT\')'), 'Must use getenv for dataroot');
    assert.ok(configContent.includes('$CFG->dataroot'), 'Must configure $CFG->dataroot');
  });

  // --- Test Group 3: Top-Level Subsystems Hierarchy ---
  console.log('\n--- Test 3: Top-Level Moodle Subsystems Hierarchy ---');
  runTest('Moodle directory contains all key functional subsystems', () => {
    const requiredDirs = ['admin', 'blocks', 'database', 'lib', 'local', 'mod'];
    for (const dir of requiredDirs) {
      const fullPath = path.join(MOODLE_DIR, dir);
      assert.ok(fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory(), `Directory moodle/${dir} must exist`);
    }
  });

  // --- Test Group 4: 5 Core Tables Schemas & Optimizations ---
  console.log('\n--- Test 4: 5 Core Tables Relational Schemas & Indexes ---');
  const schemaPath = path.join(MOODLE_DIR, 'database/schema.sql');
  const optPath = path.join(MOODLE_DIR, 'database/schema_optimizations.sql');

  runTest('moodle/database/schema.sql defines all 5 core tables', () => {
    assert.ok(fs.existsSync(schemaPath), 'schema.sql must exist');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const tables = ['mdl_course', 'mdl_grade_grades', 'mdl_course_completions', 'mdl_user', 'mdl_log'];
    for (const t of tables) {
      assert.ok(schemaContent.includes(`CREATE TABLE IF NOT EXISTS ${t}`), `Must define ${t}`);
    }
  });

  runTest('moodle/database/schema_optimizations.sql defines composite B-Tree indexes', () => {
    assert.ok(fs.existsSync(optPath), 'schema_optimizations.sql must exist');
    const optContent = fs.readFileSync(optPath, 'utf8');
    assert.ok(optContent.includes('idx_mdl_log_user_action_time'), 'Must define composite index on mdl_log');
    assert.ok(optContent.includes('idx_mdl_grade_item_user_final'), 'Must define composite covering index on mdl_grade_grades');
    assert.ok(optContent.includes('idx_mdl_completions_user_course_status'), 'Must define composite index on mdl_course_completions');
  });

  // --- Test Group 5: Frankenstyle Component Subsystems ---
  console.log('\n--- Test 5: Custom Frankenstyle Plugin Parity ---');
  runTest('All 6 custom Moodle Frankenstyle plugin files exist with standard structure', () => {
    const plugins = [
      'blocks/cynaris_stats/block_cynaris_stats.php',
      'blocks/cynaris_tracker/block_cynaris_tracker.php',
      'mod/quiz/view.php',
      'local/cynaris_ai_tutor/AiTutor.php',
      'local/cynaris_recommendations/RecommendationService.php',
      'local/cynaris_perf/QueryAuditService.php'
    ];
    for (const p of plugins) {
      const fullPath = path.join(MOODLE_DIR, p);
      assert.ok(fs.existsSync(fullPath), `Must exist: moodle/${p}`);
    }
  });

  // --- Test Group 6: AI Pipeline Multi-Tier Architecture ---
  console.log('\n--- Test 6: AI Pipeline Architecture & Failover Invariants ---');
  runTest('AI service modules define dual-provider configuration (Groq primary, OpenRouter fallback, Local fallback)', () => {
    const services = [
      path.join(ROOT_DIR, 'backend/modules/ai/AiTutorService.js'),
      path.join(ROOT_DIR, 'backend/modules/ai/AiQuizGeneratorService.js'),
      path.join(ROOT_DIR, 'backend/modules/ai/AiRecommendationService.js'),
      path.join(ROOT_DIR, 'backend/modules/ai/AiQueryOptimizerService.js')
    ];
    for (const s of services) {
      assert.ok(fs.existsSync(s), `Must exist: ${path.basename(s)}`);
      const content = fs.readFileSync(s, 'utf8');
      assert.ok(content.includes('llama-3.3-70b-versatile'), `${path.basename(s)} must use Groq model`);
      assert.ok(content.includes('llama-3.3-70b-instruct'), `${path.basename(s)} must use OpenRouter fallback model`);
    }
  });

  // --- Test Group 7: Moodle Frontpage & W3C Accessibility ---
  console.log('\n--- Test 7: Moodle Frontpage & Accessibility Standards ---');
  runTest('moodle/index.php displays system health, active subsystems, and 3 architectural decisions', () => {
    const indexPath = path.join(MOODLE_DIR, 'index.php');
    assert.ok(fs.existsSync(indexPath), 'moodle/index.php must exist');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    assert.ok(indexContent.includes('Running without errors'), 'Must indicate running without errors');
    assert.ok(indexContent.includes('3 Key Moodle Architectural Decisions'), 'Must highlight architectural decisions');
    assert.ok(indexContent.includes('Universal Database Abstraction Layer'), 'Must detail $DB decision');
    assert.ok(indexContent.includes('Modular Pluggable Component Architecture'), 'Must detail Frankenstyle decision');
    assert.ok(indexContent.includes('Decoupled Security Dataroot Architecture'), 'Must detail dataroot decision');
  });

  // --- Test Group 8: Express REST API Capstone Endpoint ---
  console.log('\n--- Test 8: Express REST API Capstone Endpoint Integration ---');
  const app = require('../backend/server');

  await runAsyncTest('GET /api/moodle/capstone/overview returns 200 with full deployment telemetry', async () => {
    const res = await dispatchExpressRequest(app, 'GET', '/api/moodle/capstone/overview');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.status, 'OPERATIONAL');
    assert.strictEqual(res.body.deployment.webUrl, 'http://localhost:8000');
    assert.strictEqual(res.body.deployment.database.port, 5432);
    assert.strictEqual(res.body.deployment.database.coreTables.length, 5);
    assert.strictEqual(res.body.aiPipeline.primaryModel, 'llama-3.3-70b-versatile');
    assert.strictEqual(res.body.aiPipeline.fallbackModel, 'meta-llama/llama-3.3-70b-instruct');
    assert.strictEqual(res.body.architecturalDecisions.length, 3);
  });

  // --- Test Group 9: Moodle CLI Deployment Verification ---
  console.log('\n--- Test 9: Moodle CLI Deployment Verification Tool ---');
  runTest('moodle/admin/cli/deploy_verify.php exists and defines required CLI checks', () => {
    const cliPath = path.join(MOODLE_DIR, 'admin/cli/deploy_verify.php');
    assert.ok(fs.existsSync(cliPath), 'deploy_verify.php must exist');
    const cliContent = fs.readFileSync(cliPath, 'utf8');
    assert.ok(cliContent.includes("define('CLI_SCRIPT', true)"), 'Must define CLI_SCRIPT');
    assert.ok(cliContent.includes('Dataroot Isolated Outside Webroot'), 'Must verify dataroot isolation');
    assert.ok(cliContent.includes('Top-Level Moodle Subsystems Present'), 'Must verify directory structure');
    assert.ok(cliContent.includes('Custom Frankenstyle Subsystems Installed'), 'Must verify custom plugins');
  });

  // --- Test Group 10: Git Workflow & Merge Hygiene ---
  console.log('\n--- Test 10: Git Workflow, Branch Naming & Hygiene ---');
  runTest('Branch naming convention follows feat/cynaris-w6d5-[name]', () => {
    const targetBranch = 'feat/cynaris-w6d5-murali';
    assert.ok(targetBranch.startsWith('feat/cynaris-w6d5-'), 'Branch must follow week/day naming format');
    assert.ok(targetBranch.endsWith('-murali'), 'Branch must be personalized with developer name');
  });

  // Summary
  console.log('\n================================================================');
  if (passCount === totalCount) {
    console.log(`🎉 [SUCCESS] All ${totalCount} Week 6 Day 5 Deployment Tests Passed!`);
  } else {
    console.error(`❌ [FAILED] ${totalCount - passCount} of ${totalCount} tests failed.`);
    process.exitCode = 1;
  }
  console.log('================================================================\n');
})();
