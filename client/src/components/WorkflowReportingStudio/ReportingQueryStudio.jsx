/**
 * ReportingQueryStudio Component
 * 
 * Demonstrates:
 * 1. Component State with useState:
 *    - reportName, targetEntity, groupByDimension, measureFunction, measureField, filterCriteria, reportOutput, isComputing
 * 2. Controlled Inputs:
 *    - Dimension selector, Aggregate measure function, Numeric field picker, Filter dropdown
 * 3. Conditional Rendering:
 *    - Conditionally displays Measure Field dropdown ONLY when measureFunction requires a numeric attribute (SUM, AVG, MAX, MIN)
 *    - Conditionally renders data visualization table vs empty state instructions
 *    - Conditionally displays calculation spinner and grand totals
 */

import React, { useState } from 'react';

const ENTITY_CONFIG = {
  Opportunity: {
    dimensions: ['stage', 'source', 'assignedUser'],
    numericFields: ['amount', 'probability'],
    defaultDimension: 'stage',
    defaultNumeric: 'amount',
    sampleData: [
      { id: 1, stage: 'Prospecting', source: 'Web', amount: 500000, probability: 10 },
      { id: 2, stage: 'Qualification', source: 'Referral', amount: 800000, probability: 25 },
      { id: 3, stage: 'Proposal/Price Quote', source: 'Campaign', amount: 1250000, probability: 75 },
      { id: 4, stage: 'Proposal/Price Quote', source: 'Web', amount: 950000, probability: 75 },
      { id: 5, stage: 'Negotiation/Review', source: 'Direct', amount: 1400000, probability: 90 },
      { id: 6, stage: 'Closed Won', source: 'Web', amount: 1250000, probability: 100 },
      { id: 7, stage: 'Closed Won', source: 'Referral', amount: 1800000, probability: 100 },
    ],
  },
  Lead: {
    dimensions: ['source', 'status', 'country'],
    numericFields: ['daysToConvert'],
    defaultDimension: 'source',
    defaultNumeric: 'daysToConvert',
    sampleData: [
      { id: 10, source: 'Web Site', status: 'Converted', daysToConvert: 4 },
      { id: 11, source: 'Web Site', status: 'In Process', daysToConvert: 2 },
      { id: 12, source: 'Campaign', status: 'Converted', daysToConvert: 7 },
      { id: 13, source: 'Referral', status: 'Converted', daysToConvert: 1 },
      { id: 14, source: 'Campaign', status: 'New', daysToConvert: 0 },
    ],
  },
  JobApplicant: {
    dimensions: ['pipelineStage', 'experienceYears'],
    numericFields: ['experienceYears'],
    defaultDimension: 'pipelineStage',
    defaultNumeric: 'experienceYears',
    sampleData: [
      { id: 101, pipelineStage: 'Screening', experienceYears: 2 },
      { id: 102, pipelineStage: 'Technical Round 1', experienceYears: 4 },
      { id: 103, pipelineStage: 'Technical Round 2', experienceYears: 6 },
      { id: 104, pipelineStage: 'HR Round', experienceYears: 5 },
      { id: 105, pipelineStage: 'Offered', experienceYears: 3 },
    ],
  },
};

export function ReportingQueryStudio() {
  // 1. Component State Management with useState
  const [reportName, setReportName] = useState('Sales Pipeline Velocity & Revenue Funnel');
  const [targetEntity, setTargetEntity] = useState('Opportunity');
  const [dimension, setDimension] = useState('stage');
  const [measureFunc, setMeasureFunc] = useState('SUM');
  const [measureField, setMeasureField] = useState('amount');
  const [reportOutput, setReportOutput] = useState(null);
  const [isComputing, setIsComputing] = useState(false);

  // 2. Entity Change Handler
  const handleEntityChange = (newEntity) => {
    setTargetEntity(newEntity);
    const conf = ENTITY_CONFIG[newEntity];
    setDimension(conf.defaultDimension);
    setMeasureField(conf.defaultNumeric);
    setReportOutput(null); // Clear previous output
  };

  // 3. Analytical Query Execution
  const handleRunReport = (e) => {
    e.preventDefault();
    setIsComputing(true);

    // Simulate analytical query aggregation
    setTimeout(() => {
      const entityConf = ENTITY_CONFIG[targetEntity];
      const records = entityConf.sampleData;

      // Group records by chosen dimension
      const groups = {};
      records.forEach((rec) => {
        const key = rec[dimension] ?? 'Unassigned';
        if (!groups[key]) {
          groups[key] = { group: key, count: 0, sum: 0, values: [] };
        }
        groups[key].count++;
        const val = rec[measureField] ?? 0;
        groups[key].sum += val;
        groups[key].values.push(val);
      });

      // Calculate measure value per group
      const rows = Object.keys(groups).map((key) => {
        const item = groups[key];
        let val = 0;
        if (measureFunc === 'COUNT') {
          val = item.count;
        } else if (measureFunc === 'SUM') {
          val = item.sum;
        } else if (measureFunc === 'AVG') {
          val = item.count > 0 ? item.sum / item.count : 0;
        } else if (measureFunc === 'MAX') {
          val = Math.max(...item.values);
        } else if (measureFunc === 'MIN') {
          val = Math.min(...item.values);
        }
        return {
          dimensionValue: key,
          count: item.count,
          computedMeasure: Math.round(val),
        };
      });

      // Sort descending
      rows.sort((a, b) => b.computedMeasure - a.computedMeasure);

      const grandTotal = rows.reduce((acc, r) => acc + r.computedMeasure, 0);

      setReportOutput({
        reportName,
        targetEntity,
        dimension,
        measureExpression: `${measureFunc}(${measureFunc === 'COUNT' ? 'id' : measureField})`,
        rows,
        grandTotal,
        totalRecords: records.length,
      });

      setIsComputing(false);
    }, 250);
  };

  const currentEntityConfig = ENTITY_CONFIG[targetEntity] || ENTITY_CONFIG.Opportunity;
  const requiresNumericField = measureFunc !== 'COUNT';

  const formatMeasure = (val) => {
    if (measureField === 'amount' && requiresNumericField) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(val);
    }
    return val.toLocaleString();
  };

  return (
    <div className="reporting-query-studio" data-testid="reporting-studio">
      <div className="studio-header">
        <h3>Enterprise Reporting Engine & Analytics Studio</h3>
        <p className="subtitle">Formulate analytical dimensional reports with aggregate SQL functions (SUM, AVG, COUNT, MIN, MAX).</p>
      </div>

      <form onSubmit={handleRunReport} className="report-config-form">
        <div className="form-row">
          <div className="form-group flex-2">
            <label htmlFor="report-name-input">Report Title:</label>
            {/* Controlled Text Input */}
            <input
              id="report-name-input"
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
            />
          </div>

          <div className="form-group flex-1">
            <label htmlFor="report-entity-select">Target Entity:</label>
            {/* Controlled Select Input */}
            <select
              id="report-entity-select"
              value={targetEntity}
              onChange={(e) => handleEntityChange(e.target.value)}
            >
              <option value="Opportunity">Opportunity</option>
              <option value="Lead">Lead</option>
              <option value="JobApplicant">JobApplicant</option>
            </select>
          </div>

          <div className="form-group flex-1">
            <label htmlFor="dimension-select">Group By (Dimension):</label>
            {/* Controlled Select Input */}
            <select
              id="dimension-select"
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
            >
              {currentEntityConfig.dimensions.map((dim) => (
                <option key={dim} value={dim}>{dim}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group flex-1">
            <label htmlFor="measure-func-select">Aggregate Function:</label>
            {/* Controlled Select Input */}
            <select
              id="measure-func-select"
              value={measureFunc}
              onChange={(e) => setMeasureFunc(e.target.value)}
            >
              <option value="SUM">SUM (Total Value)</option>
              <option value="AVG">AVG (Average Value)</option>
              <option value="COUNT">COUNT (Record Frequency)</option>
              <option value="MAX">MAX (Maximum)</option>
              <option value="MIN">MIN (Minimum)</option>
            </select>
          </div>

          {/* Conditional Rendering: Only show measureField dropdown when measureFunc is not COUNT */}
          {requiresNumericField ? (
            <div className="form-group flex-1">
              <label htmlFor="measure-field-select">Target Measure Field:</label>
              <select
                id="measure-field-select"
                value={measureField}
                onChange={(e) => setMeasureField(e.target.value)}
              >
                {currentEntityConfig.numericFields.map((fld) => (
                  <option key={fld} value={fld}>{fld}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group flex-1 field-placeholder">
              <label>Target Measure Field:</label>
              <div className="placeholder-box">Counting Primary Key: <code>id</code></div>
            </div>
          )}

          <div className="form-group flex-1 form-btn-container">
            <button
              type="submit"
              className="btn-run-report"
              disabled={isComputing}
            >
              {isComputing ? '⏳ Calculating Query...' : '🚀 Execute Analytics Report'}
            </button>
          </div>
        </div>
      </form>

      {/* Conditional Rendering: Report Results Output */}
      {isComputing ? (
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Compiling multi-dimensional aggregation query in memory...</p>
        </div>
      ) : reportOutput ? (
        <div className="report-results-panel">
          <div className="results-kpi-bar">
            <div className="kpi-box">
              <span className="kpi-label">Report Dimension</span>
              <span className="kpi-val">{reportOutput.dimension}</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-label">Measure Formula</span>
              <span className="kpi-val">{reportOutput.measureExpression}</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-label">Records Analyzed</span>
              <span className="kpi-val">{reportOutput.totalRecords} records</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-label">Aggregated Grand Total</span>
              <span className="kpi-val text-primary">{formatMeasure(reportOutput.grandTotal)}</span>
            </div>
          </div>

          <table className="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Dimension ({reportOutput.dimension})</th>
                <th>Record Count</th>
                <th>Calculated {reportOutput.measureExpression}</th>
                <th>Share of Total</th>
              </tr>
            </thead>
            <tbody>
              {reportOutput.rows.map((row, idx) => {
                const pct = reportOutput.grandTotal > 0
                  ? ((row.computedMeasure / reportOutput.grandTotal) * 100).toFixed(1)
                  : '0.0';
                return (
                  <tr key={row.dimensionValue}>
                    <td>{idx + 1}</td>
                    <td className="font-semibold">{row.dimensionValue}</td>
                    <td>{row.count}</td>
                    <td className="font-mono">{formatMeasure(row.computedMeasure)}</td>
                    <td className="share-cell">
                      <div className="pct-bar-bg">
                        <div className="pct-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }}></div>
                      </div>
                      <span className="pct-text">{pct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="report-empty-placeholder">
          <p>Configure parameters above and click <strong>"Execute Analytics Report"</strong> to generate the live aggregate data grid.</p>
        </div>
      )}
    </div>
  );
}

export default ReportingQueryStudio;
