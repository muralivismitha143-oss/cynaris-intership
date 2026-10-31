/**
 * LeadCard Component
 * 
 * Demonstrates:
 * - Functional presentation component
 * - Receiving data through read-only props
 * - Emitting user actions upward via callback props (`onConvert`, `onSelect`)
 * - Respects unidirectional data flow: never modifies lead object directly
 */

import React from 'react';

export function LeadCard({
  lead = {},
  isSelected = false,
  onSelect = () => {},
  onConvert = () => {},
}) {
  const {
    id = '',
    name = 'Unnamed Lead',
    accountName = 'Unknown Company',
    email = '',
    phone = '',
    source = 'Web',
    status = 'New',
  } = lead;

  const statusBadgeMap = {
    'New': 'badge-new',
    'Assigned': 'badge-assigned',
    'In Process': 'badge-in-process',
    'Converted': 'badge-converted',
    'Dead': 'badge-dead',
  };

  const isConverted = status === 'Converted';

  return (
    <div
      className={`lead-card ${isSelected ? 'selected' : ''} ${isConverted ? 'lead-converted' : ''}`}
      onClick={() => onSelect(lead)}
      data-testid={`lead-card-${id}`}
    >
      <div className="lead-card-header">
        <div className="lead-identity">
          <h4 className="lead-name">{name}</h4>
          <span className="lead-company">{accountName}</span>
        </div>
        <span className={`status-pill ${statusBadgeMap[status] || 'badge-default'}`}>
          {status}
        </span>
      </div>

      <div className="lead-card-body">
        <p className="lead-contact-line">📧 {email || 'No email provided'}</p>
        <p className="lead-contact-line">📞 {phone || 'No phone provided'}</p>
        <span className="lead-source-tag">Source: {source}</span>
      </div>

      <div className="lead-card-footer">
        {!isConverted ? (
          <button
            className="btn-convert"
            onClick={(e) => {
              e.stopPropagation(); // Avoid triggering onSelect
              onConvert(id);
            }}
          >
            Convert to Deal &rarr;
          </button>
        ) : (
          <span className="converted-badge">✓ Converted to Customer</span>
        )}
      </div>
    </div>
  );
}

export default LeadCard;
