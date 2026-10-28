import React, { useState } from 'react';
import CandidatePortal from './components/CandidatePortal';
import LeadPipelineContainer from './components/LeadToClosure/LeadPipelineContainer';

export function App() {
  const [activeTab, setActiveTab] = useState('lead-to-closure');

  return (
    <div className="app-root">
      <nav className="top-navbar">
        <div className="nav-brand">
          <span className="brand-logo">🚀</span>
          <span className="brand-title">Cynaris Recruitment &bull; EspoCRM Bridge</span>
        </div>
        <div className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'lead-to-closure' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('lead-to-closure')}
          >
            📊 Lead to Closure Pipeline (W3D2)
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'candidate-portal' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('candidate-portal')}
          >
            👥 Candidate Portal (W3D1)
          </button>
        </div>
        <div className="nav-status">
          <span className="live-dot"></span> React 18 / Unidirectional Flow Active
        </div>
      </nav>

      <main className="main-content">
        {activeTab === 'lead-to-closure' ? (
          <LeadPipelineContainer />
        ) : (
          <CandidatePortal />
        )}
      </main>
    </div>
  );
}

export default App;
