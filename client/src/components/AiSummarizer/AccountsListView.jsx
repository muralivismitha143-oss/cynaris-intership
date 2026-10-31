/**
 * AccountsListView Component
 * 
 * Demonstrates:
 * - Client-side Routing with React Router:
 *   - Declarative navigation with <Link to={`/accounts/${account.id}`} />
 *   - Programmatic navigation with useNavigate()
 *   - Transitioning between views without full-page reloads
 * - Master-detail list view for CRM Accounts
 */

import React from 'react';
import { Link, useNavigate } from './ReactRouterComponents';

export const MOCK_ACCOUNTS = [
  {
    id: 'acc-1',
    name: 'FinTech Innovations India Pvt Ltd',
    industry: 'Financial Services',
    type: 'Customer',
    phone: '+91-98765-43210',
    city: 'Bengaluru',
    activitiesCount: 18,
    annualRevenue: '₹ 15,000,000',
    hasAiSummary: true,
  },
  {
    id: 'acc-2',
    name: 'Bengaluru Cloud Systems',
    industry: 'Cloud Infrastructure',
    type: 'Customer',
    phone: '+91-98123-45678',
    city: 'Bengaluru',
    activitiesCount: 13,
    annualRevenue: '₹ 10,000,000',
    hasAiSummary: true,
  },
  {
    id: 'acc-3',
    name: 'Tata Telematics Labs',
    industry: 'Telecommunications',
    type: 'Prospect',
    phone: '+91-98444-12345',
    city: 'Pune',
    activitiesCount: 10,
    annualRevenue: '₹ 25,000,000',
    hasAiSummary: false,
  },
  {
    id: 'acc-4',
    name: 'Infosys FinServe Division',
    industry: 'Enterprise Software',
    type: 'Customer',
    phone: '+91-98333-78901',
    city: 'Hyderabad',
    activitiesCount: 6,
    annualRevenue: '₹ 50,000,000',
    hasAiSummary: true,
  },
];

export function AccountsListView({ onSelectAccount }) {
  const navigate = useNavigate();

  const handleCardClick = (accountId) => {
    if (onSelectAccount) {
      onSelectAccount(accountId);
    } else {
      navigate(`/accounts/${accountId}`);
    }
  };

  return (
    <div className="accounts-list-view" data-testid="accounts-list-view">
      <div className="view-header">
        <div className="header-titles">
          <h3>CRM Accounts Directory</h3>
          <p className="subtitle">
            Select an account to view company details, customer activity logs, and the AI Conversation Summarizer.
          </p>
        </div>
        <div className="header-stats">
          <span className="stats-tag">{MOCK_ACCOUNTS.length} Accounts Registered</span>
        </div>
      </div>

      <div className="accounts-cards-grid">
        {MOCK_ACCOUNTS.map((acc) => (
          <div
            key={acc.id}
            className="account-summary-card"
            data-testid={`account-card-${acc.id}`}
            onClick={() => handleCardClick(acc.id)}
          >
            <div className="card-top">
              <span className="company-icon">🏢</span>
              <div className="company-info">
                <h4 className="company-name">{acc.name}</h4>
                <span className="company-meta">{acc.industry} &bull; {acc.city}</span>
              </div>
              <span className={`type-badge type-${acc.type.toLowerCase()}`}>
                {acc.type}
              </span>
            </div>

            <div className="card-mid">
              <div className="mid-item">
                <span className="mid-label">Phone:</span>
                <span className="mid-val">{acc.phone}</span>
              </div>
              <div className="mid-item">
                <span className="mid-label">Revenue:</span>
                <span className="mid-val">{acc.annualRevenue}</span>
              </div>
            </div>

            <div className="card-bottom">
              <span className="activity-count-tag">
                📊 {acc.activitiesCount} Activities Logged
              </span>
              <Link
                to={`/accounts/${acc.id}`}
                className="btn-view-account"
                data-testid={`link-account-${acc.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick(acc.id);
                }}
              >
                View Account &amp; AI Summary &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AccountsListView;
