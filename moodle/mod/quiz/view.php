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

        <!-- Week 6 Day 1: AI Tutor Integration — Groq Primary, OpenRouter Fallback -->
        <div id="cynaris-ai-tutor-container" style="margin-top: 2rem; background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.25rem;">🤖</span>
                    <h3 style="margin: 0; font-size: 1.05rem; color: var(--text-main);">AI Technical Tutor & Exam Preparation Assistant</h3>
                </div>
                <span id="cynaris-tutor-status-badge" role="status" aria-live="polite" style="font-size: 11px; font-weight: 600; color: #0284c7; background: #e0f2fe; padding: 3px 8px; border-radius: 12px;">
                    ● Primary: Groq LLaMA 3.3 70B (Ready)
                </span>
            </div>
            <p style="margin: 0 0 1rem 0; font-size: 0.88rem; color: var(--text-muted);">
                Need clarification on concepts tested in this assessment? Ask the Cynaris AI Tutor for Socratic explanations, step-by-step guidance, and code examples.
            </p>
            
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
                <button type="button" class="btn-topic" onclick="askAiTutorPredefined('Explain the Node.js event loop phases and asynchronous non-blocking I/O.')" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; color: #475569;">
                    💡 Event Loop & Libuv
                </button>
                <button type="button" class="btn-topic" onclick="askAiTutorPredefined('How do SQL prepared statements protect against injection in Moodle DBAL?')" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; color: #475569;">
                    💡 Prepared Statements & DBAL
                </button>
                <button type="button" class="btn-topic" onclick="askAiTutorPredefined('How to prevent Chart.js label collisions on narrow mobile viewports?')" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; color: #475569;">
                    💡 Chart.js AutoSkip Ticks
                </button>
            </div>

            <div style="display: flex; gap: 0.5rem;">
                <input type="text" id="cynaris-tutor-input" placeholder="Ask a question about this assessment..." style="flex: 1; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem;" onkeypress="if(event.key === 'Enter') submitAiTutorQuestion();" />
                <button type="button" id="cynaris-tutor-submit-btn" onclick="submitAiTutorQuestion()" style="background: #0284c7; color: white; border: none; border-radius: 6px; padding: 0.6rem 1.2rem; font-weight: 600; cursor: pointer;">
                    Ask Tutor
                </button>
            </div>

            <div id="cynaris-tutor-output" style="display: none; margin-top: 1rem; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <strong style="color: #0369a1;" id="cynaris-tutor-provider-label">Provider: Groq (llama-3.3-70b-versatile)</strong>
                    <span id="cynaris-tutor-latency-label" style="font-size: 11px; color: #64748b;">Latency: ~250ms</span>
                </div>
                <div id="cynaris-tutor-explanation" style="margin-bottom: 0.75rem; color: #1e293b; line-height: 1.4;"></div>
                <div id="cynaris-tutor-steps" style="margin-bottom: 0.75rem;"></div>
                <pre id="cynaris-tutor-code" style="background: #0f172a; color: #f8fafc; padding: 0.75rem; border-radius: 4px; overflow-x: auto; font-size: 12px; margin-bottom: 0.75rem;"></pre>
                <div id="cynaris-tutor-hint" style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 0.5rem 0.75rem; border-radius: 4px; color: #92400e; font-size: 12px;"></div>
            </div>
        </div>

        <script>
        async function submitAiTutorQuestion() {
            const input = document.getElementById('cynaris-tutor-input');
            const q = input.value.trim();
            if (!q) return;
            await askAiTutor(q);
        }

        function askAiTutorPredefined(questionText) {
            const input = document.getElementById('cynaris-tutor-input');
            input.value = questionText;
            askAiTutor(questionText);
        }

        async function askAiTutor(questionText) {
            const btn = document.getElementById('cynaris-tutor-submit-btn');
            const badge = document.getElementById('cynaris-tutor-status-badge');
            const output = document.getElementById('cynaris-tutor-output');
            
            btn.disabled = true;
            btn.textContent = 'Thinking...';
            badge.textContent = '● Querying AI Tutor...';
            badge.style.color = '#ea580c';
            badge.style.background = '#ffedd5';

            try {
                const res = await fetch('/api/moodle/ai-tutor/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: 2,
                        studentName: 'Murali',
                        courseCode: 'CYN-FS-101',
                        courseName: <?php echo json_encode($courseName); ?>,
                        quizName: <?php echo json_encode($matchedQuiz['itemname']); ?>,
                        question: questionText
                    })
                });
                const data = await res.json();
                if (data.success && data.data) {
                    output.style.display = 'block';
                    document.getElementById('cynaris-tutor-provider-label').textContent = 
                        'Provider: ' + data.provider + ' (' + data.model + ')' + (data.fallbackUsed ? ' [Fallback Active]' : '');
                    document.getElementById('cynaris-tutor-latency-label').textContent = 'Latency: ' + data.latencyMs + 'ms';
                    document.getElementById('cynaris-tutor-explanation').textContent = data.data.conceptExplanation;
                    
                    const stepsEl = document.getElementById('cynaris-tutor-steps');
                    stepsEl.innerHTML = '<strong style="display:block; margin-bottom:4px; font-size:12px; color:#475569;">Step-by-Step Breakdown:</strong>' +
                        '<ol style="margin:0; padding-left:1.2rem; font-size:12px; color:#334155;">' +
                        (data.data.stepByStepBreakdown || []).map(s => '<li>' + s + '</li>').join('') +
                        '</ol>';
                    
                    const codeEl = document.getElementById('cynaris-tutor-code');
                    if (data.data.codeExample) {
                        codeEl.style.display = 'block';
                        codeEl.textContent = data.data.codeExample;
                    } else {
                        codeEl.style.display = 'none';
                    }

                    const hintEl = document.getElementById('cynaris-tutor-hint');
                    if (data.data.quizHint) {
                        hintEl.style.display = 'block';
                        hintEl.innerHTML = '<strong>Quiz Hint:</strong> ' + data.data.quizHint;
                    } else {
                        hintEl.style.display = 'none';
                    }

                    badge.textContent = data.fallbackUsed ? '● OpenRouter Fallback' : '● Groq Primary Active';
                    badge.style.color = data.fallbackUsed ? '#b45309' : '#15803d';
                    badge.style.background = data.fallbackUsed ? '#fef3c7' : '#dcfce7';
                }
            } catch (err) {
                console.error('AI Tutor error:', err);
                badge.textContent = '● Offline Fallback Active';
                badge.style.color = '#dc2626';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Ask Tutor';
            }
        }
        </script>

        <!-- Week 6 Day 2: AI Quiz Generation & Question Bank Integration -->
        <div id="cynaris-quiz-generator-container" style="margin-top: 1.5rem; background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.25rem;">📝</span>
                    <h3 style="margin: 0; font-size: 1.05rem; color: var(--text-main);">AI Assessment Generator & Question Bank Engine</h3>
                </div>
                <span id="cynaris-quizgen-status-badge" role="status" aria-live="polite" style="font-size: 11px; font-weight: 600; color: #0284c7; background: #e0f2fe; padding: 3px 8px; border-radius: 12px;">
                    ● Question Bank API: Ready
                </span>
            </div>
            <p style="margin: 0 0 1rem 0; font-size: 0.88rem; color: var(--text-muted);">
                Generate fresh, curriculum-aligned multiple-choice questions (MCQs) using Groq AI with automated OpenRouter failover, then import them directly into Moodle's Question Bank.
            </p>

            <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;">
                <label style="font-size: 0.85rem; font-weight: 600; color: #475569;">Question Count:</label>
                <select id="cynaris-quizgen-count" style="padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.85rem;">
                    <option value="3">3 Questions</option>
                    <option value="5" selected>5 Questions (Standard)</option>
                    <option value="10">10 Questions</option>
                </select>
                <button type="button" id="cynaris-quizgen-btn" onclick="generateAiQuizQuestions()" style="background: #0284c7; color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; font-weight: 600; font-size: 0.85rem; cursor: pointer;">
                    ⚡ Generate MCQs from Course
                </button>
            </div>

            <div id="cynaris-quizgen-results" style="display: none; margin-top: 1rem; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.88rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">
                    <strong style="color: #0369a1;" id="cynaris-quizgen-provider">Provider: Groq (llama-3.3-70b-versatile)</strong>
                    <span id="cynaris-quizgen-meta" style="font-size: 11px; color: #64748b;">5 Questions • Imported to Question Bank</span>
                </div>
                <div id="cynaris-quizgen-list" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
            </div>
        </div>

        <script>
        async function generateAiQuizQuestions() {
            const btn = document.getElementById('cynaris-quizgen-btn');
            const badge = document.getElementById('cynaris-quizgen-status-badge');
            const count = document.getElementById('cynaris-quizgen-count').value;
            const results = document.getElementById('cynaris-quizgen-results');
            const list = document.getElementById('cynaris-quizgen-list');

            btn.disabled = true;
            btn.textContent = 'Generating MCQs...';
            badge.textContent = '● Synthesizing Questions with Groq...';
            badge.style.color = '#ea580c';
            badge.style.background = '#ffedd5';

            try {
                // 1. Generate Questions via AI Service
                const genRes = await fetch('/api/moodle/quiz/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        courseId: <?php echo (int)($matchedQuiz['courseid'] ?? 101); ?>,
                        count: parseInt(count, 10)
                    })
                });
                const genData = await genRes.json();

                if (genData.success && genData.questions) {
                    // 2. Import into Question Bank
                    const importRes = await fetch('/api/moodle/quiz/import-to-bank', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            courseId: genData.courseId,
                            questions: genData.questions
                        })
                    });
                    const importData = await importRes.json();

                    results.style.display = 'block';
                    document.getElementById('cynaris-quizgen-provider').textContent = 
                        'Provider: ' + genData.provider + ' (' + genData.model + ')' + (genData.fallbackUsed ? ' [Fallback]' : '');
                    document.getElementById('cynaris-quizgen-meta').textContent = 
                        importData.importedCount + ' Questions Imported to Question Bank (' + genData.latencyMs + 'ms)';

                    list.innerHTML = genData.questions.map((q, idx) => `
                        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:0.75rem;">
                            <div style="font-weight:600; color:#1e293b; margin-bottom:0.35rem;">Q${idx + 1}: ${q.question}</div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.25rem; font-size:0.8rem; margin-bottom:0.35rem;">
                                <div style="padding:4px; border-radius:4px; background:${q.correct_answer === 'A' ? '#dcfce7; font-weight:600;' : '#f1f5f9;'}">A) ${q.option_a}</div>
                                <div style="padding:4px; border-radius:4px; background:${q.correct_answer === 'B' ? '#dcfce7; font-weight:600;' : '#f1f5f9;'}">B) ${q.option_b}</div>
                                <div style="padding:4px; border-radius:4px; background:${q.correct_answer === 'C' ? '#dcfce7; font-weight:600;' : '#f1f5f9;'}">C) ${q.option_c}</div>
                                <div style="padding:4px; border-radius:4px; background:${q.correct_answer === 'D' ? '#dcfce7; font-weight:600;' : '#f1f5f9;'}">D) ${q.option_d}</div>
                            </div>
                            <div style="font-size:0.75rem; color:#15803d; background:#f0fdf4; padding:4px 8px; border-radius:4px;">
                                <strong>Rationale:</strong> ${q.explanation}
                            </div>
                        </div>
                    `).join('');

                    badge.textContent = '● Imported to Question Bank';
                    badge.style.color = '#15803d';
                    badge.style.background = '#dcfce7';
                }
            } catch (err) {
                console.error('Quiz generation error:', err);
                badge.textContent = '● Offline Engine Used';
                badge.style.color = '#dc2626';
            } finally {
                btn.disabled = false;
                btn.textContent = '⚡ Generate MCQs from Course';
            }
        }
        </script>

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
