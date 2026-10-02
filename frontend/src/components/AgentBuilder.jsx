import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { RetellWebClient } from 'retell-client-js-sdk';
import { supabase } from '../services/supabaseClient';
import './AgentBuilder.css';

const API_BASE_URL = '/api/retell';

const looksLikeMissingAgentsTable = (error) => {
  const message = (error?.message || error?.details || error?.hint || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  const status = Number(error?.status || 0);

  return (
    status === 404 ||
    code === '42p01' ||
    code === 'pgrst205' ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    message.includes('not found')
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

const AgentBuilder = ({ user }) => {
  const [callType, setCallType] = useState('inbound'); // inbound vs outbound
  const [agentName, setAgentName] = useState('Customer Support Desk');
  const [prompt, setPrompt] = useState(
    'You are a customer service representative for FinanceAI. Help callers answer account questions politely and concisely.'
  );
  const [knowledgeBaseText, setKnowledgeBaseText] = useState('');
  const [voiceId, setVoiceId] = useState('11labs-Adrian');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [activeCallAgentId, setActiveCallAgentId] = useState(null);
  const [activeCallStatus, setActiveCallStatus] = useState('');
  const retellClientRef = useRef(null);
  const bgVideoRef = useRef(null);
  const [myAgents, setMyAgents] = useState([]);

  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.play().catch(() => { });
    }
  }, []);

  const currentUserId = user?.id || user?.email || 'demo_user';

  const [liveInboundId, setLiveInboundId] = useState('');

  // Context-Only Edit State
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
      setEditStatusMsg(`⚠️ Could not retrieve live context from Retell: ${msg}`);
    } finally {
      setFetchingContext(false);
    }
  };

  const handleSaveContext = async (e) => {
    if (e) e.preventDefault();
    if (!editingAgent) return;

    setSavingContext(true);
    setEditStatusMsg('Saving updated context to Retell AI engine...');

    try {
      const res = await axios.post(`${API_BASE_URL}/update-agent-context`, {
        agent_id: editingAgent.agent_id,
        prompt: editPrompt,
        begin_message: editBeginMessage || undefined,
      });

      if (res.data?.success) {
        setEditStatusMsg('✅ Context saved successfully! Voice, number, and settings preserved.');
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

  const handleInsertTag = (tag) => {
    const variableTag = `{{${tag}}}`;
    navigator.clipboard.writeText(variableTag).catch(() => { });
    setEditCopiedTag(tag);
    setTimeout(() => setEditCopiedTag(null), 1800);
    setEditPrompt((prev) => (prev ? `${prev} ${variableTag}` : variableTag));
  };

  const fetchUserAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        if (looksLikeMissingAgentsTable(error)) {
          setStatusMsg('⚠️ Supabase table public.agents is missing. Using local storage fallback.');
        } else {
          setStatusMsg(`⚠️ Supabase read: ${error.message || 'Notice'}`);
        }
      }

      if (!error && data && data.length > 0) {
        setMyAgents(data);
      }

      // Query active live inbound agent from Retell
      try {
        const liveRes = await axios.get(`${API_BASE_URL}/active-inbound-agent`);
        if (liveRes.data?.success && liveRes.data.agent_id) {
          setLiveInboundId(liveRes.data.agent_id);
        }
      } catch (e) {
        console.warn('Could not fetch active inbound agent:', e);
      }
    } catch (e) {
      console.log('Supabase agents query info:', e);
    }
  };


  const handleSetLiveInbound = async (agentId) => {
    try {
      setStatusMsg('Updating Retell live inbound routing...');
      const res = await axios.post(`${API_BASE_URL}/set-active-inbound-agent`, {
        agent_id: agentId,
      });
      if (res.data?.success) {
        setLiveInboundId(agentId);
        const ag = myAgents.find((a) => a.agent_id === agentId);
        setStatusMsg(`✅ Agent "${ag?.agent_name || agentId}" is now the active Live Inbound Agent!`);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setStatusMsg(`❌ Failed to set live inbound agent: ${msg}`);
    }
  };

  useEffect(() => {
    fetchUserAgents();
  }, [user]);

  const handleStartCall = async (agent) => {
    setActiveCallAgentId(agent.agent_id);
    setActiveCallStatus(`Connecting web call with ${agent.agent_name}...`);

    try {
      const res = await axios.post(`${API_BASE_URL}/register-call`, {
        agent_id: agent.agent_id
      });

      if (!res.data || !res.data.success) {
        throw new Error(res.data?.detail || 'Failed to register call session');
      }

      const accessToken = res.data.call_data.access_token;
      let client = retellClientRef.current;
      if (!client) {
        client = new RetellWebClient();
        retellClientRef.current = client;
      }

      client.on('call_started', () => {
        setActiveCallStatus(`🎙️ Live Call Active with "${agent.agent_name}"`);
      });

      client.on('call_ended', () => {
        setActiveCallStatus('Call ended.');
        setActiveCallAgentId(null);
      });

      client.on('error', (err) => {
        const msg = typeof err === 'string' ? err : err?.message || 'Call Error';
        setActiveCallStatus(`❌ Call Error: ${msg}`);
        setActiveCallAgentId(null);
      });

      await client.startCall({ accessToken });

    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setActiveCallStatus(`❌ Call Error: ${msg}`);
      setActiveCallAgentId(null);
    }
  };

  const handleStopCall = () => {
    if (retellClientRef.current) {
      try {
        retellClientRef.current.stopCall();
      } catch (e) { }
    }
    setActiveCallAgentId(null);
    setActiveCallStatus('Call ended.');
  };

  const handleDeployAgent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('Provisioning Agent & Knowledge Base in Retell Engine...');

    try {
      const res = await axios.post(`${API_BASE_URL}/create-custom-agent`, {
        agent_name: agentName,
        call_type: callType,
        prompt: prompt,
        knowledge_base: knowledgeBaseText,
        voice_id: voiceId
      });

      if (res.data && res.data.success) {
        const newAgent = res.data.agent;

        const { error: insertError } = await supabase.from('agents').insert([{
          user_id: currentUserId,
          agent_id: newAgent.agent_id,
          agent_name: newAgent.agent_name,
          call_type: newAgent.call_type,
          voice_id: newAgent.voice_id,
          llm_id: newAgent.llm_id
        }]);

        if (insertError) {
          console.warn('Supabase insert notice:', insertError);
        }

        setMyAgents(prev => [newAgent, ...prev]);
        setStatusMsg(`✅ Agent "${agentName}" deployed successfully!`);
      } else {
        throw new Error(res.data?.detail || 'Failed to provision agent');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setStatusMsg(`❌ Error deploying agent: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgent = async (agentIdToDelete) => {
    if (activeCallAgentId === agentIdToDelete) {
      handleStopCall();
    }

    try {
      await axios.delete(`${API_BASE_URL}/delete-agent/${agentIdToDelete}`);
    } catch (e) {
      console.log('Retell API delete notice:', e);
    }

    try {
      await supabase
        .from('agents')
        .delete()
        .eq('agent_id', agentIdToDelete)
        .eq('user_id', currentUserId);
    } catch (e) {
      console.log('Supabase delete notice:', e);
    }

    setMyAgents(prev => prev.filter(a => a.agent_id !== agentIdToDelete));
  };

  return (
    <div className="agent-builder-page-wrapper">
      {/* Background Video identical to Landing Page */}
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

      <div className="stitch-builder-container">
        {/* Left Column: Agent Builder */}
        <div className="stitch-card builder-left-card">
          <CrystalShard position="top-left" />
          <CrystalShard position="top-right" />
          <h2 className="stitch-title">Agent Builder</h2>
          <p className="stitch-subtitle">Set up and deploy your voice agent</p>

          {/* Route Selector Cards */}
          <div className="stitch-route-grid">
            <div
              className={`stitch-route-card ${callType === 'inbound' ? 'active' : ''}`}
              onClick={() => {
                setCallType('inbound');
                if (agentName === 'Outbound Sales Pitcher' || !agentName) {
                  setAgentName('Customer Support Desk');
                }
              }}
            >
              <div className="stitch-route-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                </svg>
              </div>
              <div className="stitch-route-text">
                <span className="stitch-route-title">Inbound Agent</span>
                <span className="stitch-route-desc">Support &amp; FAQ handling</span>
              </div>
              <span className="stitch-route-tag">ROUTE_01</span>
            </div>

            <div
              className={`stitch-route-card ${callType === 'outbound' ? 'active' : ''}`}
              onClick={() => {
                setCallType('outbound');
                if (agentName === 'Customer Support Desk' || !agentName) {
                  setAgentName('Outbound Sales Pitcher');
                }
              }}
            >
              <div className="stitch-route-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  <line x1="23" y1="1" x2="17" y2="7"></line>
                  <polyline points="17 1 23 1 23 7"></polyline>
                </svg>
              </div>
              <div className="stitch-route-text">
                <span className="stitch-route-title">Outbound Agent</span>
                <span className="stitch-route-desc">Sales &amp; cold outreach</span>
              </div>
              <span className="stitch-route-tag">ROUTE_02</span>
            </div>
          </div>

          {/* Builder Form */}
          <form onSubmit={handleDeployAgent} className="stitch-form">
            <div className="stitch-form-group">
              <label className="stitch-label">AGENT NAME</label>
              <input
                type="text"
                className="stitch-input"
                placeholder={callType === 'inbound' ? "Customer Support Desk" : "Outbound Sales Pitcher"}
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                required
              />
            </div>

            <div className="stitch-form-group">
              <div className="stitch-label-row">
                <label className="stitch-label">SYSTEM PROMPT</label>
                <span className="stitch-label-tag">SYSTEM_DIRECTIVE_V1</span>
              </div>
              <textarea
                rows={4}
                className="stitch-textarea"
                placeholder={callType === 'inbound'
                  ? "You are a customer service representative for FinanceAI. Help callers answer account questions politely and concisely."
                  : "You are an outbound sales representative. Call potential clients to pitch our financial software."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
              />
            </div>

            <div className="stitch-form-group">
              <div className="stitch-label-row">
                <label className="stitch-label">KNOWLEDGE BASE</label>
                <span className="stitch-label-tag">RAG_CONTEXT</span>
              </div>
              <textarea
                rows={4}
                className="stitch-textarea"
                placeholder="Paste FAQs, product details, policies..."
                value={knowledgeBaseText}
                onChange={(e) => setKnowledgeBaseText(e.target.value)}
              />
            </div>

            <div className="stitch-form-group">
              <label className="stitch-label">VOICE PERSONA</label>
              <select
                className="stitch-select"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
              >
                <option value="11labs-Adrian">Male Professional — Adrian (ElevenLabs)</option>
                <option value="11labs-Emily">Female Professional — Emily (ElevenLabs)</option>
                <option value="11labs-Brian">Male Friendly — Brian (ElevenLabs)</option>
                <option value="11labs-Jenny">Female Support — Jenny (ElevenLabs)</option>
                <option value="11labs-John">Male Executive — John (ElevenLabs)</option>
                <option value="11labs-Grace">Female Warm — Grace (ElevenLabs)</option>
                <option value="openai-Nova">Female Expressive — Nova (OpenAI)</option>
                <option value="openai-Echo">Male Deep — Echo (OpenAI)</option>
              </select>
            </div>

            <button type="submit" className="stitch-deploy-btn" disabled={loading}>
              {loading ? 'Deploying...' : `Deploy ${callType === 'inbound' ? 'Inbound' : 'Outbound'} Agent`}
            </button>
          </form>

          {statusMsg && (
            <div className="stitch-status-banner">
              {statusMsg}
            </div>
          )}
        </div>

        {/* Right Column: Deployed Agents */}
        <div className="stitch-card">
          <div className="stitch-panel-header">
            <h3 className="stitch-panel-title">Deployed Agents</h3>
            <span className="stitch-count-badge">{myAgents.length}</span>
          </div>

          {/* Deployed List */}
          <div className="stitch-agent-list">
            {myAgents.length === 0 ? (
              <div className="stitch-empty-slot">
                Deploy an agent to see it here
              </div>
            ) : (
              myAgents.map((ag, idx) => (
                <div key={ag.agent_id || idx} className={`stitch-agent-card ${ag.call_type === 'outbound' ? 'outbound' : 'inbound'}`}>
                  <div className="stitch-agent-top">
                    <div className="stitch-agent-name" title={ag.agent_name}>
                      {ag.agent_name}
                    </div>
                    <div className="stitch-agent-top-right">
                      <svg className="stitch-agent-sparkline" width="56" height="22" viewBox="0 0 56 22" fill="none" aria-hidden="true">
                        <path d="M2 14 C 10 18, 16 6, 26 14 C 36 20, 44 4, 52 6" stroke="url(#sparkGrad)" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="52" cy="6" r="2.5" fill="#38bdf8" />
                        <defs>
                          <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#38bdf8" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <button
                        type="button"
                        onClick={() => handleDeleteAgent(ag.agent_id)}
                        className="stitch-trash-btn"
                        title="Delete Agent"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={`stitch-type-badge ${ag.call_type === 'outbound' ? 'outbound' : 'inbound'}`}>
                      {(ag.call_type || 'inbound').toUpperCase()}
                    </span>
                    {ag.call_type === 'inbound' && (
                      ag.agent_id === liveInboundId ? (
                        <span className="stitch-live-inbound-badge">
                          ● LIVE INBOUND AGENT
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetLiveInbound(ag.agent_id)}
                          className="stitch-set-live-btn"
                          title="Route all live incoming carrier and WebRTC calls to this agent"
                        >
                          Set as Live Inbound
                        </button>
                      )
                    )}
                  </div>

                  <div className="stitch-agent-id-row">
                    Agent ID: <span className="stitch-agent-id-val">{ag.agent_id}</span>
                  </div>

                  <div className="stitch-card-actions-grid">
                    <button
                      type="button"
                      onClick={() => handleOpenEditContext(ag)}
                      className="stitch-edit-context-btn"
                      title="Edit agent system prompt / context only (voice & phone are protected)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit Context
                    </button>

                    {activeCallAgentId !== ag.agent_id ? (
                      <button
                        type="button"
                        onClick={() => handleStartCall(ag)}
                        className="stitch-test-btn"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                          <line x1="12" y1="19" x2="12" y2="23"></line>
                          <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                        Test Call
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopCall}
                        className="stitch-test-btn active-call"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="6" y="6" width="12" height="12"></rect>
                        </svg>
                        End Call
                      </button>
                    )}
                  </div>

                  {activeCallAgentId === ag.agent_id && (
                    <div className="stitch-status-banner" style={{ marginTop: '10px', fontSize: '11.5px', padding: '6px 10px' }}>
                      {activeCallStatus}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Placeholder slot if at least 1 agent is present */}
            {myAgents.length > 0 && (
              <div className="stitch-empty-slot">
                Deploy an agent to see it here
              </div>
            )}
          </div>

          {/* Telemetry / Status Metadata at bottom */}
          <div className="stitch-telemetry-box">
            <div className="stitch-telemetry-row">
              <span className="stitch-telemetry-label">Runtime Cluster</span>
              <span className="stitch-telemetry-val">us-east-1-telephony</span>
            </div>
            <div className="stitch-telemetry-row">
              <span className="stitch-telemetry-label">Active Retell Session</span>
              <span className="stitch-telemetry-val bold">STANDBY_READY</span>
            </div>
            <div className="stitch-telemetry-row">
              <span className="stitch-telemetry-label">Target Pipeline Latency</span>
              <span className="stitch-telemetry-val cyan">&lt; 380ms</span>
            </div>
          </div>
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
                    {(editingAgent.call_type || 'inbound').toUpperCase()}
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
                  {/* Dynamic variables are only for Outbound calls (since known lead data is injected at dial time) */}
                  {editingAgent.call_type === 'outbound' ? (
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
                          onClick={() => handleInsertTag(v)}
                          title={`Click to insert {{${v}}} into prompt and copy to clipboard`}
                        >
                          {editCopiedTag === v ? 'Copied! ✓' : `+ {{${v}}}`}
                        </button>
                      ))}
                    </div>
                  ) : null}


                  <div className="stitch-form-group">
                    <div className="stitch-label-row">
                      <label className="stitch-label">SYSTEM CONTEXT / PROMPT</label>
                      <span className="stitch-label-tag">{editPrompt.length} CHARS</span>
                    </div>
                    <textarea
                      rows={9}
                      className="stitch-textarea stitch-modal-textarea"
                      placeholder="System prompt and instructions defining the agent's behavior, tone, FAQs, and knowledge..."
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      required
                    />
                  </div>

                  <div className="stitch-form-group">
                    <div className="stitch-label-row">
                      <label className="stitch-label">BEGIN MESSAGE / GREETING (OPTIONAL)</label>
                      <span className="stitch-label-tag">INITIAL_SPEECH</span>
                    </div>
                    <input
                      type="text"
                      className="stitch-input"
                      placeholder="e.g. Hello, thank you for calling Axis Bank. How can I assist you today?"
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

export default AgentBuilder;
