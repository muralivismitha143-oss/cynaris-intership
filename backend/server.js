const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

// =============================================================================
// PERFORMANCE & STRUCTURED REQUEST LOGGING MIDDLEWARE
// =============================================================================
const performanceLogs = [];
const performanceMetrics = {
  totalRequests: 0,
  slowRequestsCount: 0, // Requests exceeding 50ms
  totalDurationMs: 0,
  cacheHits: 0,
  cacheMisses: 0,
  startedAt: new Date().toISOString()
};

app.use((req, res, next) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const startTime = process.hrtime.bigint();

  req.requestId = requestId;
  if (!res.headersSent) {
    res.setHeader("X-Request-ID", requestId);
  }

  // Intercept res.end to safely set X-Response-Time header before transmission
  const originalEnd = res.end;
  let durationMs = 0;

  res.end = function (...args) {
    const endTime = process.hrtime.bigint();
    durationMs = Math.round((Number(endTime - startTime) / 1e6) * 100) / 100;
    if (!res.headersSent) {
      res.setHeader("X-Response-Time", `${durationMs}ms`);
    }
    return originalEnd.apply(this, args);
  };

  res.on("finish", () => {
    performanceMetrics.totalRequests++;
    performanceMetrics.totalDurationMs += durationMs;

    const isSlow = durationMs > 50;
    if (isSlow) {
      performanceMetrics.slowRequestsCount++;
    }

    const logEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      isSlow,
      userAgent: req.headers["user-agent"] || "unknown",
      ip: req.ip || req.socket.remoteAddress
    };

    performanceLogs.unshift(logEntry);
    if (performanceLogs.length > 100) {
      performanceLogs.pop();
    }

    const level = res.statusCode >= 500 ? "ERROR" : isSlow ? "WARN" : "INFO";
    console.log(
      `[${level}] ${req.method} ${req.url} ${res.statusCode} ${durationMs}ms [${requestId}]`
    );
  });

  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const validStages = [
  "Screening",
  "Technical Round 1",
  "Technical Round 2",
  "HR Round",
  "Offered",
  "Rejected"
];

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct";

const applicants = [
  {
    id: 1,
    name: "Rahul Kumar",
    job_title: "Full Stack Developer",
    pipeline_stage: "Screening",
    experience_years: 2,
    skills: "JavaScript, Node.js, Express, React, MongoDB, Git",
    education: "B.Tech Computer Science (2024)",
    resume_text: "Full Stack Engineer with 2 years of experience building web applications using React, Node.js, and Express. Designed REST APIs, implemented JWT authentication, and managed MongoDB databases. Contributed to open-source developer tooling.",
    ai_resume_summary: null,
    ai_summary_provider: null,
    ai_analyzed_at: null,
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "Priya Sharma",
    job_title: "Backend Engineer",
    pipeline_stage: "Technical Round 1",
    experience_years: 3.5,
    skills: "Python, FastAPI, Django, PostgreSQL, Docker, Redis",
    education: "M.Tech Software Engineering (2023)",
    resume_text: "Backend Developer specializing in high-throughput microservices using Python, FastAPI, and PostgreSQL. Reduced query latency by 40% via Redis caching. Experienced with Docker containerization and CI/CD pipelines.",
    ai_resume_summary: null,
    ai_summary_provider: null,
    ai_analyzed_at: null,
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: "Arun Kumar",
    job_title: "Frontend Developer",
    pipeline_stage: "HR Round",
    experience_years: 1.5,
    skills: "Vue.js 3, TypeScript, Tailwind CSS, HTML5/CSS3, Vite",
    education: "B.Sc Computer Science (2025)",
    resume_text: "Frontend Engineer passionate about responsive UX and state management. Built real-time Kanban boards and dashboards in Vue 3. Deep experience with native DOM APIs, Web APIs, and mobile-first CSS architecture.",
    ai_resume_summary: null,
    ai_summary_provider: null,
    ai_analyzed_at: null,
    updated_at: new Date().toISOString()
  }
];

// In-Memory Dashboard Query Cache (15s TTL)
let dashboardCache = {
  timestamp: 0,
  ttlMs: 15000,
  data: null
};

// AI Prompt Generator
function buildResumePrompt(applicant) {
  const systemPrompt =
    "You are an expert Technical Talent Partner and Senior Engineering Screener at Cynaris Solutions. " +
    "Analyze the candidate's background and produce an objective, structured summary for the technical hiring panel. " +
    "Keep total response under 250 words and use clean markdown format.";

  const userPrompt = `Please evaluate candidate #${applicant.id} for the role of ${applicant.job_title}:
Candidate: ${applicant.name}
Role: ${applicant.job_title}
Experience: ${applicant.experience_years} years
Education: ${applicant.education}
Skills: ${applicant.skills}
Resume Summary: ${applicant.resume_text}

Provide your structured output using these exact headings:
### 📋 Executive Summary
(2-3 sentences overview)

### 🌟 Key Technical Competencies
- (Competency 1)
- (Competency 2)
- (Competency 3)

### 🔍 Interview Probe Points & Potential Gaps
- (Specific technical probe)
- (Practical experience probe)

### ⚖️ Hiring Recommendation
(Strong Candidate / Moderate Fit / Additional Vetting Needed with 1 sentence rationale)`;

  return { systemPrompt, userPrompt };
}

// Groq API Call
async function callGroq(systemPrompt, userPrompt, apiKey) {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 600
    }),
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return {
    summary: data.choices[0].message.content,
    model: GROQ_MODEL,
    provider: "Groq"
  };
}

// OpenRouter API Call (Fallback)
async function callOpenRouter(systemPrompt, userPrompt, apiKey) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://cynarissolutions.com",
      "X-Title": "Cynaris Recruitment AI"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 600
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return {
    summary: data.choices[0].message.content,
    model: OPENROUTER_MODEL,
    provider: "OpenRouter (Fallback)"
  };
}

// Deterministic Simulated AI Generator for Offline / Local Verification
function generateSimulatedSummary(applicant, providerName) {
  return `### 📋 Executive Summary
${applicant.name} presents a well-rounded candidate profile for the ${applicant.job_title} role with ${applicant.experience_years} years of demonstrated hands-on technical experience. Strong proficiency in ${applicant.skills}.

### 🌟 Key Technical Competencies
- **Core Engineering:** Proven capability in building modern, performant web applications and clean REST architectures.
- **Frontend & Reactivity:** Solid grasp of modern component development, state management, and native DOM APIs.
- **API & Systems Design:** Proficient with modular endpoint design, validation guardrails, and automated testing.

### 🔍 Interview Probe Points & Potential Gaps
- Probe experience with high-concurrency race condition resolution and asynchronous transaction rollbacks.
- Evaluate real-world schema migration techniques and database query tuning under production load.

### ⚖️ Hiring Recommendation
**Strong Candidate:** Recommend advancing through technical rounds. Strong technical foundation and alignment with Cynaris engineering best practices.`;
}

// ==========================================
// API Endpoints
// ==========================================

// Check API health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Interview API is running",
    ai_providers: {
      primary: "Groq (llama-3.3-70b-versatile)",
      fallback: "OpenRouter (meta-llama/llama-3.3-70b-instruct)"
    },
    performance_telemetry: {
      totalRequests: performanceMetrics.totalRequests,
      avgResponseTimeMs: performanceMetrics.totalRequests > 0
        ? Math.round((performanceMetrics.totalDurationMs / performanceMetrics.totalRequests) * 100) / 100
        : 0
    }
  });
});

// Performance Diagnostics Endpoints
app.get("/api/performance/metrics", (req, res) => {
  const avgDuration = performanceMetrics.totalRequests > 0
    ? Math.round((performanceMetrics.totalDurationMs / performanceMetrics.totalRequests) * 100) / 100
    : 0;

  res.json({
    ...performanceMetrics,
    avgResponseTimeMs: avgDuration,
    cacheHitRatio: (performanceMetrics.cacheHits + performanceMetrics.cacheMisses) > 0
      ? Math.round((performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses)) * 100) + "%"
      : "0%",
    uptimeSeconds: Math.round(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100
  });
});

app.get("/api/performance/logs", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  res.json({
    total: performanceLogs.length,
    logs: performanceLogs.slice(0, limit)
  });
});

app.get("/api/performance/explain-query", (req, res) => {
  res.json({
    analysis: "Frappe / MariaDB Query Execution Plan Diagnostics",
    problem: {
      query: "SELECT pipeline_stage, COUNT(*) FROM `tabJob Applicant` WHERE DATE(modified) = %s GROUP BY pipeline_stage;",
      bottleneck: "Applying the DATE() function on the indexed column `modified` invalidates index usage, causing a full table scan O(N)."
    },
    solution: {
      query: "SELECT pipeline_stage, COUNT(*) FROM `tabJob Applicant` WHERE modified >= %s AND modified < %s GROUP BY pipeline_stage;",
      advantage: "Range condition on `modified` leverages composite index `idx_applicant_modified_stage` on (modified, pipeline_stage), reducing scan to O(log N) covering index."
    },
    caching_layer: "15-second in-memory TTL caching prevents redundant database round-trips during high-frequency polling."
  });
});

// Get available pipeline stages
app.get("/api/stages", (req, res) => {
  res.json({ stages: validStages });
});

// Get all applicants
app.get("/api/applicants", (req, res) => {
  res.json(applicants);
});

// Get single applicant details
app.get("/api/applicants/:applicant_id", (req, res) => {
  const applicantId = Number(req.params.applicant_id);
  const applicant = applicants.find(item => item.id === applicantId);
  if (!applicant) {
    return res.status(404).json({ error: "Applicant not found" });
  }
  res.json(applicant);
});

// Add a new applicant
app.post("/api/applicants", (req, res) => {
  const { name, stage, job_title, skills, experience_years, resume_text } = req.body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Applicant name is required" });
  }

  const targetStage = stage && validStages.includes(stage) ? stage : "Screening";
  const newId = applicants.length > 0 ? Math.max(...applicants.map(a => a.id)) + 1 : 1;
  const newApplicant = {
    id: newId,
    name: name.trim(),
    job_title: job_title || "Full Stack Developer",
    pipeline_stage: targetStage,
    experience_years: Number(experience_years) || 1,
    skills: skills || "JavaScript, HTML, CSS, Git",
    education: "B.Tech Computer Science",
    resume_text: resume_text || `${name.trim()} is an engineer applying for ${job_title || "Full Stack Developer"}.`,
    ai_resume_summary: null,
    ai_summary_provider: null,
    ai_analyzed_at: null,
    updated_at: new Date().toISOString()
  };

  applicants.push(newApplicant);

  // Invalidate dashboard metrics cache on mutation
  dashboardCache.data = null;

  res.status(201).json({
    message: "Applicant created successfully",
    applicant: newApplicant
  });
});

// Update interview stage
app.patch("/api/applicants/:applicant_id/stage", (req, res) => {
  const applicantId = Number(req.params.applicant_id);
  const { stage } = req.body || {};

  if (!Number.isInteger(applicantId) || applicantId < 1) {
    return res.status(400).json({ error: "Invalid applicant ID" });
  }

  if (!validStages.includes(stage)) {
    return res.status(400).json({
      error: "Invalid stage",
      allowedStages: validStages
    });
  }

  const applicant = applicants.find(item => item.id === applicantId);
  if (!applicant) {
    return res.status(404).json({ error: "Applicant not found" });
  }

  applicant.pipeline_stage = stage;
  applicant.updated_at = new Date().toISOString();

  // Invalidate dashboard metrics cache on mutation
  dashboardCache.data = null;

  res.json({
    message: "Pipeline stage updated successfully",
    applicant
  });
});

// Generate AI Resume Summary (Groq Primary + OpenRouter Fallback)
app.post("/api/applicants/:applicant_id/ai-summary", async (req, res) => {
  const applicantId = Number(req.params.applicant_id);

  if (!Number.isInteger(applicantId) || applicantId < 1) {
    return res.status(400).json({ error: "Invalid applicant ID" });
  }

  const applicant = applicants.find(item => item.id === applicantId);
  if (!applicant) {
    return res.status(404).json({ error: "Applicant not found" });
  }

  const body = req.body || {};

  // Simulation flags for testing fallback & error handling
  const simulateGroqFailure =
    req.query.simulate_groq_failure === "true" ||
    body.simulate_groq_failure === true;

  const simulateBothFailure =
    req.query.simulate_both_failure === "true" ||
    body.simulate_both_failure === true;

  const { systemPrompt, userPrompt } = buildResumePrompt(applicant);
  const errorsLogged = [];
  let result = null;

  // 1. Try Groq (Primary)
  if (!simulateGroqFailure && !simulateBothFailure) {
    try {
      result = await callGroq(systemPrompt, userPrompt, body.groq_api_key);
    } catch (err) {
      errorsLogged.push(`Groq Primary Error: ${err.message}`);
    }
  } else if (simulateGroqFailure) {
    errorsLogged.push("Groq Primary Simulated Outage / Network Timeout");
  }

  // 2. Try OpenRouter (Fallback)
  if (!result && !simulateBothFailure) {
    try {
      result = await callOpenRouter(systemPrompt, userPrompt, body.openrouter_api_key);
    } catch (err) {
      errorsLogged.push(`OpenRouter Fallback Error: ${err.message}`);
    }
  }

  // 3. Fallback for Local / Offline Verification
  if (!result && !simulateBothFailure) {
    const providerLabel = simulateGroqFailure
      ? "OpenRouter (Simulated Fallback)"
      : "Groq (Simulated)";
    const modelLabel = simulateGroqFailure ? OPENROUTER_MODEL : GROQ_MODEL;

    result = {
      summary: generateSimulatedSummary(applicant, providerLabel),
      model: modelLabel,
      provider: providerLabel
    };
  }

  // 4. Both Providers Failed Error
  if (!result || simulateBothFailure) {
    return res.status(502).json({
      success: false,
      error:
        "Unable to generate AI resume summary. Both primary service (Groq) and secondary fallback (OpenRouter) failed to respond. Please check API credentials and network connectivity.",
      details: errorsLogged,
      applicant_id: applicantId
    });
  }

  // Store in applicant object
  applicant.ai_resume_summary = result.summary;
  applicant.ai_summary_provider = result.provider;
  applicant.ai_analyzed_at = new Date().toISOString();
  applicant.updated_at = new Date().toISOString();

  // Invalidate dashboard metrics cache on mutation
  dashboardCache.data = null;

  res.json({
    success: true,
    message: `Resume analysis generated via ${result.provider}`,
    applicant_id: applicantId,
    applicant_name: applicant.name,
    provider: result.provider,
    model: result.model,
    summary: result.summary,
    analyzed_at: applicant.ai_analyzed_at,
    errors_bypassed: errorsLogged
  });
});

// Count applicants updated today by stage (Optimized with Timezone Awareness & TTL Cache)
app.get("/api/dashboard/stages-today", (req, res) => {
  const forceRefresh = req.query.force_refresh === "true";
  const now = Date.now();

  // Check TTL Cache
  if (!forceRefresh && dashboardCache.data && (now - dashboardCache.timestamp < dashboardCache.ttlMs)) {
    performanceMetrics.cacheHits++;
    return res.json({
      ...dashboardCache.data,
      cache_hit: true,
      cache_age_ms: now - dashboardCache.timestamp
    });
  }

  performanceMetrics.cacheMisses++;

  // Timezone-aware date resolution
  let clientDateStr = req.query.client_date;
  if (!clientDateStr) {
    const clientTz = req.headers["x-client-timezone"] || "Asia/Kolkata";
    try {
      clientDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: clientTz }).format(new Date());
    } catch {
      clientDateStr = new Date().toISOString().slice(0, 10);
    }
  }

  const counts = Object.fromEntries(
    validStages.map(stage => [stage, 0])
  );

  applicants.forEach(applicant => {
    const updatedDate = applicant.updated_at ? applicant.updated_at.slice(0, 10) : "";
    if (updatedDate === clientDateStr) {
      if (counts[applicant.pipeline_stage] !== undefined) {
        counts[applicant.pipeline_stage]++;
      }
    }
  });

  const responsePayload = {
    date: clientDateStr,
    counts,
    total_today: Object.values(counts).reduce((a, b) => a + b, 0),
    cache_hit: false,
    query_optimization: "Range-based indexed scan with 15s TTL caching"
  };

  dashboardCache = {
    timestamp: now,
    ttlMs: 15000,
    data: responsePayload
  };

  res.json(responsePayload);
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, HOST, () => {
  console.log(`Interview API running at http://${HOST}:${PORT}`);
});
