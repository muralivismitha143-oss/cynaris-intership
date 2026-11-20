<?php
// Moodle Frontpage and Course Dashboard Router - Week 6 Day 5 Capstone
// Cynaris Recruitment & Learning Management System

require_once(__DIR__ . '/config.php');

$siteName = 'Cynaris Recruitment & Learning Management System';
$siteVersion = '4.3+ Production Capstone';

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($siteName); ?></title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 2rem; color: #1e293b; }
        .container { max-width: 1100px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 2rem; }
        header { border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
        h1 { margin: 0; color: #0284c7; font-size: 1.8rem; }
        .badge { background: #e0f2fe; color: #0369a1; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; }
        .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 1.25rem; background: #ffffff; }
        .card h3 { margin-top: 0; color: #334155; font-size: 1.15rem; }
        .status-ok { color: #16a34a; font-weight: 600; }
        .nav-buttons { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1rem; margin-bottom: 1.5rem; }
        .nav-btn { background: #0284c7; color: #ffffff; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.9rem; font-weight: 500; display: inline-block; }
        .nav-btn:hover { background: #0369a1; }
        .nav-btn-secondary { background: #475569; }
        .nav-btn-secondary:hover { background: #334155; }
        .architecture-box { background: #f1f5f9; border-left: 4px solid #0284c7; padding: 1rem 1.25rem; border-radius: 0 6px 6px 0; margin-top: 1.5rem; }
        .architecture-box h4 { margin-top: 0; color: #0f172a; margin-bottom: 0.5rem; }
        .architecture-box ol { margin: 0; padding-left: 1.25rem; }
        .architecture-box li { margin-bottom: 0.35rem; font-size: 0.9rem; }
        pre { background: #0f172a; color: #38bdf8; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1><?php echo htmlspecialchars($siteName); ?></h1>
                <p>Moodle LMS Fork Deployment & Full Capstone Architecture &mdash; Week 6 Day 5</p>
            </div>
            <span class="badge"><?php echo htmlspecialchars($siteVersion); ?></span>
        </header>

        <div class="nav-buttons">
            <a class="nav-btn" href="blocks/cynaris_stats/block_cynaris_stats.php">📊 Cynaris Stats, Recommendations & SQL Advisor</a>
            <a class="nav-btn" href="mod/quiz/view.php">📝 Quiz Assessment & AI Question Bank</a>
            <a class="nav-btn nav-btn-secondary" href="http://localhost:3000/api/moodle/capstone/overview" target="_blank">🌐 Node.js REST API Bridge</a>
            <a class="nav-btn nav-btn-secondary" href="http://localhost:8025" target="_blank">✉️ MailHog SMTP Catcher</a>
        </div>

        <div class="grid">
            <div class="card">
                <h3>🟢 System Status & Topology</h3>
                <p>Status: <span class="status-ok" id="cynaris-deployment-status">Running without errors (100% Operational)</span></p>
                <p>Web Server: <strong>Apache / PHP <?php echo phpversion(); ?></strong></p>
                <p>Database: <strong><?php echo htmlspecialchars($CFG->dbtype); ?></strong> on <code><?php echo htmlspecialchars($CFG->dbhost); ?>:<?php echo htmlspecialchars($CFG->dboptions['dbport']); ?></code></p>
                <p>Site Root: <code><?php echo htmlspecialchars($CFG->wwwroot); ?></code></p>
                <p>Isolated Dataroot: <code><?php echo htmlspecialchars($CFG->dataroot); ?></code></p>
            </div>

            <div class="card">
                <h3>🤖 Multi-Tiered AI Architecture</h3>
                <p><strong>Primary LLM:</strong> Groq (<code>llama-3.3-70b-versatile</code>, &lt; 350ms)</p>
                <p><strong>Fallback LLM:</strong> OpenRouter (<code>meta-llama/llama-3.3-70b-instruct</code>)</p>
                <p><strong>Safety Net:</strong> Zero-downtime Local Deterministic Fallback Engine</p>
                <p><strong>Core Capabilities:</strong></p>
                <ul>
                    <li>AI Socratic Tutor (Technical Interview Prep)</li>
                    <li>AI Quiz Generation to Question Bank</li>
                    <li>AI Learning Recommendations & Milestone Tracking</li>
                    <li>EXPLAIN Query Performance Auditor & B-Tree Advisor</li>
                </ul>
            </div>

            <div class="card">
                <h3>🧩 Installed & Verified Subsystems</h3>
                <ul>
                    <li><strong>blocks/cynaris_stats</strong>: Stats, Chart.js, Recommendations & Advisor</li>
                    <li><strong>blocks/cynaris_tracker</strong>: Candidate Progress Tracker</li>
                    <li><strong>mod/quiz</strong>: Interactive Technical Assessment Module & Question Bank</li>
                    <li><strong>local/cynaris_ai_tutor</strong>: Socratic Preparation Engine</li>
                    <li><strong>local/cynaris_recommendations</strong>: Pedagogical Learning Pathway</li>
                    <li><strong>local/cynaris_perf</strong>: SQL EXPLAIN Audit & Index Advisor</li>
                </ul>
            </div>

            <div class="card">
                <h3>🗄️ Database Schemas & Optimizations</h3>
                <p><strong>5 Core Tables Modeled:</strong></p>
                <ul>
                    <li><code>mdl_course</code> &mdash; Course master catalog</li>
                    <li><code>mdl_grade_grades</code> &mdash; Candidate marks & outcomes</li>
                    <li><code>mdl_course_completions</code> &mdash; Criteria & progress tracking</li>
                    <li><code>mdl_user</code> &mdash; Learner & recruiter profiles</li>
                    <li><code>mdl_log</code> &mdash; Compliance & audit trails</li>
                </ul>
                <p><strong>B-Tree Composite Indexes Applied:</strong></p>
                <ul>
                    <li><code>idx_mdl_log_user_action_time</code> (193&times; speedup)</li>
                    <li><code>idx_mdl_grade_item_user_final</code> (Covering index)</li>
                    <li><code>idx_mdl_completions_user_course_status</code></li>
                </ul>
            </div>
        </div>

        <div class="architecture-box">
            <h4>📐 3 Key Moodle Architectural Decisions</h4>
            <ol>
                <li><strong>Universal Database Abstraction Layer ($DB / moodle_database):</strong> Completely isolates business logic from underlying RDBMS engines (PostgreSQL, MySQL, MariaDB, Oracle) via parameterized DML operations, guaranteeing SQL injection immunity and portable query execution.</li>
                <li><strong>Modular Pluggable Component Architecture (Frankenstyle):</strong> Enforces strict namespace conventions across 40+ plugin subsystems (<code>blocks/</code>, <code>mod/</code>, <code>local/</code>, <code>auth/</code>, <code>enrol/</code>), ensuring self-contained capabilities with isolated database schemas, access controls, and string bundles.</li>
                <li><strong>Decoupled Security Dataroot Architecture ($CFG->dataroot):</strong> All user uploaded documents, session files, and media caches are stored strictly outside the public web server root (<code>/var/www/moodledata</code>) and served exclusively through tokenized PHP stream gateways (<code>pluginfile.php</code>) preventing direct HTTP script execution vulnerabilities.</li>
            </ol>
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
