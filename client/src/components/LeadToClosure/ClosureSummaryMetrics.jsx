/**
 * ClosureSummaryMetrics Component
 * 
 * Demonstrates:
 * - Functional component design
 * - Receiving computed pipeline metrics strictly via props (Unidirectional Data Flow)
 * - Pure presentation without internal side-effects or state mutation
 */

import React from 'react';

export function ClosureSummaryMetrics({
  totalLeads = 0,
  convertedLeads = 0,
  totalOpportunities = 0,
  closedWonCount = 0,
  totalWonRevenue = 0,
  totalPipelineValue = 0,
}) {
  const conversionRate = totalLeads > 0 
    ? ((convertedLeads / totalLeads) * 100).toFixed(1) 
    : '0.0';

  const winRate = totalOpportunities > 0 
    ? ((closedWonCount / totalOpportunities) * 100).toFixed(1) 
    : '0.0';

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="closure-metrics-grid" data-testid="closure-metrics">
      <div className="metric-card metric-leads">
        <span className="metric-label">Lead Conversion Rate</span>
        <span className="metric-value">{conversionRate}%</span>
        <span className="metric-subtext">{convertedLeads} of {totalLeads} Converted</span>
      </div>

      <div className="metric-card metric-pipeline">
        <span className="metric-label">Total Pipeline Value</span>
        <span className="metric-value">{formatCurrency(totalPipelineValue)}</span>
        <span className="metric-subtext">{totalOpportunities} Active Deals</span>
      </div>

      <div className="metric-card metric-won">
        <span className="metric-label">Closed Won Revenue</span>
        <span className="metric-value">{formatCurrency(totalWonRevenue)}</span>
        <span className="metric-subtext">{closedWonCount} Deals Won ({winRate}% Win Rate)</span>
      </div>
    </div>
  );
}

export default ClosureSummaryMetrics;
