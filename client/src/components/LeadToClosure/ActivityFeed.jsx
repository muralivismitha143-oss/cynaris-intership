/**
 * ActivityFeed Component
 * 
 * Demonstrates:
 * - Functional component rendering chronological sales activities
 * - Props receiving activities array and new activity logging callback
 * - Component composition within the Lead-to-Closure pipeline
 */

import React from 'react';

export function ActivityFeed({
  activities = [],
  selectedEntityName = 'All Entities',
  onAddActivity = () => {},
}) {
  const activityIconMap = {
    'Call': '📞',
    'Meeting': '🤝',
    'Task': '📝',
    'Email': '✉️',
  };

  return (
    <div className="activity-feed-panel" data-testid="activity-feed">
      <div className="feed-header">
        <h4>Engagement Stream: {selectedEntityName}</h4>
        <span className="count-badge">{activities.length} records</span>
      </div>

      <div className="feed-list">
        {activities.length === 0 ? (
          <div className="empty-feed">
            <p>No activity logged yet. Schedule a call or meeting.</p>
          </div>
        ) : (
          activities.map((act) => (
            <div key={act.id} className="activity-item">
              <span className="activity-icon" title={act.type}>
                {activityIconMap[act.type] || '📌'}
              </span>
              <div className="activity-details">
                <div className="activity-top-line">
                  <span className="activity-title">{act.name}</span>
                  <span className={`activity-status status-${act.status.toLowerCase()}`}>
                    {act.status}
                  </span>
                </div>
                <p className="activity-description">{act.description}</p>
                <div className="activity-meta">
                  <span>Target: {act.parentName}</span>
                  <span>&bull;</span>
                  <span>{act.timestamp}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="feed-actions">
        <button
          className="btn-quick-call"
          onClick={() => onAddActivity('Call', 'Discovery & Requirement Call')}
        >
          + Log Call
        </button>
        <button
          className="btn-quick-meeting"
          onClick={() => onAddActivity('Meeting', 'Architecture Review Meeting')}
        >
          + Log Meeting
        </button>
      </div>
    </div>
  );
}

export default ActivityFeed;
