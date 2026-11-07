<?php
// Moodle Quiz Attempt & Summary Controller
// File: mod/quiz/view.php

require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');

$id = isset($_GET['id']) ? (int)$_GET['id'] : 1;

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Technical Assessment Quiz - View</title>
    <style>
        body { font-family: sans-serif; padding: 2rem; background: #f1f5f9; color: #0f172a; }
        .card { background: white; border-radius: 8px; padding: 1.5rem; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .btn { background: #0284c7; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; text-decoration: none; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Technical Assessment Quiz (ID: <?php echo $id; ?>)</h2>
        <p><strong>Topic:</strong> Full Stack Development, React 18 & Database Engineering</p>
        <p><strong>Time Limit:</strong> 45 Mins</p>
        <p><strong>Grading Method:</strong> Highest Grade</p>
        <p>Status: Ready for candidate attempt.</p>
        <a href="#" class="btn">Attempt Quiz Now</a>
    </div>
</body>
</html>
