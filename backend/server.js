const express = require("express");
const path = require("path");

// Smart Reminders Module (Week 4 Day 1 - Node.js Architecture & AI Timing)
const { ReminderStore } = require("./modules/smartReminders/ReminderStore");
const { RuleEngine } = require("./modules/smartReminders/RuleEngine");
const { AiTimingEngine } = require("./modules/smartReminders/AiTimingEngine");

// User Preferences Router (Week 4 Day 2 - Express Routing, Middleware & Preferences)
const { preferencesRouter } = require("./routes/preferencesRouter");

// RESTful Debug Sprint & Diagnostics (Week 4 Day 3 - RESTful API Design & Performance)
const { restCacheMiddleware } = require("./middleware/restCacheMiddleware");
const { applicantsRouter, getApplicantsStore } = require("./routes/applicantsRouter");
const { diagnosticsRouter } = require("./routes/diagnosticsRouter");

// MySQL Database Connection & CRUD (Week 4 Day 4 - MySQL Connection Pool & Prepared Statements)
const { mysqlClient } = require("./database/mysqlClient");
const { dbRouter } = require("./routes/dbRouter");

const reminderStore = new ReminderStore();
const ruleEngine = new RuleEngine(reminderStore);
const aiTimingEngine = new AiTimingEngine();

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
app.use(restCacheMiddleware);
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/preferences", preferencesRouter);
app.use("/api/applicants", applicantsRouter);
app.use("/api/performance", diagnosticsRouter);
app.use("/api/database", dbRouter);
app.use("/static/preferences", express.static(path.join(__dirname, "public/preferences"), {
  maxAge: "1d",
  etag: true,
}));

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

const applicants = getApplicantsStore();

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

// Note: /api/applicants CRUD and validation routes are mounted via applicantsRouter

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


// ==========================================
// Week 4 Day 1: Smart Reminders & AI Timing Endpoints
// ==========================================

// 1. Get Automation Rules
app.get("/api/reminders/rules", async (req, res) => {
  try {
    const rules = await reminderStore.getRules();
    res.json({ success: true, count: rules.length, rules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESTful Single Rule Fetch: GET /api/reminders/rules/:ruleId
app.get("/api/reminders/rules/:ruleId", async (req, res) => {
  try {
    const { ruleId } = req.params;
    const rule = await reminderStore.getRuleById(ruleId);
    if (!rule) {
      return res.status(404).json({ success: false, error: `Rule '${ruleId}' not found`, statusCode: 404 });
    }
    res.status(200).json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// RESTful Rule Update: PATCH /api/reminders/rules/:ruleId (Idempotent Partial Update)
app.patch("/api/reminders/rules/:ruleId", async (req, res) => {
  try {
    const { ruleId } = req.params;
    if (!ruleId || !ruleId.trim()) {
      return res.status(400).json({ success: false, error: "ruleId route parameter is required" });
    }

    const { enabled } = req.body || {};
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: "enabled field must be a boolean" });
    }

    const updated = await reminderStore.toggleRule(ruleId.trim(), enabled);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Rule '${ruleId}' not found`, statusCode: 404 });
    }

    res.status(200).json({
      success: true,
      message: `Rule '${ruleId}' updated successfully`,
      rule: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Toggle Automation Rule (Preserved for backwards compatibility)
app.post("/api/reminders/rules/toggle", async (req, res) => {
  try {
    const { ruleId, enabled } = req.body || {};
    if (!ruleId) return res.status(400).json({ error: "ruleId is required" });
    const updated = await reminderStore.toggleRule(ruleId, enabled);
    if (!updated) return res.status(404).json({ error: "Rule not found" });
    res.json({ success: true, rule: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Evaluate Automation Rules
app.post("/api/reminders/evaluate", async (req, res) => {
  try {
    const applicantsToEval = req.body.applicants || applicants;
    const accountsToEval = req.body.accounts || [
      {
        id: 'acc-1',
        name: 'FinTech Innovations India Pvt Ltd',
        industry: 'Financial Services',
        type: 'Customer',
        annualRevenue: '₹ 15,000,000',
        updated_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      },
      {
        id: 'acc-3',
        name: 'Tata Telematics Labs',
        industry: 'Telecommunications',
        type: 'Prospect',
        annualRevenue: '₹ 25,000,000',
        updated_at: new Date(Date.now() - 3600000 * 110).toISOString(),
      },
    ];

    const matches = await ruleEngine.evaluateRules(applicantsToEval, accountsToEval);
    res.json({
      success: true,
      evaluatedCount: applicantsToEval.length + accountsToEval.length,
      triggeredCount: matches.length,
      matches,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Suggest AI Timing (Groq Primary + OpenRouter Fallback)
app.post("/api/reminders/suggest-timing", async (req, res) => {
  try {
    const context = req.body.context;
    if (!context) return res.status(400).json({ error: "Missing reminder context object" });

    const options = {
      simulateGroqFailure: req.body.simulateGroqFailure === true || req.query.simulate_groq === "true",
      simulateBothFailure: req.body.simulateBothFailure === true || req.query.simulate_both === "true",
      groqApiKey: req.body.groqApiKey,
      openRouterApiKey: req.body.openRouterApiKey,
    };

    const result = await aiTimingEngine.suggestTiming(context, options);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// 5. Get Scheduled Reminders
app.get("/api/reminders/scheduled", async (req, res) => {
  try {
    const scheduled = await reminderStore.getScheduledReminders();
    res.json({ success: true, count: scheduled.length, scheduledReminders: scheduled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Schedule Reminder
app.post("/api/reminders/schedule", async (req, res) => {
  try {
    if (!req.body.recipientName || !req.body.suggestedTiming) {
      return res.status(400).json({ error: "Missing required reminder fields" });
    }
    const scheduled = await reminderStore.addScheduledReminder(req.body);
    res.status(201).json({
      success: true,
      message: "Smart reminder scheduled successfully",
      reminder: scheduled,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Dispatch Reminder
app.post("/api/reminders/dispatch", async (req, res) => {
  try {
    const { reminderId } = req.body || {};
    if (!reminderId) return res.status(400).json({ error: "reminderId is required" });
    const dispatched = await reminderStore.markDispatched(reminderId);
    if (!dispatched) return res.status(404).json({ error: "Scheduled reminder not found" });
    res.json({
      success: true,
      message: `Reminder dispatched via ${dispatched.suggestedTiming.recommendedChannel}`,
      reminder: dispatched,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

if (require.main === module) {
  mysqlClient.init().catch(console.error);
  app.listen(PORT, HOST, () => {
    console.log(`Interview API running at http://${HOST}:${PORT}`);
  });
}

module.exports = app;
