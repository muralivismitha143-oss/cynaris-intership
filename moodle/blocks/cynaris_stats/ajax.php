<?php
// Moodle Block Cynaris Stats AJAX Service Endpoint
// Location: moodle/blocks/cynaris_stats/ajax.php
// Returns real-time Chart.js JSON data for dynamic dashboard visualization

define('AJAX_SCRIPT', true);

$configpath = __DIR__ . '/../../config.php';
if (!file_exists($configpath)) {
    $configpath = __DIR__ . '/../config.php';
}

if (file_exists($configpath)) {
    require_once($configpath);
} else {
    defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);
}

header('Content-Type: application/json; charset=utf-8');

// Load database seed data
$seedCandidates = [
    __DIR__ . '/../../moodle/database/seed_data.json',
    __DIR__ . '/../database/seed_data.json',
];

$data = [];
foreach ($seedCandidates as $seedPath) {
    if (file_exists($seedPath)) {
        $raw = file_get_contents($seedPath);
        $data = json_decode($raw, true) ?: [];
        break;
    }
}

$courses = $data['courses'] ?? [];
$completions = $data['course_completions'] ?? [];
$users = array_values(array_filter($data['users'] ?? [], function($u) {
    return empty($u['deleted']) && ($u['role'] ?? '') !== 'admin';
}));
$grades = $data['grades'] ?? [];
$logs = array_values(array_filter($data['logs'] ?? [], function($l) {
    return ($l['module'] ?? '') === 'login' && ($l['action'] ?? '') === 'login';
}));

// 1. Completion % per course (mdl_course + mdl_course_completions)
$courseCompletionStats = [];
foreach ($courses as $c) {
    $enrolled = array_filter($completions, function($comp) use ($c) {
        return $comp['course'] == $c['id'];
    });
    $total = count($enrolled);
    $completed = count(array_filter($enrolled, function($comp) {
        return !empty($comp['status']) || !empty($comp['timecompleted']);
    }));
    $pct = $total > 0 ? round(($completed / $total) * 100, 1) : 0.0;
    $courseCompletionStats[] = [
        'courseId' => $c['id'],
        'courseCode' => $c['shortname'],
        'courseName' => $c['fullname'],
        'totalEnrolled' => $total,
        'completedCount' => $completed,
        'completionPercentage' => $pct,
    ];
}

// 2. Average grade per student (mdl_user + mdl_grade_grades)
// Handles 3+ students: some with grades, some without grades
$studentGradeStats = [];
foreach ($users as $u) {
    $userGrades = array_filter($grades, function($g) use ($u) {
        return $g['userid'] == $u['id'];
    });
    $attempts = count($userGrades);
    $hasGrades = $attempts > 0;
    $avg = $hasGrades ? round(array_sum(array_column($userGrades, 'finalgrade')) / $attempts, 2) : 0.00;
    $studentGradeStats[] = [
        'userId' => $u['id'],
        'name' => $u['firstname'] . ' ' . $u['lastname'],
        'email' => $u['email'],
        'department' => $u['department'] ?? 'Intern',
        'gradedAttempts' => $attempts,
        'averageGrade' => $avg,
        'hasGrades' => $hasGrades,
    ];
}
usort($studentGradeStats, function($a, $b) {
    return $b['averageGrade'] <=> $a['averageGrade'];
});

// 3. Last login per user & login frequency (mdl_user + mdl_log)
$loginFrequencyStats = [];
foreach ($users as $u) {
    $userLogs = array_filter($logs, function($l) use ($u) {
        return $l['userid'] == $u['id'];
    });
    $count = count($userLogs);
    $times = array_column($userLogs, 'time');
    $lastTime = !empty($times) ? max($times) : null;
    $loginFrequencyStats[] = [
        'userId' => $u['id'],
        'name' => $u['firstname'] . ' ' . $u['lastname'],
        'loginCount' => $count,
        'lastLoginTime' => $lastTime,
        'lastLoginDate' => $lastTime ? date('Y-m-d H:i:s', $lastTime) : 'Never',
    ];
}
usort($loginFrequencyStats, function($a, $b) {
    return $b['loginCount'] <=> $a['loginCount'];
});

$response = [
    'success' => true,
    'timestamp' => date('c'),
    'courseCompletionStats' => $courseCompletionStats,
    'studentGradeStats' => $studentGradeStats,
    'loginFrequencyStats' => $loginFrequencyStats,
    'charts' => [
        'barChart' => [
            'labels' => array_column($courseCompletionStats, 'courseCode'),
            'datasets' => [[
                'label' => 'Course Completion Rate (%)',
                'data' => array_column($courseCompletionStats, 'completionPercentage'),
                'backgroundColor' => 'rgba(2, 132, 199, 0.75)',
                'borderColor' => 'rgba(2, 132, 199, 1)',
                'borderWidth' => 1.5,
                'borderRadius' => 4,
            ]],
        ],
        'lineChart' => [
            'labels' => array_column($loginFrequencyStats, 'name'),
            'datasets' => [[
                'label' => 'User Login Frequency',
                'data' => array_column($loginFrequencyStats, 'loginCount'),
                'borderColor' => 'rgba(16, 185, 129, 1)',
                'backgroundColor' => 'rgba(16, 185, 129, 0.2)',
                'fill' => true,
                'tension' => 0.35,
                'pointRadius' => 5,
                'pointBackgroundColor' => 'rgba(16, 185, 129, 1)',
            ]],
        ],
    ],
];

echo json_encode($response, JSON_PRETTY_PRINT);
exit(0);
