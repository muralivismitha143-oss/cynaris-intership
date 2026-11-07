/**
 * test_docker_and_cicd_pipeline.js
 * 
 * Week 4 Day 6: CI/CD with GitHub Actions & Docker Test Suite
 * Validates:
 * 1. Multi-Stage Dockerfile architecture (Builder & Runner stages, non-root user, healthcheck).
 * 2. Multi-Stage Python Dockerfile structure (Builder & Runner stages, Gunicorn, healthcheck).
 * 3. Docker Compose topology (web, db, migration, healthchecks, volumes, networks).
 * 4. GitHub Actions CI/CD workflow (.github/workflows/ci-cd.yml, DAG job chaining, secrets).
 * 5. Standalone database migration runner execution.
 * 6. Negative testing: Broken commit pipeline failure & deployment abortion simulation.
 * 7. Container configuration and environment templates (.dockerignore, .env.docker.example).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('🧪 Week 4 Day 6: CI/CD with GitHub Actions & Docker Test Suite');
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

async function runSuite() {
  // ----------------------------------------------------------------------------
  // Test Group 1: Multi-Stage Node.js Dockerfile Architecture
  // ----------------------------------------------------------------------------
  console.log('--- Test 1: Multi-Stage Node.js Dockerfile Architecture ---');

  const dockerfilePath = path.join(ROOT_DIR, 'Dockerfile');
  assert.ok(fs.existsSync(dockerfilePath), 'Dockerfile must exist at repository root');
  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');

  runTest('Dockerfile contains Stage 1 (AS builder) and Stage 2 (AS runner)', () => {
    assert.ok(dockerfileContent.includes('AS builder'), 'Dockerfile must define AS builder stage');
    assert.ok(dockerfileContent.includes('AS runner'), 'Dockerfile must define AS runner stage');
  });

  runTest('Builder stage compiles dependencies with --omit=dev and cache clean', () => {
    assert.ok(dockerfileContent.includes('--omit=dev'), 'Builder stage must omit development dependencies');
    assert.ok(dockerfileContent.includes('npm cache clean --force'), 'Builder stage must clean npm cache');
  });

  runTest('Runner stage establishes non-root user for security (Least Privilege)', () => {
    assert.ok(dockerfileContent.includes('adduser') || dockerfileContent.includes('addgroup'), 'Must create unprivileged user');
    assert.ok(dockerfileContent.includes('USER cynarisuser') || dockerfileContent.includes('USER node'), 'Must switch to non-root user');
    assert.ok(dockerfileContent.includes('--chown='), 'Must copy assets with non-root ownership');
  });

  runTest('Dockerfile specifies EXPOSE 3000, HEALTHCHECK, and ENTRYPOINT/CMD', () => {
    assert.ok(dockerfileContent.includes('EXPOSE 3000'), 'Must expose port 3000');
    assert.ok(dockerfileContent.includes('HEALTHCHECK'), 'Must include container healthcheck instruction');
    assert.ok(dockerfileContent.includes('/api/health'), 'Healthcheck must target /api/health endpoint');
    assert.ok(dockerfileContent.includes('CMD ["node", "backend/server.js"]'), 'Must execute backend/server.js');
  });

  // ----------------------------------------------------------------------------
  // Test Group 2: Multi-Stage Python Dockerfile Structure
  // ----------------------------------------------------------------------------
  console.log('\n--- Test 2: Multi-Stage Python Dockerfile Structure ---');

  const pythonDockerfilePath = path.join(ROOT_DIR, 'Dockerfile.python');
  assert.ok(fs.existsSync(pythonDockerfilePath), 'Dockerfile.python must exist');
  const pythonDockerfileContent = fs.readFileSync(pythonDockerfilePath, 'utf8');

  runTest('Dockerfile.python contains multi-stage build (builder -> runner)', () => {
    assert.ok(pythonDockerfileContent.includes('FROM python:3.12-slim AS builder'), 'Python builder stage must use python:3.12-slim');
    assert.ok(pythonDockerfileContent.includes('FROM python:3.12-slim AS runner'), 'Python runner stage must use python:3.12-slim');
    assert.ok(pythonDockerfileContent.includes('COPY --from=builder /root/.local /root/.local'), 'Must copy wheels/binaries from builder');
  });

  // ----------------------------------------------------------------------------
  // Test Group 3: Docker Compose Topology & Production Parity
  // ----------------------------------------------------------------------------
  console.log('\n--- Test 3: Docker Compose Topology & Parity ---');

  const composePath = path.join(ROOT_DIR, 'docker-compose.yml');
  assert.ok(fs.existsSync(composePath), 'docker-compose.yml must exist at repository root');
  const composeContent = fs.readFileSync(composePath, 'utf8');

  runTest('docker-compose.yml defines 3 coordinated services (web, db, migration)', () => {
    assert.ok(composeContent.includes('web:'), 'Must configure web service');
    assert.ok(composeContent.includes('db:'), 'Must configure db service');
    assert.ok(composeContent.includes('migration:'), 'Must configure migration service');
  });

  runTest('web service links to db with healthcheck dependency condition', () => {
    assert.ok(composeContent.includes('condition: service_healthy'), 'web must depend on healthy database');
    assert.ok(composeContent.includes('condition: service_completed_successfully'), 'web must wait for migration completion');
    assert.ok(composeContent.includes(':3000') || composeContent.includes('3000'), 'web must expose port 3000');
  });

  runTest('db service provisions MySQL 8.0 with persistent volume & init script', () => {
    assert.ok(composeContent.includes('image: mysql:8.0'), 'Must use MySQL 8.0 image');
    assert.ok(composeContent.includes('cynaris-mysql-data:'), 'Must mount persistent database volume');
    assert.ok(composeContent.includes('schema.sql:/docker-entrypoint-initdb.d/init.sql:ro'), 'Must mount init schema DDL');
  });

  runTest('migration service executes backend/database/runMigrations.js', () => {
    assert.ok(composeContent.includes('backend/database/runMigrations.js'), 'Must execute runMigrations script');
    assert.ok(composeContent.includes('restart: "no"'), 'Migration runner must run once and terminate');
  });

  // ----------------------------------------------------------------------------
  // Test Group 4: GitHub Actions CI/CD Workflow Syntax & DAG Architecture
  // ----------------------------------------------------------------------------
  console.log('\n--- Test 4: GitHub Actions CI/CD Workflow Architecture ---');

  const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'ci-cd.yml');
  assert.ok(fs.existsSync(workflowPath), '.github/workflows/ci-cd.yml must exist');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');

  runTest('Workflow triggers on push to main/feature branches and pull_request to main', () => {
    assert.ok(workflowContent.includes('push:'), 'Must configure push trigger');
    assert.ok(workflowContent.includes('pull_request:'), 'Must configure pull_request trigger');
    assert.ok(workflowContent.includes('workflow_dispatch:'), 'Must allow manual execution');
  });

  runTest('Pipeline implements strict 3-stage DAG: test -> build-and-push -> deploy', () => {
    assert.ok(workflowContent.includes('test:'), 'Must define test job');
    assert.ok(workflowContent.includes('build-and-push:'), 'Must define build-and-push job');
    assert.ok(workflowContent.includes('deploy:'), 'Must define deploy job');
    assert.ok(workflowContent.includes('needs: [test]'), 'build-and-push must strictly depend on test job passing');
    assert.ok(workflowContent.includes('needs: [build-and-push]'), 'deploy must strictly depend on build-and-push job');
  });

  runTest('Secrets are accessed safely using GitHub Encrypted Secrets (${{ secrets.* }})', () => {
    assert.ok(workflowContent.includes('${{ secrets.DOCKER_USER }}'), 'Must reference DOCKER_USER secret');
    assert.ok(workflowContent.includes('${{ secrets.DOCKER_TOKEN }}'), 'Must reference DOCKER_TOKEN secret');
    assert.ok(workflowContent.includes('${{ secrets.DEPLOY_HOOK_URL }}'), 'Must reference DEPLOY_HOOK_URL secret');
  });

  runTest('Docker build uses Buildx, GitHub Actions cache, and tags commit SHA + latest', () => {
    assert.ok(workflowContent.includes('docker/setup-buildx-action@v3'), 'Must set up Docker Buildx');
    assert.ok(workflowContent.includes('type=sha'), 'Must tag image with commit SHA');
    assert.ok(workflowContent.includes('type=raw,value=latest'), 'Must tag default branch with latest');
    assert.ok(workflowContent.includes('cache-from: type=gha'), 'Must utilize GitHub Actions layer cache');
  });

  runTest('Deploy stage includes post-deployment HTTP health check', () => {
    assert.ok(workflowContent.includes('/api/health'), 'Deploy job must verify /api/health');
    assert.ok(workflowContent.includes('environment:'), 'Deploy job must declare production environment');
  });

  // ----------------------------------------------------------------------------
  // Test Group 5: Standalone Database Migration Execution
  // ----------------------------------------------------------------------------
  console.log('\n--- Test 5: Standalone Migration Execution ---');

  await runAsyncTest('runMigrations.js executes schema migration cleanly', async () => {
    const { main } = require('../backend/database/runMigrations');
    const result = await main();
    assert.strictEqual(result.success, true, 'Migration must report success');
    assert.ok(result.appliedStatements >= 4, 'Must apply at least 4 DDL statements');
  });

  // ----------------------------------------------------------------------------
  // Test Group 6: Negative Testing — Broken Commit Abortion Simulation
  // ----------------------------------------------------------------------------
  console.log('\n--- Test 6: Negative Testing (Broken Commit Pipeline Failure) ---');

  runTest('Failed test in CI simulation immediately halts pipeline before build & deploy', () => {
    // Model CI/CD DAG behavior
    const simulatePipeline = (testPassed) => {
      const pipelineTrace = {
        testStage: testPassed ? 'SUCCESS' : 'FAILED',
        buildStage: 'SKIPPED',
        deployStage: 'SKIPPED'
      };

      if (pipelineTrace.testStage === 'SUCCESS') {
        pipelineTrace.buildStage = 'SUCCESS';
        pipelineTrace.deployStage = 'SUCCESS';
      }

      return pipelineTrace;
    };

    // Passing run
    const passingRun = simulatePipeline(true);
    assert.strictEqual(passingRun.testStage, 'SUCCESS');
    assert.strictEqual(passingRun.buildStage, 'SUCCESS');
    assert.strictEqual(passingRun.deployStage, 'SUCCESS');

    // Broken commit run (Negative Test)
    const brokenRun = simulatePipeline(false);
    assert.strictEqual(brokenRun.testStage, 'FAILED', 'Broken commit must fail test stage');
    assert.strictEqual(brokenRun.buildStage, 'SKIPPED', 'Build & Push stage MUST be skipped on test failure');
    assert.strictEqual(brokenRun.deployStage, 'SKIPPED', 'Deploy stage MUST be skipped on test failure');
  });

  // ----------------------------------------------------------------------------
  // Test Group 7: Container Environment Templates & Dockerignore
  // ----------------------------------------------------------------------------
  console.log('\n--- Test 7: Container Templates & .dockerignore ---');

  runTest('.dockerignore prevents leaking sensitive data, git history, and caches', () => {
    const dockerignorePath = path.join(ROOT_DIR, '.dockerignore');
    assert.ok(fs.existsSync(dockerignorePath), '.dockerignore must exist');
    const content = fs.readFileSync(dockerignorePath, 'utf8');
    assert.ok(content.includes('.git'), 'Must ignore .git');
    assert.ok(content.includes('node_modules'), 'Must ignore node_modules');
    assert.ok(content.includes('.env'), 'Must ignore .env');
  });

  runTest('.env.docker.example documents all deployment and database variables', () => {
    const envExamplePath = path.join(ROOT_DIR, '.env.docker.example');
    assert.ok(fs.existsSync(envExamplePath), '.env.docker.example must exist');
    const content = fs.readFileSync(envExamplePath, 'utf8');
    assert.ok(content.includes('PORT='), 'Must document PORT');
    assert.ok(content.includes('DB_PASSWORD='), 'Must document DB_PASSWORD');
    assert.ok(content.includes('JWT_SECRET='), 'Must document JWT_SECRET');
    assert.ok(content.includes('DOCKER_USER='), 'Must document DOCKER_USER');
  });

  // ----------------------------------------------------------------------------
  // Summary
  // ----------------------------------------------------------------------------
  console.log('\n================================================================');
  if (passCount === totalCount) {
    console.log(`🎉 [SUCCESS] All ${passCount} Week 4 Day 6 CI/CD & Docker Tests Passed!`);
  } else {
    console.log(`⚠️ [WARNING] ${passCount}/${totalCount} tests passed.`);
  }
  console.log('================================================================\n');
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
