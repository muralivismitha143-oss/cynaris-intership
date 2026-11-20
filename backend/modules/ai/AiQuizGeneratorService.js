/**
 * AiQuizGeneratorService.js
 * 
 * Week 6 Day 2: AI Quiz Generation — MCQs from Course Content to Question Bank
 * 
 * Architectural Highlights:
 * - Primary LLM Provider: Groq (llama-3.3-70b-versatile) — Sub-350ms MCQ generation
 * - Fallback LLM Provider: OpenRouter (meta-llama/llama-3.3-70b-instruct) — High availability failover
 * - Local Deterministic Engine: Pre-compiled curriculum MCQs for CYN-FS-101, CYN-CRM-102, CYN-OPS-103
 * - Moodle Question Bank API Parity: Category mapping, multichoice question formatting, answer weighting
 * - Programmatic Quiz Factory: Automated quiz assembly and slot attachment (quiz_add_quiz / quiz_add_instance)
 */

const fs = require('fs');
const path = require('path');

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct";

const DEFAULT_TIMEOUT_MS = 7000;

class AiQuizGeneratorService {
  constructor(config = {}) {
    this.groqApiKey = config.groqApiKey || process.env.GROQ_API_KEY || "";
    this.openRouterApiKey = config.openRouterApiKey || process.env.OPENROUTER_API_KEY || "";
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.simulateGroqFailure = config.simulateGroqFailure || false;
    this.simulateBothFailure = config.simulateBothFailure || false;

    // In-memory Question Bank and Quiz Ledger (synced with seed data)
    this.questionBank = [];
    this.quizzes = [];
    this.initLedger();
  }

  /**
   * Initializes local question bank and quiz catalog
   */
  initLedger() {
    const seedCandidates = [
      path.resolve(__dirname, '../../../moodle/database/seed_data.json'),
      path.resolve(__dirname, '../../database/seed_data.json'),
    ];

    let seedCourses = [];
    for (const p of seedCandidates) {
      if (fs.existsSync(p)) {
        try {
          const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
          seedCourses = raw.courses || [];
          break;
        } catch (e) {}
      }
    }

    this.courses = seedCourses.length > 0 ? seedCourses : [
      { id: 101, fullname: "Full Stack Developer Internship — Induction & Architecture", shortname: "CYN-FS-101", summary: "Core architectural principles, virtual DOM diffing, RESTful API design, and database persistence." },
      { id: 102, fullname: "Enterprise CRM & EspoCRM Integration", shortname: "CYN-CRM-102", summary: "Business process mapping, custom hooks, and Groq AI conversation summarizer." },
      { id: 103, fullname: "Production DevOps — Docker & CI/CD Pipelines", shortname: "CYN-OPS-103", summary: "Multi-stage Dockerfiles, Compose orchestration, and GitHub Actions automated deployment." }
    ];
  }

  getCourse(courseId) {
    return this.courses.find(c => c.id === Number(courseId)) || this.courses[0];
  }

  /**
   * PROMPT DESIGN & ARCHITECTURAL SPECIFICATION:
   * 
   * 1. Objective:
   *    Generate challenging, pedagogically sound multiple-choice questions (MCQs)
   *    based on the course title, code, and curriculum summary.
   * 
   * 2. Schema Requirements:
   *    Array of objects, each containing:
   *    - question: string (clear, unambiguous question stem)
   *    - option_a: string (Option A text)
   *    - option_b: string (Option B text)
   *    - option_c: string (Option C text)
   *    - option_d: string (Option D text)
   *    - correct_answer: string ("A" | "B" | "C" | "D")
   *    - explanation: string (Authoritative technical rationale for why the answer is correct)
   * 
   * 3. Anti-Hallucination & Quality Guards:
   *    - No "All of the above" or "None of the above" shortcuts.
   *    - Plausible distractors addressing common developer misconceptions.
   *    - Strict JSON output without markdown wrapper text.
   */
  buildQuizPrompt(course, count = 5) {
    const courseTitle = course.fullname || "Full Stack Engineering";
    const courseCode = course.shortname || "CYN-FS-101";
    const summary = course.summary || "Full stack web development, databases, and APIs.";

    const systemPrompt = 
      "You are the Cynaris Assessment Engine Lead Examiner, a Senior Principal Engineer. " +
      "Your objective is to generate rigorous, technically accurate multiple-choice assessment questions (MCQs) " +
      "from the provided course curriculum. " +
      "Each question must test conceptual depth, practical implementation, or edge cases. " +
      "All 4 options must be plausible, with exactly one indisputably correct answer. " +
      "You must ALWAYS return your output as a valid JSON array of objects conforming exactly to the requested schema.";

    const userPrompt = 
`Course Metadata:
- Course ID: ${course.id}
- Course Code: ${courseCode}
- Course Title: ${courseTitle}
- Curriculum Summary: ${summary}

Task:
Generate exactly ${count} multiple-choice questions (MCQs) testing this course content.
Return a valid JSON array of objects with these exact keys:
[
  {
    "question": "Clear, technically rigorous question stem testing real-world engineering",
    "option_a": "First plausible choice",
    "option_b": "Second plausible choice",
    "option_c": "Third plausible choice",
    "option_d": "Fourth plausible choice",
    "correct_answer": "A",
    "explanation": "Authoritative explanation explaining why the correct choice is accurate and why others are incorrect."
  }
]`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Primary Provider Call: Groq API
   * Fast sub-350ms generation via llama-3.3-70b-versatile.
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
          temperature: 0.2,
          max_tokens: 1800,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Groq API returned HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error("Empty response received from Groq API");
      }

      return this.cleanAndParseJson(rawContent);
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
   * Triggered on Groq downtime, HTTP 429 rate limit, or timeout.
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
          "X-Title": "Cynaris AI Quiz Generator",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 1800,
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

      return this.cleanAndParseJson(rawContent);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error(`OpenRouter API timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }

  cleanAndParseJson(rawText) {
    let clean = rawText.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : (parsed.questions || [parsed]);
  }

  /**
   * Validates the schema of each generated question
   */
  validateQuestionStructure(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Questions payload must be a non-empty array");
    }

    const requiredKeys = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation'];
    const validAnswers = ['A', 'B', 'C', 'D'];

    return questions.map((q, idx) => {
      for (const key of requiredKeys) {
        if (!q[key] || typeof q[key] !== 'string') {
          throw new Error(`Question at index ${idx} missing or invalid field: '${key}'`);
        }
      }

      const upperAnswer = q.correct_answer.trim().toUpperCase();
      if (!validAnswers.includes(upperAnswer)) {
        throw new Error(`Question at index ${idx} has invalid correct_answer '${q.correct_answer}' (must be A, B, C, or D)`);
      }

      return {
        ...q,
        correct_answer: upperAnswer,
      };
    });
  }

  /**
   * Deterministic Offline Fallback for Course Curricula
   */
  localDeterministicQuizFallback(course, count = 5) {
    const courseId = Number(course.id);

    const questionPool = {
      101: [
        {
          question: "Which libuv event loop phase executes callbacks registered with setImmediate()?",
          option_a: "Timers Phase",
          option_b: "Poll Phase",
          option_c: "Check Phase",
          option_d: "Close Callbacks Phase",
          correct_answer: "C",
          explanation: "In Node.js, the check phase executes immediately after the poll phase has completed, executing all setImmediate() callbacks."
        },
        {
          question: "How does React's heuristic reconciliation algorithm reduce tree comparison complexity from O(n^3) to O(n)?",
          option_a: "By converting all DOM nodes into immutable bytecode before rendering",
          option_b: "By assuming two elements of different types produce different trees and utilizing stable 'key' props for children",
          option_c: "By executing DOM updates exclusively in Web Worker background threads",
          option_d: "By bypassing the virtual DOM entirely for state updates",
          correct_answer: "B",
          explanation: "React achieves O(n) diffing by assuming different element types produce distinct trees and using keys to match children across renders."
        },
        {
          question: "Why should SQL prepared statements be used instead of string concatenation in database queries?",
          option_a: "They allow executing queries without establishing a network connection",
          option_b: "They compile the query structure first and treat input parameters strictly as literal data, preventing SQL injection",
          option_c: "They automatically compress the result set using GZIP",
          option_d: "They convert relational SQL tables into NoSQL documents",
          correct_answer: "B",
          explanation: "Prepared statements separate the query structure from user parameters, rendering user input incapable of modifying SQL grammar."
        },
        {
          question: "What is the primary architectural purpose of salting passwords before bcrypt hashing?",
          option_a: "To encrypt the password symmetrically with AES-256",
          option_b: "To guarantee that identical passwords result in completely different hashes, neutralizing precomputed rainbow table attacks",
          option_c: "To compress lengthy passwords to fit into 32-byte storage columns",
          option_d: "To allow decrypting the password back to plaintext if the user forgets it",
          correct_answer: "B",
          explanation: "A cryptographically random salt ensures two identical passwords generate unique hashes, defeating dictionary and rainbow table lookups."
        },
        {
          question: "In Chart.js, which configuration property prevents categorical x-axis labels from colliding on narrow viewport widths?",
          option_a: "scales.x.ticks.autoSkip set to true and a constrained maxRotation",
          option_b: "plugins.legend.position set to 'bottom'",
          option_c: "responsive set to false",
          option_d: "maintainAspectRatio set to true with fixed pixel widths",
          correct_answer: "A",
          explanation: "Enabling autoSkip: true with maxRotation automatically thins out and rotates tick labels so they fit without overlapping."
        }
      ],
      102: [
        {
          question: "In EspoCRM architecture, where are custom entity field definitions and relationship metadata persisted?",
          option_a: "In hardcoded MySQL database migration files only",
          option_b: "In declarative JSON metadata files within the custom/Espo/Custom/Resources/metadata directory",
          option_c: "Directly in PHP session variables",
          option_d: "In the client/src/index.html file",
          correct_answer: "B",
          explanation: "EspoCRM utilizes declarative JSON metadata (entityDefs and clientDefs) to define schemas dynamically without manual SQL migrations."
        },
        {
          question: "What happens during atomic Lead Conversion in enterprise CRM workflows?",
          option_a: "The Lead record is permanently deleted and all activities are purged",
          option_b: "A transaction creates or links an Account and Contact, optionally creates an Opportunity, and transitions Lead status to 'Converted'",
          option_c: "The Lead is emailed an unencrypted password reset token",
          option_d: "The Lead's credit score is queried via third-party SOAP API",
          correct_answer: "B",
          explanation: "Lead conversion is an atomic transaction linking the lead identity to formal Account, Contact, and Opportunity pipeline stages."
        },
        {
          question: "Which EspoCRM hook method guarantees that an AI summarizer executes after an Activity record is safely persisted?",
          option_a: "beforeSave()",
          option_b: "afterSave()",
          option_c: "beforeDelete()",
          option_d: "init()",
          correct_answer: "B",
          explanation: "The afterSave hook fires after transaction commit, ensuring activity descriptions are securely persisted before triggering external LLM APIs."
        },
        {
          question: "What is the primary benefit of Groq's Language Processing Unit (LPU) architecture for CRM AI conversation summarizers?",
          option_a: "Ultra-low token inference latency (< 350ms) delivering real-time summary updates upon record save",
          option_b: "Unlimited context windows exceeding 10 million tokens",
          option_c: "Zero electricity consumption",
          option_d: "Local CPU execution without internet access",
          correct_answer: "A",
          explanation: "Groq LPUs provide deterministic high-throughput, low-latency tensor computation ideal for synchronous CRM hooks."
        },
        {
          question: "When should an OpenRouter fallback provider be activated in a production AI pipeline?",
          option_a: "Only when the user manually clicks 'Use OpenRouter' in the browser settings",
          option_b: "Automatically when the primary provider returns HTTP 429, 5xx server errors, or times out",
          option_c: "Whenever a request is sent on weekends",
          option_d: "When the database connection pool is full",
          correct_answer: "B",
          explanation: "Automated failover monitors upstream health signals (status codes and timeouts) and triggers fallback without manual user intervention."
        }
      ],
      103: [
        {
          question: "Why do production Dockerfiles for Node.js applications use multi-stage builds?",
          option_a: "To compile TypeScript code inside the container at runtime",
          option_b: "To isolate build tools in an initial builder stage and copy only production runtime artifacts into a minimal final base image",
          option_c: "To run multiple operating systems concurrently within one container",
          option_d: "To bypass Docker daemon layer caching",
          correct_answer: "B",
          explanation: "Multi-stage builds reduce final image attack surface and size (e.g. from 1GB to < 100MB) by discarding compilers and devDependencies."
        },
        {
          question: "In Docker Compose, what is the role of 'condition: service_healthy' on a database dependency?",
          option_a: "It forces the application container to restart indefinitely",
          option_b: "It ensures the application service waits until the database passes its internal HEALTHCHECK before launching",
          option_c: "It automatically creates database tables without running migrations",
          option_d: "It publishes MySQL port 3306 to public DNS",
          correct_answer: "B",
          explanation: "Checking service_healthy prevents race conditions where an app starts before MySQL is actually accepting socket connections."
        },
        {
          question: "In a GitHub Actions CI/CD DAG pipeline, why must the 'deploy' job depend on 'build-and-push' and 'test'?",
          option_a: "To run all jobs in parallel and save billing minutes",
          option_b: "To guarantee zero defective commits or broken builds ever deploy to cloud production infrastructure",
          option_c: "Because GitHub Actions forbids single-job workflows",
          option_d: "To allow unprivileged contributors to push directly to production",
          correct_answer: "B",
          explanation: "Strict DAG dependencies (needs: [test] -> needs: [build-and-push]) guarantee that any failing unit test aborts deployment immediately."
        },
        {
          question: "Why should containers be executed under a non-root user (e.g. 'cynarisuser') in production?",
          option_a: "To prevent container breakout vulnerabilities from gaining root privileges on the underlying host kernel",
          option_b: "Because Linux kernels prohibit root users from accessing TCP port 80",
          option_c: "To automatically encrypt all files stored in container volumes",
          option_d: "To reduce container memory consumption by 50%",
          correct_answer: "A",
          explanation: "The Principle of Least Privilege dictates running as non-root to mitigate container-escape exploits."
        },
        {
          question: "What is the purpose of container HEALTHCHECK directives probing /api/health?",
          option_a: "To benchmark server CPU floating point performance",
          option_b: "To allow orchestrators (Docker, Kubernetes, Railway) to automatically detect stalled processes and restart unhealthy containers",
          option_c: "To log HTTP access counts into Google Analytics",
          option_d: "To download security updates from npm nightly",
          correct_answer: "B",
          explanation: "Orchestrators use health probes to redirect traffic away from failed containers and trigger automated self-healing restarts."
        }
      ]
    };

    const selectedPool = questionPool[courseId] || questionPool[101];
    return selectedPool.slice(0, count);
  }

  /**
   * Main Question Generation Method:
   * 1. Constructs prompt from course name and description.
   * 2. Calls Groq primary.
   * 3. On failure, calls OpenRouter.
   * 4. On dual failure, returns deterministic curriculum questions.
   * 5. Validates structure.
   */
  async generateQuizQuestions(courseId, count = 5, options = {}) {
    const startTime = Date.now();
    const course = this.getCourse(courseId);
    const { systemPrompt, userPrompt } = this.buildQuizPrompt(course, count);

    const simulateGroq = options.simulateGroqFailure || this.simulateGroqFailure;
    const simulateBoth = options.simulateBothFailure || this.simulateBothFailure;
    const groqKey = options.groqApiKey || this.groqApiKey;
    const openRouterKey = options.openRouterApiKey || this.openRouterApiKey;

    let fallbackUsed = false;
    let fallbackReason = null;
    let rawQuestions = null;
    let provider = "Groq";
    let model = GROQ_MODEL;

    // --- Tier 1: Groq Primary ---
    if (!simulateGroq && !simulateBoth && groqKey && groqKey !== "FAIL_GROQ") {
      try {
        rawQuestions = await this.callGroq(systemPrompt, userPrompt, groqKey);
      } catch (err) {
        fallbackUsed = true;
        fallbackReason = `Groq primary failed (${err.message}). Initiating OpenRouter fallback.`;
      }
    } else {
      fallbackUsed = true;
      fallbackReason = simulateBoth 
        ? "Dual provider failure simulated for resilience verification."
        : (simulateGroq ? "Groq failure simulated for fallback verification." : "Groq API key unavailable.");
    }

    // --- Tier 2: OpenRouter Fallback ---
    if (fallbackUsed && !simulateBoth && openRouterKey && openRouterKey !== "FAIL_OPENROUTER") {
      try {
        provider = "OpenRouter";
        model = OPENROUTER_MODEL;
        rawQuestions = await this.callOpenRouter(systemPrompt, userPrompt, openRouterKey);
      } catch (err) {
        fallbackReason = `Both Groq and OpenRouter failed (OpenRouter: ${err.message}). Engaging Local Rule Engine.`;
        rawQuestions = null;
      }
    }

    // --- Tier 3: Local Deterministic Offline Fallback ---
    if (!rawQuestions) {
      provider = "LocalRuleEngine";
      model = "deterministic-curriculum-v1";
      rawQuestions = this.localDeterministicQuizFallback(course, count);
      fallbackUsed = true;
    }

    // Schema Validation
    const validatedQuestions = this.validateQuestionStructure(rawQuestions);
    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      courseId: course.id,
      courseName: course.fullname,
      courseCode: course.shortname,
      count: validatedQuestions.length,
      provider,
      model,
      latencyMs,
      fallbackUsed,
      fallbackReason,
      questions: validatedQuestions,
    };
  }

  /**
   * Imports generated questions into course Question Bank
   * Mirrors Moodle's question_bank_api
   */
  importToQuestionBank(courseId, questions) {
    const course = this.getCourse(courseId);
    const validated = this.validateQuestionStructure(questions);

    const imported = validated.map((q, idx) => {
      const qId = Date.now() + idx;
      const questionRecord = {
        id: qId,
        courseId: course.id,
        category: `Course Category: ${course.shortname}`,
        name: `${course.shortname} - Question ${this.questionBank.length + 1}`,
        questiontext: q.question,
        qtype: 'multichoice',
        defaultmark: 1.0,
        generalfeedback: q.explanation,
        options: [
          { code: 'A', text: q.option_a, fraction: q.correct_answer === 'A' ? 1.0 : 0.0 },
          { code: 'B', text: q.option_b, fraction: q.correct_answer === 'B' ? 1.0 : 0.0 },
          { code: 'C', text: q.option_c, fraction: q.correct_answer === 'C' ? 1.0 : 0.0 },
          { code: 'D', text: q.option_d, fraction: q.correct_answer === 'D' ? 1.0 : 0.0 },
        ],
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        created_at: new Date().toISOString(),
      };
      this.questionBank.push(questionRecord);
      return questionRecord;
    });

    return {
      success: true,
      courseId: course.id,
      importedCount: imported.length,
      questions: imported,
    };
  }

  /**
   * Programmatically creates a Moodle Quiz using assigned Question Bank IDs
   * Mirrors Moodle's quiz_add_quiz / quiz_add_instance
   */
  createQuizFromQuestions(courseId, quizName, questionIds) {
    const course = this.getCourse(courseId);
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      throw new Error("Must provide non-empty array of questionIds for quiz creation");
    }

    // Verify questions exist in Question Bank
    const matchedQuestions = this.questionBank.filter(q => questionIds.includes(q.id));
    if (matchedQuestions.length === 0) {
      throw new Error("None of the specified questionIds were found in the question bank");
    }

    const quizId = 600 + (this.quizzes.length + 1);
    const newQuiz = {
      id: quizId,
      course: course.id,
      name: quizName || `AI Generated Assessment: ${course.shortname}`,
      intro: `Automated assessment generated from ${course.fullname} content using AI Question Bank integration.`,
      timecreated: Math.floor(Date.now() / 1000),
      timemodified: Math.floor(Date.now() / 1000),
      timeopen: Math.floor(Date.now() / 1000),
      timeclose: Math.floor(Date.now() / 1000) + (14 * 86400),
      grade: 100.0,
      slots: matchedQuestions.map((q, idx) => ({
        slot: idx + 1,
        questionid: q.id,
        maxmark: 1.0,
      })),
      totalQuestions: matchedQuestions.length,
    };

    this.quizzes.push(newQuiz);

    return {
      success: true,
      quiz: newQuiz,
      courseId: course.id,
      assignedQuestionCount: matchedQuestions.length,
    };
  }

  getCourseQuestionBank(courseId) {
    const targetId = Number(courseId);
    return this.questionBank.filter(q => q.courseId === targetId);
  }

  getCourseQuizzes(courseId) {
    const targetId = Number(courseId);
    return this.quizzes.filter(q => q.course === targetId);
  }
}

const aiQuizGeneratorService = new AiQuizGeneratorService();

module.exports = {
  AiQuizGeneratorService,
  aiQuizGeneratorService,
  GROQ_API_URL,
  GROQ_MODEL,
  OPENROUTER_API_URL,
  OPENROUTER_MODEL,
};
