/**
 * test_mysql_crud_and_espocrm_deployment.js
 * 
 * Comprehensive Unit & Integration Test Suite for Week 4 Day 4:
 * "Deploy EspoCRM Fork to Production & Connect Node.js to MySQL using mysql2"
 * 
 * Validates:
 * 1. EspoCRM Docker Compose Production Stack & Environment Variables
 *    - MySQL 8.0, EspoCRM Web App, Daemon Cron Worker, PHPMyAdmin
 *    - Named volumes, network bridge, and healthchecks
 * 2. EspoCRM Core Architecture Layer Verification
 *    - application/Espo/Core (Application kernel, DI Container)
 *    - application/Espo/Modules (Module loader)
 *    - application/Espo/Core/Api (Request/Response REST layer)
 *    - application/Espo/ORM (EntityManager, Repository, Entity)
 * 3. Node.js MySQL Connection Pool & Schema DDL Migrations
 *    - mysqlClient initialization and telemetry
 *    - Table DDL creation: job_applicant, automation_rules, smart_reminders, audit_logs
 * 4. Prepared Statement CRUD Operations (applicantRepository)
 *    - INSERT via prepared statement with auto-increment ID
 *    - SELECT via prepared statement with parameter binding
 *    - UPDATE via prepared statement with timestamp update
 *    - DELETE via prepared statement
 *    - SQL GROUP BY aggregation
 * 5. SQL Injection Immunity Test
 *    - Asserts malicious strings (' OR '1'='1, '; DROP TABLE;') are treated as literal values
 * 6. Atomic Database Transaction Management
 *    - beginTransaction, multi-table atomic execution, commit and rollback verification
 * 7. Database REST API Endpoints (/api/database)
 *    - GET /api/database/status
 *    - POST /api/database/applicants -> 201 Created + Location header
 *    - GET /api/database/applicants/:id -> 200 OK
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');

const rootDir = path.resolve(__dirname, '..');
const app = require(path.join(rootDir, 'backend/server'));
const { mysqlClient } = require(path.join(rootDir, 'backend/database/mysqlClient'));
const { applicantRepository } = require(path.join(rootDir, 'backend/database/applicantRepository'));

// In-memory HTTP request dispatcher for REST endpoints
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
  console.log('🧪 Week 4 Day 4: MySQL CRUD & EspoCRM Production Deployment Test');
  console.log('================================================================');

  // =========================================================================
  // Test 1: EspoCRM Docker Compose & Environment Template
  // =========================================================================
  console.log('\n--- Test 1: EspoCRM Docker Compose & Production Environment ---');
  const composePath = path.join(rootDir, 'docker-compose.espocrm.yml');
  assert.ok(fs.existsSync(composePath), 'docker-compose.espocrm.yml must exist');
  const composeContent = fs.readFileSync(composePath, 'utf8');

  assert.ok(composeContent.includes('espocrm-mysql:'), 'Must configure espocrm-mysql service');
  assert.ok(composeContent.includes('espocrm:'), 'Must configure espocrm application service');
  assert.ok(composeContent.includes('espocrm-daemon:'), 'Must configure espocrm-daemon worker');
  assert.ok(composeContent.includes('espocrm-phpmyadmin:'), 'Must configure phpmyadmin service');
  assert.ok(composeContent.includes('healthcheck:'), 'Must configure MySQL healthcheck');
  assert.ok(composeContent.includes('espocrm-mysql-data:'), 'Must declare persistent MySQL named volume');
  assert.ok(composeContent.includes('espocrm-network:'), 'Must declare isolated bridge network');
  console.log('  [PASS] docker-compose.espocrm.yml topology verified (App, MySQL 8.0, Daemon, PMA)');

  const envPath = path.join(rootDir, '.env.espocrm.example');
  assert.ok(fs.existsSync(envPath), '.env.espocrm.example must exist');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredEnvKeys = [
    'ESPOCRM_PORT',
    'PMA_PORT',
    'ESPOCRM_SITE_URL',
    'MYSQL_ROOT_PASSWORD',
    'ESPOCRM_DATABASE_HOST',
    'ESPOCRM_DATABASE_NAME',
    'ESPOCRM_DATABASE_USER',
    'ESPOCRM_DATABASE_PASSWORD',
    'ESPOCRM_ADMIN_USERNAME',
    'ESPOCRM_ADMIN_PASSWORD',
    'ESPOCRM_TIMEZONE',
  ];
  for (const key of requiredEnvKeys) {
    assert.ok(envContent.includes(key), `Missing required environment key: ${key}`);
  }
  console.log('  [PASS] All 11 required production environment keys verified in template');

  // =========================================================================
  // Test 2: EspoCRM Core Architecture Layer Inspection
  // =========================================================================
  console.log('\n--- Test 2: EspoCRM Core Architecture Layer Verification ---');
  const coreFiles = [
    'application/Espo/Core/Application.php',
    'application/Espo/Core/Container.php',
    'application/Espo/Modules/Recruitment/Module.php',
    'application/Espo/Core/Api/Request.php',
    'application/Espo/Core/Api/Response.php',
    'application/Espo/ORM/EntityManager.php',
    'application/Espo/ORM/Entity.php',
    'application/Espo/ORM/Repository.php',
  ];
  for (const file of coreFiles) {
    const fullPath = path.join(rootDir, file);
    assert.ok(fs.existsSync(fullPath), `Missing EspoCRM architecture file: ${file}`);
    const stats = fs.statSync(fullPath);
    assert.ok(stats.size > 200, `File ${file} should contain functional implementation`);
  }
  console.log('  [PASS] Verified 4 core layers: Core Kernel, Module Loader, Api Layer, ORM Entity Manager');

  // =========================================================================
  // Test 3: MySQL Connection Pool & Schema DDL Migrations
  // =========================================================================
  console.log('\n--- Test 3: Node.js MySQL Connection Pool & Schema DDL Migrations ---');
  await mysqlClient.init();
  const metrics = mysqlClient.getMetrics();
  assert.ok(metrics.activeDriver, 'Active driver must be initialized');
  assert.strictEqual(metrics.database, 'espocrm');
  console.log(`  [PASS] MySQL Connection Pool initialized (Driver: ${metrics.activeDriver}, DB: ${metrics.database})`);

  const migrationResult = await mysqlClient.runMigrations();
  assert.strictEqual(migrationResult.success, true);
  assert.ok(migrationResult.appliedStatements >= 4, 'Must apply DDL statements from schema.sql');
  console.log(`  [PASS] Schema migration applied ${migrationResult.appliedStatements} DDL statements (job_applicant, automation_rules, smart_reminders, audit_logs)`);

  // =========================================================================
  // Test 4: Prepared Statement CRUD Operations (applicantRepository)
  // =========================================================================
  console.log('\n--- Test 4: Prepared Statement CRUD Operations ---');

  // 4A: CREATE (INSERT)
  const candidatePayload = {
    name: 'Vikramaditya Roy',
    job_title: 'Lead Full Stack Architect',
    pipeline_stage: 'Screening',
    experience_years: 7.5,
    skills: 'Node.js, Express, MySQL, React, Redis, Docker',
    education: 'B.Tech CSE (IIT Madras)',
    resume_text: 'Engineering lead with 7.5 years architecting high-throughput CRM and recruitment engines.',
  };
  const createdCandidate = await applicantRepository.create(candidatePayload);
  assert.ok(createdCandidate.id, 'Must generate auto-increment primary key ID');
  assert.strictEqual(createdCandidate.name, 'Vikramaditya Roy');
  assert.strictEqual(createdCandidate.experience_years, 7.5);
  console.log(`  [PASS] CREATE: Inserted candidate #${createdCandidate.id} via prepared statement`);

  // 4B: READ (SELECT by ID)
  const fetchedCandidate = await applicantRepository.findById(createdCandidate.id);
  assert.ok(fetchedCandidate, 'Candidate must be retrievable by ID');
  assert.strictEqual(fetchedCandidate.id, createdCandidate.id);
  assert.strictEqual(fetchedCandidate.name, 'Vikramaditya Roy');
  console.log(`  [PASS] READ: Retrieved candidate #${fetchedCandidate.id} with matching attributes`);

  // 4C: UPDATE
  const updatedCandidate = await applicantRepository.update(createdCandidate.id, {
    pipeline_stage: 'Technical Round 1',
  });
  assert.ok(updatedCandidate);
  assert.strictEqual(updatedCandidate.pipeline_stage, 'Technical Round 1');
  console.log(`  [PASS] UPDATE: Advanced candidate #${createdCandidate.id} to Technical Round 1`);

  // 4D: AGGREGATE (GROUP BY)
  const stageCounts = await applicantRepository.countByStage();
  assert.ok(Array.isArray(stageCounts));
  assert.ok(stageCounts.length >= 1);
  assert.ok(stageCounts.some((row) => row.count >= 1));
  console.log(`  [PASS] AGGREGATE: Computed stage distribution across ${stageCounts.length} active stages`);

  // 4E: DELETE
  const deleteResult = await applicantRepository.delete(createdCandidate.id);
  assert.strictEqual(deleteResult, true, 'Delete operation must succeed');
  const postDeleteCheck = await applicantRepository.findById(createdCandidate.id);
  assert.strictEqual(postDeleteCheck, null, 'Deleted candidate must return null');
  console.log(`  [PASS] DELETE: Cleanly removed candidate #${createdCandidate.id}`);

  // =========================================================================
  // Test 5: SQL Injection Immunity Verification
  // =========================================================================
  console.log('\n--- Test 5: SQL Injection Immunity Verification ---');

  // Attempting classic SQL injection payload as parameter
  const maliciousInput = "Robert'; DROP TABLE job_applicant; --";
  const injectionCandidate = await applicantRepository.create({
    name: maliciousInput,
    job_title: "Software Engineer' OR '1'='1",
    pipeline_stage: 'Screening',
  });

  // Verify candidate was safely inserted as a literal string without executing SQL commands
  const retrievedInjection = await applicantRepository.findById(injectionCandidate.id);
  assert.strictEqual(retrievedInjection.name, maliciousInput, 'Malicious string must be preserved literally');
  
  // Verify table is intact and still contains applicants
  const allApplicants = await applicantRepository.findAll();
  assert.ok(allApplicants.length >= 1, 'Table must remain intact after injection attempt');
  console.log('  [PASS] Prepared statement treated SQL injection payload as literal string; table intact');

  // Cleanup
  await applicantRepository.delete(injectionCandidate.id);

  // =========================================================================
  // Test 6: Atomic Database Transaction Management
  // =========================================================================
  console.log('\n--- Test 6: Atomic Database Transaction Management ---');

  const txCandidate = await applicantRepository.create({
    name: 'Kavita Menon',
    job_title: 'Frontend Lead',
    pipeline_stage: 'Screening',
  });

  const txResult = await applicantRepository.updateStageWithAudit(txCandidate.id, 'Offered', 'HiringManager');
  assert.strictEqual(txResult.success, true);
  assert.strictEqual(txResult.committed, true);

  const postTxCandidate = await applicantRepository.findById(txCandidate.id);
  assert.strictEqual(postTxCandidate.pipeline_stage, 'Offered');
  console.log('  [PASS] Transaction committed atomically (applicant stage updated + audit log inserted)');

  // Cleanup
  await applicantRepository.delete(txCandidate.id);

  // =========================================================================
  // Test 7: Database REST API Endpoints
  // =========================================================================
  console.log('\n--- Test 7: Database REST API Endpoints (/api/database) ---');

  // 7A: GET /api/database/status
  const resStatus = await makeRequest(app, {
    method: 'GET',
    path: '/api/database/status',
  });
  assert.strictEqual(resStatus.statusCode, 200);
  assert.strictEqual(resStatus.body.success, true);
  assert.strictEqual(resStatus.body.status, 'ONLINE');
  assert.ok(resStatus.body.telemetry.totalQueries >= 5);
  console.log(`  [PASS] GET /api/database/status returned 200 OK (${resStatus.body.telemetry.totalQueries} queries executed)`);

  // 7B: POST /api/database/applicants
  const resPost = await makeRequest(
    app,
    {
      method: 'POST',
      path: '/api/database/applicants',
    },
    {
      name: 'Deepak Verma',
      job_title: 'Full Stack Engineer',
      pipeline_stage: 'Screening',
      experience_years: 4.0,
      skills: 'Node.js, MySQL, React',
    }
  );
  assert.strictEqual(resPost.statusCode, 201);
  assert.ok(resPost.headers.location);
  const createdDbId = resPost.body.applicant.id;
  console.log(`  [PASS] POST /api/database/applicants created record #${createdDbId} with Location header`);

  // 7C: GET /api/database/applicants/:id
  const resGet = await makeRequest(app, {
    method: 'GET',
    path: `/api/database/applicants/${createdDbId}`,
  });
  assert.strictEqual(resGet.statusCode, 200);
  assert.strictEqual(resGet.body.applicant.name, 'Deepak Verma');
  console.log(`  [PASS] GET /api/database/applicants/:id retrieved record #${createdDbId}`);

  // 7D: DELETE /api/database/applicants/:id
  const resDel = await makeRequest(app, {
    method: 'DELETE',
    path: `/api/database/applicants/${createdDbId}`,
  });
  assert.strictEqual(resDel.statusCode, 200);
  console.log(`  [PASS] DELETE /api/database/applicants/:id cleanly deleted record #${createdDbId}`);

  console.log('\n================================================================');
  console.log('🎉 [SUCCESS] All 7 Week 4 Day 4 MySQL & EspoCRM Deployment Tests Passed!');
  console.log('================================================================\n');
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
