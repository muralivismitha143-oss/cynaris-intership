/**
 * LeadPipelineContainer Component
 * 
 * Demonstrates:
 * 1. Component Composition:
 *    Composes ClosureSummaryMetrics, LeadCard, OpportunityCard, and ActivityFeed
 * 2. Passing Data via Props:
 *    Distributes sliced state models down to child functional components
 * 3. Unidirectional Data Flow:
 *    - State lives exclusively in this top-level container
 *    - Child components receive read-only props
 *    - Mutations are requested by invoking callback props passed down from parent
 *    - Parent computes next immutable state, triggering top-down re-render
 */

import React, { useState, useMemo } from 'react';
import ClosureSummaryMetrics from './ClosureSummaryMetrics';
import LeadCard from './LeadCard';
import OpportunityCard from './OpportunityCard';
import ActivityFeed from './ActivityFeed';

const OPPORTUNITY_STAGES = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Proposal/Price Quote',
  'Negotiation/Review',
  'Closed Won',
  'Closed Lost',
];

const INITIAL_LEADS = [
  {
    id: 'lead-1',
    name: 'Kavita Nambiar',
    accountName: 'FinTech Innovations India Pvt Ltd',
    email: 'kavita.nambiar@fintechinnovations.in',
    phone: '+91-98765-43210',
    source: 'Web Site',
    status: 'In Process',
  },
  {
    id: 'lead-2',
    name: 'Arjun Das',
    accountName: 'Bengaluru Cloud Systems',
    email: 'arjun.das@bengalurucloud.com',
    phone: '+91-98123-45678',
    source: 'Campaign',
    status: 'New',
  },
  {
    id: 'lead-3',
    name: 'Meera Sen',
    accountName: 'Tata Telematics Labs',
    email: 'meera.sen@tatatelematics.in',
    phone: '+91-98444-12345',
    source: 'Referral',
    status: 'Assigned',
  },
];

const INITIAL_OPPORTUNITIES = [
  {
    id: 'opp-1',
    name: 'Enterprise Recruitment Platform Rollout',
    accountName: 'FinTech Innovations India Pvt Ltd',
    amount: 1250000,
    stage: 'Proposal/Price Quote',
    probability: 75,
    closeDate: '2026-11-15',
  },
  {
    id: 'opp-2',
    name: 'Cloud Infrastructure Upgrade',
    accountName: 'Bengaluru Cloud Systems',
    amount: 850000,
    stage: 'Needs Analysis',
    probability: 50,
    closeDate: '2026-12-01',
  },
];

const INITIAL_ACTIVITIES = [
  {
    id: 'act-1',
    type: 'Call',
    name: 'Initial Inbound Lead Discovery Call',
    status: 'Held',
    description: 'Discussed ATS migration requirements and candidate volume.',
    parentName: 'FinTech Innovations India Pvt Ltd',
    timestamp: '2026-10-21 11:30 AM',
  },
  {
    id: 'act-2',
    type: 'Meeting',
    name: 'Architecture & Security Compliance Demo',
    status: 'Held',
    description: 'Demonstrated EspoCRM REST API and role-based data partitioning.',
    parentName: 'FinTech Innovations India Pvt Ltd',
    timestamp: '2026-10-21 02:00 PM',
  },
];

export function LeadPipelineContainer() {
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [opportunities, setOpportunities] = useState(INITIAL_OPPORTUNITIES);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Unidirectional Data Flow: Stage update handler
  const handleStageChange = (opportunityId, newStage) => {
    const probabilityMap = {
      'Prospecting': 10,
      'Qualification': 25,
      'Needs Analysis': 50,
      'Proposal/Price Quote': 75,
      'Negotiation/Review': 90,
      'Closed Won': 100,
      'Closed Lost': 0,
    };

    setOpportunities((prevOpps) =>
      prevOpps.map((opp) => {
        if (opp.id !== opportunityId) return opp;
        return {
          ...opp,
          stage: newStage,
          probability: probabilityMap[newStage] ?? opp.probability,
        };
      })
    );

    // Auto-log audit activity in state
    const opp = opportunities.find((o) => o.id === opportunityId);
    if (opp) {
      const newActivity = {
        id: `act-${Date.now()}`,
        type: 'Task',
        name: `Deal Stage Transition: ${newStage}`,
        status: 'Completed',
        description: `Opportunity '${opp.name}' advanced from '${opp.stage}' to '${newStage}'.`,
        parentName: opp.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setActivities((prevActs) => [newActivity, ...prevActs]);
    }
  };

  // Unidirectional Data Flow: Lead conversion handler
  const handleConvertLead = (leadId) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === 'Converted') return;

    // 1. Mark Lead as Converted
    setLeads((prevLeads) =>
      prevLeads.map((l) => (l.id === leadId ? { ...l, status: 'Converted' } : l))
    );

    // 2. Create Opportunity in pipeline
    const newOpportunity = {
      id: `opp-${Date.now()}`,
      name: `${lead.accountName} - Sales Engagement`,
      accountName: lead.accountName,
      amount: 1000000,
      stage: 'Prospecting',
      probability: 10,
      closeDate: '2026-12-31',
    };
    setOpportunities((prevOpps) => [newOpportunity, ...prevOpps]);

    // 3. Log Conversion Activity
    const conversionActivity = {
      id: `act-${Date.now()}`,
      type: 'Meeting',
      name: `Lead Converted: ${lead.name}`,
      status: 'Completed',
      description: `Lead converted to Account '${lead.accountName}' and new Opportunity created.`,
      parentName: lead.accountName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setActivities((prevActs) => [conversionActivity, ...prevActs]);
  };

  // Unidirectional Data Flow: Activity logger
  const handleAddActivity = (type, defaultTitle) => {
    const targetName = selectedEntity ? selectedEntity.name : 'Pipeline General';
    const newActivity = {
      id: `act-${Date.now()}`,
      type,
      name: defaultTitle,
      status: 'Planned',
      description: `Scheduled ${type} regarding ${targetName} deal evaluation.`,
      parentName: targetName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setActivities((prevActs) => [newActivity, ...prevActs]);
  };

  // Derived metrics passed strictly via props
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const convertedLeads = leads.filter((l) => l.status === 'Converted').length;
    const totalOpportunities = opportunities.length;
    const closedWonOpps = opportunities.filter((o) => o.stage === 'Closed Won');
    const closedWonCount = closedWonOpps.length;
    const totalWonRevenue = closedWonOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalPipelineValue = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);

    return {
      totalLeads,
      convertedLeads,
      totalOpportunities,
      closedWonCount,
      totalWonRevenue,
      totalPipelineValue,
    };
  }, [leads, opportunities]);

  return (
    <div className="lead-pipeline-orchestrator">
      {/* Top Banner & KPI Metrics Component */}
      <section className="metrics-section">
        <ClosureSummaryMetrics
          totalLeads={metrics.totalLeads}
          convertedLeads={metrics.convertedLeads}
          totalOpportunities={metrics.totalOpportunities}
          closedWonCount={metrics.closedWonCount}
          totalWonRevenue={metrics.totalWonRevenue}
          totalPipelineValue={metrics.totalPipelineValue}
        />
      </section>

      {/* Main 3-Column Business Process Flow */}
      <div className="pipeline-columns-grid">
        {/* Column 1: Leads */}
        <section className="pipeline-column">
          <div className="column-header">
            <h3>1. Inbound Leads ({leads.length})</h3>
            <span className="subtext">Qualification & Verification</span>
          </div>
          <div className="cards-scroll-container">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isSelected={selectedEntity?.id === lead.id}
                onSelect={(l) => setSelectedEntity(l)}
                onConvert={handleConvertLead}
              />
            ))}
          </div>
        </section>

        {/* Column 2: Opportunities */}
        <section className="pipeline-column">
          <div className="column-header">
            <h3>2. Opportunities ({opportunities.length})</h3>
            <span className="subtext">Deal Value & Negotiation</span>
          </div>
          <div className="cards-scroll-container">
            {opportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                stages={OPPORTUNITY_STAGES}
                isSelected={selectedEntity?.id === opp.id}
                onSelect={(o) => setSelectedEntity(o)}
                onStageChange={handleStageChange}
                onLogActivity={(id) => handleAddActivity('Meeting', 'Follow-up Discussion')}
              />
            ))}
          </div>
        </section>

        {/* Column 3: Engagement & Activity Feed */}
        <section className="pipeline-column">
          <div className="column-header">
            <h3>3. Activity & Follow-up</h3>
            <span className="subtext">Engagement Stream</span>
          </div>
          <ActivityFeed
            activities={activities}
            selectedEntityName={selectedEntity?.name || 'All Entities'}
            onAddActivity={handleAddActivity}
          />
        </section>
      </div>
    </div>
  );
}

export default LeadPipelineContainer;
