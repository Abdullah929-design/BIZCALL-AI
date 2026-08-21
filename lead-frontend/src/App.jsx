import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { supabase } from './services/supabaseClient';
import { RetellWebClient } from 'retell-client-js-sdk';

const urlParams = new URLSearchParams(window.location.search);
const queryLeadId = urlParams.get('lead_id');
const LEAD_ID = queryLeadId || import.meta.env.VITE_LEAD_ID || 'lead-1';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002/api';

function App() {
    const [leadLabel, setLeadLabel] = useState('Loading Lead Profile...');
    const [status, setStatus] = useState('idle'); // 'idle' | 'ringing' | 'connected' | 'outgoing_ringing'
    const [activeRequest, setActiveRequest] = useState(null);
    const [logs, setLogs] = useState([]);
    const [leadPhone, setLeadPhone] = useState('');

    const retellWebClientRef = useRef(null);
    const ringAudioRef = useRef(null);

    const addLog = (msg) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    // Ringtone synthesizer loop
    const playRingtone = () => {
        if (!ringAudioRef.current) {
            ringAudioRef.current = setInterval(() => {
                try {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, audioCtx.currentTime); // Standard dial tone frequency

                    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

                    osc.connect(gain);
                    gain.connect(audioCtx.destination);

                    osc.start();
                    osc.stop(audioCtx.currentTime + 1.5);
                } catch (e) {
                    console.error("Audio Context blocked by browser safety policies.", e);
                }
            }, 2000);
        }
    };

    const stopRingtone = () => {
        if (ringAudioRef.current) {
            clearInterval(ringAudioRef.current);
            ringAudioRef.current = null;
        }
    };

    // ---- Initialize WebRTC Client & Database Handshakes ----
    useEffect(() => {
        // 1. Initialize Retell SDK WebClient
        try {
            const client = new RetellWebClient();
            retellWebClientRef.current = client;

            client.on('call_started', () => {
                setStatus('connected');
                addLog('🎙️ WebRTC session active. Speaking to Agent…');
            });

            client.on('call_ended', () => {
                setStatus('idle');
                addLog('🛑 Connection closed.');
                handleResetState();
            });

            client.on('error', (err) => {
                addLog(`❌ Audio Error: ${err?.message || JSON.stringify(err)}`);
                handleResetState();
            });
        } catch (e) {
            addLog(`❌ SDK Init Error: ${e.message}`);
        }

        // 2. Fetch lead meta and reset status to idle in DB
        const syncLead = async () => {
            const { data } = await supabase
                .from('simulated_leads')
                .select('*')
                .eq('id', LEAD_ID)
                .single();

            if (data) {
                setLeadLabel(data.label);
                setLeadPhone(data.phone_number || ''); // <--- Store phone number
            } else {
                setLeadLabel(`Simulated Lead (${LEAD_ID})`);
            }

            await supabase
                .from('simulated_leads')
                .update({ status: 'idle' })
                .eq('id', LEAD_ID);

            addLog(`✅ Lead client initialized and marked idle.`);
        };
        syncLead();

        // 3. Listen to incoming call requests from the main dashboard
        const channel = supabase
            .channel(`lead-channel-${LEAD_ID}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'call_requests', filter: `lead_id=eq.${LEAD_ID}` },
                (payload) => {
                    if (payload.new.direction === 'outbound' && payload.new.status === 'ringing') {
                        setActiveRequest(payload.new);
                        setStatus('ringing');
                        playRingtone();
                        addLog(`🔔 Incoming call request detected (Request ID: ${payload.new.id})`);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'call_requests', filter: `lead_id=eq.${LEAD_ID}` },
                (payload) => {
                    if (payload.new.direction === 'outbound' && ['ended', 'rejected'].includes(payload.new.status)) {
                        handleResetState();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            stopRingtone();
        };
    }, []);

    const handleResetState = async () => {
        stopRingtone();
        setStatus('idle');
        setActiveRequest(null);
        await supabase.from('simulated_leads').update({ status: 'idle' }).eq('id', LEAD_ID);
    };

    // ---- Action Handlers ----
    const handleAnswerCall = async () => {
        if (!activeRequest) return;
        stopRingtone();
        addLog('Answering incoming call. Registering WebRTC session...');

        // Auto-reject if no connection in 30s (safety timeout)
        const timeout = setTimeout(() => {
            addLog('⏰ Connection timed out after 30s. Auto-declining.');
            handleRejectCall();
        }, 30000);


        try {
            // 1. Get access token from backend register-call
            const res = await axios.post(`${API_BASE_URL}/retell/register-call`, {
                agent_id: activeRequest.agent_id || undefined
            });

            if (res.data?.success && res.data.call_data?.access_token) {
                const { access_token, call_id } = res.data.call_data;
                addLog(`Token acquired (Call ID: ${call_id}). Connecting audio stream…`);

                // 2. Connect WebRTC stream
                if (!retellWebClientRef.current) throw new Error('Audio client not initialized. Refresh the page.');
                clearTimeout(timeout); // cancel the 30s safety net
                await retellWebClientRef.current.startCall({ accessToken: access_token });


                // 3. Update DB states
                await supabase
                    .from('call_requests')
                    .update({ status: 'answered', retell_call_id: call_id })
                    .eq('id', activeRequest.id);
                await supabase
                    .from('simulated_leads')
                    .update({ status: 'connected' })
                    .eq('id', LEAD_ID);

                // Update calls table so the dashboard slot shows the real name and phone
                await supabase
                    .from('calls')
                    .update({
                        from_number: 'Simulated System',
                        to_number: `${leadLabel} (${leadPhone})`,
                        agent_name: 'AI Assistant'
                    })
                    .eq('call_id', call_id);


            } else {
                throw new Error('Register Web Call response missing access token');
            }
        } catch (e) {
            clearTimeout(timeout);
            addLog(`❌ Connection failed: ${e.message}`);
            handleRejectCall();
        }
    };

    const handleRejectCall = async () => {
        stopRingtone();
        if (activeRequest) {
            await supabase
                .from('call_requests')
                .update({ status: 'rejected' })
                .eq('id', activeRequest.id);
        }
        handleResetState();
    };

    const handleHangup = async () => {
        if (retellWebClientRef.current) {
            retellWebClientRef.current.stopCall();
        }
        if (activeRequest) {
            await supabase
                .from('call_requests')
                .update({ status: 'ended' })
                .eq('id', activeRequest.id);
        }
        handleResetState();
    };

    // ---- Inbound Calls (Lead dials Dashboard) ----
    const handleMakeInboundCall = async () => {
        if (status !== 'idle') return; // guard against double-click
        setStatus('outgoing_ringing');
        addLog('Dials dashboard... Waiting for support agent to accept.');
        playRingtone();

        try {
            // 1. Create inbound request row targeting 'dashboard'
            const { data, error } = await supabase
                .from('call_requests')
                .insert({
                    lead_id: LEAD_ID,
                    direction: 'inbound',
                    status: 'ringing'
                })
                .select()
                .single();

            if (error) throw error;
            setActiveRequest(data);

            // 2. Listen for dashboard accept event
            const inboundChan = supabase
                .channel(`inbound-${data.id}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'call_requests', filter: `id=eq.${data.id}` },
                    async (payload) => {
                        if (payload.new.status === 'answered') {
                            stopRingtone();
                            addLog('Dashboard accepted the call! Connecting WebRTC...');
                            try {
                                // Pass the active agent ID configured by the dashboard
                                const res = await axios.post(`${API_BASE_URL}/retell/register-call`, {
                                    agent_id: payload.new.agent_id || undefined
                                });
                                const { access_token, call_id } = res.data.call_data;

                                await retellWebClientRef.current.startCall({ accessToken: access_token });
                                setStatus('connected');

                                // Update calls table so the slot shows the real name and phone
                                await supabase
                                    .from('calls')
                                    .update({
                                        from_number: `${leadLabel} (${leadPhone})`,
                                        to_number: 'Dashboard Support',
                                        agent_name: 'AI Assistant'
                                    })
                                    .eq('call_id', call_id);

                            } catch (err) {
                                addLog(`❌ Connection error: ${err.message}`);
                                handleHangup();
                            }
                            supabase.removeChannel(inboundChan);

                        } else if (payload.new.status === 'rejected') {
                            stopRingtone();
                            addLog('❌ Dashboard rejected the call.');
                            handleResetState();
                            supabase.removeChannel(inboundChan);
                        } else if (payload.new.status === 'ended') {
                            handleResetState();
                            supabase.removeChannel(inboundChan);
                        }
                    }
                )
                .subscribe();

        } catch (e) {
            addLog(`❌ Outbound dialing failed: ${e.message}`);
            handleResetState();
        }
    };

    return (
        <div className="lead-container">
            <div className="lead-phone-frame">
                <div className="phone-header">
                    <span className="network-dot">●</span> Simulated Lead Phone Profile
                </div>

                <div className="phone-screen">
                    <div className="lead-meta">
                        <h2>{leadLabel}</h2>
                        {leadPhone && <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 8 }}>{leadPhone}</div>}
                        <div className="lead-id-badge">ID: {LEAD_ID}</div>
                        <div className="status-label">Device Status: <span className={`status-badge status-${status}`}>{status.toUpperCase()}</span></div>
                    </div>

                    <div className="action-area">
                        {status === 'idle' && (
                            <>
                                <div className="idle-indicator">🔋 Waiting for incoming calls...</div>
                                <button className="inbound-btn" onClick={handleMakeInboundCall}>
                                    📞 Call Dashboard Support
                                </button>
                            </>
                        )}

                        {status === 'ringing' && (
                            <div className="call-notification">
                                <div className="ringing-animation">📳</div>
                                <h3>Incoming Outbound Call</h3>
                                <p>AI Voice Agent is Dialing You...</p>
                                <div className="button-group">
                                    <button className="accept-btn" onClick={handleAnswerCall}>Answer</button>
                                    <button className="decline-btn" onClick={handleRejectCall}>Decline</button>
                                </div>
                            </div>
                        )}

                        {status === 'outgoing_ringing' && (
                            <div className="call-notification">
                                <div className="ringing-animation animate-pulse">📞</div>
                                <h3>Calling Dashboard...</h3>
                                <p>Waiting for agent to pick up...</p>
                                <button className="decline-btn" onClick={handleHangup}>Cancel Call</button>
                            </div>
                        )}

                        {status === 'connected' && (
                            <div className="call-connected">
                                <div className="audio-wave">
                                    <span></span><span></span><span></span><span></span>
                                </div>
                                <h3>Ongoing AI Call</h3>
                                <p>Speak into your microphone...</p>
                                <button className="decline-btn" onClick={handleHangup}>🔴 Hang Up / Disconnect</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="console-logs">
                <h4>📟 Realtime Signaling Logs</h4>
                <div className="logs-wrapper">
                    {logs.map((log, i) => (
                        <div key={i} className="log-line">{log}</div>
                    ))}
                    {logs.length === 0 && <div className="log-empty">No events captured.</div>}
                </div>
            </div>
        </div>
    );
}

export default App;
