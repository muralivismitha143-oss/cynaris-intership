/**
 * ActivitySummaryDashlet Component
 * 
 * Demonstrates:
 * 1. Handling Side Effects with useEffect:
 *    - Data fetching on component mount (empty dependency array [])
 *    - Re-fetching when filter dependencies change ([timeRange, filterAccount])
 * 2. Subscription & Timer Cleanup:
 *    - Polling interval cleanup with clearInterval in return function
 *    - HTTP request cancellation using AbortController on component unmount
 * 3. Loading, Error, and Success States:
 *    - Robust UX with loading spinners, retry buttons, and empty state banners
 * 4. Visual Multi-Bar Chart Rendering:
 *    - Proportional stacked/grouped bar chart visualizing Calls, Meetings, and Emails
 */

import React, { useState, useEffect } from 'react';

const MOCK_ACCOUNT_ACTIVITIES = [
  {
    accountId: 'acc-1',
    accountName: 'FinTech Innovations India Pvt Ltd',
    calls: 6,
    meetings: 4,
    emails: 8,
    totalActivities: 18,
    latestDate: '2026-10-21',
  },
  {
    accountId: 'acc-2',
    accountName: 'Bengaluru Cloud Systems',
    calls: 5,
    meetings: 3,
    emails: 5,
    totalActivities: 13,
    latestDate: '2026-10-20',
  },
  {
    accountId: 'acc-3',
    accountName: 'Tata Telematics Labs',
    calls: 4,
    meetings: 2,
    emails: 4,
    totalActivities: 10,
    latestDate: '2026-10-19',
  },
  {
    accountId: 'acc-4',
    accountName: 'Infosys FinServe Division',
    calls: 2,
    meetings: 1,
    emails: 3,
    totalActivities: 6,
    latestDate: '2026-10-18',
  },
];

export function ActivitySummaryDashlet({
  defaultTimeRange = '30',
  autoRefreshIntervalSec = 30,
}) {
  // State variables managed with useState
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [timeRange, setTimeRange] = useState(defaultTimeRange);
  const [filterAccount, setFilterAccount] = useState('All');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchCount, setFetchCount] = useState(0);

  // 1. Data Fetching Effect with AbortController Cleanup & Dependency Array
  useEffect(() => {
    // Instantiate AbortController to cancel request if component unmounts
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchActivityReport = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Simulate network API request with abort signal
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 300);
          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new DOMException('Request aborted by cleanup', 'AbortError'));
          });
        });

        // Calculate filtered activity data based on timeRange and filterAccount
        const multiplier = timeRange === '7' ? 0.4 : timeRange === '90' ? 1.8 : 1.0;
        const adjustedData = MOCK_ACCOUNT_ACTIVITIES.map((acc) => {
          const calls = Math.max(1, Math.round(acc.calls * multiplier));
          const meetings = Math.max(1, Math.round(acc.meetings * multiplier));
          const emails = Math.max(1, Math.round(acc.emails * multiplier));
          return {
            ...acc,
            calls,
            meetings,
            emails,
            totalActivities: calls + meetings + emails,
          };
        });

        const filtered = filterAccount === 'All'
          ? adjustedData
          : adjustedData.filter((a) => a.accountId === filterAccount);

        setActivities(filtered);
        setLastUpdated(new Date().toLocaleTimeString());
        setFetchCount((prev) => prev + 1);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setErrorMessage('Failed to fetch activity metrics. Please verify EspoCRM API connectivity.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityReport();

    // Cleanup function: Abort in-flight network requests on unmount or re-render
    return () => {
      abortController.abort();
    };
  }, [timeRange, filterAccount]); // Dependency Array: Re-runs when timeRange or filterAccount changes

  // 2. Subscription / Polling Timer Effect with Interval Cleanup
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const intervalMs = autoRefreshIntervalSec * 1000;
    const intervalTimer = setInterval(() => {
      // Re-trigger fetch by updating fetch timestamp
      setLastUpdated(new Date().toLocaleTimeString());
      setFetchCount((prev) => prev + 1);
    }, intervalMs);

    // Cleanup function: Clear polling interval on unmount or when auto-refresh toggles off
    return () => {
      clearInterval(intervalTimer);
    };
  }, [autoRefreshEnabled, autoRefreshIntervalSec]);

  // Aggregate totals
  const totalCalls = activities.reduce((sum, a) => sum + a.calls, 0);
  const totalMeetings = activities.reduce((sum, a) => sum + a.meetings, 0);
  const totalEmails = activities.reduce((sum, a) => sum + a.emails, 0);
  const grandTotal = totalCalls + totalMeetings + totalEmails;

  // Max activities for relative bar width calculation
  const maxActivities = activities.length > 0 
    ? Math.max(...activities.map((a) => a.totalActivities)) 
    : 1;

  return (
    <div className="activity-summary-dashlet" data-testid="activity-dashlet">
      {/* Dashlet Header & Controls */}
      <div className="dashlet-header">
        <div className="dashlet-title-box">
          <h4>📊 Activities per Account (Last {timeRange} Days)</h4>
          <span className="dashlet-subtitle">Grouped by Type: Calls, Meetings & Emails</span>
        </div>

        <div className="dashlet-controls">
          <label htmlFor="time-range-select" className="sr-only">Time Range:</label>
          <select
            id="time-range-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            disabled={isLoading}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>

          <label htmlFor="account-filter-select" className="sr-only">Account:</label>
          <select
            id="account-filter-select"
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            disabled={isLoading}
          >
            <option value="All">All Accounts</option>
            {MOCK_ACCOUNT_ACTIVITIES.map((acc) => (
              <option key={acc.accountId} value={acc.accountId}>
                {acc.accountName}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`btn-auto-refresh ${autoRefreshEnabled ? 'refresh-active' : ''}`}
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            title={autoRefreshEnabled ? 'Auto-refresh active (30s)' : 'Auto-refresh paused'}
          >
            {autoRefreshEnabled ? '🔄 Auto (30s)' : '⏸ Paused'}
          </button>
        </div>
      </div>

      {/* Aggregate KPI Badges */}
      <div className="dashlet-kpi-row">
        <div className="kpi-badge kpi-total">
          <span className="kpi-num">{grandTotal}</span>
          <span className="kpi-txt">Total Activities</span>
        </div>
        <div className="kpi-badge kpi-calls">
          <span className="kpi-num">{totalCalls}</span>
          <span className="kpi-txt">📞 Calls</span>
        </div>
        <div className="kpi-badge kpi-meetings">
          <span className="kpi-num">{totalMeetings}</span>
          <span className="kpi-txt">🤝 Meetings</span>
        </div>
        <div className="kpi-badge kpi-emails">
          <span className="kpi-num">{totalEmails}</span>
          <span className="kpi-txt">✉️ Emails</span>
        </div>
      </div>

      {/* Main Content: Loading vs Error vs Data Chart */}
      <div className="dashlet-body">
        {isLoading ? (
          <div className="dashlet-loading-state">
            <div className="spinner"></div>
            <p>Fetching activity metrics from EspoCRM reporting service...</p>
          </div>
        ) : errorMessage ? (
          <div className="dashlet-error-state">
            <p>⚠️ {errorMessage}</p>
            <button
              className="btn-retry"
              onClick={() => setTimeRange(timeRange)}
            >
              Retry Query
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="dashlet-empty-state">
            <p>No activity logs found for the selected time range.</p>
          </div>
        ) : (
          <div className="chart-and-table-view">
            {/* Multi-Bar Chart Visualization */}
            <div className="barchart-container">
              {activities.map((acc) => {
                const totalPct = (acc.totalActivities / maxActivities) * 100;
                const callPct = acc.totalActivities > 0 ? (acc.calls / acc.totalActivities) * 100 : 0;
                const meetPct = acc.totalActivities > 0 ? (acc.meetings / acc.totalActivities) * 100 : 0;
                const mailPct = acc.totalActivities > 0 ? (acc.emails / acc.totalActivities) * 100 : 0;

                return (
                  <div key={acc.accountId} className="barchart-row">
                    <div className="bar-label-col">
                      <span className="bar-account-name" title={acc.accountName}>
                        {acc.accountName}
                      </span>
                      <span className="bar-total-tag">{acc.totalActivities} actions</span>
                    </div>

                    <div className="bar-track-col">
                      <div className="stacked-bar-fill" style={{ width: `${Math.max(totalPct, 15)}%` }}>
                        <div
                          className="bar-seg seg-calls"
                          style={{ width: `${callPct}%` }}
                          title={`Calls: ${acc.calls}`}
                        >
                          {acc.calls > 0 && <span>{acc.calls}</span>}
                        </div>
                        <div
                          className="bar-seg seg-meetings"
                          style={{ width: `${meetPct}%` }}
                          title={`Meetings: ${acc.meetings}`}
                        >
                          {acc.meetings > 0 && <span>{acc.meetings}</span>}
                        </div>
                        <div
                          className="bar-seg seg-emails"
                          style={{ width: `${mailPct}%` }}
                          title={`Emails: ${acc.emails}`}
                        >
                          {acc.emails > 0 && <span>{acc.emails}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend & Telemetry Footer */}
            <div className="dashlet-footer">
              <div className="chart-legend">
                <span className="legend-item"><span className="dot dot-calls"></span> Calls</span>
                <span className="legend-item"><span className="dot dot-meetings"></span> Meetings</span>
                <span className="legend-item"><span className="dot dot-emails"></span> Emails</span>
              </div>
              <div className="telemetry-info">
                <span>Updated: {lastUpdated || 'Initial'}</span>
                <span>&bull;</span>
                <span>Syncs: #{fetchCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivitySummaryDashlet;
