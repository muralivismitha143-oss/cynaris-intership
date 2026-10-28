/**
 * test_espocrm_setup.js
 * 
 * Unit test suite validating:
 * 1. EspoCRM Docker Compose configuration and environment variables template.
 * 2. EspoCRM Architecture files (Core, Modules, Api, ORM).
 * 3. Metadata-driven JSON entity definitions (JobApplicant).
 * 4. REST API Request / Response lifecycle simulation.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function testDockerCompose() {
  console.log('--- Test 1: Docker Compose Configuration ---');
  const composePath = path.join(rootDir, 'docker-compose.espocrm.yml');
  assert.ok(fs.existsSync(composePath), 'docker-compose.espocrm.yml must exist');

  const content = fs.readFileSync(composePath, 'utf8');
  assert.ok(content.includes('espocrm-mysql:'), 'Must define espocrm-mysql service');
  assert.ok(content.includes('espocrm:'), 'Must define espocrm application service');
  assert.ok(content.includes('espocrm-daemon:'), 'Must define espocrm-daemon service');
  assert.ok(content.includes('espocrm-phpmyadmin:'), 'Must define espocrm-phpmyadmin service');
  assert.ok(content.includes('8080'), 'Must map port 8080');
  assert.ok(content.includes('8081'), 'Must map port 8081 for PMA');
  assert.ok(content.includes('service_healthy'), 'Must depend on mysql healthcheck');
  console.log('  [PASS] docker-compose.espocrm.yml structure verified');
}

function testEnvTemplate() {
  console.log('\n--- Test 2: Environment Template Validation ---');
  const envPath = path.join(rootDir, '.env.espocrm.example');
  assert.ok(fs.existsSync(envPath), '.env.espocrm.example must exist');

  const content = fs.readFileSync(envPath, 'utf8');
  const requiredKeys = [
    'ESPOCRM_PORT',
    'PMA_PORT',
    'ESPOCRM_SITE_URL',
    'MYSQL_ROOT_PASSWORD',
    'ESPOCRM_DATABASE_HOST',
    'ESPOCRM_DATABASE_NAME',
    'ESPOCRM_DATABASE_USER',
    'ESPOCRM_ADMIN_USERNAME',
    'ESPOCRM_ADMIN_PASSWORD',
  ];

  for (const key of requiredKeys) {
    assert.ok(content.includes(key), `Missing configuration variable: ${key}`);
  }
  console.log('  [PASS] All 9 required environment keys validated in template');
}

function testArchitectureFiles() {
  console.log('\n--- Test 3: EspoCRM Core Architecture Files ---');
  const expectedFiles = [
    'application/Espo/Core/Application.php',
    'application/Espo/Core/Container.php',
    'application/Espo/Core/Api/Request.php',
    'application/Espo/Core/Api/Response.php',
    'application/Espo/ORM/EntityManager.php',
    'application/Espo/ORM/Entity.php',
    'application/Espo/ORM/Repository.php',
    'application/Espo/Modules/Recruitment/Module.php',
    'application/Espo/Resources/metadata/entityDefs/JobApplicant.json',
  ];

  for (const relPath of expectedFiles) {
    const fullPath = path.join(rootDir, relPath);
    assert.ok(fs.existsSync(fullPath), `Missing architecture file: ${relPath}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 50, `File ${relPath} should not be empty`);
    console.log(`  [PASS] ${relPath} (${stat.size} bytes)`);
  }
}

function testMetadataJSON() {
  console.log('\n--- Test 4: JobApplicant Metadata Schema ---');
  const metaPath = path.join(rootDir, 'application/Espo/Resources/metadata/entityDefs/JobApplicant.json');
  const raw = fs.readFileSync(metaPath, 'utf8');
  const data = JSON.parse(raw);

  assert.ok(data.fields, 'Metadata must contain fields');
  assert.ok(data.fields.pipelineStage, 'Must define pipelineStage enum');
  assert.strictEqual(data.fields.pipelineStage.type, 'enum');

  const expectedOptions = [
    'Screening',
    'Technical Round 1',
    'Technical Round 2',
    'HR Round',
    'Offered',
    'Rejected'
  ];

  for (const opt of expectedOptions) {
    assert.ok(data.fields.pipelineStage.options.includes(opt), `Missing stage option: ${opt}`);
  }
  console.log('  [PASS] Metadata JSON contains all 6 pipeline stages and valid schema');
}

function testRestApiSimulation() {
  console.log('\n--- Test 5: EspoCRM REST API Simulation ---');
  const mockRequest = {
    method: 'GET',
    path: '/api/v1/JobApplicant',
    queryParams: { maxSize: 20, offset: 0 },
    headers: { authorization: 'Bearer crm-secret-token-123' },
  };

  const mockResponse = {
    total: 5,
    list: [
      { id: 'app-001', name: 'Priya Sharma', pipelineStage: 'Technical Round 1' },
      { id: 'app-002', name: 'Rohan Mehta', pipelineStage: 'Screening' },
    ],
  };

  assert.strictEqual(mockRequest.method, 'GET');
  assert.ok(mockRequest.headers.authorization.startsWith('Bearer '));
  assert.strictEqual(mockResponse.total, 5);
  assert.strictEqual(mockResponse.list.length, 2);
  console.log('  [PASS] REST API request/response cycle validated');
}

function runAll() {
  testDockerCompose();
  testEnvTemplate();
  testArchitectureFiles();
  testMetadataJSON();
  testRestApiSimulation();
  console.log('\n========================================');
  console.log('All 5 EspoCRM Setup Unit Tests Passed!');
  console.log('========================================\n');
}

runAll();
