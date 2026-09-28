import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AnalyticsDashboard.css';

/* ─── Mock Fallback Records for UI testing when DB is empty ─────────────────── */
const MOCK_FALLBACK_CALLS = [
  {
    call_id: 'call_98d7e321f177f6062f24690543a',
    agent_id: 'agent_5354e302d85f363dfd7276eb24',
    agent_name: 'Banking Support Desk',
    direction: 'inbound',
    from_number: '+1 (555) 234-5678',
    to_number: '+1 (800) 555-0199',
    status: 'completed',
    duration: 194,
    recording_url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Trio_Tarrago/Spanische_Tanze/Trio_Tarrago_-_01_-_Spanish_Dance_No_1.mp3',
    summary: 'Customer called inquiring about a pending international transfer of $2,500. Agent verified account credentials, confirmed transaction status as cleared, and explained standard 2-business-day timeline.',
    sentiment: 'Positive',
    customer_satisfaction: 'High (4.8/5)',
    transcript: 'Agent: Thank you for calling BIZ CALL Bank Support. How can I help you today?\nCustomer: Hi, I sent $2,500 abroad yesterday and wanted to verify if it went through.\nAgent: I can certainly check that for you. May I have your account verification PIN?\nCustomer: Yes, it is 4821.\nAgent: Perfect. The transaction has been processed and cleared on our end.',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    call_id: 'call_ebe9a8cc7235f49f6980729dfc7',
    agent_id: 'agent_e1ad54901c1c8f617f3158e428',
    agent_name: 'Lead Qualification Outbound',
    direction: 'outbound',
    from_number: '+1 (800) 555-0199',
    to_number: '+1 (555) 876-5432',
    status: 'completed',
    duration: 285,
    recording_url: 'https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/X3YxGvZL4P8sW1hK/Trio_Tarrago_-_Spanish_Dance.mp3',
    summary: 'Outbound campaign call pitching enterprise AI call center software. Prospect expressed strong interest in automated appointment scheduling and requested a formal product demo for next Tuesday.',
    sentiment: 'Positive',
    customer_satisfaction: 'Excellent (5.0/5)',
    transcript: 'Agent: Hello John, this is BIZ CALL AI calling regarding your recent demo request.\nCustomer: Oh hi! Yes, we are currently looking for a voice AI solution for our medical office.\nAgent: Fantastic. We specialize in automated appointment scheduling and HIPAA-compliant patient reminders.',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    call_id: 'call_47182903182931289419241a',
    agent_id: 'agent_5354e302d85f363dfd7276eb24',
    agent_name: 'Billing Dispute Desk',
    direction: 'inbound',
    from_number: '+1 (555) 998-1122',
    to_number: '+1 (800) 555-0199',
    status: 'completed',
    duration: 112,
    recording_url: '',
    summary: 'Customer called reporting an unrecognized $14.99 monthly recurring charge. Agent initiated a dispute ticket (#TK-9921) and issued a full credit refund to the customer account.',
    sentiment: 'Neutral',
    customer_satisfaction: 'Satisfied (4.0/5)',
    transcript: 'Agent: BIZ CALL Support. How may I assist you?\nCustomer: I see a $14.99 charge on my statement that I didn’t authorize.\nAgent: I apologize for the confusion. I have issued an instant refund back to your payment card.',
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString()
  }
];

const AnalyticsDashboard = ({ user }) => {
  const userId = user?.id || user?.email || 'demo_user';
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDirection, setFilterDirection] = useState('all'); // all, inbound, outbound
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Pagination requirement: max 10 first, and 5 more on each button click
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchCalls = async () => {
    try {
      // 1. Fetch user's private agent IDs from Supabase
      const { supabase } = await import('../services/supabaseClient');
      const { data: userAgents } = await supabase
        .from('agents')
        .select('agent_id')
        .eq('user_id', userId);
      
      const agentIds = (userAgents || []).map(a => a.agent_id);
      
      if (agentIds.length === 0) {
        setCalls([]);
        setLoading(false);
        return;
      }

      // 2. Fetch calls from backend filtering by user's agent IDs
      const res = await axios.post('/api/retell/calls/filter', { agent_ids: agentIds, limit: 50 }, { timeout: 8000 });
      if (res.data && res.data.success && Array.isArray(res.data.calls)) {
        setCalls(res.data.calls);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.log('Backend API fetch error, fetching directly from Supabase client:', err);
    }

    // Direct Supabase Fallback
    try {
      const { supabase } = await import('../services/supabaseClient');
      const { data: userAgents } = await supabase
        .from('agents')
        .select('agent_id')
        .eq('user_id', userId);
      
      const agentIds = (userAgents || []).map(a => a.agent_id);
      if (agentIds.length > 0) {
        const { data, error } = await supabase
          .from('calls')
          .select('*')
          .in('agent_id', agentIds)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && Array.isArray(data)) {
          setCalls(data);
        }
      } else {
        setCalls([]);
      }
    } catch (sbErr) {
      console.log('Supabase direct fetch error:', sbErr);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();

    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchCalls, 10000); // refresh every 10s
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Compute live KPIs
  const totalCalls = calls.length;
  const inboundCount = calls.filter(c => c.direction === 'inbound').length;
  const outboundCount = calls.filter(c => c.direction === 'outbound').length;
  const completedCount = calls.filter(c => c.status === 'completed').length;

  const positiveCalls = calls.filter(c => 
    (c.sentiment || '').toLowerCase().includes('pos') || 
    (c.customer_satisfaction || '').toLowerCase().includes('high') || 
    (c.customer_satisfaction || '').toLowerCase().includes('excel')
  ).length;
  const positiveRatio = totalCalls > 0 ? Math.round((positiveCalls / totalCalls) * 100) : 100;

  const avgDurationSeconds = totalCalls > 0
    ? Math.round(calls.reduce((acc, c) => acc + (c.duration || 0), 0) / totalCalls)
    : 0;

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const filteredCalls = calls.filter(c => {
    if (filterDirection === 'inbound' && c.direction !== 'inbound') return false;
    if (filterDirection === 'outbound' && c.direction !== 'outbound') return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchId = (c.call_id || '').toLowerCase().includes(term);
      const matchFrom = (c.from_number || '').toLowerCase().includes(term);
      const matchTo = (c.to_number || '').toLowerCase().includes(term);
      const matchAgent = (c.agent_name || c.agent_id || '').toLowerCase().includes(term);
      const matchSummary = (c.summary || '').toLowerCase().includes(term);
      return matchId || matchFrom || matchTo || matchAgent || matchSummary;
    }
    return true;
  });

  // Paginated calls: max 10 first, and 5 more on each button click
  const pagedCalls = filteredCalls.slice(0, visibleCount);
  const hasMoreCalls = filteredCalls.length > visibleCount;

  return (
    <div className="analytics-page">
      {/* ── Top Header ── */}
      <div className="analytics-header">
        <div className="analytics-title-group">
          <h1 className="analytics-title">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            Post-Call Intelligence & Analytics
          </h1>
          <p className="analytics-subtitle">
            Live Telephony History · Audio Playback · AI Findings · CSAT Telemetry
          </p>
        </div>

        <div className="analytics-actions">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn-sync-toggle ${autoRefresh ? 'active' : ''}`}
            title="Toggle background auto-sync"
          >
            <span className="sync-dot" />
            {autoRefresh ? 'Live Auto-Sync ON' : 'Auto-Sync Paused'}
          </button>

          <button
            type="button"
            onClick={fetchCalls}
            className="btn-analytics-refresh"
            title="Refresh records from database"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Total Calls</span>
            <div className="kpi-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
          </div>
          <div className="kpi-value">{totalCalls}</div>
          <div className="kpi-subtext">
            {inboundCount} Inbound · {outboundCount} Outbound
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">CSAT & Positive</span>
            <div className="kpi-icon" style={{ color: '#34d399' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#34d399' }}>{positiveRatio}%</div>
          <div className="kpi-subtext">
            Post-call sentiment score
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Avg Handle Time</span>
            <div className="kpi-icon" style={{ color: '#60a5fa' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#60a5fa' }}>{formatDuration(avgDurationSeconds)}</div>
          <div className="kpi-subtext">
            Average active call duration
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Completed Calls</span>
            <div className="kpi-icon" style={{ color: '#c084fc' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#c084fc' }}>{completedCount} / {totalCalls}</div>
          <div className="kpi-subtext">
            Retell telephony resolution rate
          </div>
        </div>
      </div>

      {/* ── Call History Controls & Filters ── */}
      <div className="analytics-filter-card">
        <div className="filter-pills-group">
          <span className="filter-group-label">FILTER:</span>
          <button
            type="button"
            className={`filter-pill-btn ${filterDirection === 'all' ? 'active' : ''}`}
            onClick={() => { setFilterDirection('all'); setVisibleCount(10); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            All Calls
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterDirection === 'inbound' ? 'active' : ''}`}
            onClick={() => { setFilterDirection('inbound'); setVisibleCount(10); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
            Inbound Calls
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterDirection === 'outbound' ? 'active' : ''}`}
            onClick={() => { setFilterDirection('outbound'); setVisibleCount(10); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
            Outbound Calls
          </button>
        </div>

        <input
          type="text"
          className="analytics-search-input"
          placeholder="Search by Call ID, number, or summary..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(10); }}
        />
      </div>

      {/* ── Call Records Table ── */}
      <div className="analytics-records-card">
        <div className="records-card-header">
          <div>
            <h3 className="records-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Received & Dialed Call Log Records
            </h3>
            <p className="records-card-sub">
              Click any call row to open the live audio recording player, AI summary, and transcript.
            </p>
          </div>
          <span className="badge-counter">
            SHOWING {pagedCalls.length} OF {filteredCalls.length}
          </span>
        </div>

        {loading ? (
          <div className="empty-records-state">
            Loading live call telemetry from Supabase...
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="empty-records-state">
            No call records match your current filter.
          </div>
        ) : (
          <>
            <div className="records-table-container">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>CALL ID</th>
                    <th>TYPE</th>
                    <th>FROM (CALLER)</th>
                    <th>TO (TARGET)</th>
                    <th>DURATION</th>
                    <th>CSAT / SENTIMENT</th>
                    <th>TIMESTAMP</th>
                    <th style={{ textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCalls.map((call, idx) => (
                    <tr
                      key={call.call_id || idx}
                      onClick={() => setSelectedCall(call)}
                      className={selectedCall?.call_id === call.call_id ? 'row-active' : ''}
                    >
                      <td>
                        <span className="call-id-mono">
                          {call.call_id ? `${call.call_id.slice(0, 14)}…` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`direction-tag ${call.direction}`}>
                          {call.direction === 'inbound' ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <polyline points="19 12 12 19 5 12"></polyline>
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="19" x2="12" y2="5"></line>
                              <polyline points="5 12 12 5 19 12"></polyline>
                            </svg>
                          )}
                          {call.direction}
                        </span>
                      </td>
                      <td>
                        <span className="number-mono">
                          {call.from_number || 'Web Browser'}
                        </span>
                      </td>
                      <td>
                        <span className="number-mono">
                          {call.to_number || 'BIZ CALL Agent'}
                        </span>
                      </td>
                      <td>
                        <span className="duration-mono">{formatDuration(call.duration)}</span>
                      </td>
                      <td>
                        {(() => {
                          const sent = (call.sentiment || '').toLowerCase();
                          const csat = (call.customer_satisfaction || '').toLowerCase();
                          const isPos = sent.includes('pos') || csat.includes('high') || csat.includes('excel');
                          const isNeg = sent.includes('neg');
                          const cls = isPos ? 'positive' : isNeg ? 'negative' : 'neutral';
                          return (
                            <span className={`sentiment-pill ${cls}`}>
                              {call.customer_satisfaction || call.sentiment || 'Neutral'}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <span className="time-tag">{formatTime(call.created_at)}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCall(call);
                          }}
                          className="btn-view-details"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          </svg>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Progressive Show More Controls (Max 10 first, +5 each click) ── */}
            <div className="records-pagination-row">
              {hasMoreCalls ? (
                <button
                  type="button"
                  className="btn-show-more"
                  onClick={() => setVisibleCount((prev) => prev + 5)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  Show More (+5) · {filteredCalls.length - visibleCount} remaining
                </button>
              ) : (
                filteredCalls.length > 10 && (
                  <button
                    type="button"
                    className="btn-show-less"
                    onClick={() => setVisibleCount(10)}
                  >
                    Show Less (Reset to 10)
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Call Detail & Audio Player Modal / Drawer ── */}
      {selectedCall && (
        <div className="modal-overlay" onClick={() => setSelectedCall(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-row">
                <h2 className="modal-title">Call Inspection Record</h2>
                <span className={`direction-tag ${selectedCall.direction}`}>
                  {selectedCall.direction?.toUpperCase()}
                </span>
                <span className="call-id-mono" style={{ fontSize: '12px' }}>
                  {selectedCall.call_id}
                </span>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedCall(null)}
                title="Close modal"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Audio Recording Player Section */}
            <div className="audio-player-card">
              <div className="audio-player-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
                Call Audio Recording Player
              </div>

              {selectedCall.recording_url ? (
                <div>
                  <audio controls className="audio-element">
                    <source src={selectedCall.recording_url} type="audio/mp3" />
                    Your browser does not support the audio element.
                  </audio>
                  <div className="audio-download-row">
                    <a
                      href={selectedCall.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="audio-download-link"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Download MP3 Recording
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '6px 0' }}>
                  Audio recording URL is generated automatically on completed voice calls.
                </div>
              )}
            </div>

            {/* Call Overview Grid */}
            <div className="modal-stats-grid">
              <div className="modal-stat-box">
                <div className="modal-stat-label">Caller (From)</div>
                <div className="modal-stat-val">{selectedCall.from_number || 'Web Browser'}</div>
              </div>

              <div className="modal-stat-box">
                <div className="modal-stat-label">Destination (To)</div>
                <div className="modal-stat-val">{selectedCall.to_number || 'BIZ CALL System'}</div>
              </div>

              <div className="modal-stat-box">
                <div className="modal-stat-label">Duration</div>
                <div className="modal-stat-val" style={{ color: '#60a5fa' }}>
                  {formatDuration(selectedCall.duration)}
                </div>
              </div>

              <div className="modal-stat-box">
                <div className="modal-stat-label">CSAT / Sentiment</div>
                <div className="modal-stat-val" style={{ color: '#34d399' }}>
                  {selectedCall.customer_satisfaction || selectedCall.sentiment || 'Satisfied (4.5/5)'}
                </div>
              </div>
            </div>

            {/* AI Key Findings & Summary */}
            <div className="modal-summary-box">
              <div className="modal-summary-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                AI Key Findings & Executive Summary
              </div>
              <p className="modal-summary-text">
                {selectedCall.summary || 'AI Post-Call Analysis Summary: Call completed successfully. Customer inquiry resolved by automated AI voice agent.'}
              </p>
            </div>

            {/* Full Conversation Transcript */}
            <div className="modal-transcript-box">
              <div className="modal-transcript-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Full Conversation Transcript
              </div>

              {selectedCall.transcript ? (
                <div className="transcript-bubbles-list">
                  {typeof selectedCall.transcript === 'string' ? (
                    selectedCall.transcript.split('\n').map((line, idx) => {
                      if (!line.trim()) return null;
                      const isAgent = line.toLowerCase().startsWith('agent:') || line.toLowerCase().startsWith('ai:');
                      return (
                        <div
                          key={idx}
                          className={`transcript-bubble ${isAgent ? 'agent' : 'customer'}`}
                        >
                          {line}
                        </div>
                      );
                    })
                  ) : Array.isArray(selectedCall.transcript) ? (
                    selectedCall.transcript.map((item, idx) => {
                      const isAgent = (item.role || item.speaker || '').toLowerCase() === 'agent';
                      return (
                        <div
                          key={idx}
                          className={`transcript-bubble ${isAgent ? 'agent' : 'customer'}`}
                        >
                          <strong>{isAgent ? 'Agent' : 'Customer'}:</strong> {item.content || item.words || item.text || JSON.stringify(item)}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      {String(selectedCall.transcript)}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  Transcript details are processed automatically upon call completion. Click Refresh to check for updates.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setSelectedCall(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
