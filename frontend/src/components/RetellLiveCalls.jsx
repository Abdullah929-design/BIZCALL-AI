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

const CrystalShard = ({ position = 'top-left' }) => (
  <div className={`stitch-corner-crystal ${position}`} aria-hidden="true">
    <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
      <path d="M4 4 L 42 12 L 28 38 L 8 42 Z" fill="url(#crystGrad1)" opacity="0.45" />
      <path d="M4 4 L 28 18 L 12 36 Z" fill="url(#crystGrad2)" opacity="0.65" />
      <path d="M28 18 L 42 12 L 32 34 Z" fill="url(#crystGrad3)" opacity="0.8" />
      <path d="M4 4 L 42 12 L 32 34 L 12 36 Z" stroke="rgba(186, 230, 253, 0.9)" strokeWidth="1.2" />
      <defs>
        <linearGradient id="crystGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
        <linearGradient id="crystGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="crystGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

const RetellLiveCalls = ({ user, prefilledCallData, onClearPrefilledData }) => {
  const userId = user?.id || user?.email || 'demo_user';
  const bgVideoRef = useRef(null);

  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.play().catch(() => { });
    }
  }, []);

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

  // Dynamic Variables Visual Builder State
  const [varMode, setVarMode] = useState('visual'); // 'visual' | 'json'
  const [variableRows, setVariableRows] = useState([
    { id: 1, key: 'customer_name', value: '' },
    { id: 2, key: 'company_name', value: '' }
  ]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [varsExpanded, setVarsExpanded] = useState(true);

  const updateJsonFromRows = (rows) => {
    const obj = {};
    rows.forEach((r) => {
      const k = r.key.trim();
      if (k) obj[k] = r.value;
    });
    setDynamicVarsText(JSON.stringify(obj, null, 2));
  };

  const handleAddVariableRow = (suggestedKey = '', suggestedVal = '') => {
    const newRow = { id: Date.now() + Math.random(), key: suggestedKey, value: suggestedVal };
    const next = [...variableRows, newRow];
    setVariableRows(next);
    updateJsonFromRows(next);
  };

  const handleUpdateVariableRow = (id, field, val) => {
    const next = variableRows.map((r) => (r.id === id ? { ...r, [field]: val } : r));
    setVariableRows(next);
    updateJsonFromRows(next);
  };

  const handleRemoveVariableRow = (id) => {
    const next = variableRows.filter((r) => r.id !== id);
    setVariableRows(next);
    updateJsonFromRows(next);
  };

  const handleClearAllVariables = () => {
    setVariableRows([]);
    setDynamicVarsText('{}');
  };

  const handleCopyPromptTag = (key) => {
    const cleanKey = key.trim();
    if (!cleanKey) return;
    const tag = `{{${cleanKey}}}`;
    navigator.clipboard.writeText(tag).catch(() => { });
    setCopiedKey(cleanKey);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleJsonChange = (text) => {
    setDynamicVarsText(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const rows = Object.entries(parsed).map(([k, v], idx) => ({
          id: Date.now() + idx,
          key: k,
          value: String(v ?? '')
        }));
        setVariableRows(rows);
      }
    } catch { }
  };

  // Context-Only Edit State for selected agent
  const [editingAgent, setEditingAgent] = useState(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editBeginMessage, setEditBeginMessage] = useState('');
  const [fetchingContext, setFetchingContext] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const [editStatusMsg, setEditStatusMsg] = useState('');
  const [editCopiedTag, setEditCopiedTag] = useState(null);

  const handleOpenEditContext = async (agent) => {
    setEditingAgent(agent);
    setFetchingContext(true);
    setEditStatusMsg('');
    setEditPrompt('');
    setEditBeginMessage('');

    try {
      const res = await axios.get(`${API_BASE_URL}/agent-context/${agent.agent_id}`);
      if (res.data?.success) {
        setEditPrompt(res.data.prompt || '');
        setEditBeginMessage(res.data.begin_message || '');
      } else {
        setEditStatusMsg('⚠️ Could not fetch live prompt. You can enter a new context below.');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setEditStatusMsg(`⚠️ Could not retrieve live context: ${msg}`);
    } finally {
      setFetchingContext(false);
    }
  };

  const handleSaveContext = async (e) => {
    if (e) e.preventDefault();
    if (!editingAgent) return;

    setSavingContext(true);
    setEditStatusMsg('Saving updated context to Retell AI...');

    try {
      const res = await axios.post(`${API_BASE_URL}/update-agent-context`, {
        agent_id: editingAgent.agent_id,
        prompt: editPrompt,
        begin_message: editBeginMessage || undefined,
      });

      if (res.data?.success) {
        setEditStatusMsg('✅ Context saved successfully! Voice and settings preserved.');
        setStatusMsg(`✅ Context updated for agent "${editingAgent.agent_name}".`);
        setTimeout(() => {
          setEditingAgent(null);
          setEditStatusMsg('');
        }, 1300);
      } else {
        throw new Error(res.data?.detail || 'Failed to update context');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setEditStatusMsg(`❌ Error saving context: ${msg}`);
    } finally {
      setSavingContext(false);
    }
  };

  const handleInsertEditTag = (tag) => {
    const variableTag = `{{${tag}}}`;
    navigator.clipboard.writeText(variableTag).catch(() => { });
    setEditCopiedTag(tag);
    setTimeout(() => setEditCopiedTag(null), 1800);
    setEditPrompt((prev) => (prev ? `${prev} ${variableTag}` : variableTag));
  };

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
      } catch (e) { }

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

  // Handoff from LeadFinder (or any other scraper/CRM source)
  useEffect(() => {
    if (!prefilledCallData || !prefilledCallData.toNumber) return;

    setToNumber(prefilledCallData.toNumber);
    setCallMode('phone');

    if (prefilledCallData.dynamicVariables && typeof prefilledCallData.dynamicVariables === 'object') {
      const rows = Object.entries(prefilledCallData.dynamicVariables)
        .filter(([k, v]) => Boolean(k && String(v).trim()))
        .map(([k, v], idx) => ({
          id: Date.now() + idx,
          key: k,
          value: String(v ?? '')
        }));

      if (rows.length > 0) {
        setVariableRows(rows);
        const obj = {};
        rows.forEach((r) => { obj[r.key] = r.value; });
        setDynamicVarsText(JSON.stringify(obj, null, 2));
      }
    }

    setStatusMsg(`🎯 Pre-filled lead: ${prefilledCallData.companyName || prefilledCallData.toNumber}. Customize variables below and initiate call.`);
    if (onClearPrefilledData) {
      onClearPrefilledData();
    }
  }, [prefilledCallData, onClearPrefilledData]);

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
    if (varMode === 'visual') {
      variableRows.forEach((r) => {
        const k = r.key.trim();
        if (k) dynamicVariables[k] = r.value;
      });
    } else {
      try {
        dynamicVariables = dynamicVarsText.trim() ? JSON.parse(dynamicVarsText) : {};
      } catch {
        setStatusMsg('⚠️ Dynamic variables must be valid JSON.');
        return;
      }
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
    <div className="agent-builder-page-wrapper retell-live-page-wrapper">
      {/* Levitating Crystal Video Background */}
      <video
        ref={bgVideoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="builder-bg-video"
        src="https://res.cloudinary.com/dv7fu8gwf/video/upload/Crystal_levitating_up_and_down_20260928230831_dyw0df.mp4"
      >
        <iframe
          src="https://player.cloudinary.com/embed/?cloud_name=dv7fu8gwf&public_id=Crystal_levitating_up_and_down_20260928230831_dyw0df"
          className="builder-bg-video"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          frameBorder="0"
          title="Background Video"
        />
      </video>
      <div className="builder-bg-overlay" />

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
            <CrystalShard position="top-left" />
            <CrystalShard position="top-right" />
            <div className="live-card-header">
              <h3 className="live-card-title">
                Initiate Outbound Call
              </h3>
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
                Simulated Lead
              </button>
            </div>

            <form onSubmit={handleInitiateCall} className="live-form">
              <div className="live-form-group">
                <div className="live-label-row">
                  <label className="live-label">OUTBOUND VOICE AGENT</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedAgentId && (
                      <button
                        type="button"
                        className="live-edit-agent-context-link"
                        onClick={() => {
                          const ag = outboundAgents.find((a) => a.agent_id === selectedAgentId) || agents.find((a) => a.agent_id === selectedAgentId);
                          if (ag) handleOpenEditContext(ag);
                        }}
                        title="Edit prompt and conversational context for selected agent"
                      >
                        Edit Context ↗
                      </button>
                    )}
                  </div>
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

              {/* Dynamic Variables & Strategy Injection Builder */}
              <div className="live-form-group var-builder-group">
                <div className="var-header-bar" onClick={() => setVarsExpanded(!varsExpanded)}>
                  <div className="var-header-left">
                    <svg className={`var-chevron ${varsExpanded ? 'open' : ''}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <label className="live-label" style={{ cursor: 'pointer', userSelect: 'none' }}>DYNAMIC VARIABLES &amp; STRATEGY</label>

                  </div>
                  <div className="var-header-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="var-mode-switch">
                      <button
                        type="button"
                        className={`var-mode-btn ${varMode === 'visual' ? 'active' : ''}`}
                        onClick={() => setVarMode('visual')}
                      >
                        Visual
                      </button>
                      <button
                        type="button"
                        className={`var-mode-btn ${varMode === 'json' ? 'active' : ''}`}
                        onClick={() => setVarMode('json')}
                      >
                        JSON
                      </button>
                    </div>
                    {variableRows.length > 0 && (
                      <button
                        type="button"
                        className="var-clear-btn"
                        onClick={handleClearAllVariables}
                        title="Clear all variables"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {varsExpanded && (
                  <div className="var-expanded-content">
                    {/* Compact Strategy Tip */}

                    {/* Clean Presets + Add Actions Bar */}
                    <div className="var-action-toolbar">
                      <select
                        className="var-preset-dropdown"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            if (!variableRows.some((r) => r.key.trim() === e.target.value)) {
                              handleAddVariableRow(e.target.value, '');
                            }
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="" disabled>+ Quick Add Preset...</option>
                        <option value="customer_name">customer_name</option>
                        <option value="company_name">company_name</option>
                        <option value="city">city</option>
                        <option value="website">website</option>
                        <option value="offer_discount">offer_discount</option>
                        <option value="appointment_time">appointment_time</option>
                      </select>

                      <button
                        type="button"
                        className="var-add-custom-btn"
                        onClick={() => handleAddVariableRow('', '')}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Custom
                      </button>
                    </div>

                    {varMode === 'visual' ? (
                      <div className="var-builder-box">
                        {variableRows.length === 0 ? (
                          <div className="var-empty-box">
                            <span>No dynamic variables defined. Agent will use default context.</span>
                            <button
                              type="button"
                              className="var-preset-chip"
                              onClick={() => handleAddVariableRow('customer_name', '')}
                            >
                              + Add customer_name
                            </button>
                          </div>
                        ) : (
                          <div className="var-rows-list">
                            {variableRows.map((row) => {
                              const cleanKey = row.key.trim();
                              const isCopied = copiedKey === cleanKey && cleanKey.length > 0;
                              return (
                                <div key={row.id} className="var-row-item">
                                  <div className="var-row-inputs">
                                    <input
                                      type="text"
                                      className="live-input var-input-key"
                                      placeholder="variable_name"
                                      value={row.key}
                                      onChange={(e) =>
                                        handleUpdateVariableRow(
                                          row.id,
                                          'key',
                                          e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                                        )
                                      }
                                    />
                                    <input
                                      type="text"
                                      className="live-input var-input-val"
                                      placeholder="Value (e.g. Acme Corp)"
                                      value={row.value}
                                      onChange={(e) => handleUpdateVariableRow(row.id, 'value', e.target.value)}
                                    />
                                  </div>
                                  <div className="var-row-actions">
                                    {cleanKey ? (
                                      <button
                                        type="button"
                                        className={`var-copy-tag-btn ${isCopied ? 'copied' : ''}`}
                                        onClick={() => handleCopyPromptTag(cleanKey)}
                                        title="Click to copy prompt injection tag"
                                      >
                                        {isCopied ? 'Copied!' : `{{${cleanKey}}}`}
                                      </button>
                                    ) : (
                                      <span className="var-tag-placeholder">{"{{tag}}"}</span>
                                    )}
                                    <button
                                      type="button"
                                      className="var-row-delete-btn"
                                      onClick={() => handleRemoveVariableRow(row.id)}
                                      title="Delete variable"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <textarea
                        rows={4}
                        className="live-textarea var-json-textarea"
                        value={dynamicVarsText}
                        onChange={(e) => handleJsonChange(e.target.value)}
                        placeholder='{\n  "customer_name": "Alex",\n  "company_name": "Acme Corp"\n}'
                      />
                    )}
                  </div>
                )}
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
            <CrystalShard position="top-left" />
            <CrystalShard position="top-right" />
            <div className="live-card-header">
              <h3 className="live-card-title">

                Telephony Line Monitors
              </h3>

            </div>

            {/* Active Live Inbound Agent Selector Card */}
            <div className="active-inbound-card">
              <div className="active-inbound-header">
                <div className="active-inbound-title-area">
                  <span className="inbound-pulse-dot" />
                  <span className="active-inbound-title">ACTIVE LIVE INBOUND AGENT</span>
                </div>
                <span className={`inbound-status-pill ${activeInboundAgentId ? 'live' : ''}`}>
                  {settingLiveInbound ? 'SWITCHING...' : (activeInboundAgentId ? '● LIVE INBOUND' : 'STANDBY')}
                </span>
              </div>

              <div className="active-inbound-body">

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
                      Verified Active
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
          <CrystalShard position="top-left" />
          <CrystalShard position="top-right" />
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

        {/* Context-Only Edit Modal */}
        {editingAgent && (
          <div className="stitch-modal-backdrop" onClick={() => !savingContext && setEditingAgent(null)}>
            <div className="stitch-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="stitch-modal-header">
                <div className="stitch-modal-title-box">
                  <div className="stitch-modal-sub">EDIT AGENT CONTEXT &amp; PROMPT</div>
                  <h3 className="stitch-modal-title">{editingAgent.agent_name}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`stitch-type-badge ${editingAgent.call_type === 'outbound' ? 'outbound' : 'inbound'}`}>
                    {(editingAgent.call_type || 'outbound').toUpperCase()}
                  </span>
                  <button
                    type="button"
                    className="stitch-modal-close-btn"
                    onClick={() => !savingContext && setEditingAgent(null)}
                    disabled={savingContext}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>


              {fetchingContext ? (
                <div className="stitch-modal-loading">
                  <div className="stitch-spinner"></div>
                  <span>Retrieving live context from Retell AI...</span>
                </div>
              ) : (
                <form onSubmit={handleSaveContext} className="stitch-modal-form">
                  {/* Dynamic variables are only for Outbound calls */}
                  {editingAgent.call_type === 'outbound' && (
                    <div className="stitch-modal-chips-row">
                      <span className="stitch-modal-chips-label">Insert Dynamic Tag:</span>
                      {[
                        'customer_name',
                        'company_name',
                        'city',
                        'website',
                        'offer_discount',
                        'appointment_time'
                      ].map((v) => (
                        <button
                          key={v}
                          type="button"
                          className="stitch-modal-var-chip"
                          onClick={() => handleInsertEditTag(v)}
                          title={`Click to insert {{${v}}} into prompt and copy to clipboard`}
                        >
                          {editCopiedTag === v ? 'Copied! ✓' : `+ {{${v}}}`}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="live-form-group">
                    <div className="live-label-row">
                      <label className="live-label">SYSTEM CONTEXT / PROMPT</label>
                      <span className="live-label-tag">{editPrompt.length} CHARS</span>
                    </div>
                    <textarea
                      rows={9}
                      className="live-textarea stitch-modal-textarea"
                      placeholder="System prompt and instructions defining the agent's behavior, tone, FAQs, and knowledge..."
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      required
                    />
                  </div>

                  <div className="live-form-group">
                    <div className="live-label-row">
                      <label className="live-label">BEGIN MESSAGE / GREETING (OPTIONAL)</label>
                      <span className="live-label-tag">INITIAL_SPEECH</span>
                    </div>
                    <input
                      type="text"
                      className="live-input"
                      placeholder="e.g. Hello, thank you for calling. How can I assist you today?"
                      value={editBeginMessage}
                      onChange={(e) => setEditBeginMessage(e.target.value)}
                    />
                  </div>

                  {editStatusMsg && (
                    <div className={`stitch-status-banner ${editStatusMsg.includes('❌') ? 'error' : editStatusMsg.includes('✅') ? 'success' : ''}`}>
                      {editStatusMsg}
                    </div>
                  )}

                  <div className="stitch-modal-footer">
                    <button
                      type="button"
                      className="stitch-modal-cancel-btn"
                      onClick={() => setEditingAgent(null)}
                      disabled={savingContext}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="stitch-modal-save-btn"
                      disabled={savingContext || !editPrompt.trim()}
                    >
                      {savingContext ? 'Saving to Retell AI...' : 'Save Context Only'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetellLiveCalls;
