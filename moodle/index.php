<?php
// Moodle Frontpage and Course Dashboard Router

require_once(__DIR__ . '/config.php');

$siteName = 'Cynaris Recruitment & Learning Management System';
$siteVersion = '4.3+';

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($siteName); ?></title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 2rem; color: #1e293b; }
        .container { max-width: 1000px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 2rem; }
        header { border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
        h1 { margin: 0; color: #0284c7; font-size: 1.8rem; }
        .badge { background: #e0f2fe; color: #0369a1; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; }
        .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 1.25rem; background: #ffffff; }
        .card h3 { margin-top: 0; color: #334155; }
        .status-ok { color: #16a34a; font-weight: 600; }
        pre { background: #0f172a; color: #38bdf8; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1><?php echo htmlspecialchars($siteName); ?></h1>
                <p>Moodle LMS Local Docker Environment &mdash; Week 5 Day 1</p>
            </div>
            <span class="badge">Moodle v<?php echo htmlspecialchars($siteVersion); ?></span>
        </header>

        <div class="grid">
            <div class="card">
                <h3>🟢 System Status</h3>
                <p>Status: <span class="status-ok">Running without errors</span></p>
                <p>Web Server: <strong>Apache / PHP <?php echo phpversion(); ?></strong></p>
                <p>Database: <strong><?php echo htmlspecialchars($CFG->dbtype); ?></strong> on <code><?php echo htmlspecialchars($CFG->dbhost); ?></code></p>
                <p>Site Root: <code><?php echo htmlspecialchars($CFG->wwwroot); ?></code></p>
            </div>

            <div class="card">
                <h3>📚 Active Training Modules</h3>
                <ul>
                    <li>Full Stack Developer Induction (Course ID: 101)</li>
                    <li>Technical Round Skill Assessment (Quiz ID: 501)</li>
                    <li>Cynaris Platform Onboarding (Course ID: 102)</li>
                </ul>
            </div>

            <div class="card">
                <h3>🧩 Installed Subsystems</h3>
                <ul>
                    <li><strong>blocks/cynaris_tracker</strong>: Candidate Progress Tracker Block</li>
                    <li><strong>mod/quiz</strong>: Interactive Technical Assessment Module</li>
                    <li><strong>auth/manual</strong>: Default Core Authentication</li>
                </ul>
            </div>
        </div>

        <h3>📋 Active Configuration Manifest ($CFG)</h3>
        <pre><?php
            $displayConfig = (array) $CFG;
            unset($displayConfig['dbpass']); // Mask credentials
            echo htmlspecialchars(json_encode($displayConfig, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        ?></pre>
    </div>
</body>
</html>
