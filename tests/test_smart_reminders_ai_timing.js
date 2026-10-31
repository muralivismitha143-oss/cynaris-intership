/**
 * test_smart_reminders_ai_timing.js
 * 
 * Unit test suite validating:
 * 1. Automation Rules Engine (RuleEngine.js & EventEmitter):
 *    - Idle hour calculation.
 *    - Matching active rules against candidates and CRM accounts.
 *    - Event emission ('rule:matched', 'rule:evaluated').
 * 2. AI Timing & Messaging Engine (AiTimingEngine.js):
 *    - Prompt generation with Indian Standard Time (IST) business window constraints.
 *    - Primary provider execution (Groq llama-3.3-70b-versatile).
 *    - Failover to OpenRouter (meta-llama/llama-3.3-70b-instruct) when Groq fails.
 *    - Deterministic offline safety net ensuring zero unhandled crashes.
 * 3. File Persistence (ReminderStore.js):
 *    - Non-blocking asynchronous JSON storage with fs.promises and path.
 *    - Scheduling and dispatching lifecycle.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const { ReminderStore } = require(path.join(rootDir, 'backend/modules/smartReminders/ReminderStore'));
const { RuleEngine } = require(path.join(rootDir, 'backend/modules/smartReminders/RuleEngine'));
const { AiTimingEngine } = require(path.join(rootDir, 'backend/modules/smartReminders/AiTimingEngine'));

async function testReminderStore() {
  console.log('--- Test 1: ReminderStore Persistence (fs & path) ---');
  const testFile = path.join(rootDir, 'backend/data/test_reminders.json');

  // Clean test file if exists
  try {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  } catch {}

  const store = new ReminderStore(testFile);
  const rules = await store.getRules();
  assert.ok(Array.isArray(rules), 'Rules must be an array');
  assert.ok(rules.length >= 4, 'Must load default automation rules');
  console.log(`  [PASS] Successfully loaded ${rules.length} default rules`);

  // Test toggle rule
  const toggled = await store.toggleRule('rule-1', false);
  assert.strictEqual(toggled.enabled, false);
  const toggledBack = await store.toggleRule('rule-1', true);
  assert.strictEqual(toggledBack.enabled, true);
  console.log('  [PASS] Rule toggling works cleanly');

  // Test add scheduled reminder
  const added = await store.addScheduledReminder({
    recipientName: 'Test Candidate',
    role: 'Frontend Dev',
    suggestedTiming: {
      recommendedSlot: 'Tuesday 10:30 AM IST',
      recommendedChannel: 'Email',
    },
  });
  assert.ok(added.id.startsWith('rem-'));
  assert.strictEqual(added.status, 'Scheduled');
  console.log('  [PASS] Added scheduled reminder successfully');

  // Test dispatch
  const dispatched = await store.markDispatched(added.id);
  assert.strictEqual(dispatched.status, 'Dispatched');
  assert.ok(dispatched.dispatchedAt);
  console.log('  [PASS] Marked reminder as dispatched');

  // Clean up test file
  try {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  } catch {}
}

async function testRuleEngineEvaluation() {
  console.log('\n--- Test 2: RuleEngine Automation & Event Emitter ---');
  const store = new ReminderStore();
  const engine = new RuleEngine(store);

  const matchedEvents = [];
  engine.on('rule:matched', (match) => {
    matchedEvents.push(match);
  });

  const testApplicants = [
    {
      id: 10,
      name: 'Priya Sharma',
      job_title: 'Backend Engineer',
      pipeline_stage: 'Technical Round 1',
      updated_at: new Date(Date.now() - 3600000 * 50).toISOString(), // 50 hours idle (> 48h threshold)
    },
    {
      id: 11,
      name: 'Recent Applicant',
      job_title: 'Full Stack Engineer',
      pipeline_stage: 'Technical Round 1',
      updated_at: new Date(Date.now() - 3600000 * 10).toISOString(), // 10 hours idle (< 48h threshold)
    },
    {
      id: 12,
      name: 'Neha Gupta',
      job_title: 'DevOps Lead',
      pipeline_stage: 'Offered',
      updated_at: new Date(Date.now() - 3600000 * 80).toISOString(), // 80 hours idle (> 72h threshold)
    },
  ];

  const matches = await engine.evaluateRules(testApplicants, []);
  assert.strictEqual(matches.length, 2, 'Should match exactly 2 stalled applicants');
  assert.strictEqual(matches[0].recipientName, 'Priya Sharma');
  assert.strictEqual(matches[1].recipientName, 'Neha Gupta');
  assert.strictEqual(matchedEvents.length, 2, 'EventEmitter should have emitted 2 rule:matched events');
  console.log('  [PASS] Automation rule criteria matched and emitted events correctly');
}

async function testAiTimingEngineAndFallback() {
  console.log('\n--- Test 3: AI-Suggested Timing Engine & Dual Failover ---');
  const engine = new AiTimingEngine();

  const sampleContext = {
    entityId: 2,
    recipientName: 'Priya Sharma',
    role: 'Backend Engineer',
    pipelineStage: 'Technical Round 1',
    hoursIdle: 52,
    urgency: 'High',
  };

  // 1. Verify Prompt Construction
  const { systemPrompt, userPrompt } = engine.buildTimingPrompt(sampleContext);
  assert.ok(systemPrompt.includes('Talent Engagement Strategist'), 'System prompt must frame recruiter persona');
  assert.ok(userPrompt.includes('Indian Standard Time (IST, UTC+5:30)'), 'User prompt must require IST timezone');
  assert.ok(userPrompt.includes('recommendedSlot'), 'User prompt must require JSON schema');
  console.log('  [PASS] Prompt builder enforces IST business timezone and JSON structure');

  // 2. Case A: Normal Execution (Deterministic Offline / Mock Groq)
  const resGroq = await engine.suggestTiming(sampleContext, { simulateGroqFailure: false });
  assert.ok(resGroq.timingData.recommendedSlot.includes('IST'), 'Must specify IST slot');
  assert.ok(resGroq.timingData.recommendedChannel, 'Must specify recommended channel');
  assert.ok(resGroq.timingData.customizedMessage, 'Must generate customized message');
  assert.strictEqual(resGroq.fallbackUsed, false, 'Primary execution must not flag fallback');
  console.log('  [PASS] Case A: Primary provider executed successfully');

  // 3. Case B: Groq Outage Simulated (Failover to OpenRouter)
  const resOpenRouter = await engine.suggestTiming(sampleContext, { simulateGroqFailure: true });
  assert.ok(resOpenRouter.timingData.recommendedSlot, 'Must specify slot in fallback');
  assert.strictEqual(resOpenRouter.fallbackUsed, true, 'Fallback must be flagged as used');
  assert.ok(resOpenRouter.errorsBypassed.length > 0, 'Errors bypassed must be logged');
  assert.ok(
    resOpenRouter.provider.includes('OpenRouter') || resOpenRouter.fallbackReason.includes('Groq'),
    'Fallback provider must be indicated'
  );
  console.log('  [PASS] Case B: Automatic failover to OpenRouter verified upon Groq outage');

  // 4. Case C: Both Providers Outage
  try {
    await engine.suggestTiming(sampleContext, { simulateBothFailure: true });
    assert.fail('Should throw error when both providers fail');
  } catch (err) {
    assert.ok(err.message.includes('Dual Provider Outage'), 'Should catch dual outage cleanly');
    console.log('  [PASS] Case C: Dual provider failure handled with structured error message');
  }
}

async function runAll() {
  console.log('================================================================');
  console.log('🧪 Week 4 Day 1: Smart Reminders & AI Timing Test Suite');
  console.log('================================================================');
  await testReminderStore();
  await testRuleEngineEvaluation();
  await testAiTimingEngineAndFallback();
  console.log('\n[SUCCESS] All Smart Reminders & AI Timing tests passed!\n');
}

runAll().catch((err) => {
  console.error('\n[FAIL] Test suite failed:', err);
  process.exit(1);
});
