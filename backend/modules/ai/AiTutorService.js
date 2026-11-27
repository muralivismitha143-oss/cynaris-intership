/**
 * AiTutorService.js
 * 
 * Week 6 Day 1: AI Tutor Integration — Groq Primary, OpenRouter Fallback
 * 
 * Architectural Highlights:
 * - Primary LLM Provider: Groq (llama-3.3-70b-versatile) — Ultra-low inference latency (< 350ms)
 * - Fallback LLM Provider: OpenRouter (meta-llama/llama-3.3-70b-instruct) — High resilience and multi-model failover
 * - Offline Deterministic Fallback: Local Curriculum Rule Engine — Zero downtime, air-gapped test safety
 * - Structured Pedagogical Prompting: Socratic explanations, code snippets, step-by-step breakdown, and quiz hints
 * - Comprehensive Telemetry: Latency tracking, provider selection logging, and fallback reason diagnostics
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct";

const DEFAULT_TIMEOUT_MS = 6000;

class AiTutorService {
  constructor(config = {}) {
    this.groqApiKey = config.groqApiKey || process.env.GROQ_API_KEY || "";
    this.openRouterApiKey = config.openRouterApiKey || process.env.OPENROUTER_API_KEY || "";
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.simulateGroqFailure = config.simulateGroqFailure || false;
    this.simulateBothFailure = config.simulateBothFailure || false;
  }

  /**
   * PROMPT DESIGN & ARCHITECTURAL SPECIFICATION:
   * 
   * 1. Objective:
   *    Provide real-time, context-aware tutoring and concept breakdown to candidates enrolled
   *    in Cynaris LMS technical training tracks (Full Stack, EspoCRM, DevOps/CI-CD).
   * 
   * 2. Persona & Pedagogical Philosophy:
   *    The system prompt establishes the AI as a "Senior Technical Educator and Pedagogical Tutor".
   *    It strictly enforces the Socratic method: instead of merely providing the raw answer to a quiz,
   *    it explains the foundational architectural principles, highlights common developer pitfalls,
   *    and gives executable syntax examples.
   * 
   * 3. Grounding & Anti-Hallucination Constraints:
   *    - Context injection includes candidate profile, current enrolled course, topic, and optional quiz attempt.
   *    - Grounded strictly in the Cynaris training curriculum (Node.js, Express, React, MySQL, Moodle, Docker).
   *    - Mandates strict JSON structure for predictable parsing by web frontends and microservices.
   * 
   * 4. Output Schema:
   *    {
   *      "conceptExplanation": "Clear, concise 2-3 sentence concept definition",
   *      "stepByStepBreakdown": ["Step 1", "Step 2", "Step 3"],
   *      "codeExample": "Executable code snippet demonstrating the solution",
   *      "quizHint": "Pedagogical hint designed for self-assessment",
   *      "recommendedAction": "Concrete next study action or documentation link"
   *    }
   */
  buildPrompt(context = {}) {
    const studentName = context.studentName || "Candidate";
    const courseName = context.courseName || "Full Stack Engineering & Enterprise LMS";
    const courseCode = context.courseCode || "CYN-FS-101";
    const topic = context.topic || "Core Web Architecture";
    const question = context.question || "How does the Node.js event loop handle asynchronous I/O operations?";
    const currentGrade = context.currentGrade !== undefined ? `${context.currentGrade}%` : "Not yet evaluated";
    const quizContext = context.quizName ? `Quiz Context: ${context.quizName}` : "General Curriculum Study";

    const systemPrompt = 
      "You are the Cynaris AI Tutor, a Senior Staff Software Engineer and Master Technical Educator. " +
      "Your mission is to guide engineering interns through software architecture, full-stack development, " +
      "relational database design, and cloud deployments. " +
      "Use clear, precise language. When explaining concepts, break them into logical steps and provide a brief, clean code example. " +
      "Adhere strictly to modern engineering standards (Node.js ES6+, React Hooks, MySQL prepared statements, Moodle DBAL). " +
      "You must ALWAYS return your output in valid, parseable JSON conforming to the requested schema, without markdown formatting around the JSON.";

    const userPrompt = 
`Context Information:
- Student: ${studentName}
- Course: [${courseCode}] ${courseName}
- Current Assessment Score: ${currentGrade}
- Track Context: ${quizContext}
- Topic: ${topic}

Student Question:
"${question}"

Instructions:
Analyze the student's question within the context of the course curriculum. Return a JSON object with these exact keys:
{
  "conceptExplanation": "A crisp, authoritative explanation of the core concept in 2 to 3 sentences.",
  "stepByStepBreakdown": [
    "1. First fundamental principle or execution phase",
    "2. Second phase showing data or control flow",
    "3. Key safeguard, best practice, or performance tip"
  ],
  "codeExample": "A concise, well-commented code snippet (JavaScript/SQL/PHP) illustrating the solution.",
  "quizHint": "A targeted Socratic hint helping the candidate solve related quiz questions without giving away trivial answers.",
  "recommendedAction": "A specific follow-up practice step (e.g. 'Review libuv thread pool documentation' or 'Test prepared statement syntax in MySQL CLI')."
}`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Primary Provider Call: Groq API
   * Uses llama-3.3-70b-versatile for sub-second inference.
   */
  async callGroq(systemPrompt, userPrompt, apiKeyOverride) {
    const key = apiKeyOverride || this.groqApiKey;
    if (!key || key === "INVALID_KEY" || key === "FAIL_GROQ") {
      throw new Error("GROQ_API_KEY is not configured or marked invalid");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 700,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Groq API returned HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response received from Groq API");
      }

      return JSON.parse(content);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error(`Groq API timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }

  /**
   * Fallback Provider Call: OpenRouter API
   * Activates seamlessly on Groq downtime, quota exhaustion (429), or timeout.
   */
  async callOpenRouter(systemPrompt, userPrompt, apiKeyOverride) {
    const key = apiKeyOverride || this.openRouterApiKey;
    if (!key || key === "INVALID_KEY" || key === "FAIL_OPENROUTER") {
      throw new Error("OPENROUTER_API_KEY is not configured or marked invalid");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://cynaris.com/learning-platform",
          "X-Title": "Cynaris AI Tutor Engine",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 700,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`OpenRouter API returned HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error("Empty response received from OpenRouter API");
      }

      // Safe JSON parsing with regex strip if model returned markdown backticks
      return this.cleanAndParseJson(rawContent);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error(`OpenRouter API timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }

  /**
   * Helper to strip markdown JSON code fences if returned by open-weights models
   */
  cleanAndParseJson(rawText) {
    let clean = rawText.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    return JSON.parse(clean);
  }

  /**
   * Offline Deterministic Fallback Engine:
   * Grounded in Cynaris enterprise curriculum when both external APIs are unreachable
   * or during air-gapped CI test runs.
   */
  localDeterministicFallback(context = {}, userPrompt = "") {
    const qLower = (context.question || userPrompt || "").toLowerCase();

    if (qLower.includes("event loop") || qLower.includes("asynchronous") || qLower.includes("node")) {
      return {
        conceptExplanation: "The Node.js Event Loop is a single-threaded orchestrator backed by libuv that delegates I/O operations to kernel system calls or a background worker pool, enabling non-blocking concurrency.",
        stepByStepBreakdown: [
          "1. Timers Phase: Executes callbacks scheduled by setTimeout() and setInterval().",
          "2. Poll Phase: Retrieves new I/O events, executes non-blocking I/O callbacks, and blocks only when queue is empty.",
          "3. Check Phase: Executes setImmediate() callbacks immediately following poll completion."
        ],
        codeExample: "// Non-blocking asynchronous I/O via fs.promises\nconst fs = require('fs/promises');\nasync function readFile() {\n  const data = await fs.readFile('data.json', 'utf8');\n  return JSON.parse(data);\n}",
        quizHint: "Remember that process.nextTick() fires before the event loop advances to the next phase, not during standard timer queues.",
        recommendedAction: "Review the Node.js official Event Loop guide and run timing diagnostics with process.hrtime()."
      };
    }

    if (qLower.includes("chart") || qLower.includes("canvas") || qLower.includes("autoskip")) {
      return {
        conceptExplanation: "Chart.js renders responsive HTML5 canvas graphics. In constrained layouts, label collision is prevented by setting scales.x.ticks.autoSkip to true and defining maxRotation.",
        stepByStepBreakdown: [
          "1. Wrap <canvas> inside a relative container with fixed or max height to control bounding dimensions.",
          "2. Set maintainAspectRatio: false and responsive: true in chart options.",
          "3. Configure scales.x.ticks with autoSkip: true and maxRotation: 40 to prevent tick overlap."
        ],
        codeExample: "options: {\n  responsive: true,\n  maintainAspectRatio: false,\n  scales: {\n    x: { ticks: { autoSkip: true, maxRotation: 40, font: { size: 10 } } }\n  }\n}",
        quizHint: "Always call chartInstance.destroy() before re-instantiating on the same canvas element to prevent memory leaks and hover flickers.",
        recommendedAction: "Test block_cynaris_stats rendering on mobile viewport sizes (320px - 390px)."
      };
    }

    if (qLower.includes("sql") || qLower.includes("join") || qLower.includes("moodle") || qLower.includes("grade")) {
      return {
        conceptExplanation: "Moodle relational queries link user identities (mdl_user) to course progress (mdl_course_completions) and grading ledgers (mdl_grade_grades) through strict foreign key relationships.",
        stepByStepBreakdown: [
          "1. Use LEFT JOIN when evaluating enrolled students so candidates with 0 completed attempts are not dropped.",
          "2. Use COALESCE(ROUND(AVG(gg.finalgrade), 2), 0.00) to safely format nullable grade averages.",
          "3. Filter out deleted accounts with u.deleted = 0 to respect Moodle soft-delete semantics."
        ],
        codeExample: "SELECT u.id, CONCAT(u.firstname, ' ', u.lastname) AS student,\n       COALESCE(ROUND(AVG(gg.finalgrade), 2), 0.00) AS avg_grade\nFROM mdl_user u\nLEFT JOIN mdl_grade_grades gg ON u.id = gg.userid\nWHERE u.deleted = 0\nGROUP BY u.id, student;",
        quizHint: "Remember that Moodle timestamps are stored as Unix epochs (integers), requiring UNIX_TIMESTAMP() for date arithmetic.",
        recommendedAction: "Examine mdl_course_completions status column: 1 indicates completed, 0 indicates in progress."
      };
    }

    // Default general technical guidance
    return {
      conceptExplanation: `The requested topic relates to enterprise full-stack development within ${context.courseName || 'Cynaris Platform'}. Core engineering rigor requires clean separation of concerns, defensive validation, and idempotent service interfaces.`,
      stepByStepBreakdown: [
        "1. Identify system inputs and validate with strict runtime type guards (e.g. FILTER_VALIDATE_INT or Zod schemas).",
        "2. Isolate core business logic in stateless domain services before writing presentation or persistence code.",
        "3. Safeguard network endpoints with timeouts, circuit breakers, and deterministic fallback engines."
      ],
      codeExample: "// Defensive service call pattern\ntry {\n  const result = await externalService.fetchWithTimeout(url, 5000);\n  return result;\n} catch (err) {\n  return localFallbackEngine.resolve(context);\n}",
      quizHint: "When evaluating system reliability questions, remember that high availability relies on multi-provider failover and graceful degradation.",
      recommendedAction: "Review corresponding course module notes and verify automated unit tests in the tests/ directory."
    };
  }

  /**
   * Main Public Dispatcher:
   * 1. Attempts Groq Primary (llama-3.3-70b-versatile).
   * 2. On error / timeout / simulation -> Fails over to OpenRouter (meta-llama/llama-3.3-70b-instruct).
   * 3. On dual error / offline -> Gracefully falls back to Local Deterministic Engine.
   */
  async askTutor(context = {}, options = {}) {
    const startTime = Date.now();
    const { systemPrompt, userPrompt } = this.buildPrompt(context);

    const simulateGroq = options.simulateGroqFailure || this.simulateGroqFailure;
    const simulateBoth = options.simulateBothFailure || this.simulateBothFailure;
    const groqKey = options.groqApiKey || this.groqApiKey;
    const openRouterKey = options.openRouterApiKey || this.openRouterApiKey;

    let fallbackUsed = false;
    let fallbackReason = null;
    let primaryError = null;

    // --- Tier 1: Primary Provider (Groq) ---
    if (!simulateGroq && !simulateBoth && groqKey && groqKey !== "FAIL_GROQ") {
      try {
        const tutorResponse = await this.callGroq(systemPrompt, userPrompt, groqKey);
        const latencyMs = Date.now() - startTime;
        return {
          success: true,
          provider: "Groq",
          model: GROQ_MODEL,
          latencyMs,
          fallbackUsed: false,
          fallbackReason: null,
          data: tutorResponse,
          context: {
            studentName: context.studentName || "Candidate",
            courseCode: context.courseCode || "CYN-FS-101",
            topic: context.topic || "Core Architecture",
          },
        };
      } catch (err) {
        primaryError = err.message;
        fallbackUsed = true;
        fallbackReason = `Groq primary failed: ${err.message}. Initiating OpenRouter fallback.`;
      }
    } else {
      fallbackUsed = true;
      fallbackReason = simulateBoth 
        ? "Dual provider failure simulated for resilience verification."
        : (simulateGroq ? "Groq failure simulated for fallback testing." : "Groq API key not provided or unavailable.");
    }

    // --- Tier 2: Fallback Provider (OpenRouter) ---
    if (!simulateBoth && openRouterKey && openRouterKey !== "FAIL_OPENROUTER") {
      try {
        const tutorResponse = await this.callOpenRouter(systemPrompt, userPrompt, openRouterKey);
        const latencyMs = Date.now() - startTime;
        return {
          success: true,
          provider: "OpenRouter",
          model: OPENROUTER_MODEL,
          latencyMs,
          fallbackUsed: true,
          fallbackReason,
          primaryError,
          data: tutorResponse,
          context: {
            studentName: context.studentName || "Candidate",
            courseCode: context.courseCode || "CYN-FS-101",
            topic: context.topic || "Core Architecture",
          },
        };
      } catch (err) {
        fallbackReason = `Both Groq and OpenRouter failed (Groq: ${primaryError || 'bypassed'}; OpenRouter: ${err.message}). Engaging Local Rule Engine.`;
      }
    } else if (!simulateBoth && (!openRouterKey || openRouterKey === "FAIL_OPENROUTER")) {
      fallbackReason = `OpenRouter key missing or bypassed. Engaging Local Rule Engine.`;
    }

    // --- Tier 3: Local Deterministic Offline Fallback ---
    const localData = this.localDeterministicFallback(context, userPrompt);
    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      provider: "LocalRuleEngine",
      model: "deterministic-curriculum-v1",
      latencyMs,
      fallbackUsed: true,
      fallbackReason: fallbackReason || "Offline mode active",
      primaryError,
      data: localData,
      context: {
        studentName: context.studentName || "Candidate",
        courseCode: context.courseCode || "CYN-FS-101",
        topic: context.topic || "Core Architecture",
      },
    };
  }

  /**
   * Health and Provider Diagnostics
   */
  getHealth() {
    return {
      status: "operational",
      primary: {
        provider: "Groq",
        model: GROQ_MODEL,
        configured: Boolean(this.groqApiKey && this.groqApiKey !== "FAIL_GROQ"),
      },
      fallback: {
        provider: "OpenRouter",
        model: OPENROUTER_MODEL,
        configured: Boolean(this.openRouterApiKey && this.openRouterApiKey !== "FAIL_OPENROUTER"),
      },
      offlineEngine: {
        provider: "LocalRuleEngine",
        status: "ready",
      },
      timeoutConfiguredMs: this.timeoutMs,
    };
  }

  /**
   * Pre-configured curriculum topics for student assistance
   */
  getCurriculumTopics(courseCode = "CYN-FS-101") {
    const catalog = {
      "CYN-FS-101": [
        { topic: "Event Loop & Asynchronous I/O", sampleQuestion: "How does libuv event loop handle timer vs I/O queues?" },
        { topic: "React Virtual DOM & Reconciliation", sampleQuestion: "Why does React use heuristic O(n) diffing instead of generic O(n^3) tree diffing?" },
        { topic: "Express Middleware Chain & Error Handling", sampleQuestion: "How does Express 4-argument error middleware catch asynchronous exceptions?" },
        { topic: "Stateless JWT Auth & Password Hashing", sampleQuestion: "Why is bcrypt salt hashing preferred over simple SHA-256 for passwords?" }
      ],
      "CYN-CRM-102": [
        { topic: "EspoCRM Metadata Architecture", sampleQuestion: "How do entityDefs and clientDefs configure dynamic CRM schemas without hardcoded migrations?" },
        { topic: "Business Process Mapping & Lead Conversion", sampleQuestion: "What database operations occur during atomic Lead to Account/Contact conversion?" },
        { topic: "EspoCRM Hooks & Service Extensions", sampleQuestion: "How does afterSave hook guarantee non-blocking AI summarization?" }
      ],
      "CYN-OPS-103": [
        { topic: "Multi-Stage Docker Containerization", sampleQuestion: "Why do multi-stage Docker builds separate build dependencies from runtime alpine images?" },
        { topic: "GitHub Actions CI/CD Pipeline", sampleQuestion: "How does a DAG dependency pipeline guarantee zero failing builds deploy to production?" },
        { topic: "Database Migrations & Health Checks", sampleQuestion: "Why should container health checks verify database readiness before running migrations?" }
      ]
    };

    return catalog[courseCode] || catalog["CYN-FS-101"];
  }
}

const aiTutorService = new AiTutorService();

module.exports = {
  AiTutorService,
  aiTutorService,
  GROQ_API_URL,
  GROQ_MODEL,
  OPENROUTER_API_URL,
  OPENROUTER_MODEL,
};
