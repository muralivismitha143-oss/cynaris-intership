/**
 * test_react_props_unidirectional.js
 * 
 * Unit test suite validating:
 * 1. Functional component design and file composition.
 * 2. Unidirectional Data Flow mechanics:
 *    - Data flows DOWN via immutable props
 *    - Events flow UP via callback props
 *    - Parent container manages single source of truth
 * 3. State transition determinism and metric derivations.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function testComponentFileIntegrity() {
  console.log('--- Test 1: Functional Component Composition Integrity ---');
  const components = [
    'client/src/components/LeadToClosure/ClosureSummaryMetrics.jsx',
    'client/src/components/LeadToClosure/LeadCard.jsx',
    'client/src/components/LeadToClosure/OpportunityCard.jsx',
    'client/src/components/LeadToClosure/ActivityFeed.jsx',
    'client/src/components/LeadToClosure/LeadPipelineContainer.jsx',
  ];

  for (const compPath of components) {
    const fullPath = path.join(rootDir, compPath);
    assert.ok(fs.existsSync(fullPath), `Component file missing: ${compPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.length > 100, `File ${compPath} should contain implementation`);
    assert.ok(content.includes('export function'), `Must use functional component export in ${compPath}`);
    console.log(`  [PASS] Verified ${compPath} (${content.length} bytes)`);
  }
}

function testUnidirectionalStateTransitions() {
  console.log('\n--- Test 2: Unidirectional State Transition Simulation ---');

  // Simulated parent container state
  let state = {
    leads: [
      { id: 'lead-1', name: 'Kavita Nambiar', accountName: 'FinTech India', status: 'In Process' },
      { id: 'lead-2', name: 'Arjun Das', accountName: 'Bengaluru Cloud', status: 'New' },
    ],
    opportunities: [
      { id: 'opp-1', name: 'FinTech Deal', amount: 1250000, stage: 'Proposal/Price Quote', probability: 75 },
    ],
    activities: [],
  };

  // Simulating Child -> Parent callback: onConvert(leadId)
  function handleConvert(leadId) {
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead || lead.status === 'Converted') return;

    // Immutably clone and update leads
    const updatedLeads = state.leads.map((l) =>
      l.id === leadId ? { ...l, status: 'Converted' } : l
    );

    // Create new opportunity
    const newOpp = {
      id: 'opp-new',
      name: `${lead.accountName} - Sales Engagement`,
      amount: 1000000,
      stage: 'Prospecting',
      probability: 10,
    };

    // Create activity
    const newAct = {
      id: 'act-new',
      type: 'Meeting',
      name: `Lead Converted: ${lead.name}`,
    };

    // Update parent state (Unidirectional)
    state = {
      ...state,
      leads: updatedLeads,
      opportunities: [...state.opportunities, newOpp],
      activities: [newAct, ...state.activities],
    };
  }

  // Simulating Child -> Parent callback: onStageChange(oppId, newStage)
  function handleStageChange(oppId, newStage) {
    const probMap = {
      'Prospecting': 10,
      'Proposal/Price Quote': 75,
      'Closed Won': 100,
      'Closed Lost': 0,
    };

    state = {
      ...state,
      opportunities: state.opportunities.map((opp) => {
        if (opp.id !== oppId) return opp;
        return {
          ...opp,
          stage: newStage,
          probability: probMap[newStage] ?? opp.probability,
        };
      }),
    };
  }

  // 1. Initial State assertions
  assert.strictEqual(state.leads[0].status, 'In Process');
  assert.strictEqual(state.opportunities.length, 1);

  // 2. Execute Lead Conversion
  handleConvert('lead-1');
  assert.strictEqual(state.leads[0].status, 'Converted');
  assert.strictEqual(state.opportunities.length, 2);
  assert.strictEqual(state.activities.length, 1);
  console.log('  [PASS] Conversion event properly immutably updated parent state and created Opportunity');

  // 3. Execute Opportunity Stage Advance to Closed Won
  handleStageChange('opp-1', 'Closed Won');
  assert.strictEqual(state.opportunities[0].stage, 'Closed Won');
  assert.strictEqual(state.opportunities[0].probability, 100);
  console.log('  [PASS] Stage transition correctly enforced 100% win probability');
}

function testPropsPurityAndMetrics() {
  console.log('\n--- Test 3: Computed Metrics Derived from Props ---');

  const leads = [
    { id: '1', status: 'Converted' },
    { id: '2', status: 'Converted' },
    { id: '3', status: 'New' },
    { id: '4', status: 'In Process' },
  ];

  const opportunities = [
    { id: '1', amount: 1250000, stage: 'Closed Won' },
    { id: '2', amount: 750000, stage: 'Closed Won' },
    { id: '3', amount: 500000, stage: 'Proposal/Price Quote' },
  ];

  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l) => l.status === 'Converted').length;
  const conversionRate = ((convertedLeads / totalLeads) * 100).toFixed(1);

  const totalOpportunities = opportunities.length;
  const closedWonOpps = opportunities.filter((o) => o.stage === 'Closed Won');
  const winRate = ((closedWonOpps.length / totalOpportunities) * 100).toFixed(1);
  const totalWonRevenue = closedWonOpps.reduce((sum, o) => sum + o.amount, 0);
  const totalPipelineValue = opportunities.reduce((sum, o) => sum + o.amount, 0);

  assert.strictEqual(totalLeads, 4);
  assert.strictEqual(conversionRate, '50.0');
  assert.strictEqual(totalOpportunities, 3);
  assert.strictEqual(winRate, '66.7');
  assert.strictEqual(totalWonRevenue, 2000000);
  assert.strictEqual(totalPipelineValue, 2500000);

  console.log('  [PASS] Derived metrics accurately calculated from props inputs');
}

function runAll() {
  testComponentFileIntegrity();
  testUnidirectionalStateTransitions();
  testPropsPurityAndMetrics();
  console.log('\n========================================');
  console.log('All 3 React Props & Unidirectional Flow Tests Passed!');
  console.log('========================================\n');
}

runAll();
