/**
 * AccountDetailView.jsx
 * 
 * Demonstrates:
 * - useParams hook: Extracts dynamic route parameter `accountId` from `/accounts/:accountId`
 * - useNavigate hook: Programmatic navigation to go back to `/accounts` or jump to another account
 * - Link component: Declarative breadcrumb navigation
 * - Embedding ConversationSummarizerPanel with account-specific activity feeds
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from './ReactRouterComponents';
import { ConversationSummarizerPanel } from './ConversationSummarizerPanel';

export const ACCOUNT_DATABASE = {
  'acc-1': {
    id: 'acc-1',
    name: 'FinTech Innovations India Pvt Ltd',
    industry: 'Financial Services',
    type: 'Customer',
    phone: '+91-98765-43210',
    email: 'contact@fintechinnovations.in',
    website: 'https://fintechinnovations.in',
    city: 'Bengaluru',
    state: 'Karnataka',
    assignedUser: 'Murali V (Account Executive)',
    annualRevenue: '₹ 15,000,000',
    status: 'Active Customer',
    activities: [
      {
        id: 'act-101',
        type: 'Meeting',
        icon: '📅',
        date: '2026-10-24 14:30',
        subject: 'Architecture & REST API Webhook Deep Dive',
        description: 'Reviewed candidate sync webhooks and database schema compatibility. Approved REST endpoints and data residency protocols.',
        status: 'Held',
        duration: '45 mins',
      },
      {
        id: 'act-102',
        type: 'Call',
        icon: '📞',
        date: '2026-10-25 11:00',
        subject: 'Security & SOC2 Compliance Verification',
        description: 'Clarified encryption at rest (AES-256) and TLS 1.3 in-transit policies. Customer requested SOC2 Type II audit report for compliance archive.',
        status: 'Held',
        duration: '25 mins',
      },
      {
        id: 'act-103',
        type: 'Email',
        icon: '✉️',
        date: '2026-10-26 09:45',
        subject: 'Master Services Agreement & SLA Terms',
        description: 'Sent standard enterprise SLA (99.9% uptime) and custom hiring pipeline configuration options to procurement lead.',
        status: 'Archived',
        duration: 'N/A',
      },
      {
        id: 'act-104',
        type: 'Task',
        icon: '📋',
        date: '2026-10-27 16:15',
        subject: 'Prepare Sandbox API Credentials',
        description: 'Provisioned dedicated staging workspace and verified bearer token generation for candidate ingestion pipeline.',
        status: 'Completed',
        duration: '30 mins',
      },
      {
        id: 'act-105',
        type: 'Meeting',
        icon: '🤝',
        date: '2026-10-28 10:00',
        subject: 'Executive Sponsor Review & Contract Finalization',
        description: 'Presented final proposal to VP of Engineering. Received verbal commitment, awaiting signed procurement agreement by Friday.',
        status: 'Held',
        duration: '50 mins',
      },
    ],
  },
  'acc-2': {
    id: 'acc-2',
    name: 'Bengaluru Cloud Systems',
    industry: 'Cloud Infrastructure',
    type: 'Customer',
    phone: '+91-98123-45678',
    email: 'info@bengalurucloud.io',
    website: 'https://bengalurucloud.io',
    city: 'Bengaluru',
    state: 'Karnataka',
    assignedUser: 'Priya Sharma (Senior AE)',
    annualRevenue: '₹ 10,000,000',
    status: 'Active Customer',
    activities: [
      {
        id: 'act-201',
        type: 'Call',
        icon: '📞',
        date: '2026-10-22 15:00',
        subject: 'Multi-Tenant Cluster Ingestion Review',
        description: 'Evaluated Kubernetes deployment scripts and Redis caching tier.',
        status: 'Held',
        duration: '30 mins',
      },
      {
        id: 'act-202',
        type: 'Meeting',
        icon: '📅',
        date: '2026-10-24 16:30',
        subject: 'Data Retention & GDPR Compliance Consultation',
        description: 'Discussed candidate data purging rules and EspoCRM hook automation.',
        status: 'Held',
        duration: '40 mins',
      },
      {
        id: 'act-203',
        type: 'Email',
        icon: '✉️',
        date: '2026-10-25 12:15',
        subject: 'Revised Pricing Proposal - Enterprise Tier',
        description: 'Dispatched volume tier discounts for 500+ monthly technical interviews.',
        status: 'Archived',
        duration: 'N/A',
      },
      {
        id: 'act-204',
        type: 'Task',
        icon: '📋',
        date: '2026-10-26 14:00',
        subject: 'Setup Custom Interview Stages in CRM',
        description: 'Configured Screening -> Tech 1 -> Bar Raiser -> Offer stages.',
        status: 'Completed',
        duration: '45 mins',
      },
      {
        id: 'act-205',
        type: 'Call',
        icon: '📞',
        date: '2026-10-27 11:30',
        subject: 'Account Health Check & Q4 Planning',
        description: 'Confirmed satisfaction with candidate response rates; scheduled renewal discussion.',
        status: 'Held',
        duration: '20 mins',
      },
    ],
  },
  'acc-3': {
    id: 'acc-3',
    name: 'Tata Telematics Labs',
    industry: 'Telecommunications',
    type: 'Prospect',
    phone: '+91-98444-12345',
    email: 'partners@tatatelematics.com',
    website: 'https://tatatelematics.com',
    city: 'Pune',
    state: 'Maharashtra',
    assignedUser: 'Rahul Deshmukh (Sales Lead)',
    annualRevenue: '₹ 25,000,000',
    status: 'Evaluation Phase',
    activities: [
      {
        id: 'act-301',
        type: 'Meeting',
        icon: '📅',
        date: '2026-10-20 10:00',
        subject: 'Initial Discovery Call & Product Demo',
        description: 'Demonstrated EspoCRM integration with candidate feedback forms.',
        status: 'Held',
        duration: '60 mins',
      },
      {
        id: 'act-302',
        type: 'Email',
        icon: '✉️',
        date: '2026-10-22 17:00',
        subject: 'Answers to Security Questionnaire',
        description: 'Submitted 45-point cyber security compliance sheet.',
        status: 'Archived',
        duration: 'N/A',
      },
      {
        id: 'act-303',
        type: 'Call',
        icon: '📞',
        date: '2026-10-24 11:15',
        subject: 'Follow-up with Head of Talent Acquisition',
        description: 'Discussed interview workflow customizations and candidate resume summarization.',
        status: 'Held',
        duration: '30 mins',
      },
    ],
  },
};

export function AccountDetailView({ accountIdProp = null }) {
  const routeParams = useParams();
  const navigate = useNavigate();

  // Support both React Router params or direct prop injection for tests
  const targetId = accountIdProp || routeParams.accountId || 'acc-1';
  const account = ACCOUNT_DATABASE[targetId] || ACCOUNT_DATABASE['acc-1'];

  return (
    <div className="account-detail-view" data-testid="account-detail-view">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="detail-navigation-bar">
        <div className="breadcrumbs">
          <Link to="/accounts" className="breadcrumb-link" data-testid="breadcrumb-accounts">
            🏢 Accounts Directory
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current" data-testid="breadcrumb-current">
            {account.name}
          </span>
        </div>

        <div className="nav-actions">
          <button
            type="button"
            className="btn-back-directory"
            data-testid="back-button"
            onClick={() => navigate('/accounts')}
          >
            &larr; Back to Accounts (useNavigate)
          </button>
        </div>
      </div>

      {/* Account Master Profile Banner */}
      <div className="account-profile-banner" data-testid="account-banner">
        <div className="banner-main">
          <div className="account-avatar">🏢</div>
          <div className="account-meta-titles">
            <div className="name-and-status">
              <h2 data-testid="account-name">{account.name}</h2>
              <span className={`status-pill pill-${account.type.toLowerCase()}`}>
                {account.type}
              </span>
            </div>
            <p className="account-submeta">
              <strong>Industry:</strong> {account.industry} &bull;{' '}
              <strong>Location:</strong> {account.city}, {account.state} &bull;{' '}
              <strong>Revenue:</strong> {account.annualRevenue}
            </p>
          </div>
        </div>

        <div className="banner-details-grid">
          <div className="meta-box">
            <span className="meta-label">Primary Phone</span>
            <span className="meta-value">{account.phone}</span>
          </div>
          <div className="meta-box">
            <span className="meta-label">Work Email</span>
            <span className="meta-value">{account.email}</span>
          </div>
          <div className="meta-box">
            <span className="meta-label">Assigned Representative</span>
            <span className="meta-value">{account.assignedUser}</span>
          </div>
          <div className="meta-box">
            <span className="meta-label">Total Activities</span>
            <span className="meta-value">{account.activities.length} Recorded</span>
          </div>
        </div>
      </div>

      {/* AI Conversation Summarizer Panel (Groq + OpenRouter) */}
      <ConversationSummarizerPanel
        accountName={account.name}
        activitiesCount={account.activities.length}
      />

      {/* Account Recent Activities Stream (Last 5 Interactions) */}
      <div className="activities-stream-card" data-testid="activities-stream-card">
        <div className="stream-header">
          <div className="stream-title">
            <h3>Recent Customer Interactions &amp; Logged Activities</h3>
            <p className="stream-subtitle">
              Source feeds ingested by EspoCRM <code>ConversationSummarizerHook</code> to generate executive bullets.
            </p>
          </div>
          <span className="stream-badge">{account.activities.length} Recent Touchpoints</span>
        </div>

        <div className="activity-timeline">
          {account.activities.map((act, index) => (
            <div key={act.id} className="timeline-item" data-testid="activity-item">
              <div className="item-marker">
                <span className="marker-icon">{act.icon}</span>
                {index < account.activities.length - 1 && <span className="marker-line"></span>}
              </div>

              <div className="item-content">
                <div className="item-heading">
                  <span className="item-type-badge">{act.type}</span>
                  <h4 className="item-subject">{act.subject}</h4>
                  <span className="item-date">{act.date}</span>
                </div>
                <p className="item-description">{act.description}</p>
                <div className="item-footer">
                  <span className="footer-status">Status: <strong>{act.status}</strong></span>
                  {act.duration !== 'N/A' && (
                    <span className="footer-duration">Duration: {act.duration}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Navigation Switcher demonstrating useNavigate & Link */}
      <div className="account-switcher-footer" data-testid="account-switcher">
        <span className="switcher-label">Switch Account Route (Demonstrating React Router):</span>
        <div className="switcher-links">
          {Object.keys(ACCOUNT_DATABASE).map((id) => (
            <button
              key={id}
              type="button"
              className={`btn-switcher ${id === targetId ? 'active' : ''}`}
              data-testid={`switch-to-${id}`}
              onClick={() => navigate(`/accounts/${id}`)}
            >
              {ACCOUNT_DATABASE[id].name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AccountDetailView;
