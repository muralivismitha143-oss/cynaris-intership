/**
 * ReminderStore.js
 * 
 * Demonstrates:
 * - Node.js Built-in Modules: `fs` (fs.promises), `path`
 * - Asynchronous Non-Blocking File I/O
 * - Atomic persistence of automation rules and scheduled smart reminders
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'reminders.json');

const DEFAULT_DATA = {
  rules: [
    {
      id: 'rule-1',
      name: 'Stalled Technical Round Follow-up',
      entityType: 'JobApplicant',
      triggerStage: 'Technical Round 1',
      idleThresholdHours: 48,
      urgency: 'High',
      channelPreference: 'Email',
      description: 'Trigger when applicant in Technical Round 1 has had no scorecard or status update for > 48 hours.',
      enabled: true,
    },
    {
      id: 'rule-2',
      name: 'Offer Decision & Acceptance Check-in',
      entityType: 'JobApplicant',
      triggerStage: 'Offered',
      idleThresholdHours: 72,
      urgency: 'Critical',
      channelPreference: 'WhatsApp',
      description: 'Trigger when an offer letter has been pending acceptance for > 72 hours without candidate reply.',
      enabled: true,
    },
    {
      id: 'rule-3',
      name: 'Screening Feedback Acceleration',
      entityType: 'JobApplicant',
      triggerStage: 'Screening',
      idleThresholdHours: 24,
      urgency: 'Medium',
      channelPreference: 'Email',
      description: 'Trigger when a newly applied candidate remains unreviewed in Screening for > 24 hours.',
      enabled: true,
    },
    {
      id: 'rule-4',
      name: 'High-Value Account Outreach (EspoCRM)',
      entityType: 'Account',
      triggerStage: 'Prospect',
      idleThresholdHours: 96,
      urgency: 'High',
      channelPreference: 'Phone',
      description: 'Trigger when a high-value sales account in evaluation phase has had no touchpoint for > 4 days.',
      enabled: true,
    },
  ],
  scheduledReminders: [
    {
      id: 'rem-101',
      ruleId: 'rule-1',
      entityId: 2,
      recipientName: 'Priya Sharma',
      role: 'Backend Engineer',
      pipelineStage: 'Technical Round 1',
      hoursIdle: 54,
      suggestedTiming: {
        recommendedSlot: 'Tuesday 10:30 AM - 11:30 AM IST',
        recommendedChannel: 'Email',
        rationale: 'Engineering leads demonstrate peak open rates on Tuesday mornings post-standup.',
        urgencyLevel: 'High',
        customizedMessage: 'Hi Priya, hope your week is off to a great start! Our engineering panel thoroughly enjoyed your Technical Round 1 discussion. We wanted to quickly touch base regarding the next steps and bar-raiser schedule.',
      },
      provider: 'Groq (llama-3.3-70b-versatile)',
      status: 'Scheduled',
      scheduledAt: new Date(Date.now() + 3600000 * 2).toISOString(),
      createdAt: new Date().toISOString(),
    },
  ],
  dispatchHistory: [],
};

class ReminderStore {
  constructor(filePath = DATA_FILE) {
    this.filePath = filePath;
    this.dirPath = path.dirname(filePath);
    this.memoryCache = null;
  }

  async ensureDirectory() {
    try {
      await fs.mkdir(this.dirPath, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  async load() {
    if (this.memoryCache) return this.memoryCache;

    await this.ensureDirectory();
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      this.memoryCache = JSON.parse(content);
      return this.memoryCache;
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Initialize default file if not found
        this.memoryCache = JSON.parse(JSON.stringify(DEFAULT_DATA));
        await this.save(this.memoryCache);
        return this.memoryCache;
      }
      throw err;
    }
  }

  async save(data) {
    await this.ensureDirectory();
    this.memoryCache = data;
    const tempFile = `${this.filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tempFile, this.filePath);
    return data;
  }

  async getRules() {
    const data = await this.load();
    return data.rules || [];
  }

  async getRuleById(ruleId) {
    const rules = await this.getRules();
    return rules.find((r) => r.id === ruleId) || null;
  }

  async toggleRule(ruleId, enabled) {
    const data = await this.load();
    const rule = data.rules.find((r) => r.id === ruleId);
    if (!rule) return null;
    rule.enabled = enabled !== undefined ? enabled : !rule.enabled;
    await this.save(data);
    return rule;
  }

  async getScheduledReminders() {
    const data = await this.load();
    return data.scheduledReminders || [];
  }

  async addScheduledReminder(reminder) {
    const data = await this.load();
    const newReminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      status: 'Scheduled',
      ...reminder,
    };
    data.scheduledReminders.unshift(newReminder);
    await this.save(data);
    return newReminder;
  }

  async markDispatched(reminderId) {
    const data = await this.load();
    const index = data.scheduledReminders.findIndex((r) => r.id === reminderId);
    if (index === -1) return null;

    const [dispatched] = data.scheduledReminders.splice(index, 1);
    dispatched.status = 'Dispatched';
    dispatched.dispatchedAt = new Date().toISOString();
    data.dispatchHistory.unshift(dispatched);
    await this.save(data);
    return dispatched;
  }
}

module.exports = {
  ReminderStore,
  DEFAULT_DATA,
};
