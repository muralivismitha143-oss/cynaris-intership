/**
 * test_moodle_block_cynaris_stats.js
 * 
 * Week 5 Day 3: Automated Test Suite for block_cynaris_stats Moodle Block Plugin Scaffold
 * 
 * Tests:
 * 1. File Structure & Directory Integrity (blocks/cynaris_stats and moodle/blocks/cynaris_stats)
 * 2. PHP Class & Block Architecture (block_base inheritance, init, get_content, applicable_formats)
 * 3. Version Specification & Frankenstyle Component Name (version.php)
 * 4. English Language Strings Dictionary (lang/en/block_cynaris_stats.php)
 * 5. Access Control & Capabilities (db/access.php)
 * 6. Headless CLI Upgrade Runner Simulation (admin/cli/upgrade.php)
 * 7. Cynaris Backend API Bridge Integration (getBlockPlugins & getStatsBlockContent)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { moodleService } = require('../backend/modules/moodle/MoodleService');
const { runMoodleCliUpgrade } = require('../backend/modules/moodle/cliUpgrade');

let passCount = 0;
let totalCount = 0;

function it(description, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
  }
}

console.log('================================================================');
console.log('🧪 Week 5 Day 3: Moodle Block Plugin (block_cynaris_stats) Test Suite');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');
const blockPaths = [
  path.join(projectRoot, 'blocks/cynaris_stats'),
  path.join(projectRoot, 'moodle/blocks/cynaris_stats'),
];

// --- Test 1: Directory Structure & File Presence ---
console.log('--- Test 1: Directory Structure & File Presence ---');

blockPaths.forEach(blockDir => {
  const relPath = path.relative(projectRoot, blockDir);
  it(`${relPath} directory exists`, () => {
    assert.strictEqual(fs.existsSync(blockDir), true, `${relPath} directory must exist`);
  });

  it(`${relPath}/block_cynaris_stats.php exists and is non-empty`, () => {
    const filePath = path.join(blockDir, 'block_cynaris_stats.php');
    assert.strictEqual(fs.existsSync(filePath), true);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 200, 'File must be non-empty');
  });

  it(`${relPath}/version.php exists and specifies component`, () => {
    const filePath = path.join(blockDir, 'version.php');
    assert.strictEqual(fs.existsSync(filePath), true);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes("component = 'block_cynaris_stats'"));
  });

  it(`${relPath}/lang/en/block_cynaris_stats.php exists`, () => {
    const filePath = path.join(blockDir, 'lang/en/block_cynaris_stats.php');
    assert.strictEqual(fs.existsSync(filePath), true);
  });

  it(`${relPath}/db/access.php exists`, () => {
    const filePath = path.join(blockDir, 'db/access.php');
    assert.strictEqual(fs.existsSync(filePath), true);
  });
});

// --- Test 2: PHP Class & Block Architecture ---
console.log('\n--- Test 2: PHP Class & Block Architecture ---');

it('Class block_cynaris_stats extends block_base', () => {
  const classContent = fs.readFileSync(path.join(projectRoot, 'blocks/cynaris_stats/block_cynaris_stats.php'), 'utf8');
  assert.ok(classContent.includes('class block_cynaris_stats extends block_base'), 'Must extend block_base');
});

it('Implements init() initializing block title', () => {
  const classContent = fs.readFileSync(path.join(projectRoot, 'blocks/cynaris_stats/block_cynaris_stats.php'), 'utf8');
  assert.ok(classContent.includes('function init()'), 'Must implement init()');
  assert.ok(classContent.includes("get_string('pluginname', 'block_cynaris_stats')"), 'Must fetch title via get_string');
});

it('Implements get_content() with content caching and return object', () => {
  const classContent = fs.readFileSync(path.join(projectRoot, 'blocks/cynaris_stats/block_cynaris_stats.php'), 'utf8');
  assert.ok(classContent.includes('function get_content()'), 'Must implement get_content()');
  assert.ok(classContent.includes('$this->content !== null'), 'Must cache content');
  assert.ok(classContent.includes('new stdClass()'), 'Must instantiate stdClass');
  assert.ok(classContent.includes('$this->content->text'), 'Must populate content text');
  assert.ok(classContent.includes('$this->content->footer'), 'Must populate content footer');
  assert.ok(classContent.includes('return $this->content;'), 'Must return content object');
});

it('Implements applicable_formats() with dashboard and course views', () => {
  const classContent = fs.readFileSync(path.join(projectRoot, 'blocks/cynaris_stats/block_cynaris_stats.php'), 'utf8');
  assert.ok(classContent.includes('function applicable_formats()'));
  assert.ok(classContent.includes("'my' => true"), 'Must support My Dashboard');
  assert.ok(classContent.includes("'course-view' => true"), 'Must support course view');
});

it('Prevents duplicate instances via instance_allow_multiple()', () => {
  const classContent = fs.readFileSync(path.join(projectRoot, 'blocks/cynaris_stats/block_cynaris_stats.php'), 'utf8');
  assert.ok(classContent.includes('function instance_allow_multiple()'));
  assert.ok(classContent.includes('return false;'));
});

// --- Test 3: Version Specification & Metadata ---
console.log('\n--- Test 3: Version Specification & Metadata ---');

it('version.php contains compliant Moodle version, requires, and maturity metadata', () => {
  const versionContent = fs.readFileSync(path.join(projectRoot, 'blocks/cynaris_stats/version.php'), 'utf8');
  assert.ok(versionContent.includes("component = 'block_cynaris_stats'"));
  assert.ok(/version\s*=\s*2023100900/.test(versionContent), 'Version must match Moodle 4.3 build');
  assert.ok(/requires\s*=\s*2023042400/.test(versionContent), 'Requires Moodle 4.2+ core');
  assert.ok(versionContent.includes('MATURITY_STABLE'), 'Maturity must be MATURITY_STABLE');
  assert.ok(versionContent.includes("release   = 'v1.0.0'"), 'Release must be v1.0.0');
});

// --- Test 4: Language Strings Dictionary ---
console.log('\n--- Test 4: Language Strings Dictionary ---');

it('Language pack contains required strings for plugin name and capabilities', () => {
  const langContent = fs.readFileSync(path.join(projectRoot, 'blocks/cynaris_stats/lang/en/block_cynaris_stats.php'), 'utf8');
  assert.ok(langContent.includes("$string['pluginname'] = 'Cynaris Recruitment & Training Stats'"));
  assert.ok(langContent.includes("$string['cynaris_stats:addinstance']"));
  assert.ok(langContent.includes("$string['cynaris_stats:myaddinstance']"));
  assert.ok(langContent.includes("$string['active_candidates']"));
  assert.ok(langContent.includes("$string['completed_courses']"));
  assert.ok(langContent.includes("$string['average_assessment_score']"));
});

// --- Test 5: Capabilities & Access Control ---
console.log('\n--- Test 5: Capabilities & Access Control ---');

it('db/access.php declares proper Moodle capabilities for block placement', () => {
  const accessContent = fs.readFileSync(path.join(projectRoot, 'blocks/cynaris_stats/db/access.php'), 'utf8');
  assert.ok(accessContent.includes("'block/cynaris_stats:myaddinstance'"));
  assert.ok(accessContent.includes("'block/cynaris_stats:addinstance'"));
  assert.ok(accessContent.includes('CONTEXT_SYSTEM'));
  assert.ok(accessContent.includes('CONTEXT_BLOCK'));
  assert.ok(accessContent.includes("'archetypes'"));
});

// --- Test 6: Headless CLI Upgrade Runner Simulation ---
console.log('\n--- Test 6: Headless CLI Upgrade Runner Simulation ---');

it('admin/cli/upgrade.php and moodle/admin/cli/upgrade.php exist', () => {
  assert.strictEqual(fs.existsSync(path.join(projectRoot, 'admin/cli/upgrade.php')), true);
  assert.strictEqual(fs.existsSync(path.join(projectRoot, 'moodle/admin/cli/upgrade.php')), true);
});

it('runMoodleCliUpgrade discovers and successfully registers block_cynaris_stats', () => {
  const upgradeResult = runMoodleCliUpgrade();
  assert.strictEqual(upgradeResult.success, true);
  assert.ok(upgradeResult.discoveredCount >= 2, 'Must discover at least 2 block plugins');
  assert.strictEqual(upgradeResult.statsPluginRegistered, true, 'block_cynaris_stats must be registered');
});

// --- Test 7: Cynaris Backend API Bridge Integration ---
console.log('\n--- Test 7: Cynaris Backend API Bridge Integration ---');

it('moodleService.getBlockPlugins() returns block_cynaris_stats in plugins list', () => {
  const blocks = moodleService.getBlockPlugins();
  assert.ok(Array.isArray(blocks), 'Should return an array of blocks');
  const statsBlock = blocks.find(b => b.component === 'block_cynaris_stats');
  assert.ok(statsBlock, 'block_cynaris_stats must be present in plugin list');
  assert.strictEqual(statsBlock.displayName, 'Cynaris Recruitment & Training Stats');
  assert.strictEqual(statsBlock.version, 2023100900);
  assert.strictEqual(statsBlock.hasAccessConfig, true);
  assert.strictEqual(statsBlock.hasLangPack, true);
});

it('moodleService.getStatsBlockContent() renders scaffold statistics', () => {
  const rendered = moodleService.getStatsBlockContent('scaffold');
  assert.strictEqual(rendered.success, true);
  assert.strictEqual(rendered.component, 'block_cynaris_stats');
  assert.strictEqual(rendered.title, 'Cynaris Recruitment & Training Stats');
  assert.ok(rendered.content.text.includes('Cynaris Candidate & Training Telemetry'));
  assert.ok(rendered.content.text.includes('Active Enrolled Candidates'));
  assert.ok(rendered.content.footer.includes('Open Recruiter Dashboard'));
  assert.strictEqual(rendered.metrics.activeCandidates, 5);
  assert.strictEqual(rendered.metrics.averageAssessmentScore, '91.0%');
});

// --- Final Summary ---
console.log('\n================================================================');
if (passCount === totalCount) {
  console.log(`🎉 [SUCCESS] All ${passCount} Week 5 Day 3 Block Plugin Tests Passed!`);
} else {
  console.log(`⚠️ [WARNING] ${passCount}/${totalCount} tests passed.`);
}
console.log('================================================================\n');

process.exit(passCount === totalCount ? 0 : 1);
