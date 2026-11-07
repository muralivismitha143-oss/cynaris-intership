/**
 * WorkflowReportingDashboard Component
 * 
 * Demonstrates:
 * - Master-detail dashboard combining Workflow Rule Builder and Reporting Query Studio
 * - Component state management with useState for active sub-tab switching
 * - Controlled input search / filtering
 * - Conditional rendering of active studio view
 */

import React, { useState } from 'react';
import WorkflowRuleBuilder from './WorkflowRuleBuilder';
import ReportingQueryStudio from './ReportingQueryStudio';

export function WorkflowReportingDashboard() {
  const [activeStudio, setActiveStudio] = useState('workflow'); // 'workflow' | 'reporting'
  const [savedRulesCount, setSavedRulesCount] = useState(3);

  const handleRuleSaved = (rule) => {
    setSavedRulesCount((prev) => prev + 1);
  };

  return (
    <div className="workflow-reporting-dashboard" data-testid="wr-dashboard">
      <div className="studio-subnav">
        <div className="subnav-left">
          <button
            className={`subnav-btn ${activeStudio === 'workflow' ? 'active-subnav' : ''}`}
            onClick={() => setActiveStudio('workflow')}
          >
            ⚙️ Workflow Rule Builder ({savedRulesCount} Active)
          </button>
          <button
            className={`subnav-btn ${activeStudio === 'reporting' ? 'active-subnav' : ''}`}
            onClick={() => setActiveStudio('reporting')}
          >
            📈 Analytical Reporting Engine
          </button>
        </div>

        <div className="subnav-right">
          <span className="live-engine-tag">
            <span className="pulsing-green-dot"></span> CRM Engine v8.3 Online
          </span>
        </div>
      </div>

      <div className="studio-body">
        {/* Conditional Rendering between Workflow and Reporting */}
        {activeStudio === 'workflow' ? (
          <WorkflowRuleBuilder onSaveRule={handleRuleSaved} />
        ) : (
          <ReportingQueryStudio />
        )}
      </div>
    </div>
  );
}

export default WorkflowReportingDashboard;
