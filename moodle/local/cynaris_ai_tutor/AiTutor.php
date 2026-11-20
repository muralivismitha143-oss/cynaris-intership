<?php
namespace local_cynaris_ai_tutor;

defined('MOODLE_INTERNAL') || die();

/**
 * Class AiTutor
 *
 * Moodle Native AI Tutor Service.
 * Implements Groq primary inference (llama-3.3-70b-versatile) with automatic failover
 * to OpenRouter (meta-llama/llama-3.3-70b-instruct) and local curriculum fallback.
 *
 * @package    local_cynaris_ai_tutor
 * @copyright  2026 Cynaris Solutions
 */
class AiTutor
{
    private string $groqApiKey;
    private string $openRouterApiKey;
    private int $timeoutSeconds;
    private bool $simulateGroqFailure = false;
    private bool $simulateBothFailure = false;

    public const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
    public const GROQ_MODEL = 'llama-3.3-70b-versatile';

    public const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
    public const OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct';

    public function __construct(?string $groqApiKey = null, ?string $openRouterApiKey = null, int $timeoutSeconds = 6)
    {
        $this->groqApiKey = $groqApiKey ?? (getenv('GROQ_API_KEY') ?: '');
        $this->openRouterApiKey = $openRouterApiKey ?? (getenv('OPENROUTER_API_KEY') ?: '');
        $this->timeoutSeconds = $timeoutSeconds;
    }

    public function setSimulateGroqFailure(bool $simulate): self
    {
        $this->simulateGroqFailure = $simulate;
        return $this;
    }

    public function setSimulateBothFailure(bool $simulate): self
    {
        $this->simulateBothFailure = $simulate;
        return $this;
    }

    /**
     * Builds structured Socratic prompt for technical tutoring.
     */
    public function buildPrompt(array $context): array
    {
        $studentName = $context['studentName'] ?? 'Candidate';
        $courseName = $context['courseName'] ?? 'Full Stack Engineering';
        $courseCode = $context['courseCode'] ?? 'CYN-FS-101';
        $topic = $context['topic'] ?? 'Core Architecture';
        $question = $context['question'] ?? 'Explain asynchronous processing.';
        $grade = isset($context['currentGrade']) ? "{$context['currentGrade']}%" : 'Not evaluated';

        $systemPrompt = "You are the Cynaris AI Tutor, a Senior Technical Educator at Cynaris Solutions. " .
            "Explain concepts clearly using the Socratic method, break down solutions into 3 distinct steps, " .
            "provide clean code examples, and provide a helpful quiz hint. " .
            "Return output strictly in valid JSON without backticks.";

        $userPrompt = "Context:\n" .
            "- Student: {$studentName}\n" .
            "- Course: [{$courseCode}] {$courseName}\n" .
            "- Grade: {$grade}\n" .
            "- Topic: {$topic}\n\n" .
            "Question: \"{$question}\"\n\n" .
            "Return JSON with keys: conceptExplanation, stepByStepBreakdown (array of 3 strings), codeExample, quizHint, recommendedAction.";

        return [
            'systemPrompt' => $systemPrompt,
            'userPrompt' => $userPrompt,
        ];
    }

    /**
     * Executes AI Tutor request with Groq -> OpenRouter -> Local Fallback.
     */
    public function ask(array $context, array $options = []): array
    {
        $startTime = microtime(true);
        $prompts = $this->buildPrompt($context);
        $simulateGroq = $options['simulateGroqFailure'] ?? $this->simulateGroqFailure;
        $simulateBoth = $options['simulateBothFailure'] ?? $this->simulateBothFailure;

        // 1. Primary: Groq
        if (!$simulateGroq && !$simulateBoth && !empty($this->groqApiKey) && $this->groqApiKey !== 'FAIL_GROQ') {
            try {
                $response = $this->callCurl(self::GROQ_URL, $this->groqApiKey, self::GROQ_MODEL, $prompts);
                $latencyMs = round((microtime(true) - $startTime) * 1000, 2);
                return [
                    'success' => true,
                    'provider' => 'Groq',
                    'model' => self::GROQ_MODEL,
                    'latencyMs' => $latencyMs,
                    'fallbackUsed' => false,
                    'fallbackReason' => null,
                    'data' => $response,
                ];
            } catch (\Throwable $e) {
                error_log("Groq error: " . $e->getMessage() . ". Falling back to OpenRouter.");
            }
        }

        // 2. Fallback: OpenRouter
        if (!$simulateBoth && !empty($this->openRouterApiKey) && $this->openRouterApiKey !== 'FAIL_OPENROUTER') {
            try {
                $response = $this->callCurl(self::OPENROUTER_URL, $this->openRouterApiKey, self::OPENROUTER_MODEL, $prompts);
                $latencyMs = round((microtime(true) - $startTime) * 1000, 2);
                return [
                    'success' => true,
                    'provider' => 'OpenRouter',
                    'model' => self::OPENROUTER_MODEL,
                    'latencyMs' => $latencyMs,
                    'fallbackUsed' => true,
                    'fallbackReason' => 'Groq primary unreachable or simulated failure',
                    'data' => $response,
                ];
            } catch (\Throwable $e) {
                error_log("OpenRouter error: " . $e->getMessage() . ". Engaging local fallback.");
            }
        }

        // 3. Tier 3: Local Deterministic Curriculum Fallback
        $latencyMs = round((microtime(true) - $startTime) * 1000, 2);
        return [
            'success' => true,
            'provider' => 'LocalRuleEngine',
            'model' => 'deterministic-curriculum-v1',
            'latencyMs' => $latencyMs,
            'fallbackUsed' => true,
            'fallbackReason' => 'External LLM APIs unavailable; local curriculum fallback engaged',
            'data' => [
                'conceptExplanation' => 'Core technical concepts in Cynaris training emphasize asynchronous execution, defensive parameter validation, and modular decoupling.',
                'stepByStepBreakdown' => [
                    '1. Validate input parameters and enforce runtime constraints.',
                    '2. Execute non-blocking operations through asynchronous event orchestration.',
                    '3. Apply resilient fallback handlers to protect against network or service interruptions.'
                ],
                'codeExample' => "// Resilient execution pattern\ntry { return await aiService.query(); } catch (err) { return fallback(); }",
                'quizHint' => 'Remember that fault tolerance in distributed architectures relies on automated failover.',
                'recommendedAction' => 'Review the official Cynaris course architecture documentation.'
            ],
        ];
    }

    private function callCurl(string $url, string $key, string $model, array $prompts): array
    {
        if (!function_exists('curl_init')) {
            throw new \RuntimeException("cURL extension is required");
        }

        $payload = json_encode([
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => $prompts['systemPrompt']],
                ['role' => 'user', 'content' => $prompts['userPrompt']],
            ],
            'temperature' => 0.3,
            'max_tokens' => 700,
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeoutSeconds);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $key,
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($result === false || !empty($error)) {
            throw new \RuntimeException("cURL error: " . $error);
        }

        if ($httpCode !== 200) {
            throw new \RuntimeException("HTTP status {$httpCode}: " . substr($result, 0, 200));
        }

        $data = json_decode($result, true);
        $content = $data['choices'][0]['message']['content'] ?? '';
        return json_decode($content, true) ?: ['rawResponse' => $content];
    }
}
