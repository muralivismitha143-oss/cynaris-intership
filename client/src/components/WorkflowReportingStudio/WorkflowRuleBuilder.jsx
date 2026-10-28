/**
 * WorkflowRuleBuilder Component
 * 
 * Demonstrates:
 * 1. Managing Component State with useState:
 *    - ruleName, entityType, triggerType, isActive, conditions, actionConfig, executionLog, validationError
 * 2. Handlers for State Updates:
 *    - Immutable condition row appending, removal, and field-level updates
 * 3. Controlled Inputs:
 *    - All form elements (text, select, checkbox, number) bound to state with value/onChange
 * 4. Conditional Rendering:
 *    - Conditional action parameters (Email vs Task vs Webhook vs Entity Update)
 *    - Empty state banners and validation alerts
 *    - Execution trace visualization
 */

import React, { useState } from 'react';

const ENTITY_FIELDS = {
  Lead: ['status', 'source', 'accountName', 'emailAddress', 'country'],
  Opportunity: ['stage', 'amount', 'probability', 'closeDate'],
  Account: ['type', 'industry', 'annualRevenue'],
  JobApplicant: ['pipelineStage', 'experienceYears', 'aiResumeSummary'],
};

const OPERATORS = [
  { value: 'equals', label: 'Equals (=)' },
  { value: 'notEquals', label: 'Not Equals (!=)' },
  { value: 'greaterThan', label: 'Greater Than (>)' },
  { value: 'greaterThanOrEqual', label: 'Greater Than or Equal (>=)' },
  { value: 'lessThan', label: 'Less Than (<)' },
  { value: 'notEmpty', label: 'Is Not Empty' },
  { value: 'in', label: 'Is In Whitelist' },
];

export function WorkflowRuleBuilder({ onSaveRule = () => {} }) {
  // 1. Component State Management via useState
  const [ruleName, setRuleName] = useState('High-Value Deal Executive Alert');
  const [entityType, setEntityType] = useState('Opportunity');
  const [triggerType, setTriggerType] = useState('afterSave');
  const [isActive, setIsActive] = useState(true);
  const [actionType, setActionType] = useState('createTask');

  // Multi-attribute condition rows state
  const [conditions, setConditions] = useState([
    { id: 1, field: 'stage', operator: 'equals', value: 'Proposal/Price Quote' },
    { id: 2, field: 'amount', operator: 'greaterThanOrEqual', value: '1000000' },
  ]);

  // Action configuration state
  const [actionConfig, setActionConfig] = useState({
    taskSubject: 'Schedule Executive Sponsorship Call',
    taskPriority: 'High',
    emailTemplate: 'enterprise_high_value_deal',
    emailRecipient: 'vp_sales@cynaris.com',
    targetField: 'stage',
    targetValue: 'Negotiation/Review',
    webhookUrl: 'https://api.cynaris.com/v1/deal-alerts',
  });

  const [validationError, setValidationError] = useState('');
  const [simulationLog, setSimulationLog] = useState(null);

  // 2. State Update Handlers
  const handleAddCondition = () => {
    const fields = ENTITY_FIELDS[entityType] || [];
    const newCondition = {
      id: Date.now(),
      field: fields[0] || 'status',
      operator: 'equals',
      value: '',
    };
    // Immutable array state update
    setConditions((prev) => [...prev, newCondition]);
  };

  const handleRemoveCondition = (id) => {
    // Immutable removal
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleConditionChange = (id, prop, val) => {
    // Immutable item update via .map()
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [prop]: val } : c))
    );
  };

  const handleActionConfigChange = (prop, val) => {
    setActionConfig((prev) => ({ ...prev, [prop]: val }));
  };

  const handleEntityChange = (newEntity) => {
    setEntityType(newEntity);
    // Reset conditions when entity changes to maintain schema integrity
    const firstField = ENTITY_FIELDS[newEntity]?.[0] || 'status';
    setConditions([{ id: Date.now(), field: firstField, operator: 'equals', value: '' }]);
  };

  // 3. Rule Submission & Validation
  const handleSave = (e) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      setValidationError('Workflow rule name cannot be empty.');
      return;
    }
    setValidationError('');

    const ruleData = {
      id: `rule-${Date.now()}`,
      name: ruleName,
      entityType,
      triggerType,
      isActive,
      conditions,
      action: {
        type: actionType,
        config: actionConfig,
      },
    };

    onSaveRule(ruleData);
    setSimulationLog({
      timestamp: new Date().toLocaleTimeString(),
      status: 'Active & Verified',
      message: `Rule '${ruleName}' successfully registered and primed for triggers.`,
    });
  };

  const availableFields = ENTITY_FIELDS[entityType] || [];

  return (
    <div className="workflow-rule-builder" data-testid="workflow-rule-builder">
      <div className="builder-header">
        <div className="header-titles">
          <h3>Workflow Rule Builder</h3>
          <p className="subtitle">Configure automated event triggers, condition filters, and action dispatches.</p>
        </div>
        <div className="active-toggle-container">
          <label className="toggle-switch">
            {/* Controlled Checkbox Input */}
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
          {/* Conditional Rendering based on isActive */}
          <span className={`status-badge-state ${isActive ? 'state-active' : 'state-inactive'}`}>
            {isActive ? 'RULE ENABLED' : 'RULE DISABLED'}
          </span>
        </div>
      </div>

      {/* Conditional Validation Alert */}
      {validationError && (
        <div className="alert-error" role="alert">
          ⚠️ {validationError}
        </div>
      )}

      <form onSubmit={handleSave} className="rule-form">
        {/* Section 1: Basic Rule Configuration */}
        <div className="form-section">
          <h4>1. Trigger Definition</h4>
          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="rule-name-input">Rule Name:</label>
              {/* Controlled Text Input */}
              <input
                id="rule-name-input"
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. Inactivity Reminder for Open Leads"
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="entity-select">Target Entity:</label>
              {/* Controlled Select Input */}
              <select
                id="entity-select"
                value={entityType}
                onChange={(e) => handleEntityChange(e.target.value)}
              >
                <option value="Opportunity">Opportunity (Deals)</option>
                <option value="Lead">Lead (Prospects)</option>
                <option value="Account">Account (Customers)</option>
                <option value="JobApplicant">JobApplicant (Recruitment)</option>
              </select>
            </div>

            <div className="form-group flex-1">
              <label htmlFor="trigger-select">Execution Trigger:</label>
              {/* Controlled Select Input */}
              <select
                id="trigger-select"
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
              >
                <option value="afterCreate">After Record Created</option>
                <option value="afterSave">After Record Modified</option>
                <option value="scheduled">Time-Based (Cron Daily)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Conditions Engine */}
        <div className="form-section">
          <div className="section-header-row">
            <h4>2. Evaluated Conditions (AND Logic)</h4>
            <button
              type="button"
              className="btn-add-condition"
              onClick={handleAddCondition}
            >
              + Add Condition
            </button>
          </div>

          {/* Conditional Rendering: Empty State vs Condition Rows */}
          {conditions.length === 0 ? (
            <div className="empty-conditions-alert">
              <span>⚠️ No conditions configured. This rule will trigger on <strong>ALL</strong> {entityType} events unconditionally.</span>
            </div>
          ) : (
            <div className="conditions-table-container">
              {conditions.map((cond, index) => (
                <div key={cond.id} className="condition-row">
                  <span className="row-prefix">{index === 0 ? 'WHEN' : 'AND'}</span>
                  
                  {/* Controlled Select: Field */}
                  <select
                    value={cond.field}
                    onChange={(e) => handleConditionChange(cond.id, 'field', e.target.value)}
                  >
                    {availableFields.map((fld) => (
                      <option key={fld} value={fld}>{fld}</option>
                    ))}
                  </select>

                  {/* Controlled Select: Operator */}
                  <select
                    value={cond.operator}
                    onChange={(e) => handleConditionChange(cond.id, 'operator', e.target.value)}
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>

                  {/* Controlled Text Input: Value */}
                  <input
                    type="text"
                    value={cond.value}
                    placeholder="Comparison value..."
                    onChange={(e) => handleConditionChange(cond.id, 'value', e.target.value)}
                  />

                  <button
                    type="button"
                    className="btn-remove-row"
                    onClick={() => handleRemoveCondition(cond.id)}
                    title="Remove this condition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Action Dispatcher (Demonstrates Conditional Rendering) */}
        <div className="form-section">
          <h4>3. Action Execution</h4>
          <div className="form-group action-type-group">
            <label htmlFor="action-type-select">Action Type:</label>
            <select
              id="action-type-select"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
            >
              <option value="createTask">Create Follow-up Task</option>
              <option value="sendEmail">Send Templated Email</option>
              <option value="updateEntity">Update Entity Field</option>
              <option value="triggerWebhook">Dispatch Outbound Webhook</option>
            </select>
          </div>

          {/* Conditional Rendering: Action-Specific Form Controls */}
          {actionType === 'createTask' && (
            <div className="conditional-action-panel action-task">
              <h5>📝 Task Creation Parameters</h5>
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Task Subject:</label>
                  <input
                    type="text"
                    value={actionConfig.taskSubject}
                    onChange={(e) => handleActionConfigChange('taskSubject', e.target.value)}
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Priority:</label>
                  <select
                    value={actionConfig.taskPriority}
                    onChange={(e) => handleActionConfigChange('taskPriority', e.target.value)}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {actionType === 'sendEmail' && (
            <div className="conditional-action-panel action-email">
              <h5>✉️ Email Dispatch Parameters</h5>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Email Template:</label>
                  <select
                    value={actionConfig.emailTemplate}
                    onChange={(e) => handleActionConfigChange('emailTemplate', e.target.value)}
                  >
                    <option value="enterprise_high_value_deal">Enterprise High Value Deal Alert</option>
                    <option value="welcome_lead_template">Welcome Inbound Prospect</option>
                    <option value="candidate_round_invitation">Candidate Technical Round Invitation</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Recipient:</label>
                  <input
                    type="text"
                    value={actionConfig.emailRecipient}
                    onChange={(e) => handleActionConfigChange('emailRecipient', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {actionType === 'updateEntity' && (
            <div className="conditional-action-panel action-update">
              <h5>🔄 Entity Field Mutation Parameters</h5>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Target Field to Mutate:</label>
                  <select
                    value={actionConfig.targetField}
                    onChange={(e) => handleActionConfigChange('targetField', e.target.value)}
                  >
                    {availableFields.map((fld) => (
                      <option key={fld} value={fld}>{fld}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>New Field Value:</label>
                  <input
                    type="text"
                    value={actionConfig.targetValue}
                    onChange={(e) => handleActionConfigChange('targetValue', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {actionType === 'triggerWebhook' && (
            <div className="conditional-action-panel action-webhook">
              <h5>🌐 HTTP Webhook Endpoint</h5>
              <div className="form-group">
                <label>Webhook URL (POST JSON):</label>
                <input
                  type="url"
                  value={actionConfig.webhookUrl}
                  onChange={(e) => handleActionConfigChange('webhookUrl', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="form-footer">
          <button type="submit" className="btn-save-rule">
            💾 Save & Prime Workflow Rule
          </button>
        </div>
      </form>

      {/* Conditional Rendering: Simulation Execution Log */}
      {simulationLog && (
        <div className="simulation-log-card">
          <div className="log-header">
            <span className="log-badge-success">✓ {simulationLog.status}</span>
            <span className="log-time">{simulationLog.timestamp}</span>
          </div>
          <p className="log-message">{simulationLog.message}</p>
        </div>
      )}
    </div>
  );
}

export default WorkflowRuleBuilder;
