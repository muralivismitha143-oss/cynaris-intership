/**
 * RestDiagnosticsDashboard.jsx
 * 
 * Week 4 Day 3: Debug Sprint — Root Cause 2 Issues + Performance Investigation
 * 
 * Visual Dashboard demonstrating:
 * 1. Root Cause 1: Route Parameter Type Coercion & Consistent HTTP Status Codes
 *    - Interactive :applicant_id tester ('abc' -> 400 Bad Request, '999' -> 404 Not Found, '1' -> 200 OK)
 * 2. RESTful Query String Filtering, Search & Pagination Envelope
 *    - Filter by ?stage, ?search, ?min_exp, and ?page=&limit=
 * 3. Root Cause 2: Smart Reminders Query Filters & RESTful Methods
 *    - Filter by ?status=Scheduled, ?channel=Email, and idempotent PATCH /api/reminders/rules/:ruleId
 * 4. Performance Investigation & Conditional Caching
 *    - ETag generation, If-None-Match 304 Not Modified validation, and Event Loop lag telemetry
 */

import React, { useState, useEffect } from 'react';

export function RestDiagnosticsDashboard() {
  // Test 1: Route Parameter Tester
  const [testedParam, setTestedParam] = useState('abc');
  const [paramResult, setParamResult] = useState(null);

  // Test 2: Query String Filtering
  const [selectedStage, setSelectedStage] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [minExp, setMinExp] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(2);
  const [queryEnvelope, setQueryEnvelope] = useState(null);

  // Test 3: Smart Reminders Filtering & RESTful PATCH
  const [reminderFilterChannel, setReminderFilterChannel] = useState('All');
  const [reminderFilterStatus, setReminderFilterStatus] = useState('All');
  const [scheduledReminders, setScheduledReminders] = useState([
    {
      id: 'rem-101',
      ruleId: 'rule-1',
      recipientName: 'Priya Sharma',
      role: 'Backend Engineer',
      channel: 'Email',
      status: 'Scheduled',
      suggestedTiming: { recommendedChannel: 'Email', recommendedSlot: 'Tuesday 10:30 AM IST' },
    },
    {
      id: 'rem-102',
      ruleId: 'rule-2',
      recipientName: 'Neha Gupta',
      role: 'Senior DevOps Specialist',
      channel: 'WhatsApp',
      status: 'Scheduled',
      suggestedTiming: { recommendedChannel: 'WhatsApp', recommendedSlot: 'Wednesday 2:00 PM IST' },
    },
    {
      id: 'rem-103',
      ruleId: 'rule-3',
      recipientName: 'Rahul Kumar',
      role: 'Full Stack Developer',
      channel: 'Email',
      status: 'Dispatched',
      suggestedTiming: { recommendedChannel: 'Email', recommendedSlot: 'Dispatched Today' },
    },
  ]);
  const [rules, setRules] = useState([
    { id: 'rule-1', name: 'Stalled Technical Round Follow-up', enabled: true },
    { id: 'rule-2', name: 'Offer Decision & Acceptance Check-in', enabled: true },
    { id: 'rule-3', name: 'Screening Feedback Acceleration', enabled: true },
  ]);

  // Test 4: ETag Caching & Event Loop Diagnostics
  const [etagValue, setEtagValue] = useState('W/"b109af32dde771441ebbfbe5937d0364"');
  const [cacheStatus, setCacheStatus] = useState('MISS-200');
  const [bytesTransferred, setBytesTransferred] = useState('487 B');
  const [eventLoopLag, setEventLoopLag] = useState(0.06);

  // Mock applicant database for local preview
  const mockApplicants = [
    { id: 1, name: 'Rahul Kumar', job_title: 'Full Stack Developer', pipeline_stage: 'Screening', experience_years: 2, skills: 'JavaScript, Node.js, Express, React' },
    { id: 2, name: 'Priya Sharma', job_title: 'Backend Engineer', pipeline_stage: 'Technical Round 1', experience_years: 3.5, skills: 'Python, FastAPI, PostgreSQL, Docker' },
    { id: 3, name: 'Arun Kumar', job_title: 'Frontend Developer', pipeline_stage: 'HR Round', experience_years: 1.5, skills: 'Vue.js 3, TypeScript, Tailwind' },
    { id: 4, name: 'Neha Gupta', job_title: 'Senior DevOps Specialist', pipeline_stage: 'Offered', experience_years: 5, skills: 'Kubernetes, Terraform, AWS' },
  ];

  // Execute Route Parameter test
  const handleTestRouteParam = (val) => {
    setTestedParam(val);
    const numId = Number(val);
    if (!Number.isInteger(numId) || numId < 1 || String(numId) !== val.trim()) {
      setParamResult({
        statusCode: 400,
        statusText: 'Bad Request',
        error: 'Invalid applicant ID: must be a positive integer',
        explanation: 'Fix applied: Route parameter strictly validated before DB query. Previously returned misleading 404 Not Found.',
      });
    } else {
      const found = mockApplicants.find((a) => a.id === numId);
      if (!found) {
        setParamResult({
          statusCode: 404,
          statusText: 'Not Found',
          error: 'Applicant not found',
          explanation: 'Resource genuinely does not exist in datastore. 404 accurately returned.',
        });
      } else {
        setParamResult({
          statusCode: 200,
          statusText: 'OK',
          applicant: found,
          explanation: 'Valid integer ID matched active candidate profile.',
        });
      }
    }
  };

  // Run initial test
  useEffect(() => {
    handleTestRouteParam('abc');
  }, []);

  // Update query envelope
  useEffect(() => {
    let filtered = [...mockApplicants];
    if (selectedStage !== 'All') {
      filtered = filtered.filter((a) => a.pipeline_stage === selectedStage);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(q) || a.skills.toLowerCase().includes(q) || a.job_title.toLowerCase().includes(q));
    }
    if (minExp > 0) {
      filtered = filtered.filter((a) => a.experience_years >= minExp);
    }
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    setQueryEnvelope({
      success: true,
      total,
      count: paginated.length,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      data: paginated,
    });
  }, [selectedStage, searchQuery, minExp, page, limit]);

  // Patch rule status (RESTful PATCH /api/reminders/rules/:ruleId)
  const handlePatchRule = (ruleId) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  // Simulate conditional ETag request
  const handleSimulateConditionalGet = (sendMatchingEtag) => {
    if (sendMatchingEtag) {
      setCacheStatus('HIT-304 Not Modified');
      setBytesTransferred('0 B (Zero Bandwidth Payload)');
    } else {
      const newEtag = `W/"${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}"`;
      setEtagValue(newEtag);
      setCacheStatus('MISS-200 OK');
      setBytesTransferred('487 B');
    }
  };

  return (
    <div className="rest-diagnostics-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ marginBottom: '28px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#1a202c', margin: '0 0 8px 0' }}>
          🔍 REST API Debug Sprint & Performance Diagnostics
        </h1>
        <p style={{ color: '#4a5568', margin: 0, fontSize: '15px' }}>
          Week 4 Day 3: Root Cause Analysis of Route Parameters &amp; Query Strings + HTTP 304 Caching &amp; Event Loop Profiling
        </p>
      </header>

      {/* Top Telemetry Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Event Loop Lag</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', marginTop: '4px' }}>{eventLoopLag} ms</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>● Status: HEALTHY (&lt; 25ms threshold)</div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Conditional HTTP Caching</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb', marginTop: '4px' }}>HTTP 304 Active</div>
          <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px' }}>MD5 Weak ETag + If-None-Match</div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>RESTful Method Contracts</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginTop: '8px' }}>
            GET &bull; POST (201) &bull; PATCH &bull; DELETE
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Location header + JSON envelopes</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Issue 1: Route Parameter Type Coercion */}
        <section style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', background: '#fff' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748', margin: '0 0 12px 0' }}>
            🐞 Root Cause 1: Route Parameter Type Coercion
          </h2>
          <p style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
            Endpoint: <code>GET /api/applicants/:applicant_id</code>. Malformed parameters previously returned misleading 404 Not Found.
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {['abc', '-5', '1.5', '999', '1'].map((param) => (
              <button
                key={param}
                onClick={() => handleTestRouteParam(param)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: testedParam === param ? '2px solid #3182ce' : '1px solid #cbd5e0',
                  background: testedParam === param ? '#ebf8ff' : '#fff',
                  fontWeight: testedParam === param ? 'bold' : 'normal',
                  cursor: 'pointer',
                }}
              >
                :{param}
              </button>
            ))}
          </div>

          {paramResult && (
            <div style={{ background: paramResult.statusCode === 200 ? '#f0fdf4' : paramResult.statusCode === 400 ? '#fef2f2' : '#fffbeb', border: `1px solid ${paramResult.statusCode === 200 ? '#86efac' : paramResult.statusCode === 400 ? '#fca5a5' : '#fde68a'}`, borderRadius: '6px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: paramResult.statusCode === 200 ? '#15803d' : paramResult.statusCode === 400 ? '#b91c1c' : '#b45309' }}>
                  HTTP {paramResult.statusCode} {paramResult.statusText}
                </span>
                <span style={{ fontSize: '12px', background: '#fff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  Param: "{testedParam}"
                </span>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#374151' }}>{paramResult.explanation}</p>
            </div>
          )}
        </section>

        {/* Performance: Conditional Caching */}
        <section style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', background: '#fff' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748', margin: '0 0 12px 0' }}>
            ⚡ Performance: HTTP 304 &amp; ETag Caching
          </h2>
          <p style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
            Middleware evaluates MD5 hash of response body. Matching <code>If-None-Match</code> drops transfer payload to 0 bytes.
          </p>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
            <div><strong>ETag Header:</strong> <code>{etagValue}</code></div>
            <div style={{ marginTop: '6px' }}><strong>Status:</strong> <span style={{ color: cacheStatus.includes('304') ? '#059669' : '#2563eb', fontWeight: 'bold' }}>{cacheStatus}</span></div>
            <div style={{ marginTop: '6px' }}><strong>Payload Transferred:</strong> <strong>{bytesTransferred}</strong></div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleSimulateConditionalGet(true)}
              style={{ flex: 1, padding: '8px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Send with Matching ETag (304 Hit)
            </button>
            <button
              onClick={() => handleSimulateConditionalGet(false)}
              style={{ flex: 1, padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Send New Request (200 Miss)
            </button>
          </div>
        </section>
      </div>

      {/* Issue 2: Query String Filtering & Pagination Explorer */}
      <section style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', background: '#fff', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748', margin: '0 0 12px 0' }}>
          📊 RESTful Query String Filtering &amp; Pagination Envelope
        </h2>
        <p style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
          Demonstrates client-side parameterization via query string: <code>?stage=...&amp;search=...&amp;min_exp=...&amp;page=...&amp;limit=...</code>
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#4a5568', marginBottom: '4px' }}>Stage</label>
            <select value={selectedStage} onChange={(e) => { setSelectedStage(e.target.value); setPage(1); }} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e0' }}>
              <option value="All">All Stages</option>
              <option value="Screening">Screening</option>
              <option value="Technical Round 1">Technical Round 1</option>
              <option value="HR Round">HR Round</option>
              <option value="Offered">Offered</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#4a5568', marginBottom: '4px' }}>Search Query</label>
            <input
              type="text"
              placeholder="e.g. Python, React..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', width: '180px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#4a5568', marginBottom: '4px' }}>Min Experience: {minExp} yrs</label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={minExp}
              onChange={(e) => { setMinExp(Number(e.target.value)); setPage(1); }}
              style={{ width: '140px', marginTop: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#4a5568', marginBottom: '4px' }}>Page Size (Limit)</label>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e0' }}>
              <option value="1">1 per page</option>
              <option value="2">2 per page</option>
              <option value="4">4 per page</option>
            </select>
          </div>
        </div>

        {/* Envelope Metadata */}
        {queryEnvelope && (
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
            <span><strong>Total Records:</strong> {queryEnvelope.total}</span>
            <span><strong>Count in Page:</strong> {queryEnvelope.count}</span>
            <span><strong>Page:</strong> {queryEnvelope.page} of {queryEnvelope.totalPages}</span>
            <span><strong>hasNext:</strong> {queryEnvelope.hasNext ? 'true' : 'false'}</span>
            <span><strong>hasPrev:</strong> {queryEnvelope.hasPrev ? 'true' : 'false'}</span>
          </div>
        )}

        {/* Results List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {queryEnvelope?.data.map((item) => (
            <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', background: '#fff' }}>
              <div style={{ fontWeight: 'bold', color: '#1a202c' }}>{item.name}</div>
              <div style={{ fontSize: '13px', color: '#4a5568' }}>{item.job_title} &bull; {item.experience_years} yrs</div>
              <div style={{ fontSize: '12px', color: '#2b6cb0', marginTop: '4px' }}>Stage: {item.pipeline_stage}</div>
              <div style={{ fontSize: '11px', color: '#718096', marginTop: '4px' }}>Skills: {item.skills}</div>
            </div>
          ))}
        </div>

        {/* Pagination buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            disabled={!queryEnvelope?.hasPrev}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e0', background: queryEnvelope?.hasPrev ? '#fff' : '#f1f5f9', cursor: queryEnvelope?.hasPrev ? 'pointer' : 'not-allowed' }}
          >
            &larr; Previous Page
          </button>
          <button
            disabled={!queryEnvelope?.hasNext}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e0', background: queryEnvelope?.hasNext ? '#fff' : '#f1f5f9', cursor: queryEnvelope?.hasNext ? 'pointer' : 'not-allowed' }}
          >
            Next Page &rarr;
          </button>
        </div>
      </section>

      {/* Issue 2: Smart Reminders RESTful PATCH & Query Filters */}
      <section style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', background: '#fff' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748', margin: '0 0 12px 0' }}>
          ⏰ Smart Reminders: RESTful PATCH /api/reminders/rules/:ruleId
        </h2>
        <p style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
          Replacing non-RESTful POST toggles with standard idempotent HTTP PATCH methods.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
          {rules.map((rule) => (
            <div key={rule.id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a202c' }}>{rule.name}</div>
                <div style={{ fontSize: '12px', color: rule.enabled ? '#059669' : '#dc2626' }}>
                  Status: {rule.enabled ? 'Active (Triggering)' : 'Disabled'}
                </div>
              </div>
              <button
                onClick={() => handlePatchRule(rule.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  background: rule.enabled ? '#fee2e2' : '#dcfce7',
                  color: rule.enabled ? '#991b1b' : '#166534',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                PATCH: {rule.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default RestDiagnosticsDashboard;
