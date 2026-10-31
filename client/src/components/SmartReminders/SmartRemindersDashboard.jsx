/**
 * SmartRemindersDashboard.jsx
 * 
 * Demonstrates:
 * - Smart Reminders: Automation Rules & AI-Suggested Timing
 * - Express Routing & User Preference Settings (Quiet Hours, Channels, Policy)
 * - Groq Primary (llama-3.3-70b-versatile) + OpenRouter Fallback (meta-llama/llama-3.3-70b-instruct)
 * - Interactive Groq outage simulation toggle
 * - Queue management for scheduled and dispatched smart reminders
 */

import React, { useState } from 'react';
import UserPreferencesSettings, { INITIAL_USER_PREFERENCES } from './UserPreferencesSettings';

const INITIAL_RULES = [
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
];

const SAMPLE_MATCHES = [
  {
    ruleId: 'rule-1',
    ruleName: 'Stalled Technical Round Follow-up',
    entityType: 'JobApplicant',
    entityId: 2,
    recipientName: 'Priya Sharma',
    role: 'Backend Engineer',
    pipelineStage: 'Technical Round 1',
    hoursIdle: 54,
    thresholdHours: 48,
    urgency: 'High',
    preferredChannel: 'Email',
  },
  {
    ruleId: 'rule-2',
    ruleName: 'Offer Decision & Acceptance Check-in',
    entityType: 'JobApplicant',
    entityId: 4,
    recipientName: 'Neha Gupta',
    role: 'Senior DevOps Specialist',
    pipelineStage: 'Offered',
    hoursIdle: 84,
    thresholdHours: 72,
    urgency: 'Critical',
    preferredChannel: 'WhatsApp',
  },
  {
    ruleId: 'rule-3',
    ruleName: 'Screening Feedback Acceleration',
    entityType: 'JobApplicant',
    entityId: 1,
    recipientName: 'Rahul Kumar',
    role: 'Full Stack Developer',
    pipelineStage: 'Screening',
    hoursIdle: 36,
    thresholdHours: 24,
    urgency: 'Medium',
    preferredChannel: 'Email',
  },
];

export function SmartRemindersDashboard() {
  const [rules, setRules] = useState(INITIAL_RULES);
  const [matchedEntities, setMatchedEntities] = useState(SAMPLE_MATCHES);
  const [selectedEntity, setSelectedEntity] = useState(SAMPLE_MATCHES[0]);
  const [simulateOutage, setSimulateOutage] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [currentPrefs, setCurrentPrefs] = useState(INITIAL_USER_PREFERENCES['recruiter-1']);

  const [timingResult, setTimingResult] = useState({
    recommendedSlot: 'Tuesday 10:30 AM - 11:30 AM IST',
    recommendedChannel: 'Email',
    urgencyLevel: 'High',
    rationale:
      'Engineering leads demonstrate peak open rates on Tuesday mornings post-standup. Mid-morning delivery avoids early-inbox clutter and gives candidate uninterrupted focus time.',
    customizedMessage:
      'Hi Priya, hope your week is off to a great start! Our engineering panel thoroughly enjoyed your Technical Round 1 discussion. We wanted to quickly touch base regarding the next steps and bar-raiser schedule.',
    provider: 'Groq (Primary)',
    model: 'llama-3.3-70b-versatile',
    latencyMs: 248,
    fallbackUsed: false,
    timestamp: 'Just now',
  });

  const [scheduledQueue, setScheduledQueue] = useState([
    {
      id: 'rem-101',
      recipientName: 'Priya Sharma',
      role: 'Backend Engineer',
      pipelineStage: 'Technical Round 1',
      recommendedSlot: 'Tuesday 10:30 AM IST',
      recommendedChannel: 'Email',
      provider: 'Groq',
      status: 'Scheduled',
      createdAt: '10 mins ago',
    },
  ]);

  const [notification, setNotification] = useState(null);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleRule = (ruleId) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
    showToast('Automation rule status updated', 'info');
  };

  const handleGenerateTiming = async (entity) => {
    setSelectedEntity(entity);
    setIsLoadingAi(true);

    try {
      // Simulate API round-trip to backend with dual failover and user preference checks
      await new Promise((resolve) => setTimeout(resolve, 380));

      // Resolve channel according to user preferences
      let chosenChannel = entity.preferredChannel || 'Email';
      if (chosenChannel === 'WhatsApp' && !currentPrefs.channels.whatsapp) {
        chosenChannel = currentPrefs.channels.email ? 'Email' : 'In-App';
      }

      if (simulateOutage) {
        // OpenRouter Fallback
        setTimingResult({
          recommendedSlot:
            entity.pipelineStage === 'Offered'
              ? 'Tomorrow 11:00 AM - 12:30 PM IST'
              : 'Wednesday 2:30 PM - 3:30 PM IST',
          recommendedChannel: chosenChannel,
          urgencyLevel: entity.urgency,
          rationale:
            '[OpenRouter Fallback] Mid-week afternoon delivery minimizes calendar clashes with core sprint meetings while preserving fast response urgency.',
          customizedMessage:
            entity.pipelineStage === 'Offered'
              ? `Hi ${entity.recipientName}, checking in on your Cynaris offer letter! We are thrilled about the prospect of having you join our team. Please let us know if you need any clarification on compensation or benefits.`
              : `Hi ${entity.recipientName}, our team wanted to follow up regarding your interview stage in ${entity.pipelineStage}. We would love to align on upcoming touchpoints at your convenience.`,
          provider: 'OpenRouter (Fallback)',
          model: 'meta-llama/llama-3.3-70b-instruct',
          latencyMs: 760,
          fallbackUsed: true,
          fallbackReason: 'Primary Groq API Outage Simulated (HTTP 503)',
          timestamp: new Date().toLocaleTimeString(),
        });
        showToast('Groq Outage Simulated — OpenRouter Fallback Engaged!', 'warning');
      } else {
        // Groq Primary
        setTimingResult({
          recommendedSlot:
            entity.pipelineStage === 'Offered'
              ? 'Today 4:00 PM - 5:00 PM IST'
              : 'Tuesday 10:30 AM - 11:30 AM IST',
          recommendedChannel: chosenChannel,
          urgencyLevel: entity.urgency,
          rationale:
            'Engineering candidates exhibit 3.2x higher response rates when contacted in mid-morning windows following team syncs. Professional tone maintains high engagement.',
          customizedMessage:
            entity.pipelineStage === 'Offered'
              ? `Hi ${entity.recipientName}, hope you are doing well! We are excited about your prospective role at Cynaris. Let us know if you have any questions regarding the offer package.`
              : `Hi ${entity.recipientName}, hope your week is going well! We wanted to provide a quick update on your ${entity.pipelineStage} evaluation and coordinate the next step.`,
          provider: 'Groq (Primary)',
          model: 'llama-3.3-70b-versatile',
          latencyMs: 242,
          fallbackUsed: false,
          timestamp: new Date().toLocaleTimeString(),
        });
        showToast('AI Timing generated via Groq (Primary)', 'success');
      }
    } catch (err) {
      showToast('Error generating AI timing', 'danger');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleScheduleReminder = () => {
    if (!selectedEntity || !timingResult) return;

    const newReminder = {
      id: `rem-${Date.now()}`,
      recipientName: selectedEntity.recipientName,
      role: selectedEntity.role,
      pipelineStage: selectedEntity.pipelineStage,
      recommendedSlot: timingResult.recommendedSlot,
      recommendedChannel: timingResult.recommendedChannel,
      provider: timingResult.provider,
      status: 'Scheduled',
      createdAt: 'Just now',
    };

    setScheduledQueue((prev) => [newReminder, ...prev]);
    showToast(`Reminder scheduled for ${selectedEntity.recipientName}!`, 'success');
  };

  const handleDispatch = (remId) => {
    setScheduledQueue((prev) =>
      prev.map((r) => (r.id === remId ? { ...r, status: 'Dispatched' } : r))
    );
    showToast('Reminder successfully dispatched via selected channel!', 'success');
  };

  return (
    <div className="smart-reminders-dashboard" data-testid="smart-reminders-dashboard">
      {/* Toast Notification */}
      {notification && (
        <div className={`toast-alert toast-${notification.type}`} data-testid="toast-notification">
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Preferences Modal Dialog */}
      {showPreferencesModal && (
        <UserPreferencesSettings
          activeUserId={currentPrefs.userId}
          onPreferencesChanged={(updated) => {
            setCurrentPrefs(updated);
            showToast(`Active preferences synchronized with ${updated.userName}`, 'info');
          }}
          onClose={() => setShowPreferencesModal(false)}
        />
      )}

      {/* Hero Header */}
      <header className="dashboard-hero">
        <div className="hero-top-row">
          <div className="hero-titles">
            <div className="hero-badge-group">
              <span className="badge-pill">Week 4 Day 2</span>
              <span className="badge-pill pill-node">Express Routing &amp; Middleware</span>
              <span className="badge-pill pill-profile">👤 {currentPrefs.userName} ({currentPrefs.role})</span>
            </div>
            <h2>Smart Reminders &mdash; Frontend UI + User Preference Settings</h2>
            <p className="hero-description">
              Configure recruiter notification channels, quiet hours (DND in IST), and automation rules.
              Powered by Express REST API, middleware validation, and dual-provider AI scheduling (Groq &bull; OpenRouter).
            </p>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="btn-open-preferences"
              onClick={() => setShowPreferencesModal(true)}
              data-testid="btn-open-preferences"
            >
              ⚙️ User Preferences &amp; Quiet Hours
            </button>
          </div>
        </div>

        {/* Live Preferences Overview Ribbon */}
        <div className="preferences-ribbon-bar">
          <div className="ribbon-item">
            <span className="r-label">Active Channels:</span>
            <div className="r-channels">
              {currentPrefs.channels.email && <span className="ch-pill">✉️ Email</span>}
              {currentPrefs.channels.whatsapp && <span className="ch-pill">💬 WhatsApp</span>}
              {currentPrefs.channels.inApp && <span className="ch-pill">🔔 In-App</span>}
              {currentPrefs.channels.sms && <span className="ch-pill">📱 SMS</span>}
            </div>
          </div>

          <div className="ribbon-item">
            <span className="r-label">Quiet Hours (DND):</span>
            <span className="r-val">
              {currentPrefs.quietHours.enabled
                ? `🌙 ${currentPrefs.quietHours.start} - ${currentPrefs.quietHours.end} IST`
                : '☀️ Disabled'}
            </span>
          </div>

          <div className="ribbon-item">
            <span className="r-label">Working Days:</span>
            <span className="r-val">
              🗓️ {currentPrefs.workingSchedule?.days?.length || 5} Days ({currentPrefs.workingSchedule?.startHour} - {currentPrefs.workingSchedule?.endHour} IST)
            </span>
          </div>

          <div className="ribbon-item">
            <span className="r-label">Min Urgency:</span>
            <span className="r-val">⚡ {currentPrefs.remindersPolicy?.minimumUrgency || 'Medium'}</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Rules & Trigger Evaluation */}
      <div className="dashboard-grid">
        {/* Left Column: Automation Rules & Triggers */}
        <div className="rules-section-card">
          <div className="section-card-header">
            <div className="title-area">
              <span className="icon-badge">⚙️</span>
              <h3>Pipeline Automation Rules</h3>
            </div>
            <span className="counter-badge">{rules.filter((r) => r.enabled).length} Active Rules</span>
          </div>

          <p className="section-note">
            Built-in event triggers checking idle hours and pipeline stages via Node.js <code>EventEmitter</code>.
          </p>

          <div className="rules-list">
            {rules.map((rule) => (
              <div key={rule.id} className={`rule-item-box ${rule.enabled ? 'rule-enabled' : 'rule-disabled'}`}>
                <div className="rule-item-top">
                  <div className="rule-name-group">
                    <h4 className="rule-name">{rule.name}</h4>
                    <span className="rule-entity-tag">{rule.entityType} &bull; {rule.triggerStage}</span>
                  </div>
                  <label className="switch-toggle" title="Toggle Automation Rule">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule.id)}
                      data-testid={`toggle-rule-${rule.id}`}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <p className="rule-desc">{rule.description}</p>

                <div className="rule-meta-footer">
                  <span className="meta-pill">Idle: &gt; {rule.idleThresholdHours} hrs</span>
                  <span className={`meta-pill pill-urgency-${rule.urgency.toLowerCase()}`}>
                    {rule.urgency} Urgency
                  </span>
                  <span className="meta-pill">Channel: {rule.channelPreference}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Triggered Entities & AI Timing Engine */}
        <div className="ai-timing-section-card">
          <div className="section-card-header">
            <div className="title-area">
              <span className="icon-badge">✨</span>
              <h3>AI-Suggested Timing Engine</h3>
            </div>
            <div className="header-provider-badges">
              <span className={`provider-badge ${timingResult.fallbackUsed ? 'badge-openrouter' : 'badge-groq'}`}>
                {timingResult.provider}
              </span>
            </div>
          </div>

          {/* Trigger Matches Selector */}
          <div className="triggered-entities-selector">
            <span className="selector-label">Triggered Candidates &amp; Accounts ({matchedEntities.length} Pending):</span>
            <div className="entity-pills-row">
              {matchedEntities.map((ent) => (
                <button
                  key={ent.entityId}
                  type="button"
                  className={`entity-pill-btn ${selectedEntity.entityId === ent.entityId ? 'active' : ''}`}
                  onClick={() => handleGenerateTiming(ent)}
                  data-testid={`select-entity-${ent.entityId}`}
                >
                  <span className="entity-name">{ent.recipientName}</span>
                  <span className="entity-idle">⏱️ {ent.hoursIdle}h idle</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Controls & Outage Simulation */}
          <div className="ai-controls-bar">
            <button
              type="button"
              className="btn-generate-timing"
              onClick={() => handleGenerateTiming(selectedEntity)}
              disabled={isLoadingAi}
              data-testid="btn-generate-timing"
            >
              {isLoadingAi ? 'Computing Optimal Timing...' : '✨ Re-calculate AI Timing & Message'}
            </button>

            <label className="checkbox-outage-toggle">
              <input
                type="checkbox"
                checked={simulateOutage}
                onChange={(e) => setSimulateOutage(e.target.checked)}
                data-testid="simulate-groq-toggle"
              />
              <span className="toggle-label">Simulate Groq Outage (Test OpenRouter Fallback)</span>
            </label>
          </div>

          {/* Fallback Alert Banner */}
          {timingResult.fallbackUsed && (
            <div className="fallback-banner" data-testid="fallback-banner">
              <span className="warning-icon">⚠️</span>
              <div className="banner-text">
                <strong>Fallback Triggered:</strong> Primary Groq API Outage Simulated (HTTP 503).
                Seamlessly routed to <code>{timingResult.model}</code> via OpenRouter.
              </div>
            </div>
          )}

          {/* AI Output Card */}
          <div className="ai-timing-result-card" data-testid="ai-timing-result-card">
            <div className="result-top-row">
              <div className="timing-slot-box">
                <span className="slot-label">Optimal Dispatch Window (IST)</span>
                <span className="slot-value" data-testid="timing-slot">
                  🗓️ {timingResult.recommendedSlot}
                </span>
              </div>
              <div className="channel-box">
                <span className="slot-label">Recommended Channel</span>
                <span className="channel-tag" data-testid="timing-channel">
                  📲 {timingResult.recommendedChannel}
                </span>
              </div>
            </div>

            <div className="rationale-box">
              <span className="sub-label">Strategic Timing Rationale:</span>
              <p className="rationale-text" data-testid="timing-rationale">
                {timingResult.rationale}
              </p>
            </div>

            <div className="message-box">
              <div className="message-header">
                <span className="sub-label">Personalized Outreach Draft:</span>
                <span className="tag-recipient">For: {selectedEntity.recipientName} ({selectedEntity.role})</span>
              </div>
              <div className="message-content" data-testid="timing-message">
                "{timingResult.customizedMessage}"
              </div>
            </div>

            <div className="result-footer-bar">
              <div className="telemetry-tags">
                <span className="telemetry-item">Model: {timingResult.model}</span>
                <span className="telemetry-item">Latency: {timingResult.latencyMs}ms</span>
              </div>

              <button
                type="button"
                className="btn-schedule-action"
                onClick={handleScheduleReminder}
                data-testid="btn-schedule-reminder"
              >
                📅 Schedule Smart Reminder
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Reminders Queue */}
      <div className="queue-section-card">
        <div className="section-card-header">
          <div className="title-area">
            <span className="icon-badge">📋</span>
            <h3>Scheduled Smart Reminders Queue</h3>
          </div>
          <span className="counter-badge">{scheduledQueue.length} Reminders In Queue</span>
        </div>

        <div className="table-responsive">
          <table className="reminders-table" data-testid="reminders-queue-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Role / Entity</th>
                <th>Pipeline Stage</th>
                <th>Optimal Dispatch Slot</th>
                <th>Channel</th>
                <th>AI Provider</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {scheduledQueue.map((rem) => (
                <tr key={rem.id} data-testid={`reminder-row-${rem.id}`}>
                  <td className="recipient-col">
                    <strong>{rem.recipientName}</strong>
                  </td>
                  <td>{rem.role}</td>
                  <td>
                    <span className="stage-pill">{rem.pipelineStage}</span>
                  </td>
                  <td>
                    <strong>{rem.recommendedSlot}</strong>
                  </td>
                  <td>
                    <span className="channel-pill">{rem.recommendedChannel}</span>
                  </td>
                  <td>
                    <span className="provider-tag">{rem.provider}</span>
                  </td>
                  <td>
                    <span className={`status-tag status-${rem.status.toLowerCase()}`}>
                      {rem.status}
                    </span>
                  </td>
                  <td>
                    {rem.status === 'Scheduled' ? (
                      <button
                        type="button"
                        className="btn-dispatch"
                        onClick={() => handleDispatch(rem.id)}
                        data-testid={`btn-dispatch-${rem.id}`}
                      >
                        🚀 Dispatch Now
                      </button>
                    ) : (
                      <span className="dispatched-label">✅ Sent</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SmartRemindersDashboard;
