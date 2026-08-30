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
                <div className="slot-dotted-icon">{direction === 'inbound' ? '📞' : '📤'}</div>
                <span>{direction === 'inbound' ? 'Waiting for Inbound Line…' : 'Line Idle'}</span>
            </div>
        );
    }

    return (
        <div className={`call-slot call-slot-active status-${call.status}`}>
            <div className="slot-top-row">
                <span className={`status-dot ${active ? 'glow' : ''}`} />
                <span className="slot-number">{direction === 'inbound' ? call.from_number : call.to_number}</span>
            </div>
            <div className="wave" aria-hidden="true">
                {Array.from({ length: 12 }).map((_, i) => (
                    <span key={i} style={{ animationDelay: `${i * 0.08}s` }} />
                ))}
            </div>
            <div className="slot-meta">
                <span>{call.agent_name || call.agent_id || 'Unknown Agent'}</span>
                <span className="slot-timer">{formatDuration(elapsed)}</span>
            </div>
            {active && (
                <button className="hangup-btn" onClick={() => onHangup(call.call_id)}>
                    🔴 Disconnect / Hang Up
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
    const [dynamicVarsText, setDynamicVarsText] = useState('{}');
    const [statusMsg, setStatusMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const [inboundSlots, setInboundSlots] = useState(emptySlots());
    const [outboundSlots, setOutboundSlots] = useState(emptySlots());
    const [history, setHistory] = useState([]);
    const [expandedCallId, setExpandedCallId] = useState(null);

    // Simulated call states
    const [outboundRequest, setOutboundRequest] = useState(null);  // dashboard→lead
    const [inboundRequest, setInboundRequest] = useState(null);    // lead→dashboard (current active)
    const [incomingQueue, setIncomingQueue] = useState([]);         // all ringing leads
    // Convenience alias - current ringing call shown in banner
    const incomingCall = incomingQueue[0] || null;

    const { callStatus, isCalling, activeCallId, startWebCall, stopWebCall } = useRetellWebCall();
    const channelRef = useRef(null);

    // ---- Load agents + leads ----
    useEffect(() => {
        const load = async () => {
            const { data: agentData } = await supabase
                .from('agents')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            setAgents(agentData || []);
            if (agentData && agentData.length > 0) setSelectedAgentId(agentData[0].agent_id);

            // Fetch simulated leads
            const { data: leadData } = await supabase
                .from('simulated_leads')
                .select('*')
                .order('label', { ascending: true });
            setSimulatedLeads(leadData || []);
            if (leadData && leadData.length > 0) setSelectedLeadId(leadData[0].id);

            try {
                const cfg = await axios.get('/api/health/config');
                if (cfg.data?.TWILIO_PHONE_NUMBER) setFromNumber(cfg.data.TWILIO_PHONE_NUMBER);
            } catch (e) { /* non-fatal */ }
        };
        load();
    }, [userId]);

    // ---- Load recent history + slot state from Supabase ----
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
        const { data } = await supabase
            .from('calls')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        setHistory(data || []);
    }, []);

    useEffect(() => {
        const bootstrap = async () => {
            const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            const { data } = await supabase
                .from('calls')
                .select('*')
                .in('status', ['registered', 'ringing', 'active'])
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

    // ---- Subscribe to Inbound call_requests from leads ----
    useEffect(() => {
        const inboundChannel = supabase
            .channel('inbound-requests')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'call_requests', filter: "direction=eq.inbound" },
                (payload) => {
                    if (payload.new && payload.new.status === 'ringing' && payload.new.lead_id !== 'dashboard') {
                        setIncomingQueue(prev => [...prev, payload.new]); // queue it
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'call_requests', filter: "direction=eq.inbound" },
                (payload) => {
                    if (payload.new && ['ended', 'rejected', 'answered'].includes(payload.new.status)) {
                        setIncomingQueue(prev => prev.filter(c => c.id !== payload.new.id)); // dequeue it
                    }
                }

            )
            .subscribe();

        return () => {
            supabase.removeChannel(inboundChannel);
        };
    }, []);

    // ---- Actions ----
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
            // 1. Create simulated call request row
            const { data: reqData, error } = await supabase
                .from('call_requests')
                .insert({
                    lead_id: selectedLeadId,
                    direction: 'outbound',
                    status: 'ringing',
                    agent_id: selectedAgentId || undefined
                })
                .select()
                .single();

            if (error) throw error;
            setOutboundRequest(reqData); // was: setActiveRequest(reqData)

            // 2. Listen to this specific request's update event
            const reqChannel = supabase
                .channel(`req-${reqData.id}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'call_requests', filter: `id=eq.${reqData.id}` },
                    async (payload) => {
                        if (payload.new.status === 'answered') {
                            setStatusMsg('🎙️ Connected to Simulated Lead.');
                            setLoading(false);
                            supabase.removeChannel(reqChannel); // cleanup listener
                            // The lead's own browser tab handles joining the WebRTC audio
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

    const handleAcceptInbound = async () => {
        if (!incomingCall) return;
        try {
            setStatusMsg('Connecting inbound call...');

            // Accept call and pass the dashboard's selected agent ID to the lead
            await supabase
                .from('call_requests')
                .update({
                    status: 'answered',
                    agent_id: selectedAgentId
                })
                .eq('id', incomingCall.id);

            setIncomingQueue(prev => prev.slice(1));
            setStatusMsg('🎙️ Call accepted. Lead is connecting...');
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
        setIncomingQueue(prev => prev.slice(1));
    };

    const handleHangupSimulated = async (reqId) => {
        await stopWebCall();
        await supabase
            .from('call_requests')
            .update({ status: 'ended' })
            .eq('id', reqId);

        if (outboundRequest) {  // was: activeRequest
            await supabase
                .from('simulated_leads')
                .update({ status: 'idle' })
                .eq('id', outboundRequest.lead_id);  // was: activeRequest.lead_id
        }

        setOutboundRequest(null);  // was: setActiveRequest(null)
        setLoading(false);
    };


    const handleHangup = async (callId) => {
        if (isCalling && activeCallId === callId) {
            if (outboundRequest) {  // was: activeRequest
                await handleHangupSimulated(outboundRequest.id);  // was: activeRequest.id
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

    return (
        <div className="live-calls-page">
            {/* Inbound Call Alert Popup */}
            {incomingCall && (
                <div className="inbound-banner" style={{ background: '#1e1b4b', border: '1px solid #4f46e5', padding: 16, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <span style={{ fontSize: '1.2rem', marginRight: 8 }}>🔔</span>
                        <strong>Incoming Simulated Web Call</strong> from Lead: {incomingCall.lead_id}
                        {incomingQueue.length > 1 && <span style={{ marginLeft: 8, color: '#f59e0b' }}>+{incomingQueue.length - 1} more waiting</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={handleAcceptInbound} style={{ background: '#10b981', color: 'white', padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>Answer</button>
                        <button onClick={handleRejectInbound} style={{ background: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>Reject</button>
                    </div>
                </div>
            )}

            <div className="live-calls-grid">
                {/* Outbound trigger panel */}
                <div className="retell-card">
                    <h3>📤 Initiate Live Outbound Call</h3>

                    {/* Call Mode Toggle */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <button
                            type="button"
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer', border: '1px solid', borderColor: callMode === 'phone' ? '#6366f1' : 'rgba(255,255,255,0.1)', background: callMode === 'phone' ? 'rgba(99,102,241,0.15)' : 'transparent', color: '#fff' }}
                            onClick={() => setCallMode('phone')}
                        >
                            📞 Real Phone (Twilio)
                        </button>
                        <button
                            type="button"
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer', border: '1px solid', borderColor: callMode === 'simulated' ? '#6366f1' : 'rgba(255,255,255,0.1)', background: callMode === 'simulated' ? 'rgba(99,102,241,0.15)' : 'transparent', color: '#fff' }}
                            onClick={() => setCallMode('simulated')}
                        >
                            💻 Simulated Lead (WebRTC)
                        </button>
                    </div>

                    <form onSubmit={handleInitiateCall} className="retell-form">
                        <div className="form-group">
                            <label>Voice Agent</label>
                            <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} required>
                                <option value="" disabled>Select an agent…</option>
                                {agents.map((a) => (
                                    <option key={a.agent_id} value={a.agent_id}>
                                        {a.agent_name} ({a.call_type})
                                    </option>
                                ))}
                            </select>
                            {agents.length === 0 && (
                                <small>No agents found — deploy one first in the "Inbound/Outbound Builder" tab.</small>
                            )}
                        </div>

                        {callMode === 'phone' ? (
                            <>
                                <div className="form-group">
                                    <label>To Number (E.164)</label>
                                    <input type="tel" placeholder="+15551234567" value={toNumber}
                                        onChange={(e) => setToNumber(e.target.value)} required />
                                </div>

                                <div className="form-group">
                                    <label>From Number (E.164)</label>
                                    <input type="tel" placeholder="+15557654321" value={fromNumber}
                                        onChange={(e) => setFromNumber(e.target.value)} required />
                                </div>
                            </>
                        ) : (
                            <div className="form-group">
                                <label>Target Lead</label>
                                <select value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)} required>
                                    <option value="" disabled>Select simulated lead…</option>
                                    {simulatedLeads.map((lead) => (
                                        <option key={lead.id} value={lead.id}>
                                            {lead.label} ({lead.status})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Dynamic Variables (JSON)</label>
                            <textarea rows={3} value={dynamicVarsText}
                                onChange={(e) => setDynamicVarsText(e.target.value)}
                                placeholder='{"customer_name": "Alex"}' />
                        </div>

                        {isCalling ? (
                            <button type="button" className="call-btn" style={{ background: '#ef4444' }} onClick={() => handleHangup(activeCallId)}>
                                🔴 Disconnect Active WebRTC Call
                            </button>
                        ) : (
                            <button type="submit" className="call-btn" disabled={loading || outboundActive >= MAX_SLOTS}>
                                {loading ? 'Ringing…' : `⚡ Initiate Live Call (${outboundActive}/${MAX_SLOTS} lines busy)`}
                            </button>
                        )}
                    </form>
                    {statusMsg && <div className="status-badge" style={{ marginTop: 16 }}>{statusMsg}</div>}
                    {callStatus !== 'Idle' && <div style={{ color: '#818cf8', fontSize: '0.8rem', marginTop: 8 }}>WebRTC: {callStatus}</div>}
                </div>

                {/* Slot monitors */}
                <div className="retell-card">
                    <h3>📥 Inbound Lines ({inboundActive}/{MAX_SLOTS})</h3>
                    <div className="slots-grid">
                        {inboundSlots.map((call, i) => (
                            <CallSlot key={i} call={call} direction="inbound" onHangup={handleHangup} />
                        ))}
                    </div>

                    <h3 style={{ marginTop: 24 }}>📤 Outbound Lines ({outboundActive}/{MAX_SLOTS})</h3>
                    <div className="slots-grid">
                        {outboundSlots.map((call, i) => (
                            <CallSlot key={i} call={call} direction="outbound" onHangup={handleHangup} />
                        ))}
                    </div>
                </div>
            </div>

            {/* History */}
            <div className="retell-card" style={{ marginTop: 24 }}>
                <h3>🗂️ Recent Calls Log</h3>
                {history.length === 0 ? (
                    <p className="empty-log">No calls logged yet.</p>
                ) : (
                    <div className="calls-table">
                        {history.map((call) => (
                            <div key={call.call_id} className="calls-row-wrapper">
                                <div
                                    className="calls-row"
                                    onClick={() => setExpandedCallId(expandedCallId === call.call_id ? null : call.call_id)}
                                >
                                    <span className={`direction-badge ${call.direction}`}>{call.direction}</span>
                                    <span>{call.direction === 'inbound' ? call.from_number : call.to_number}</span>
                                    <span>{call.agent_name || call.agent_id || '—'}</span>
                                    <span className={`status-pill status-${call.status}`}>{call.status}</span>
                                    <span>{formatDuration(call.duration)}</span>
                                    {call.sentiment && <span className={`sentiment-badge ${call.sentiment.toLowerCase()}`}>{call.sentiment}</span>}
                                </div>

                                {expandedCallId === call.call_id && (
                                    <div className="calls-row-expanded">
                                        {call.summary && <p><strong>Summary:</strong> {call.summary}</p>}
                                        {call.recording_url && (
                                            <audio controls src={call.recording_url} style={{ width: '100%', marginTop: 8 }} />
                                        )}
                                        {call.transcript && (
                                            <pre className="transcript-block">{call.transcript}</pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RetellLiveCalls;
