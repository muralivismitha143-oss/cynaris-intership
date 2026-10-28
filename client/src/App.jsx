import React from 'react';
import CandidatePortal from './components/CandidatePortal';

export function App() {
  return (
    <div className="app-root">
      <nav className="top-navbar">
        <div className="nav-brand">
          <span className="brand-logo">🚀</span>
          <span className="brand-title">Cynaris Recruitment &bull; EspoCRM Bridge</span>
        </div>
        <div className="nav-status">
          <span className="live-dot"></span> React 18 / Virtual DOM Active
        </div>
      </nav>

      <main className="main-content">
        <CandidatePortal />
      </main>
    </div>
  );
}

export default App;
