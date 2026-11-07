/**
 * OpportunityCard Component
 * 
 * Demonstrates:
 * - Functional component composing deal stage progression
 * - Props receiving opportunity details, stages whitelist, and stage transition handler
 * - Controlled select input respecting unidirectional state flow
 */

import React from 'react';

export function OpportunityCard({
  opportunity = {},
  stages = [],
  isSelected = false,
  onSelect = () => {},
  onStageChange = () => {},
  onLogActivity = () => {},
}) {
  const {
    id = '',
    name = 'Unnamed Deal',
    accountName = 'Unknown Account',
    amount = 0,
    stage = 'Prospecting',
    probability = 10,
    closeDate = '',
  } = opportunity;

  const isWon = stage === 'Closed Won';
  const isLost = stage === 'Closed Lost';

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div
      className={`opportunity-card ${isSelected ? 'selected' : ''} ${isWon ? 'card-won' : ''} ${isLost ? 'card-lost' : ''}`}
      onClick={() => onSelect(opportunity)}
      data-testid={`opportunity-card-${id}`}
    >
      <div className="opp-header">
        <h4 className="opp-title">{name}</h4>
        <span className="opp-account">{accountName}</span>
      </div>

      <div className="opp-metrics-row">
        <div className="metric-item">
          <span className="label">Amount:</span>
          <span className="value-amount">{formatCurrency(amount)}</span>
        </div>
        <div className="metric-item">
          <span className="label">Probability:</span>
          <span className="value-prob">{probability}%</span>
        </div>
      </div>

      <div className="opp-stage-selector" onClick={(e) => e.stopPropagation()}>
        <label htmlFor={`stage-select-${id}`}>Stage:</label>
        <select
          id={`stage-select-${id}`}
          value={stage}
          disabled={isWon || isLost}
          onChange={(e) => onStageChange(id, e.target.value)}
        >
          {stages.map((stg) => (
            <option key={stg} value={stg}>
              {stg}
            </option>
          ))}
        </select>
      </div>

      <div className="opp-footer">
        <span className="close-date">Target: {closeDate || 'TBD'}</span>
        <button
          className="btn-activity"
          onClick={(e) => {
            e.stopPropagation();
            onLogActivity(id);
          }}
        >
          + Log Activity
        </button>
      </div>
    </div>
  );
}

export default OpportunityCard;
