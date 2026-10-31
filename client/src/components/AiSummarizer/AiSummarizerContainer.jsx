/**
 * AiSummarizerContainer.jsx
 * 
 * Top-level container for Week 3 Day 5 feature:
 * - Implements React Router architecture:
 *   - <BrowserRouter>
 *   - <Routes>
 *   - <Route path="/" element={<AccountsListView />} />
 *   - <Route path="/accounts" element={<AccountsListView />} />
 *   - <Route path="/accounts/:accountId" element={<AccountDetailView />} />
 *   - <Link>
 *   - useParams, useNavigate
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Link } from './ReactRouterComponents';
import AccountsListView from './AccountsListView';
import AccountDetailView from './AccountDetailView';

export function AiSummarizerContainer() {
  return (
    <BrowserRouter initialPath="/accounts">
      <div className="ai-summarizer-container" data-testid="ai-summarizer-container">
        {/* Sub-navigation bar with React Router Link components */}
        <header className="router-header-nav">
          <div className="router-brand">
            <span className="brand-badge">React Router DOM</span>
            <h3>EspoCRM Intelligence Hub</h3>
          </div>

          <nav className="router-links-group">
            <Link to="/accounts" className="router-nav-link" data-testid="nav-link-accounts">
              📋 All Accounts
            </Link>
            <Link to="/accounts/acc-1" className="router-nav-link" data-testid="nav-link-featured">
              ⭐ FinTech Innovations (Featured)
            </Link>
          </nav>
        </header>

        {/* Declarative React Router Routes */}
        <main className="router-main-view">
          <Routes>
            <Route path="/" element={<AccountsListView />} />
            <Route path="/accounts" element={<AccountsListView />} />
            <Route path="/accounts/:accountId" element={<AccountDetailView />} />
            <Route path="*" element={<AccountsListView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default AiSummarizerContainer;
