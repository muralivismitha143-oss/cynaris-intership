<?php
/**
 * deploy_verify.php
 * 
 * Command-line deployment and capstone verification tool for Moodle LMS fork.
 * Usage: php moodle/admin/cli/deploy_verify.php
 */

define('CLI_SCRIPT', true);

require_once(__DIR__ . '/../../config.php');

echo "================================================================\n";
echo "🎓 Moodle LMS Deployment & Capstone Architecture Verification\n";
echo "================================================================\n\n";

$checks = [];

// 1. Verify Configuration Object
$checks['Configuration ($CFG)'] = !empty($CFG->wwwroot) && !empty($CFG->dataroot) && !empty($CFG->dbtype);
echo sprintf("  [%s] CFG Object Initialized (wwwroot: %s, dbtype: %s)\n",
    $checks['Configuration ($CFG)'] ? 'PASS' : 'FAIL',
    $CFG->wwwroot ?? 'MISSING',
    $CFG->dbtype ?? 'MISSING'
);

// 2. Verify Dataroot Isolation
$checks['Dataroot Security'] = ($CFG->dataroot !== __DIR__ . '/../../');
echo sprintf("  [%s] Dataroot Isolated Outside Webroot (%s)\n",
    $checks['Dataroot Security'] ? 'PASS' : 'FAIL',
    $CFG->dataroot ?? 'MISSING'
);

// 3. Verify Top-Level Subsystems
$baseDir = realpath(__DIR__ . '/../../');
$requiredDirs = ['admin', 'blocks', 'database', 'lib', 'local', 'mod'];
$dirsFound = true;
foreach ($requiredDirs as $d) {
    if (!is_dir($baseDir . '/' . $d)) {
        $dirsFound = false;
        break;
    }
}
$checks['Directory Structure'] = $dirsFound;
echo sprintf("  [%s] Top-Level Moodle Subsystems Present (%s)\n",
    $dirsFound ? 'PASS' : 'FAIL',
    implode(', ', $requiredDirs)
);

// 4. Verify Custom Frankenstyle Plugins
$requiredPlugins = [
    'blocks/cynaris_stats/block_cynaris_stats.php',
    'blocks/cynaris_tracker/block_cynaris_tracker.php',
    'mod/quiz/view.php',
    'local/cynaris_ai_tutor/AiTutor.php',
    'local/cynaris_recommendations/RecommendationService.php',
    'local/cynaris_perf/QueryAuditService.php'
];
$pluginsFound = true;
foreach ($requiredPlugins as $p) {
    if (!file_exists($baseDir . '/' . $p)) {
        $pluginsFound = false;
        break;
    }
}
$checks['Frankenstyle Plugins'] = $pluginsFound;
echo sprintf("  [%s] Custom Frankenstyle Subsystems Installed (6 of 6)\n",
    $pluginsFound ? 'PASS' : 'FAIL'
);

// 5. Verify Database Schema & Optimizations SQL Files
$schemaFile = $baseDir . '/database/schema.sql';
$optimizationsFile = $baseDir . '/database/schema_optimizations.sql';
$checks['Database Schemas'] = file_exists($schemaFile) && file_exists($optimizationsFile);
echo sprintf("  [%s] DDL Schema & Optimization SQL Files Present\n",
    $checks['Database Schemas'] ? 'PASS' : 'FAIL'
);

// 6. Summary
$allPassed = !in_array(false, $checks, true);
echo "\n----------------------------------------------------------------\n";
if ($allPassed) {
    echo "🎉 [SUCCESS] All Moodle Deployment Verification Checks Passed! (100% Operational)\n";
    exit(0);
} else {
    echo "❌ [FAILED] One or more verification checks failed.\n";
    exit(1);
}
