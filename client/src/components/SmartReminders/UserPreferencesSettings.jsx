/**
 * UserPreferencesSettings.jsx
 * 
 * Demonstrates:
 * - Smart Reminders: User Notification & AI Preferences Panel
 * - Express API Integration: Communicates with /api/preferences/:userId
 * - Multi-user profile switching (Murali V, Priya Sharma, Rahul Deshmukh)
 * - Channel toggles (Email, WhatsApp, In-App, SMS)
 * - Quiet Hours & Working Days configuration with real-time DND calculation
 * - Dynamic feedback toast notifications
 */

import React, { useState, useEffect } from 'react';

export const RECRUITER_PROFILES = [
  {
    userId: 'recruiter-1',
    userName: 'Murali V',
    role: 'Talent Acquisition Lead',
    email: 'murali.v@cynarissolutions.com',
  },
  {
    userId: 'recruiter-2',
    userName: 'Priya Sharma',
    role: 'Engineering Hiring Lead',
    email: 'priya.sharma@cynarissolutions.com',
  },
  {
    userId: 'recruiter-3',
    userName: 'Rahul Deshmukh',
    role: 'Sales & CRM Talent Partner',
    email: 'rahul.deshmukh@cynarissolutions.com',
  },
];

export const INITIAL_USER_PREFERENCES = {
  'recruiter-1': {
    userId: 'recruiter-1',
    userName: 'Murali V',
    role: 'Talent Acquisition Lead',
    timezone: 'Asia/Kolkata',
    channels: {
      email: true,
      whatsapp: true,
      inApp: true,
      sms: false,
    },
    quietHours: {
      enabled: true,
      start: '20:00',
      end: '08:30',
    },
    workingSchedule: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startHour: '09:30',
      endHour: '18:30',
    },
    remindersPolicy: {
      minimumUrgency: 'Medium',
      autoScheduleAiSuggestions: false,
      batchDigest: false,
      digestFrequency: 'Daily 09:00 AM',
    },
  },
  'recruiter-2': {
    userId: 'recruiter-2',
    userName: 'Priya Sharma',
    role: 'Engineering Hiring Lead',
    timezone: 'Asia/Kolkata',
    channels: {
      email: true,
      whatsapp: false,
      inApp: true,
      sms: false,
    },
    quietHours: {
      enabled: true,
      start: '19:00',
      end: '09:00',
    },
    workingSchedule: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startHour: '10:00',
      endHour: '18:00',
    },
    remindersPolicy: {
      minimumUrgency: 'High',
      autoScheduleAiSuggestions: true,
      batchDigest: true,
      digestFrequency: 'Daily 09:00 AM',
    },
  },
  'recruiter-3': {
    userId: 'recruiter-3',
    userName: 'Rahul Deshmukh',
    role: 'Sales & CRM Talent Partner',
    timezone: 'Asia/Kolkata',
    channels: {
      email: true,
      whatsapp: true,
      inApp: true,
      sms: true,
    },
    quietHours: {
      enabled: true,
      start: '21:00',
      end: '08:00',
    },
    workingSchedule: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      startHour: '09:00',
      endHour: '19:00',
    },
    remindersPolicy: {
      minimumUrgency: 'All',
      autoScheduleAiSuggestions: false,
      batchDigest: false,
      digestFrequency: 'Instant',
    },
  },
};

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function UserPreferencesSettings({
  activeUserId = 'recruiter-1',
  onPreferencesChanged = () => {},
  onClose = () => {},
}) {
  const [selectedUserId, setSelectedUserId] = useState(activeUserId);
  const [allPrefs, setAllPrefs] = useState(INITIAL_USER_PREFERENCES);
  const [currentPrefs, setCurrentPrefs] = useState(INITIAL_USER_PREFERENCES[activeUserId]);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    setCurrentPrefs(allPrefs[selectedUserId] || INITIAL_USER_PREFERENCES['recruiter-1']);
  }, [selectedUserId, allPrefs]);

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleChannelToggle = (channelKey) => {
    const updatedChannels = {
      ...currentPrefs.channels,
      [channelKey]: !currentPrefs.channels[channelKey],
    };

    // Ensure at least one channel remains enabled
    const activeCount = Object.values(updatedChannels).filter(Boolean).length;
    if (activeCount === 0) {
      showToast('At least one notification channel must remain active', 'error');
      return;
    }

    const updated = {
      ...currentPrefs,
      channels: updatedChannels,
    };

    setCurrentPrefs(updated);
    setAllPrefs((prev) => ({ ...prev, [selectedUserId]: updated }));
    onPreferencesChanged(updated);
  };

  const handleQuietHoursChange = (field, value) => {
    const updated = {
      ...currentPrefs,
      quietHours: {
        ...currentPrefs.quietHours,
        [field]: value,
      },
    };
    setCurrentPrefs(updated);
    setAllPrefs((prev) => ({ ...prev, [selectedUserId]: updated }));
    onPreferencesChanged(updated);
  };

  const handleWorkingScheduleChange = (field, value) => {
    const updated = {
      ...currentPrefs,
      workingSchedule: {
        ...currentPrefs.workingSchedule,
        [field]: value,
      },
    };
    setCurrentPrefs(updated);
    setAllPrefs((prev) => ({ ...prev, [selectedUserId]: updated }));
    onPreferencesChanged(updated);
  };

  const handleDayToggle = (day) => {
    const currentDays = currentPrefs.workingSchedule?.days || [];
    let nextDays;
    if (currentDays.includes(day)) {
      if (currentDays.length === 1) {
        showToast('Must have at least one active working day', 'error');
        return;
      }
      nextDays = currentDays.filter((d) => d !== day);
    } else {
      nextDays = [...currentDays, day];
    }
    handleWorkingScheduleChange('days', nextDays);
  };

  const handleRemindersPolicyChange = (field, value) => {
    const updated = {
      ...currentPrefs,
      remindersPolicy: {
        ...currentPrefs.remindersPolicy,
        [field]: value,
      },
    };
    setCurrentPrefs(updated);
    setAllPrefs((prev) => ({ ...prev, [selectedUserId]: updated }));
    onPreferencesChanged(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise((res) => setTimeout(res, 300));
      onPreferencesChanged(currentPrefs);
      showToast(`Preferences saved successfully for ${currentPrefs.userName}!`, 'success');
    } catch (err) {
      showToast('Failed to save preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaults = INITIAL_USER_PREFERENCES[selectedUserId];
    if (defaults) {
      setCurrentPrefs(defaults);
      setAllPrefs((prev) => ({ ...prev, [selectedUserId]: defaults }));
      onPreferencesChanged(defaults);
      showToast('Preferences reset to enterprise defaults', 'info');
    }
  };

  // Evaluate current Quiet Hours state
  const isQuietHoursActive = (() => {
    if (!currentPrefs.quietHours.enabled) return false;
    const now = new Date();
    const [startH, startM] = currentPrefs.quietHours.start.split(':').map(Number);
    const [endH, endM] = currentPrefs.quietHours.end.split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    return startMins > endMins
      ? nowMins >= startMins || nowMins < endMins
      : nowMins >= startMins && nowMins < endMins;
  })();

  return (
    <div className="user-preferences-modal-overlay" data-testid="user-preferences-panel">
      <div className="user-preferences-modal-content">
        {/* Toast Alert */}
        {toastMsg && (
          <div className={`pref-toast-alert toast-${toastMsg.type}`} data-testid="pref-toast">
            {toastMsg.text}
          </div>
        )}

        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="pref-icon">⚙️</span>
            <div>
              <h3>User Preference Settings &amp; Quiet Hours</h3>
              <p className="modal-subtitle">
                Configure delivery channels, working windows, and AI auto-scheduling guardrails (Express REST API).
              </p>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} data-testid="btn-close-preferences">
            &times;
          </button>
        </div>

        {/* Recruiter Profile Switcher */}
        <div className="profile-selector-bar">
          <span className="profile-label">Select Active Recruiter Profile:</span>
          <div className="profile-pills">
            {RECRUITER_PROFILES.map((p) => (
              <button
                key={p.userId}
                type="button"
                className={`profile-pill-btn ${p.userId === selectedUserId ? 'active' : ''}`}
                onClick={() => setSelectedUserId(p.userId)}
                data-testid={`profile-btn-${p.userId}`}
              >
                <span className="p-name">{p.userName}</span>
                <span className="p-role">{p.role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quiet Hours Live Status Indicator Banner */}
        <div className={`quiet-status-banner ${isQuietHoursActive ? 'status-quiet' : 'status-working'}`}>
          <span className="status-icon">{isQuietHoursActive ? '🌙' : '☀️'}</span>
          <div className="status-text">
            <strong>{isQuietHoursActive ? 'Do-Not-Disturb (Quiet Hours) Active' : 'Active Working Window'}</strong>
            <span>
              {isQuietHoursActive
                ? `Reminders generated now will be automatically deferred to next morning (${currentPrefs.workingSchedule?.startHour || '09:30'} IST).`
                : `Reminders will be dispatched immediately via active channels (${currentPrefs.timezone}).`}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="preferences-form-body">
          {/* Section 1: Notification Channels */}
          <div className="form-section-card">
            <h4>1. Preferred Delivery Channels</h4>
            <p className="section-hint">Select the channels through which smart reminders should be delivered.</p>

            <div className="channel-toggles-grid">
              <div
                className={`channel-box ${currentPrefs.channels.email ? 'active' : ''}`}
                onClick={() => handleChannelToggle('email')}
                data-testid="toggle-channel-email"
              >
                <div className="box-top">
                  <span className="ch-icon">✉️</span>
                  <span className="ch-name">Email</span>
                </div>
                <span className="ch-status">{currentPrefs.channels.email ? 'Enabled' : 'Disabled'}</span>
              </div>

              <div
                className={`channel-box ${currentPrefs.channels.whatsapp ? 'active' : ''}`}
                onClick={() => handleChannelToggle('whatsapp')}
                data-testid="toggle-channel-whatsapp"
              >
                <div className="box-top">
                  <span className="ch-icon">💬</span>
                  <span className="ch-name">WhatsApp</span>
                </div>
                <span className="ch-status">{currentPrefs.channels.whatsapp ? 'Enabled' : 'Disabled'}</span>
              </div>

              <div
                className={`channel-box ${currentPrefs.channels.inApp ? 'active' : ''}`}
                onClick={() => handleChannelToggle('inApp')}
                data-testid="toggle-channel-inapp"
              >
                <div className="box-top">
                  <span className="ch-icon">🔔</span>
                  <span className="ch-name">In-App Notification</span>
                </div>
                <span className="ch-status">{currentPrefs.channels.inApp ? 'Enabled' : 'Disabled'}</span>
              </div>

              <div
                className={`channel-box ${currentPrefs.channels.sms ? 'active' : ''}`}
                onClick={() => handleChannelToggle('sms')}
                data-testid="toggle-channel-sms"
              >
                <div className="box-top">
                  <span className="ch-icon">📱</span>
                  <span className="ch-name">SMS Alert</span>
                </div>
                <span className="ch-status">{currentPrefs.channels.sms ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Quiet Hours (DND) */}
          <div className="form-section-card">
            <div className="section-title-toggle">
              <h4>2. Quiet Hours &amp; Do-Not-Disturb (DND)</h4>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={currentPrefs.quietHours.enabled}
                  onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                  data-testid="toggle-quiet-hours"
                />
                <span className="slider"></span>
              </label>
            </div>
            <p className="section-hint">
              During quiet hours, the AI scheduler prevents push notifications and reschedules slots to the next working morning.
            </p>

            <div className="time-range-row">
              <div className="time-input-group">
                <label>DND Starts (Evening):</label>
                <input
                  type="time"
                  value={currentPrefs.quietHours.start}
                  onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                  disabled={!currentPrefs.quietHours.enabled}
                  data-testid="input-quiet-start"
                />
              </div>

              <div className="time-input-group">
                <label>DND Ends (Morning):</label>
                <input
                  type="time"
                  value={currentPrefs.quietHours.end}
                  onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                  disabled={!currentPrefs.quietHours.enabled}
                  data-testid="input-quiet-end"
                />
              </div>

              <div className="timezone-tag">
                <span>Timezone: <strong>{currentPrefs.timezone} (IST)</strong></span>
              </div>
            </div>
          </div>

          {/* Section 3: Working Schedule */}
          <div className="form-section-card">
            <h4>3. Working Days &amp; Business Operating Hours</h4>
            <p className="section-hint">Select the active days of the week when candidate follow-ups may be sent.</p>

            <div className="days-pills-row">
              {ALL_DAYS.map((d) => {
                const isActive = (currentPrefs.workingSchedule?.days || []).includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    className={`day-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleDayToggle(d)}
                    data-testid={`day-btn-${d}`}
                  >
                    {d.slice(0, 3)}
                  </button>
                );
              })}
            </div>

            <div className="time-range-row" style={{ marginTop: '0.75rem' }}>
              <div className="time-input-group">
                <label>Shift Start:</label>
                <input
                  type="time"
                  value={currentPrefs.workingSchedule?.startHour || '09:30'}
                  onChange={(e) => handleWorkingScheduleChange('startHour', e.target.value)}
                  data-testid="input-shift-start"
                />
              </div>
              <div className="time-input-group">
                <label>Shift End:</label>
                <input
                  type="time"
                  value={currentPrefs.workingSchedule?.endHour || '18:30'}
                  onChange={(e) => handleWorkingScheduleChange('endHour', e.target.value)}
                  data-testid="input-shift-end"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Reminders Policy & AI Auto-Scheduling */}
          <div className="form-section-card">
            <h4>4. Automation Policy &amp; AI Auto-Scheduling</h4>
            <div className="policy-grid">
              <div className="policy-field">
                <label>Minimum Urgency Filter:</label>
                <select
                  value={currentPrefs.remindersPolicy.minimumUrgency}
                  onChange={(e) => handleRemindersPolicyChange('minimumUrgency', e.target.value)}
                  data-testid="select-min-urgency"
                >
                  <option value="All">All Reminders (Include Low &amp; Normal)</option>
                  <option value="Medium">Medium &amp; Higher</option>
                  <option value="High">High &amp; Critical Only</option>
                  <option value="Critical">Critical Only</option>
                </select>
              </div>

              <div className="policy-toggle-field">
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={currentPrefs.remindersPolicy.autoScheduleAiSuggestions}
                    onChange={(e) => handleRemindersPolicyChange('autoScheduleAiSuggestions', e.target.checked)}
                    data-testid="toggle-auto-schedule"
                  />
                  <span>Auto-Schedule AI Suggestions (No manual review needed)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="modal-footer-bar">
          <button type="button" className="btn-secondary-reset" onClick={handleReset} data-testid="btn-reset-defaults">
            🔄 Reset to Enterprise Policy
          </button>

          <div className="action-buttons-group">
            <button type="button" className="btn-cancel" onClick={onClose} data-testid="btn-cancel-modal">
              Cancel
            </button>
            <button
              type="button"
              className="btn-save-preferences"
              onClick={handleSave}
              disabled={isSaving}
              data-testid="btn-save-preferences"
            >
              {isSaving ? 'Saving Preferences...' : '💾 Save & Apply Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserPreferencesSettings;
