<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle Quiz Local Library: AI Quiz Generation & Question Bank Integration
// File: mod/quiz/locallib.php
//
// @package    mod_quiz
// @copyright  2026 Cynaris Solutions
// @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later

defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);

require_once(__DIR__ . '/lib.php');

/**
 * Question Bank API Simulation & Data Ledger for Moodle.
 */
class question_bank_api
{
    private static array $bank = [];

    /**
     * Import an array of MCQ questions into the course Question Bank.
     *
     * @param int $course_id Course ID
     * @param array $questions Validated MCQ question objects
     * @return array Array of created question records with IDs
     */
    public static function import_questions(int $course_id, array $questions): array
    {
        $imported = [];
        foreach ($questions as $idx => $q) {
            $question_id = time() + count(self::$bank) + $idx + 1;
            $record = (object)[
                'id' => $question_id,
                'courseid' => $course_id,
                'category' => "Course $course_id Default Category",
                'name' => "MCQ Q" . ($idx + 1) . ": " . substr($q['question'], 0, 40) . '...',
                'questiontext' => $q['question'],
                'qtype' => 'multichoice',
                'defaultmark' => 1.0,
                'generalfeedback' => $q['explanation'],
                'options' => [
                    'A' => ['text' => $q['option_a'], 'fraction' => ($q['correct_answer'] === 'A' ? 1.0 : 0.0)],
                    'B' => ['text' => $q['option_b'], 'fraction' => ($q['correct_answer'] === 'B' ? 1.0 : 0.0)],
                    'C' => ['text' => $q['option_c'], 'fraction' => ($q['correct_answer'] === 'C' ? 1.0 : 0.0)],
                    'D' => ['text' => $q['option_d'], 'fraction' => ($q['correct_answer'] === 'D' ? 1.0 : 0.0)],
                ],
                'correct_answer' => $q['correct_answer'],
                'explanation' => $q['explanation'],
                'timecreated' => time(),
            ];
            self::$bank[$question_id] = $record;
            $imported[] = $record;
        }
        return $imported;
    }

    /**
     * Retrieve all questions stored in Question Bank for a course.
     */
    public static function get_questions_by_course(int $course_id): array
    {
        return array_values(array_filter(self::$bank, function($q) use ($course_id) {
            return $q->courseid === $course_id;
        }));
    }

    /**
     * Retrieve a specific question by ID.
     */
    public static function get_question(int $question_id): ?stdClass
    {
        return self::$bank[$question_id] ?? null;
    }
}

/**
 * Programmatically create a Moodle Quiz containing the specified Question Bank questions.
 *
 * @param int $course_id Course ID
 * @param string $quiz_name Title of the Quiz
 * @param array $question_ids Array of Question Bank question IDs
 * @return stdClass Created Quiz record with slots
 */
function quiz_add_quiz(int $course_id, string $quiz_name, array $question_ids): stdClass
{
    static $quiz_counter = 700;
    $quiz_counter++;

    $slots = [];
    foreach ($question_ids as $slot_num => $qid) {
        $slots[] = (object)[
            'slot' => $slot_num + 1,
            'questionid' => $qid,
            'maxmark' => 1.0,
        ];
    }

    $quiz = (object)[
        'id' => $quiz_counter,
        'course' => $course_id,
        'name' => $quiz_name,
        'intro' => "AI-Generated Assessment created automatically via Cynaris AI Quiz Generator.",
        'timeopen' => time(),
        'timeclose' => time() + (14 * 86400),
        'grade' => count($slots) * 1.0,
        'sumgrades' => count($slots) * 1.0,
        'slots' => $slots,
        'timecreated' => time(),
        'timemodified' => time(),
    ];

    return $quiz;
}

/**
 * Practical Task: Generate Quiz Questions from Course Content to Question Bank.
 *
 * 1. Fetches course name + description.
 * 2. Constructs prompt for Groq primary (with OpenRouter fallback).
 * 3. Parses and validates JSON response.
 * 4. Imports questions into Moodle Question Bank via question_bank_api.
 *
 * @param int $course_id Moodle course ID
 * @param int $count Number of MCQs to generate (default 5)
 * @param array $options Diagnostic options (e.g. simulate_groq_failure)
 * @return array Array of generated and validated question records
 */
function generate_quiz_questions(int $course_id, int $count = 5, array $options = []): array
{
    // 1. Fetch course details from seed data or database
    $course = get_course_details($course_id);
    $course_name = $course['fullname'] ?? "Course {$course_id}";
    $course_code = $course['shortname'] ?? "CYN-{$course_id}";
    $description = $course['summary'] ?? "Curriculum concepts, implementation principles, and architecture.";

    // 2. Prompt construction
    $prompt = "Generate {$count} MCQ questions about {$course_name} ({$course_code}). " .
              "Curriculum details: {$description}. " .
              "Return JSON: [{\"question\": \"...\", \"option_a\": \"...\", \"option_b\": \"...\", \"option_c\": \"...\", \"option_d\": \"...\", \"correct_answer\": \"A\", \"explanation\": \"...\"}]";

    $system_prompt = "You are the Cynaris Assessment Engine Lead Examiner. Generate rigorous multiple-choice questions (MCQs). " .
                     "Return output strictly as a parseable JSON array without markdown code blocks.";

    // 3. Execution with Groq -> OpenRouter -> Local Fallback
    $groq_key = $options['groq_api_key'] ?? getenv('GROQ_API_KEY');
    $openrouter_key = $options['openrouter_api_key'] ?? getenv('OPENROUTER_API_KEY');
    $simulate_groq = !empty($options['simulate_groq_failure']);
    $simulate_both = !empty($options['simulate_both_failure']);

    $raw_json = null;

    // Primary: Groq
    if (!$simulate_groq && !$simulate_both && !empty($groq_key) && $groq_key !== 'FAIL_GROQ') {
        try {
            $raw_json = call_llm_api('https://api.groq.com/openai/v1/chat/completions', $groq_key, 'llama-3.3-70b-versatile', $system_prompt, $prompt);
        } catch (\Throwable $e) {
            error_log("Groq generation failed ({$e->getMessage()}), attempting OpenRouter fallback.");
        }
    }

    // Fallback: OpenRouter
    if (!$raw_json && !$simulate_both && !empty($openrouter_key) && $openrouter_key !== 'FAIL_OPENROUTER') {
        try {
            $raw_json = call_llm_api('https://openrouter.ai/api/v1/chat/completions', $openrouter_key, 'meta-llama/llama-3.3-70b-instruct', $system_prompt, $prompt);
        } catch (\Throwable $e) {
            error_log("OpenRouter generation failed ({$e->getMessage()}), engaging local fallback.");
        }
    }

    // Fallback: Local Curriculum Engine
    if (!$raw_json) {
        $questions = get_deterministic_quiz_fallback($course_id, $count);
    } else {
        $clean = trim($raw_json);
        if (str_starts_with($clean, '```json')) {
            $clean = preg_replace('/^```json\s*/', '', $clean);
            $clean = preg_replace('/\s*```$/', '', $clean);
        } elseif (str_starts_with($clean, '```')) {
            $clean = preg_replace('/^```\s*/', '', $clean);
            $clean = preg_replace('/\s*```$/', '', $clean);
        }
        $questions = json_decode($clean, true);
        if (!is_array($questions)) {
            $questions = get_deterministic_quiz_fallback($course_id, $count);
        }
    }

    // 4. Validate structure
    $validated = validate_quiz_structure($questions, $count);

    return $validated;
}

/**
 * Validates array of questions conforming to required keys.
 */
function validate_quiz_structure(array $questions, int $expected_count): array
{
    $validated = [];
    $required_keys = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation'];

    foreach ($questions as $idx => $q) {
        if (!is_array($q)) continue;
        foreach ($required_keys as $key) {
            if (!isset($q[$key]) || !is_string($q[$key])) {
                throw new \InvalidArgumentException("Question at index {$idx} missing required key: {$key}");
            }
        }
        $ans = strtoupper(trim($q['correct_answer']));
        if (!in_array($ans, ['A', 'B', 'C', 'D'])) {
            throw new \InvalidArgumentException("Question at index {$idx} has invalid correct_answer: {$q['correct_answer']}");
        }
        $q['correct_answer'] = $ans;
        $validated[] = $q;
        if (count($validated) >= $expected_count) break;
    }

    if (empty($validated)) {
        throw new \RuntimeException("No valid questions parsed from AI response");
    }

    return $validated;
}

function get_course_details(int $course_id): array
{
    $seed_path = __DIR__ . '/../../database/seed_data.json';
    if (file_exists($seed_path)) {
        $raw = json_decode(file_get_contents($seed_path), true);
        foreach ($raw['courses'] ?? [] as $c) {
            if ($c['id'] == $course_id) return $c;
        }
    }
    return [
        'id' => $course_id,
        'fullname' => "Full Stack Development Induction",
        'shortname' => "CYN-FS-{$course_id}",
        'summary' => "Event loop architecture, REST APIs, MySQL CRUD, and Moodle LMS."
    ];
}

function get_deterministic_quiz_fallback(int $course_id, int $count): array
{
    $pool = [
        [
            'question' => "Which libuv phase processes setImmediate() callbacks in Node.js?",
            'option_a' => "Timers Phase",
            'option_b' => "Poll Phase",
            'option_c' => "Check Phase",
            'option_d' => "Close Callbacks",
            'correct_answer' => "C",
            'explanation' => "The check phase executes setImmediate() callbacks right after the poll phase."
        ],
        [
            'question' => "How do prepared statements prevent SQL injection attacks in MySQL?",
            'option_a' => "By running queries exclusively in browser memory",
            'option_b' => "By precompiling SQL structure and parameterizing user inputs as literals",
            'option_c' => "By using SHA-256 password hashes",
            'option_d' => "By disabling the MySQL WHERE clause",
            'correct_answer' => "B",
            'explanation' => "Prepared statements treat input parameters as literal data, preventing syntax injection."
        ],
        [
            'question' => "What is the primary role of salt in bcrypt password hashing?",
            'option_a' => "To symmetrically encrypt the password string",
            'option_b' => "To ensure identical passwords generate unique hashes, preventing rainbow table attacks",
            'option_c' => "To shorten password length to 16 characters",
            'option_d' => "To enable reversible plaintext decryption",
            'correct_answer' => "B",
            'explanation' => "Unique pseudorandom salts guarantee distinct hashes for identical plain passwords."
        ],
        [
            'question' => "In Chart.js, which property automatically rotates and reduces labels on narrow mobile viewports?",
            'option_a' => "scales.x.ticks.autoSkip set to true",
            'option_b' => "plugins.legend.position set to 'left'",
            'option_c' => "responsive set to false",
            'option_d' => "maintainAspectRatio set to true with fixed width",
            'correct_answer' => "A",
            'explanation' => "autoSkip: true thins out categorical tick labels on constrained widths."
        ],
        [
            'question' => "In Docker multi-stage builds, why are devDependencies excluded from runner containers?",
            'option_a' => "Because Linux cannot execute npm commands",
            'option_b' => "To minimize container attack surface and reduce production image size",
            'option_c' => "To bypass Docker healthcheck probes",
            'option_d' => "To prevent containers from accessing TCP port 3000",
            'correct_answer' => "B",
            'explanation' => "Excluding devDependencies reduces image footprint and eliminates unneeded binaries."
        ]
    ];

    return array_slice($pool, 0, $count);
}

function call_llm_api(string $url, string $key, string $model, string $system, string $user): string
{
    if (!function_exists('curl_init')) {
        throw new \RuntimeException("cURL extension not available");
    }

    $payload = json_encode([
        'model' => $model,
        'messages' => [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => $user],
        ],
        'temperature' => 0.2,
        'max_tokens' => 1800,
    ]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_TIMEOUT, 7);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $key,
    ]);

    $res = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($res === false || !empty($err)) {
        throw new \RuntimeException("cURL error: " . $err);
    }
    if ($http_code !== 200) {
        throw new \RuntimeException("HTTP {$http_code}: " . substr($res, 0, 150));
    }

    $json = json_decode($res, true);
    return $json['choices'][0]['message']['content'] ?? '';
}
