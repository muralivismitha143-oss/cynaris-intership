/**
 * ActivityDashboardContainer Component
 * 
 * Demonstrates:
 * - Integration of the custom ActivitySummaryDashlet within the full-stack CRM view
 * - State management with useState and useEffect
 * - Dynamic tab navigation and activity insights breakdown
 */

import React, { useState } from 'react';
import ActivitySummaryDashlet from './ActivitySummaryDashlet';

export function ActivityDashboardContainer() {
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'sql'
  const [selectedRange, setSelectedRange] = useState('30');

  const sqlQuerySample = `SELECT 
    a.id AS account_id,
    a.name AS account_name,
    act.type AS activity_type,
    COUNT(act.id) AS activity_count,
    MAX(act.date_start) AS latest_activity_date
FROM account a
JOIN (
    SELECT id, name, 'Call' AS type, date_start, parent_id, parent_type 
    FROM \`call\` 
    WHERE date_start >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND deleted = 0
    UNION ALL
    SELECT id, name, 'Meeting' AS type, date_start, parent_id, parent_type 
    FROM meeting 
    WHERE date_start >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND deleted = 0
    UNION ALL
    SELECT id, name, 'Email' AS type, date_sent AS date_start, parent_id, parent_type 
    FROM email 
    WHERE date_sent >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND deleted = 0
) act ON act.parent_id = a.id AND act.parent_type = 'Account'
WHERE a.deleted = 0
GROUP BY a.id, a.name, act.type
ORDER BY a.name ASC, activity_count DESC;`;

  return (
    <div className="activity-dashboard-container" data-testid="activity-dashboard-container">
      {/* Top Banner */}
      <div className="activity-banner">
        <div className="banner-titles">
          <h3>Activity Intelligence & Reporting Extension</h3>
          <p className="subtitle">
            Enterprise analytics querying polymorphic CRM activity entities (Calls, Meetings, Emails) across Accounts.
          </p>
        </div>

        <div className="tab-pill-group">
          <button
            className={`pill-btn ${activeTab === 'chart' ? 'pill-active' : ''}`}
            onClick={() => setActiveTab('chart')}
          >
            📊 Visual Bar Dashlet
          </button>
          <button
            className={`pill-btn ${activeTab === 'sql' ? 'pill-active' : ''}`}
            onClick={() => setActiveTab('sql')}
          >
            🔍 SQL Query & Execution Plan
          </button>
        </div>
      </div>

      {/* Main View: Visual Dashlet vs SQL Query Inspector */}
      {activeTab === 'chart' ? (
        <div className="dashlet-wrapper">
          <ActivitySummaryDashlet defaultTimeRange={selectedRange} autoRefreshIntervalSec={30} />
        </div>
      ) : (
        <div className="sql-inspector-card">
          <div className="inspector-header">
            <h4>Raw EspoCRM Reporting Query (MySQL 8.0)</h4>
            <span className="badge-tag">Optimized UNION ALL</span>
          </div>

          <pre className="code-block">
            <code>{sqlQuerySample}</code>
          </pre>

          <div className="query-notes-grid">
            <div className="note-card">
              <h5>⚡ Sargable Date Range</h5>
              <p>Uses <code>date_start &gt;= DATE_SUB(NOW(), INTERVAL 30 DAY)</code> directly against the indexed timestamp column, avoiding full table scans.</p>
            </div>
            <div className="note-card">
              <h5>🔗 Polymorphic Parent Match</h5>
              <p>Joins on <code>parent_id = a.id AND parent_type = 'Account'</code> to leverage composite indexes on polymorphic foreign keys.</p>
            </div>
            <div className="note-card">
              <h5>🚀 Non-blocking UNION ALL</h5>
              <p>Employs <code>UNION ALL</code> rather than <code>UNION</code> to eliminate costly duplicate elimination sort buffers.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityDashboardContainer;
