/**
 * test_moodle_setup.js
 * 
 * Week 5 Day 1: Fork moodle/moodle, moodle-docker Setup & First Run Test Suite
 * Validates:
 * 1. Docker Compose topology & moodle-docker configuration (docker-compose.moodle.yml).
 * 2. Environment variables template (.env.moodle.example).
 * 3. Moodle configuration files (config.docker-template.php & config.php).
 * 4. Moodle directory structure, version.php, block plugin (blocks/cynaris_tracker), and quiz module (mod/quiz).
 * 5. Relational database schema for key tables: mdl_course, mdl_grade_grades, mdl_course_completions, mdl_user, mdl_log.
 * 6. Cynaris Moodle API bridge service & endpoints (/api/moodle).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MOODLE_DIR = path.join(ROOT_DIR, 'moodle');

console.log('================================================================');
console.log('🧪 Week 5 Day 1: Moodle Setup & Architecture Test Suite');
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

// ------------------------------------------------------------------------------
// Test Group 1: Docker Compose Configuration (docker-compose.moodle.yml)
// ------------------------------------------------------------------------------
console.log('--- Test 1: Docker Compose Configuration ---');

const composePath = path.join(ROOT_DIR, 'docker-compose.moodle.yml');
assert.ok(fs.existsSync(composePath), 'docker-compose.moodle.yml must exist');
const composeContent = fs.readFileSync(composePath, 'utf8');

runTest('docker-compose.moodle.yml defines moodle-web, moodle-db, and moodle-mailhog', () => {
  assert.ok(composeContent.includes('moodle-web:'), 'Must define moodle-web service');
  assert.ok(composeContent.includes('moodle-db:'), 'Must define moodle-db service');
  assert.ok(composeContent.includes('moodle-mailhog:'), 'Must define moodle-mailhog service');
});

runTest('moodle-web maps port 8000 and depends on healthy database', () => {
  assert.ok(composeContent.includes('8000') || composeContent.includes(':80'), 'Must map port 8000');
  assert.ok(composeContent.includes('condition: service_healthy'), 'Must depend on healthy database');
});

runTest('moodle-web mounts moodle codebase and moodle-data volume', () => {
  assert.ok(composeContent.includes('/var/www/html'), 'Must mount codebase to /var/www/html');
  assert.ok(composeContent.includes('/var/www/moodledata'), 'Must mount moodledata volume');
});

// ------------------------------------------------------------------------------
// Test Group 2: Environment Template Validation (.env.moodle.example)
// ------------------------------------------------------------------------------
console.log('\n--- Test 2: Environment Template Validation ---');

const envPath = path.join(ROOT_DIR, '.env.moodle.example');
assert.ok(fs.existsSync(envPath), '.env.moodle.example must exist');
const envContent = fs.readFileSync(envPath, 'utf8');

const requiredKeys = [
  'MOODLE_DOCKER_WEB_PORT',
  'MOODLE_DOCKER_PHP_VERSION',
  'MOODLE_DOCKER_WWWROOT',
  'MOODLE_DOCKER_DATAROOT',
  'MOODLE_DOCKER_DB',
  'MOODLE_DOCKER_DB_HOST',
  'MOODLE_DOCKER_DB_PORT',
  'MOODLE_DOCKER_DB_NAME',
  'MOODLE_DOCKER_DB_USER',
  'MOODLE_DOCKER_DB_PASSWORD',
  'MOODLE_ADMIN_USER',
  'MOODLE_ADMIN_PASSWORD',
];

runTest('All required Moodle environment keys validated in template', () => {
  for (const key of requiredKeys) {
    assert.ok(envContent.includes(key), `Missing required key in .env.moodle.example: ${key}`);
  }
});

// ------------------------------------------------------------------------------
// Test Group 3: Moodle Configuration Templates (config.docker-template.php & config.php)
// ------------------------------------------------------------------------------
console.log('\n--- Test 3: Moodle Configuration Templates ---');

const templatePath = path.join(MOODLE_DIR, 'config.docker-template.php');
assert.ok(fs.existsSync(templatePath), 'config.docker-template.php must exist in moodle/');
const templateContent = fs.readFileSync(templatePath, 'utf8');

const configPath = path.join(MOODLE_DIR, 'config.php');
assert.ok(fs.existsSync(configPath), 'config.php must exist in moodle/');
const configContent = fs.readFileSync(configPath, 'utf8');

runTest('config.docker-template.php defines CFG database, prefix, wwwroot, and dataroot', () => {
  assert.ok(templateContent.includes('$CFG->dbtype'), 'Must define $CFG->dbtype');
  assert.ok(templateContent.includes('$CFG->prefix'), 'Must define $CFG->prefix');
  assert.ok(templateContent.includes("'mdl_'"), 'Prefix must be mdl_');
  assert.ok(templateContent.includes('$CFG->wwwroot'), 'Must define $CFG->wwwroot');
  assert.ok(templateContent.includes('$CFG->dataroot'), 'Must define $CFG->dataroot');
  assert.ok(templateContent.includes('$CFG->directorypermissions'), 'Must define directorypermissions');
});

runTest('config.php is instantiated with valid CFG parameters and no PHP closing tag', () => {
  assert.ok(configContent.includes('$CFG->dbtype'), 'Must define $CFG->dbtype');
  assert.ok(configContent.includes('$CFG->prefix'), 'Must define $CFG->prefix');
  assert.ok(!configContent.trim().endsWith('?>'), 'config.php must omit closing PHP tag to avoid whitespace issues');
});

// ------------------------------------------------------------------------------
// Test Group 4: Moodle Directory Structure, Plugins & Modules
// ------------------------------------------------------------------------------
console.log('\n--- Test 4: Moodle Plugins & Modules Structure ---');

const versionPath = path.join(MOODLE_DIR, 'version.php');
assert.ok(fs.existsSync(versionPath), 'moodle/version.php must exist');
const versionContent = fs.readFileSync(versionPath, 'utf8');

runTest('version.php specifies Moodle release and version metadata', () => {
  assert.ok(versionContent.includes('$version'), 'Must define $version');
  assert.ok(versionContent.includes('$release'), 'Must define $release');
  assert.ok(versionContent.includes('$maturity'), 'Must define $maturity');
});

const blockPath = path.join(MOODLE_DIR, 'blocks/cynaris_tracker/block_cynaris_tracker.php');
assert.ok(fs.existsSync(blockPath), 'blocks/cynaris_tracker/block_cynaris_tracker.php must exist');
const blockContent = fs.readFileSync(blockPath, 'utf8');

runTest('blocks/cynaris_tracker implements block_cynaris_tracker extending block_base', () => {
  assert.ok(blockContent.includes('class block_cynaris_tracker extends block_base'), 'Must extend block_base');
  assert.ok(blockContent.includes('function init()'), 'Must implement init()');
  assert.ok(blockContent.includes('function get_content()'), 'Must implement get_content()');
});

const quizLibPath = path.join(MOODLE_DIR, 'mod/quiz/lib.php');
assert.ok(fs.existsSync(quizLibPath), 'mod/quiz/lib.php must exist');
const quizLibContent = fs.readFileSync(quizLibPath, 'utf8');

runTest('mod/quiz/lib.php defines core quiz module lifecycle functions', () => {
  assert.ok(quizLibContent.includes('function quiz_add_instance('), 'Must define quiz_add_instance');
  assert.ok(quizLibContent.includes('function quiz_update_instance('), 'Must define quiz_update_instance');
  assert.ok(quizLibContent.includes('function quiz_delete_instance('), 'Must define quiz_delete_instance');
  assert.ok(quizLibContent.includes('function quiz_get_user_grades('), 'Must define quiz_get_user_grades');
});

// ------------------------------------------------------------------------------
// Test Group 5: Relational Database Schema Verification (schema.sql)
// ------------------------------------------------------------------------------
console.log('\n--- Test 5: Relational Database Schema Verification ---');

const schemaPath = path.join(MOODLE_DIR, 'database/schema.sql');
assert.ok(fs.existsSync(schemaPath), 'moodle/database/schema.sql must exist');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

const expectedTables = [
  'mdl_course',
  'mdl_grade_grades',
  'mdl_course_completions',
  'mdl_user',
  'mdl_log',
];

runTest('schema.sql defines all 5 mandatory Moodle tables with mdl_ prefix', () => {
  for (const table of expectedTables) {
    assert.ok(schemaContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `Missing table definition: ${table}`);
  }
});

runTest('schema.sql creates required performance indexes', () => {
  assert.ok(schemaContent.includes('mdl_course_cat_idx'), 'Must index course category');
  assert.ok(schemaContent.includes('mdl_grade_item_user_idx'), 'Must index grade item and user');
  assert.ok(schemaContent.includes('mdl_completions_user_course_idx'), 'Must index course completions');
  assert.ok(schemaContent.includes('mdl_user_email_idx'), 'Must index user email');
});

// ------------------------------------------------------------------------------
// Test Group 6: Cynaris Moodle API Bridge Service
// ------------------------------------------------------------------------------
console.log('\n--- Test 6: Cynaris Moodle API Bridge Service ---');

const { moodleService } = require('../backend/modules/moodle/MoodleService');

runTest('moodleService.getStatus() returns valid Moodle environment telemetry', () => {
  const status = moodleService.getStatus();
  assert.strictEqual(status.success, true);
  assert.strictEqual(status.version, '4.3+');
  assert.strictEqual(status.environment.configured, true);
  assert.strictEqual(status.environment.dbtype, 'pgsql');
  assert.ok(status.metrics.coursesCount >= 3, 'Must report at least 3 courses');
});

runTest('moodleService.getCourses() returns course catalog', () => {
  const courses = moodleService.getCourses();
  assert.ok(Array.isArray(courses), 'Courses must be an array');
  assert.ok(courses.length >= 3, 'Must have at least 3 courses');
  const induction = courses.find(c => c.id === 101);
  assert.ok(induction, 'Must contain induction course #101');
  assert.ok(induction.fullname.includes('Induction'), 'Course name must include Induction');
});

runTest('moodleService.getCandidateProgress() calculates candidate grades & completions', () => {
  const progress = moodleService.getCandidateProgress(2);
  assert.ok(progress, 'Progress must be returned for candidate #2');
  assert.strictEqual(progress.user.name, 'Murali V');
  assert.strictEqual(progress.inductionComplete, true);
  assert.ok(progress.completions.length >= 1, 'Must have completions');
  assert.ok(progress.grades.length >= 1, 'Must have grades');
  assert.strictEqual(progress.overallReadinessPercentage, 95);
});

runTest('moodleService.getLogs() returns LMS audit trail events', () => {
  const logs = moodleService.getLogs(10);
  assert.ok(Array.isArray(logs), 'Logs must be an array');
  assert.ok(logs.length >= 2, 'Must contain at least 2 audit events');
  assert.strictEqual(logs[0].module, 'quiz');
});

// ------------------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------------------
console.log('\n================================================================');
if (passCount === totalCount) {
  console.log(`🎉 [SUCCESS] All ${passCount} Week 5 Day 1 Moodle Setup Tests Passed!`);
} else {
  console.log(`⚠️ [WARNING] ${passCount}/${totalCount} tests passed.`);
}
console.log('================================================================\n');
