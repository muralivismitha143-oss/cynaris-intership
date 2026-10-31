/**
 * RuleEngine.js
 * 
 * Demonstrates:
 * - Node.js Built-in Modules: `events` (EventEmitter)
 * - Automation Rule Evaluation Architecture
 * - Calculating idle hours based on last modified timestamps
 * - Event-driven dispatching of smart reminder trigger events
 */

const EventEmitter = require('events');

class RuleEngine extends EventEmitter {
  constructor(reminderStore) {
    super();
    this.store = reminderStore;
  }

  /**
   * Calculates the idle time (hours elapsed) since the last update.
   */
  calculateIdleHours(updatedAt) {
    if (!updatedAt) return 999;
    const diffMs = Date.now() - new Date(updatedAt).getTime();
    return Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
  }

  /**
   * Evaluates active automation rules against candidate and account entities.
   * Emits 'rule:matched' events for entities requiring action.
   */
  async evaluateRules(applicants = [], accounts = []) {
    const rules = await this.store.getRules();
    const activeRules = rules.filter((r) => r.enabled);
    const existingReminders = await this.store.getScheduledReminders();

    const matches = [];

    // 1. Evaluate Applicant Rules
    for (const applicant of applicants) {
      const hoursIdle = this.calculateIdleHours(applicant.updated_at);

      for (const rule of activeRules) {
        if (rule.entityType !== 'JobApplicant') continue;

        if (applicant.pipeline_stage === rule.triggerStage) {
          if (hoursIdle >= rule.idleThresholdHours) {
            // Check if already scheduled to avoid duplicate spam
            const alreadyScheduled = existingReminders.some(
              (r) => r.entityId === applicant.id && r.ruleId === rule.id && r.status === 'Scheduled'
            );

            const match = {
              ruleId: rule.id,
              ruleName: rule.name,
              entityType: 'JobApplicant',
              entityId: applicant.id,
              recipientName: applicant.name,
              role: applicant.job_title,
              pipelineStage: applicant.pipeline_stage,
              skills: applicant.skills,
              experienceYears: applicant.experience_years,
              hoursIdle,
              thresholdHours: rule.idleThresholdHours,
              urgency: rule.urgency,
              preferredChannel: rule.channelPreference,
              alreadyScheduled,
              detectedAt: new Date().toISOString(),
            };

            matches.push(match);
            this.emit('rule:matched', match);
          }
        }
      }
    }

    // 2. Evaluate Account Rules (for EspoCRM Bridge)
    for (const account of accounts) {
      const hoursIdle = this.calculateIdleHours(account.updated_at || account.lastActivityAt);

      for (const rule of activeRules) {
        if (rule.entityType !== 'Account') continue;

        if (account.type === rule.triggerStage || rule.triggerStage === 'All') {
          if (hoursIdle >= rule.idleThresholdHours) {
            const alreadyScheduled = existingReminders.some(
              (r) => r.entityId === account.id && r.ruleId === rule.id && r.status === 'Scheduled'
            );

            const match = {
              ruleId: rule.id,
              ruleName: rule.name,
              entityType: 'Account',
              entityId: account.id,
              recipientName: account.name,
              role: account.industry,
              pipelineStage: account.type,
              annualRevenue: account.annualRevenue,
              hoursIdle,
              thresholdHours: rule.idleThresholdHours,
              urgency: rule.urgency,
              preferredChannel: rule.channelPreference,
              alreadyScheduled,
              detectedAt: new Date().toISOString(),
            };

            matches.push(match);
            this.emit('rule:matched', match);
          }
        }
      }
    }

    this.emit('rule:evaluated', {
      totalEvaluated: applicants.length + accounts.length,
      matchesCount: matches.length,
      timestamp: new Date().toISOString(),
    });

    return matches;
  }
}

module.exports = {
  RuleEngine,
};
