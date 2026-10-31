/**
 * smartReminderServer.js
 * 
 * Standalone Pure Node.js HTTP Server demonstrating:
 * 1. Node.js Architecture & Event Loop:
 *    - Single-threaded event loop with non-blocking I/O operations
 *    - Lifecycle phases: Timers, Pending Callbacks, Poll, Check (setImmediate), Close
 *    - Microtasks (process.nextTick, Promise.then)
 * 2. Node.js Built-in Modules:
 *    - `http`: Native HTTP server with request routing and stream handling
 *    - `fs` & `path`: Non-blocking JSON file persistence via ReminderStore
 *    - `events`: Event-driven architecture with RuleEngine EventEmitter
 *    - `url`: Modern URL and query parameter parsing
 * 3. AI Smart Reminders Integration:
 *    - Automated rule evaluation for stalled pipeline candidates
 *    - AI-suggested timing (Groq primary + OpenRouter fallback)
 */

const http = require('http');
const path = require('path');
const { URL } = require('url');

const { ReminderStore } = require('./modules/smartReminders/ReminderStore');
const { RuleEngine } = require('./modules/smartReminders/RuleEngine');
const { AiTimingEngine } = require('./modules/smartReminders/AiTimingEngine');

const PORT = process.env.REMINDER_PORT || 3005;
const HOST = process.env.HOST || '0.0.0.0';

const reminderStore = new ReminderStore();
const ruleEngine = new RuleEngine(reminderStore);
const aiTimingEngine = new AiTimingEngine();

// Sample Candidates dataset (integrating with Cynaris Recruitment Pipeline)
const SAMPLE_APPLICANTS = [
  {
    id: 1,
    name: 'Rahul Kumar',
    job_title: 'Full Stack Developer',
    pipeline_stage: 'Screening',
    skills: 'JavaScript, Node.js, Express, React, MongoDB, Git',
    experience_years: 2,
    updated_at: new Date(Date.now() - 3600000 * 36).toISOString(), // 36 hours idle (> 24h threshold)
  },
  {
    id: 2,
    name: 'Priya Sharma',
    job_title: 'Backend Engineer',
    pipeline_stage: 'Technical Round 1',
    skills: 'Python, FastAPI, Django, PostgreSQL, Docker, Redis',
    experience_years: 3.5,
    updated_at: new Date(Date.now() - 3600000 * 52).toISOString(), // 52 hours idle (> 48h threshold)
  },
  {
    id: 3,
    name: 'Arun Kumar',
    job_title: 'Frontend Developer',
    pipeline_stage: 'HR Round',
    skills: 'Vue.js 3, TypeScript, Tailwind CSS, Vite',
    experience_years: 1.5,
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours idle (< threshold)
  },
  {
    id: 4,
    name: 'Neha Gupta',
    job_title: 'Senior DevOps Specialist',
    pipeline_stage: 'Offered',
    skills: 'Kubernetes, Terraform, AWS, Prometheus',
    experience_years: 5,
    updated_at: new Date(Date.now() - 3600000 * 84).toISOString(), // 84 hours idle (> 72h threshold)
  },
];

// Sample Accounts dataset (EspoCRM integration)
const SAMPLE_ACCOUNTS = [
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
    updated_at: new Date(Date.now() - 3600000 * 110).toISOString(), // 110 hours idle (> 96h threshold)
  },
];

/**
 * Utility: Sends JSON response with standard CORS headers
 */
function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Utility: Asynchronously reads and parses request body stream
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Guard against oversized payload attacks (max 1MB)
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

/**
 * Create pure Node.js HTTP Server
 */
function createSmartReminderServer() {
  const server = http.createServer(async (req, res) => {
    const startTime = process.hrtime.bigint();
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Handle Pre-flight CORS
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      });
      res.end();
      return;
    }

    try {
      // 1. Health & Node.js Event Loop Architecture Diagnostics
      if (pathname === '/health' || pathname === '/api/health') {
        const memoryUsage = process.memoryUsage();
        return sendJsonResponse(res, 200, {
          status: 'ok',
          service: 'Smart Reminders & Automation Rules Microservice',
          architecture: {
            engine: 'Node.js Pure HTTP Server (Built-in http module)',
            eventLoop: 'Active (Non-blocking I/O)',
            processUptimeSec: Math.round(process.uptime()),
            heapUsedMB: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
            nodeVersion: process.version,
          },
          aiProviders: {
            primary: 'Groq (llama-3.3-70b-versatile)',
            fallback: 'OpenRouter (meta-llama/llama-3.3-70b-instruct)',
            offlineSafety: 'Deterministic Rule Engine',
          },
        });
      }

      // 2. GET /api/reminders/rules - List Automation Rules
      if (pathname === '/api/reminders/rules' && method === 'GET') {
        const rules = await reminderStore.getRules();
        return sendJsonResponse(res, 200, {
          success: true,
          count: rules.length,
          rules,
        });
      }

      // 3. POST /api/reminders/rules/toggle - Toggle Automation Rule
      if (pathname === '/api/reminders/rules/toggle' && method === 'POST') {
        const body = await parseJsonBody(req);
        const { ruleId, enabled } = body;
        if (!ruleId) {
          return sendJsonResponse(res, 400, { error: 'ruleId is required' });
        }
        const updated = await reminderStore.toggleRule(ruleId, enabled);
        if (!updated) {
          return sendJsonResponse(res, 404, { error: 'Rule not found' });
        }
        return sendJsonResponse(res, 200, { success: true, rule: updated });
      }

      // 4. POST /api/reminders/evaluate - Run Automation Rules
      if (pathname === '/api/reminders/evaluate' && method === 'POST') {
        const body = await parseJsonBody(req);
        const applicantsToEval = body.applicants || SAMPLE_APPLICANTS;
        const accountsToEval = body.accounts || SAMPLE_ACCOUNTS;

        const matches = await ruleEngine.evaluateRules(applicantsToEval, accountsToEval);
        return sendJsonResponse(res, 200, {
          success: true,
          evaluatedCount: applicantsToEval.length + accountsToEval.length,
          triggeredCount: matches.length,
          matches,
        });
      }

      // 5. POST /api/reminders/suggest-timing - AI-Suggested Timing (Groq + OpenRouter Fallback)
      if (pathname === '/api/reminders/suggest-timing' && method === 'POST') {
        const body = await parseJsonBody(req);
        const context = body.context;
        if (!context) {
          return sendJsonResponse(res, 400, { error: 'Missing reminder context object' });
        }

        const options = {
          simulateGroqFailure: body.simulateGroqFailure || parsedUrl.searchParams.get('simulate_groq') === 'true',
          simulateBothFailure: body.simulateBothFailure || parsedUrl.searchParams.get('simulate_both') === 'true',
          groqApiKey: body.groqApiKey,
          openRouterApiKey: body.openRouterApiKey,
        };

        const result = await aiTimingEngine.suggestTiming(context, options);
        return sendJsonResponse(res, 200, {
          success: true,
          ...result,
        });
      }

      // 6. GET /api/reminders/scheduled - List Scheduled Reminders
      if (pathname === '/api/reminders/scheduled' && method === 'GET') {
        const scheduled = await reminderStore.getScheduledReminders();
        return sendJsonResponse(res, 200, {
          success: true,
          count: scheduled.length,
          scheduledReminders: scheduled,
        });
      }

      // 7. POST /api/reminders/schedule - Schedule Smart Reminder
      if (pathname === '/api/reminders/schedule' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.recipientName || !body.suggestedTiming) {
          return sendJsonResponse(res, 400, { error: 'Missing required reminder fields' });
        }

        const scheduled = await reminderStore.addScheduledReminder(body);
        return sendJsonResponse(res, 201, {
          success: true,
          message: 'Smart reminder scheduled successfully',
          reminder: scheduled,
        });
      }

      // 8. POST /api/reminders/dispatch - Dispatch/Execute Reminder
      if (pathname === '/api/reminders/dispatch' && method === 'POST') {
        const body = await parseJsonBody(req);
        const { reminderId } = body;
        if (!reminderId) {
          return sendJsonResponse(res, 400, { error: 'reminderId is required' });
        }

        const dispatched = await reminderStore.markDispatched(reminderId);
        if (!dispatched) {
          return sendJsonResponse(res, 404, { error: 'Scheduled reminder not found' });
        }

        return sendJsonResponse(res, 200, {
          success: true,
          message: `Reminder dispatched via ${dispatched.suggestedTiming.recommendedChannel}`,
          reminder: dispatched,
        });
      }

      // Default 404 Route
      return sendJsonResponse(res, 404, {
        error: 'Route not found',
        availableRoutes: [
          'GET  /health',
          'GET  /api/reminders/rules',
          'POST /api/reminders/rules/toggle',
          'POST /api/reminders/evaluate',
          'POST /api/reminders/suggest-timing',
          'GET  /api/reminders/scheduled',
          'POST /api/reminders/schedule',
          'POST /api/reminders/dispatch',
        ],
      });
    } catch (err) {
      return sendJsonResponse(res, 500, {
        success: false,
        error: err.message,
      });
    }
  });

  return server;
}

// Standalone execution check
if (require.main === module) {
  const server = createSmartReminderServer();
  server.listen(PORT, HOST, () => {
    console.log(`[Pure Node.js HTTP Server] Smart Reminders Service running at http://${HOST}:${PORT}`);
    console.log(`[Event Loop] Built-in modules active: http, fs, path, events, url`);
  });
}

module.exports = {
  createSmartReminderServer,
  reminderStore,
  ruleEngine,
  aiTimingEngine,
  SAMPLE_APPLICANTS,
  SAMPLE_ACCOUNTS,
};
