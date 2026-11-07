<?php
// Moodle Quiz Attempt & Summary Controller
// File: mod/quiz/view.php
// Fixed in Issue #101: Sanitized quiz ID parameter, added responsive mobile viewport,
// dynamic database lookup, candidate attempt history, and accessible action controls.

$configpath = __DIR__ . '/../../config.php';
if (!file_exists($configpath)) {
    $configpath = __DIR__ . '/../config.php';
}

if (file_exists($configpath)) {
    require_once($configpath);
} else {
    defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);
}

require_once(__DIR__ . '/lib.php');

// Parameter sanitization & boundary validation
$rawId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$quizId = ($rawId !== false && $rawId > 0) ? $rawId : 501;

// Load seed data for dynamic assessment lookup
$seedCandidates = [
    __DIR__ . '/../../database/seed_data.json',
    __DIR__ . '/../database/seed_data.json',
];

$seedData = [];
foreach ($seedCandidates as $seedPath) {
    if (file_exists($seedPath)) {
        $raw = file_get_contents($seedPath);
        $seedData = json_decode($raw, true) ?: [];
        break;
    }
}

// Locate matching quiz metadata
$gradeItems = $seedData['grade_items'] ?? [];
$matchedQuiz = null;
foreach ($gradeItems as $gi) {
    if ($gi['id'] == $quizId) {
        $matchedQuiz = $gi;
        break;
    }
}

if (!$matchedQuiz) {
    // Default fallback quiz definition
    $matchedQuiz = [
        'id' => $quizId,
        'itemname' => 'Technical Assessment: Full Stack Architecture & RESTful APIs',
        'courseid' => 101,
        'itemmodule' => 'quiz',
    ];
}

// Locate matching course
$courses = $seedData['courses'] ?? [];
$courseName = 'Full Stack Developer Induction (CYN-FS-101)';
foreach ($courses as $c) {
    if ($c['id'] == $matchedQuiz['courseid']) {
        $courseName = $c['fullname'] . ' (' . $c['shortname'] . ')';
        break;
    }
}

// Check existing candidate grade attempts (User 2: Murali)
$grades = $seedData['grades'] ?? [];
$candidateAttempt = null;
foreach ($grades as $g) {
    if ($g['itemid'] == $quizId && $g['userid'] == 2) {
        $candidateAttempt = $g;
        break;
    }
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Cynaris Technical Skill Assessment Portal">
    <title><?php echo htmlspecialchars($matchedQuiz['itemname']); ?> — Assessment View</title>
    <style>
        :root {
            --primary: #0284c7;
            --primary-hover: #0369a1;
            --success: #16a34a;
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border: #e2e8f0;
        }
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 1.5rem;
            margin: 0;
            background: var(--bg);
            color: var(--text-main);
            line-height: 1.6;
        }
        .container {
            max-width: 720px;
            margin: 2rem auto;
            background: var(--card-bg);
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid var(--border);
        }
        .header-section {
            border-bottom: 2px solid var(--border);
            padding-bottom: 1.25rem;
            margin-bottom: 1.5rem;
        }
        .breadcrumb {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-bottom: 0.5rem;
        }
        .breadcrumb a {
            color: var(--primary);
            text-decoration: none;
        }
        h1 {
            margin: 0 0 0.5rem 0;
            font-size: 1.5rem;
            color: var(--text-main);
        }
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 1.5rem 0;
            padding: 1.25rem;
            background: #f1f5f9;
            border-radius: 8px;
        }
        .meta-item {
            font-size: 0.9rem;
        }
        .meta-label {
            color: var(--text-muted);
            font-size: 0.8rem;
            text-transform: uppercase;
            font-weight: 600;
        }
        .meta-val {
            font-weight: 600;
            color: var(--text-main);
            margin-top: 0.25rem;
        }
        .attempt-card {
            background: #f0fdf4;
            border-left: 4px solid var(--success);
            padding: 1rem 1.25rem;
            border-radius: 6px;
            margin: 1.5rem 0;
        }
        .attempt-score {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--success);
        }
        .btn-group {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
            flex-wrap: wrap;
        }
        .btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            font-size: 0.95rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s ease-in-out;
        }
        .btn:hover { background: var(--primary-hover); }
        .btn-outline {
            background: transparent;
            color: var(--text-muted);
            border: 1px solid var(--border);
        }
        .btn-outline:hover {
            background: #f1f5f9;
            color: var(--text-main);
        }
        @media (max-width: 600px) {
            body { padding: 1rem; }
            .container { padding: 1.25rem; }
            .btn-group { flex-direction: column; }
            .btn { width: 100%; text-align: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-section">
            <div class="breadcrumb">
                <a href="/">&larr; Dashboard</a> / Technical Assessments / Quiz #<?php echo (int)$matchedQuiz['id']; ?>
            </div>
            <h1><?php echo htmlspecialchars($matchedQuiz['itemname']); ?></h1>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">
                Curriculum Module: <strong><?php echo htmlspecialchars($courseName); ?></strong>
            </p>
        </div>

        <div class="meta-grid">
            <div class="meta-item">
                <div class="meta-label">Time Limit</div>
                <div class="meta-val">⏱️ 45 Minutes</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Grading Method</div>
                <div class="meta-val">🏆 Highest Attempt</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Passing Grade</div>
                <div class="meta-val">🎯 75.0% / 100.0%</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Attempts Allowed</div>
                <div class="meta-val">🔄 2 Attempts</div>
            </div>
        </div>

        <?php if ($candidateAttempt): ?>
            <div class="attempt-card">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                    <div>
                        <strong style="color: #15803d;">✅ Previous Attempt Completed</strong>
                        <div style="font-size: 0.85rem; color: #166534; margin-top: 0.25rem;">
                            Feedback: <?php echo htmlspecialchars($candidateAttempt['feedback'] ?? 'Passed with distinction.'); ?>
                        </div>
                    </div>
                    <div class="attempt-score">
                        <?php echo number_format($candidateAttempt['finalgrade'], 1); ?>%
                    </div>
                </div>
            </div>
        <?php else: ?>
            <p style="font-size: 0.95rem; color: var(--text-muted);">
                You have not yet submitted an attempt for this technical assessment. Click below when ready to begin your timed session.
            </p>
        <?php endif; ?>

        <div class="btn-group">
            <a href="?id=<?php echo (int)$matchedQuiz['id']; ?>&action=start"
               class="btn"
               aria-label="<?php echo $candidateAttempt ? 'Retake Technical Assessment Quiz' : 'Start Technical Assessment Quiz Attempt'; ?>">
                <?php echo $candidateAttempt ? '🔄 Retake Assessment' : '🚀 Start Timed Attempt'; ?>
            </a>
            <a href="/" class="btn btn-outline" aria-label="Return to Candidate Dashboard">
                Return to Dashboard
            </a>
        </div>
    </div>
</body>
</html>
