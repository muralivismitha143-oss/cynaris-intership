/**
 * ConversationSummarizerPanel Component
 * 
 * Demonstrates:
 * - AI Conversation Summarizer visual panel displayed on the Account Detail View
 * - Groq (primary: llama-3.3-70b-versatile) + OpenRouter (fallback: meta-llama/llama-3.3-70b-instruct)
 * - Error handling, loading state, and latency telemetry
 * - Interactive Groq outage toggle to demonstrate fallback live
 */

import React, { useState } from 'react';

export function ConversationSummarizerPanel({
  accountName = 'FinTech Innovations India Pvt Ltd',
  activitiesCount = 5,
  initialSummary = null,
  onSummaryGenerated = () => {},
}) {
  const [summaryData, setSummaryData] = useState(
    initialSummary || {
      provider: 'Groq',
      model: 'llama-3.3-70b-versatile',
      summary:
        "• Technical & ATS Integration Approved: Client reviewed system architecture, approving REST API endpoints and data residency protocols.\n" +
        "• High Buying Intent with Security Focus: Decision-makers expressed strong enthusiasm, pending final verification of SOC2 audit compliance documentation.\n" +
        "• Commercial Next Steps Agreed: Account Executive to deliver updated Master Services Agreement by Friday for final leadership sign-off.",
      latencyMs: 312,
      fallbackUsed: false,
      timestamp: 'Just now',
    }
  );

  const [isLoading, setIsLoading] = useState(false);
  const [simulateOutage, setSimulateOutage] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    // Simulate AI inference call with dual-provider fallback
    try {
      await new Promise((resolve) => setTimeout(resolve, 450));

      let result;
      if (simulateOutage) {
        // Fallback triggered
        result = {
          provider: 'OpenRouter (Fallback)',
          model: 'meta-llama/llama-3.3-70b-instruct',
          summary:
            "• [OpenRouter Fallback] Architectural Scalability Confirmed: Client confirmed compatibility with recruitment webhooks and database schemas.\n" +
            "• Positive Leadership Alignment: CTO indicated agreement with proposed multi-tenant separation and data retention policies.\n" +
            "• Action Items Active: Final commercial proposal queued for procurement review with scheduled executive touchpoint.",
          latencyMs: 785,
          fallbackUsed: true,
          fallbackReason: 'Primary Groq API Outage Simulated (HTTP 503)',
          timestamp: new Date().toLocaleTimeString(),
        };
      } else {
        // Primary Groq call
        result = {
          provider: 'Groq (Primary)',
          model: 'llama-3.3-70b-versatile',
          summary:
            "• Product Demo & ATS Integration Validated: Client completed full architecture evaluation, expressing high satisfaction with pipeline automation.\n" +
            "• Strong Stakeholder Buy-in: Key engineering and HR leads endorsed platform migration timeline for Q4 rollout.\n" +
            "• Agreed Timeline: Final procurement contract delivered for formal signature following legal counsel sign-off.",
          latencyMs: 284,
          fallbackUsed: false,
          timestamp: new Date().toLocaleTimeString(),
        };
      }

      setSummaryData(result);
      onSummaryGenerated(result);
    } catch (err) {
      setErrorMessage('AI Summarization failed across both Groq and OpenRouter providers.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-summarizer-panel" data-testid="ai-summarizer-panel">
      {/* Header & Provider Telemetry Badge */}
      <div className="panel-header">
        <div className="title-group">
          <span className="ai-sparkle-icon">✨</span>
          <h4>AI Conversation Intelligence & Executive Summary</h4>
        </div>

        <div className="provider-badges">
          <span
            className={`badge-provider ${
              summaryData.fallbackUsed ? 'provider-openrouter' : 'provider-groq'
            }`}
          >
            {summaryData.provider}
          </span>
          <span className="badge-model">{summaryData.model}</span>
          <span className="badge-latency">⚡ {summaryData.latencyMs}ms</span>
        </div>
      </div>

      {/* Control bar: Generate button + Simulate Groq outage toggle */}
      <div className="panel-controls-bar">
        <div className="control-left">
          <button
            type="button"
            className="btn-trigger-ai"
            onClick={handleGenerateSummary}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Analyzing Customer Interactions...' : '✨ Regenerate AI Summary'}
          </button>
          <span className="activities-context-tag">
            Analyzed: Last {activitiesCount} Activities
          </span>
        </div>

        <div className="control-right">
          <label className="outage-toggle-label">
            <input
              type="checkbox"
              checked={simulateOutage}
              onChange={(e) => setSimulateOutage(e.target.checked)}
            />
            <span className="toggle-text">
              Simulate Groq Outage (Test OpenRouter Fallback)
            </span>
          </label>
        </div>
      </div>

      {/* Fallback Notice Banner (Conditional Rendering) */}
      {summaryData.fallbackUsed && (
        <div className="fallback-alert-banner" role="alert">
          <span className="alert-icon">ℹ️</span>
          <div className="alert-text">
            <strong>Dual-Provider Failover Triggered:</strong> {summaryData.fallbackReason}.
            Seamlessly switched to secondary model <code>{summaryData.model}</code> without service disruption.
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="alert-error" role="alert">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Summary Content Body */}
      <div className="summary-body">
        {isLoading ? (
          <div className="summary-loading-placeholder">
            <div className="spinner"></div>
            <p>Prompting Groq LLM (llama-3.3-70b-versatile) with customer activity stream...</p>
          </div>
        ) : (
          <div className="bullet-points-container">
            {summaryData.summary.split('\n').map((bullet, idx) => (
              <div key={idx} className="summary-bullet-card">
                <span className="bullet-num">{idx + 1}</span>
                <p className="bullet-text">{bullet.replace(/^[•\s-]+/, '')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Metadata */}
      <div className="panel-footer">
        <span className="footer-timestamp">
          Last Synced: {summaryData.timestamp}
        </span>
        <span className="footer-account-tag">
          Account: <strong>{accountName}</strong>
        </span>
      </div>
    </div>
  );
}

export default ConversationSummarizerPanel;
