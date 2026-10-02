import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../services/supabaseClient';
import { useRetellWebCall } from '../hooks/useRetellWebCall';
import './RetellLiveCalls.css';

const API_BASE_URL = '/api/retell';
const MAX_SLOTS = 5;

const emptySlots = () => Array.from({ length: MAX_SLOTS }, () => null);

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '--:--';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function useCallTimer(startedAt, active) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active || !startedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, active]);
  return elapsed;
}

const isCallActive = (call) => {
  if (!call) return false;
  const isStale = call.created_at && (Date.now() - new Date(call.created_at).getTime()) > 15 * 60 * 1000;
  return !isStale && ['active', 'ringing', 'registered'].includes(call.status);
};

const CallSlot = ({ call, direction, onHangup }) => {
  const active = isCallActive(call);
  const elapsed = useCallTimer(call?.created_at, active);

  if (!active) {
    return (
      <div className="call-slot call-slot-empty">
        <div className="slot-dotted-icon">
          {direction === 'inbound' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          )}
        </div>
        <span>{direction === 'inbound' ? 'Waiting for Line…' : 'Line Idle'}</span>
      </div>
    );
  }

  return (
    <div className={`call-slot call-slot-active status-${call.status}`}>
      <div className="slot-top-row">
        <span className={`status-dot ${active ? 'glow' : ''}`} />
        <span className="slot-number" title={direction === 'inbound' ? call.from_number : call.to_number}>
          {direction === 'inbound' ? call.from_number : call.to_number}
        </span>
      </div>
      <div className="wave" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <div className="slot-meta">
        <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {call.agent_name || 'Agent'}
        </span>
        <span className="slot-timer">{formatDuration(elapsed)}</span>
      </div>
      {active && (
        <button className="slot-hangup-btn" onClick={() => onHangup(call.call_id)}>
          Disconnect
        </button>
      )}
    </div>
  );
};

const RetellLiveCalls = ({ user }) => {
  const userId = user?.id || user?.email || 'demo_user';

  const [agents, setAgents] = useState([]);
  const [callMode, setCallMode] = useState('phone'); // 'phone' | 'simulated'
  const [simulatedLeads, setSimulatedLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [toNumber, setToNumber] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [activeInboundAgentId, setActiveInboundAgentId] = useState('');
  const [activeInboundPhone, setActiveInboundPhone] = useState('');
  const [settingLiveInbound, setSettingLiveInbound] = useState(false);
  const [dynamicVarsText, setDynamicVarsText] = useState('{}');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Separate pools for outbound calling and inbound routing
  const outboundAgents = agents.filter((a) => a.call_type === 'outbound');
  const inboundAgents = agents.filter((a) => a.call_type === 'inbound');

  const [inboundSlots, setInboundSlots] = useState(emptySlots());
  const [outboundSlots, setOutboundSlots] = useState(emptySlots());
  const [history, setHistory] = useState([]);
  const [expandedCallId, setExpandedCallId] = useState(null);

  // Pagination for logs: 5 initially, show more by 5
  const [visibleLogsCount, setVisibleLogsCount] = useState(5);

  // Simulated call states
  const [outboundRequest, setOutboundRequest] = useState(null);
  const [inboundRequest, setInboundRequest] = useState(null);
  const [incomingQueue, setIncomingQueue] = useState([]);
  const incomingCall = incomingQueue[0] || null;

  const { callStatus, isCalling, activeCallId, startWebCall, stopWebCall } = useRetellWebCall();
  const channelRef = useRef(null);

  // Load agents + leads
  useEffect(() => {
    const load = async () => {
      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      const loadedAgents = agentData || [];
      setAgents(loadedAgents);

      // Default the outbound dialer strictly to an outbound agent
      const outb = loadedAgents.filter((a) => a.call_type === 'outbound');
      if (outb.length > 0) {
        setSelectedAgentId(outb[0].agent_id);
      } else {
        setSelectedAgentId('');
      }

      const { data: leadData } = await supabase
        .from('simulated_leads')
        .select('*')
        .order('label', { ascending: true });
      setSimulatedLeads(leadData || []);
      if (leadData && leadData.length > 0) setSelectedLeadId(leadData[0].id);

      try {
        const cfg = await axios.get('/api/health/config');
        if (cfg.data?.TWILIO_PHONE_NUMBER) setFromNumber(cfg.data.TWILIO_PHONE_NUMBER);
      } catch (e) {}

      // Fetch the currently active inbound agent from Retell AI
      try {
        const inbRes = await axios.get('/api/retell/active-inbound-agent');
        if (inbRes.data?.success) {
          if (inbRes.data.agent_id) setActiveInboundAgentId(inbRes.data.agent_id);
          if (inbRes.data.phone_number) setActiveInboundPhone(inbRes.data.phone_number);
        }
      } catch (e) {
        console.warn('Could not fetch active inbound agent from Retell:', e);
      }
    };
    load();
  }, [userId]);

  const applyCallToSlots = useCallback((call) => {
    const isTerminal = ['completed', 'failed', 'ended'].includes(call.status);
    const setter = call.direction === 'inbound' ? setInboundSlots : setOutboundSlots;

    setter((prev) => {
      const next = [...prev];
      const idx = next.findIndex((c) => c?.call_id === call.call_id);

      if (isTerminal) {
        if (idx !== -1) next[idx] = null;
        return next;
      }

      if (idx !== -1) {
        next[idx] = call;
        return next;
      }
      const emptyIdx = next.findIndex((c) => c === null);
      if (emptyIdx !== -1) next[emptyIdx] = call;
      return next;
    });
  }, []);

  const refreshHistory = useCallback(async () => {
    const { data: userAgents } = await supabase
      .from('agents')
      .select('agent_id')
      .eq('user_id', userId);

    const agentIds = (userAgents || []).map((a) => a.agent_id);

    if (agentIds.length === 0) {
      setHistory([]);
      return;
    }

    const { data } = await supabase
      .from('calls')
      .select('*')
      .in('agent_id', agentIds)
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory(data || []);
  }, [userId]);

  useEffect(() => {
    const bootstrap = async () => {
      const { data: userAgents } = await supabase
        .from('agents')
        .select('agent_id')
        .eq('user_id', userId);

      const agentIds = (userAgents || []).map((a) => a.agent_id);
      if (agentIds.length === 0) return;

      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('calls')
        .select('*')
        .in('status', ['registered', 'ringing', 'active'])
        .in('agent_id', agentIds)
        .gte('created_at', fifteenMinsAgo)
        .order('created_at', { ascending: false });
      (data || []).forEach(applyCallToSlots);
      await refreshHistory();
    };
    bootstrap();

    const channel = supabase
      .channel('calls-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        (payload) => {
          const call = payload.new?.call_id ? payload.new : payload.old;
          if (!call) return;
          applyCallToSlots(call);
          refreshHistory();
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [applyCallToSlots, refreshHistory]);

  // Subscribe to Inbound call_requests
  useEffect(() => {
    const inboundChannel = supabase
      .channel('inbound-requests')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_requests', filter: 'direction=eq.inbound' },
        (payload) => {
          if (payload.new && payload.new.status === 'ringing' && payload.new.lead_id !== 'dashboard') {
            setIncomingQueue((prev) => [...prev, payload.new]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'call_requests', filter: 'direction=eq.inbound' },
        (payload) => {
          if (payload.new && ['ended', 'rejected', 'answered'].includes(payload.new.status)) {
            setIncomingQueue((prev) => prev.filter((c) => c.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inboundChannel);
    };
  }, []);

  // Actions
  const handleInitiateCall = async (e) => {
    e.preventDefault();
    setStatusMsg('');

    if (callMode === 'simulated') {
      await handleInitiateSimulatedCall();
      return;
    }

    const activeOutbound = outboundSlots.filter(Boolean).length;
    if (activeOutbound >= MAX_SLOTS) {
      setStatusMsg('⚠️ Outbound limit reached (5 concurrent calls). Wait for a line to free up.');
      return;
    }

    let dynamicVariables = {};
    try {
      dynamicVariables = dynamicVarsText.trim() ? JSON.parse(dynamicVarsText) : {};
    } catch {
      setStatusMsg('⚠️ Dynamic variables must be valid JSON.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/create-phone-call`, {
        from_number: fromNumber,
        to_number: toNumber,
        override_agent_id: selectedAgentId || undefined,
        retell_llm_dynamic_variables: dynamicVariables,
      });

      if (res.data?.success) {
        setStatusMsg(`✅ Call initiated to ${toNumber}.`);
        setToNumber('');
      } else {
        throw new Error(res.data?.detail || 'Failed to initiate call');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setStatusMsg(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateSimulatedCall = async () => {
    if (!selectedLeadId) return;
    setLoading(true);
    setStatusMsg('Ringing simulated lead...');

    try {
      const { data: reqData, error } = await supabase
        .from('call_requests')
        .insert({
          lead_id: selectedLeadId,
          direction: 'outbound',
          status: 'ringing',
          agent_id: selectedAgentId || undefined,
        })
        .select()
        .single();

      if (error) throw error;
      setOutboundRequest(reqData);

      const reqChannel = supabase
        .channel(`req-${reqData.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'call_requests', filter: `id=eq.${reqData.id}` },
          async (payload) => {
            if (payload.new.status === 'answered') {
              setStatusMsg('🎙️ Connected to Simulated Lead.');
              setLoading(false);
              supabase.removeChannel(reqChannel);
            } else if (payload.new.status === 'rejected') {
              setStatusMsg('❌ Lead declined the call.');
              setLoading(false);
              supabase.removeChannel(reqChannel);
            } else if (payload.new.status === 'ended') {
              setStatusMsg('Call ended.');
              setLoading(false);
              supabase.removeChannel(reqChannel);
            }
          }
        )
        .subscribe();
    } catch (err) {
      setStatusMsg(`❌ Failed to trigger simulated call: ${err.message}`);
      setLoading(false);
    }
  };

  const handleSetActiveInboundAgent = async (agentId) => {
    if (!agentId || agentId === activeInboundAgentId) return;
    setSettingLiveInbound(true);
    try {
      const res = await axios.post('/api/retell/set-active-inbound-agent', {
        agent_id: agentId,
        phone_number: activeInboundPhone || undefined,
      });
      if (res.data?.success) {
        setActiveInboundAgentId(agentId);
        const targetAgent = agents.find((a) => a.agent_id === agentId);
        setStatusMsg(`✅ Live Inbound Agent updated to "${targetAgent?.agent_name || agentId}"! Incoming carrier & WebRTC calls will now route here.`);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setStatusMsg(`❌ Failed to update live inbound agent: ${msg}`);
    } finally {
      setSettingLiveInbound(false);
    }
  };

  const handleAcceptInbound = async () => {
    if (!incomingCall) return;
    try {
      setStatusMsg('Connecting inbound call...');
      // Strictly route to the designated active live inbound agent
      const targetAgentId = activeInboundAgentId || inboundAgents[0]?.agent_id || selectedAgentId;
      await supabase
        .from('call_requests')
        .update({
          status: 'answered',
          agent_id: targetAgentId,
        })
        .eq('id', incomingCall.id);

      setIncomingQueue((prev) => prev.slice(1));
      const ag = agents.find((a) => a.agent_id === targetAgentId);
      setStatusMsg(`🎙️ Call accepted. Routed to Live Inbound Agent: "${ag?.agent_name || 'Inbound Specialist'}"`);
    } catch (e) {
      setStatusMsg(`❌ Inbound accept failed: ${e.message}`);
    }
  };

  const handleRejectInbound = async () => {
    if (!incomingCall) return;
    await supabase
      .from('call_requests')
      .update({ status: 'rejected' })
      .eq('id', incomingCall.id);
    setIncomingQueue((prev) => prev.slice(1));
  };

  const handleHangupSimulated = async (reqId) => {
    await stopWebCall();
    await supabase
      .from('call_requests')
      .update({ status: 'ended' })
      .eq('id', reqId);

    if (outboundRequest) {
      await supabase
        .from('simulated_leads')
        .update({ status: 'idle' })
        .eq('id', outboundRequest.lead_id);
    }

    setOutboundRequest(null);
    setLoading(false);
  };

  const handleHangup = async (callId) => {
    if (isCalling && activeCallId === callId) {
      if (outboundRequest) {
        await handleHangupSimulated(outboundRequest.id);
      } else {
        await stopWebCall();
      }
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/hangup-call/${callId}`);
    } catch (err) {
      console.error('Hangup error:', err);
    }
  };

  const inboundActive = inboundSlots.filter(isCallActive).length;
  const outboundActive = outboundSlots.filter(isCallActive).length;

  // Sliced logs for pagination
  const visibleLogs = history.slice(0, visibleLogsCount);
  const hasMoreLogs = history.length > visibleLogsCount;

  return (
    <div className="live-calls-page">
      {/* Inbound Call Alert Popup */}
      {incomingCall && (
        <div className="inbound-alert-banner">
          <div className="inbound-alert-left">
            <span className="inbound-alert-pulse" />
            <div className="inbound-alert-title">
              Incoming WebRTC Call from Lead: <strong>{incomingCall.lead_id}</strong>
              {incomingQueue.length > 1 && (
                <span style={{ marginLeft: 8, color: '#f59e0b', fontSize: '12px' }}>
                  (+{incomingQueue.length - 1} queued)
                </span>
              )}
            </div>
          </div>
          <div className="inbound-alert-actions">
            <button onClick={handleAcceptInbound} className="btn-answer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Answer
            </button>
            <button onClick={handleRejectInbound} className="btn-reject">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Decline
            </button>
          </div>
        </div>
      )}

      <div className="live-calls-grid">
        {/* Outbound Trigger Panel */}
        <div className="live-card">
          <div className="live-card-header">
            <h3 className="live-card-title">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5855d6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              Initiate Outbound Call
            </h3>
            <span className="live-badge-count">{outboundActive}/{MAX_SLOTS} BUSY</span>
          </div>

          {/* Call Mode Switcher */}
          <div className="mode-toggle-group">
            <button
              type="button"
              className={`mode-btn ${callMode === 'phone' ? 'active' : ''}`}
              onClick={() => setCallMode('phone')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Real Phone (Twilio)
            </button>
            <button
              type="button"
              className={`mode-btn ${callMode === 'simulated' ? 'active' : ''}`}
              onClick={() => setCallMode('simulated')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              Simulated Lead (WebRTC)
            </button>
          </div>

          <form onSubmit={handleInitiateCall} className="live-form">
            <div className="live-form-group">
              <div className="live-label-row">
                <label className="live-label">OUTBOUND VOICE AGENT</label>
                <span className="live-label-tag">OUTBOUND ONLY</span>
              </div>
              <select
                className="live-select"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                required
              >
                <option value="" disabled>Select an outbound agent…</option>
                {outboundAgents.map((a) => (
                  <option key={a.agent_id} value={a.agent_id}>
                    {a.agent_name}
                  </option>
                ))}
              </select>
              {outboundAgents.length === 0 && (
                <span style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px', display: 'block' }}>
                  ⚠️ No outbound agents found. Deploy an outbound agent in the Inbound/Outbound Builder.
                </span>
              )}
            </div>

            {callMode === 'phone' ? (
              <>
                <div className="live-form-group">
                  <div className="live-label-row">
                    <label className="live-label">TO NUMBER</label>
                    <span className="live-label-tag">E.164</span>
                  </div>
                  <input
                    type="tel"
                    className="live-input"
                    placeholder="+15551234567"
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="live-form-group">
                  <div className="live-label-row">
                    <label className="live-label">FROM NUMBER</label>
                    <span className="live-label-tag">TWILIO_CALLER_ID</span>
                  </div>
                  <input
                    type="tel"
                    className="live-input"
                    placeholder="+15557654321"
                    value={fromNumber}
                    onChange={(e) => setFromNumber(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <div className="live-form-group">
                <label className="live-label">TARGET SIMULATED LEAD</label>
                <select
                  className="live-select"
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select simulated lead…</option>
                  {simulatedLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.label} ({lead.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="live-form-group">
              <div className="live-label-row">
                <label className="live-label">DYNAMIC VARIABLES</label>
                <span className="live-label-tag">JSON_PAYLOAD</span>
              </div>
              <textarea
                rows={2}
                className="live-textarea"
                value={dynamicVarsText}
                onChange={(e) => setDynamicVarsText(e.target.value)}
                placeholder='{"customer_name": "Alex"}'
              />
            </div>

            {isCalling ? (
              <button
                type="button"
                className="live-initiate-btn disconnect-btn"
                onClick={() => handleHangup(activeCallId)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12"></rect>
                </svg>
                Disconnect Active WebRTC Call
              </button>
            ) : (
              <button
                type="submit"
                className="live-initiate-btn"
                disabled={loading || outboundActive >= MAX_SLOTS}
              >
                {loading ? (
                  'Ringing Lead...'
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Initiate Live Outbound Call
                  </>
                )}
              </button>
            )}
          </form>

          {statusMsg && <div className="live-status-badge">{statusMsg}</div>}
          {callStatus !== 'Idle' && (
            <div style={{ color: '#818cf8', fontSize: '11.5px', marginTop: 8, fontFamily: 'DM Mono, monospace' }}>
              WebRTC Status: {callStatus}
            </div>
          )}
        </div>

        {/* Telephony Slots Monitor */}
        <div className="live-card">
          <div className="live-card-header">
            <h3 className="live-card-title">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Telephony Line Monitors
            </h3>
            <span className="live-badge-count">{inboundActive + outboundActive}/10 ACTIVE</span>
          </div>

          {/* Active Live Inbound Agent Selector Card */}
          <div className="active-inbound-card">
            <div className="active-inbound-header">
              <div className="active-inbound-title-area">
                <span className="inbound-pulse-dot" />
                <span className="active-inbound-title">ACTIVE LIVE INBOUND AGENT</span>
                {activeInboundPhone && (
                  <span className="inbound-phone-tag">
                    📞 {activeInboundPhone}
                  </span>
                )}
              </div>
              <span className={`inbound-status-pill ${activeInboundAgentId ? 'live' : ''}`}>
                {settingLiveInbound ? 'SWITCHING...' : (activeInboundAgentId ? '● LIVE INBOUND' : 'STANDBY')}
              </span>
            </div>

            <div className="active-inbound-body">
              <div className="active-inbound-desc">
                Designate which agent answers 100% of incoming live carrier (Twilio/Retell) & WebRTC calls:
              </div>
              <div className="active-inbound-control-row">
                <select
                  className="active-inbound-select"
                  value={activeInboundAgentId}
                  onChange={(e) => handleSetActiveInboundAgent(e.target.value)}
                  disabled={settingLiveInbound || inboundAgents.length === 0}
                >
                  {inboundAgents.length === 0 && (
                    <option value="" disabled>No inbound agents deployed</option>
                  )}
                  {inboundAgents.map((ag) => (
                    <option key={ag.agent_id} value={ag.agent_id}>
                      {ag.agent_name} {ag.agent_id === activeInboundAgentId ? '★ (Active Live)' : ''}
                    </option>
                  ))}
                </select>
                {activeInboundAgentId && (
                  <span className="active-inbound-confirmed-badge">
                    ✓ Verified Active
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="section-subhead">
            <span>INBOUND LINES</span>
            <span className="live-badge-count">{inboundActive}/{MAX_SLOTS}</span>
          </div>
          <div className="slots-grid">
            {inboundSlots.map((call, i) => (
              <CallSlot key={i} call={call} direction="inbound" onHangup={handleHangup} />
            ))}
          </div>

          <div className="section-subhead" style={{ marginTop: 20 }}>
            <span>OUTBOUND LINES</span>
            <span className="live-badge-count">{outboundActive}/{MAX_SLOTS}</span>
          </div>
          <div className="slots-grid">
            {outboundSlots.map((call, i) => (
              <CallSlot key={i} call={call} direction="outbound" onHangup={handleHangup} />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Calls Log Card */}
      <div className="live-card">
        <div className="live-card-header">
          <h3 className="live-card-title">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Recent Calls Log
          </h3>
          <span className="live-badge-count">{history.length} TOTAL</span>
        </div>

        {history.length === 0 ? (
          <p className="empty-log">No calls logged yet. Initiate an outbound call or trigger an inbound call.</p>
        ) : (
          <>
            <div className="calls-table-header">
              <span>DIRECTION</span>
              <span>NUMBER / ENDPOINT</span>
              <span>AGENT</span>
              <span>STATUS</span>
              <span>DURATION</span>
              <span>SENTIMENT</span>
            </div>

            <div className="calls-table">
              {visibleLogs.map((call) => (
                <div key={call.call_id} className="calls-row-wrapper">
                  <div
                    className={`calls-row ${expandedCallId === call.call_id ? 'expanded' : ''}`}
                    onClick={() => setExpandedCallId(expandedCallId === call.call_id ? null : call.call_id)}
                  >
                    <div>
                      <span className={`direction-badge ${call.direction}`}>
                        {call.direction}
                      </span>
                    </div>
                    <span className="calls-row-num">
                      {call.direction === 'inbound' ? call.from_number : call.to_number}
                    </span>
                    <span className="calls-row-agent">
                      {call.agent_name || call.agent_id || '—'}
                    </span>
                    <div>
                      <span className={`status-pill status-${call.status}`}>
                        {call.status}
                      </span>
                    </div>
                    <span className="calls-row-dur">{formatDuration(call.duration)}</span>
                    <div>
                      {call.sentiment ? (
                        <span className={`sentiment-badge ${call.sentiment.toLowerCase()}`}>
                          {call.sentiment}
                        </span>
                      ) : (
                        <span style={{ color: '#475569', fontSize: '11px' }}>—</span>
                      )}
                    </div>
                  </div>

                  {expandedCallId === call.call_id && (
                    <div className="calls-row-expanded">
                      {call.summary && (
                        <div style={{ marginBottom: 10 }}>
                          <strong style={{ color: '#f8fafc' }}>Call Summary:</strong>{' '}
                          <span style={{ color: '#94a3b8' }}>{call.summary}</span>
                        </div>
                      )}
                      {call.recording_url && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ color: '#f8fafc', fontWeight: 600, marginBottom: 4 }}>Call Audio Recording:</div>
                          <audio controls src={call.recording_url} style={{ width: '100%', height: '36px' }} />
                        </div>
                      )}
                      {call.transcript && (
                        <div>
                          <div style={{ color: '#f8fafc', fontWeight: 600 }}>Live Transcript:</div>
                          <pre className="transcript-block">{call.transcript}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="show-more-container">
              {hasMoreLogs ? (
                <button
                  type="button"
                  className="show-more-btn"
                  onClick={() => setVisibleLogsCount((prev) => prev + 5)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  Show More Calls ({history.length - visibleLogsCount} remaining)
                </button>
              ) : (
                history.length > 5 && (
                  <button
                    type="button"
                    className="show-less-btn"
                    onClick={() => setVisibleLogsCount(5)}
                  >
                    Show Less (Reset to 5)
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RetellLiveCalls;
