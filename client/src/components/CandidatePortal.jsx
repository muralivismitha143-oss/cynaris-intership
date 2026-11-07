/**
 * CandidatePortal Component
 * 
 * Demonstrates:
 * 1. JSX Syntax:
 *    - JS expressions embedded via curly braces `{...}`
 *    - JSX attributes (camelCase: `className`, `onClick`, `htmlFor`)
 *    - React Fragments `<>...</>` to group children without extra DOM nodes
 *    - Array mapping with mandatory unique `key` props for Virtual DOM diffing
 * 2. Virtual DOM & React Rendering Lifecycle:
 *    - Render Phase: React calls component, evaluates JSX to lightweight JavaScript object tree
 *    - Reconciliation (Diffing): React compares previous Virtual DOM tree against new Virtual DOM tree
 *    - Commit Phase: React updates ONLY the real DOM nodes that actually changed
 * 3. React Hooks (`useState`, `useEffect`, `useMemo`)
 */

import React, { useState, useEffect, useMemo } from 'react';
import PipelineCard from './PipelineCard';

const PIPELINE_STAGES = [
  'Screening',
  'Technical Round 1',
  'Technical Round 2',
  'HR Round',
  'Offered',
  'Rejected',
];

const INITIAL_APPLICANTS = [
  { id: 1, name: 'Priya Sharma', email: 'priya.sharma@example.com', pipeline_stage: 'Technical Round 1', experience_years: 4 },
  { id: 2, name: 'Rohan Mehta', email: 'rohan.mehta@example.com', pipeline_stage: 'Screening', experience_years: 2 },
  { id: 3, name: 'Ananya Iyer', email: 'ananya.iyer@example.com', pipeline_stage: 'Technical Round 2', experience_years: 6 },
  { id: 4, name: 'Vikram Malhotra', email: 'vikram.m@example.com', pipeline_stage: 'HR Round', experience_years: 5 },
  { id: 5, name: 'Sneha Patil', email: 'sneha.p@example.com', pipeline_stage: 'Offered', experience_years: 3 },
];

export function CandidatePortal({ apiBaseUrl = '/api/v1' }) {
  const [applicants, setApplicants] = useState(INITIAL_APPLICANTS);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [filterStage, setFilterStage] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [renderCount, setRenderCount] = useState(0);

  // Track component renders for Virtual DOM demonstration
  useEffect(() => {
    setRenderCount((prev) => prev + 1);
  }, [applicants, filterStage, searchTerm]);

  // Advance applicant to next pipeline stage
  const handleAdvanceStage = (applicantId) => {
    setApplicants((prevApplicants) =>
      prevApplicants.map((app) => {
        if (app.id !== applicantId) return app;
        const currentIndex = PIPELINE_STAGES.indexOf(app.pipeline_stage);
        const nextIndex = currentIndex < PIPELINE_STAGES.length - 2 ? currentIndex + 1 : currentIndex;
        return { ...app, pipeline_stage: PIPELINE_STAGES[nextIndex] };
      })
    );
  };

  // Filter applicants based on active filters
  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      const matchesStage = filterStage === 'All' || app.pipeline_stage === filterStage;
      const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            app.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStage && matchesSearch;
    });
  }, [applicants, filterStage, searchTerm]);

  // Calculate metrics per stage
  const stageCounts = useMemo(() => {
    const counts = {};
    PIPELINE_STAGES.forEach((stage) => {
      counts[stage] = applicants.filter((a) => a.pipeline_stage === stage).length;
    });
    return counts;
  }, [applicants]);

  return (
    <div className="candidate-portal-container">
      {/* Header & Virtual DOM Status Banner */}
      <header className="portal-header">
        <h2>EspoCRM React Candidate Portal</h2>
        <div className="vdom-badge" title="Virtual DOM reconciliation count">
          Virtual DOM Renders: <strong>{renderCount}</strong>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <section className="portal-controls">
        <div className="control-group">
          <label htmlFor="search-input">Search Candidates:</label>
          <input
            id="search-input"
            type="text"
            placeholder="Type name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="control-group">
          <label htmlFor="stage-filter">Filter by Stage:</label>
          <select
            id="stage-filter"
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
          >
            <option value="All">All Stages ({applicants.length})</option>
            {PIPELINE_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage} ({stageCounts[stage]})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Summary KPI Pills */}
      <section className="stage-pills-row">
        {PIPELINE_STAGES.map((stage) => (
          <button
            key={stage}
            className={`pill-btn ${filterStage === stage ? 'pill-active' : ''}`}
            onClick={() => setFilterStage(filterStage === stage ? 'All' : stage)}
          >
            {stage} <span className="pill-count">{stageCounts[stage]}</span>
          </button>
        ))}
      </section>

      {/* Main Grid: Pipeline List + Detail Inspector */}
      <div className="portal-main-grid">
        <section className="cards-column">
          {filteredApplicants.length === 0 ? (
            <div className="empty-state">
              <p>No candidates found matching the selected criteria.</p>
            </div>
          ) : (
            filteredApplicants.map((applicant) => (
              <PipelineCard
                key={applicant.id} // Essential for Virtual DOM list diffing
                applicant={applicant}
                isActive={selectedApplicant?.id === applicant.id}
                onSelect={(app) => setSelectedApplicant(app)}
                onAdvanceStage={handleAdvanceStage}
              />
            ))
          )}
        </section>

        {/* Candidate Detail Inspector */}
        <aside className="detail-column">
          {selectedApplicant ? (
            <div className="detail-panel">
              <h3>Applicant Details</h3>
              <p><strong>Name:</strong> {selectedApplicant.name}</p>
              <p><strong>Email:</strong> {selectedApplicant.email}</p>
              <p><strong>Stage:</strong> {selectedApplicant.pipeline_stage}</p>
              <p><strong>Experience:</strong> {selectedApplicant.experience_years} years</p>
              <button
                className="btn-close-detail"
                onClick={() => setSelectedApplicant(null)}
              >
                Close Details
              </button>
            </div>
          ) : (
            <div className="detail-placeholder">
              <p>Select a candidate to view CRM details & audit trail.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default CandidatePortal;
