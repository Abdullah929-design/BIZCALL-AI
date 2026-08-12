import React, { useState, useRef } from 'react';
import axios from 'axios';
import { RetellWebClient } from 'retell-client-js-sdk';
import './RetellCallDemo.css';

const API_BASE_URL = '/api/retell';

const AgentBuilder = () => {
  const [callType, setCallType] = useState('inbound'); // inbound vs outbound
  const [agentName, setAgentName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [knowledgeBaseText, setKnowledgeBaseText] = useState('');
  const [voiceId, setVoiceId] = useState('11labs-Adrian');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [activeCallAgentId, setActiveCallAgentId] = useState(null);
  const [activeCallStatus, setActiveCallStatus] = useState('');
  const retellClientRef = useRef(null);

  const [myAgents, setMyAgents] = useState(() => {
    try {
      const saved = localStorage.getItem('bizcall_agents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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
      } catch (e) {}
    }
    setActiveCallAgentId(null);
    setActiveCallStatus('Call ended.');
  };

  const saveAgentsToStorage = (agentsList) => {
    try {
      localStorage.setItem('bizcall_agents', JSON.stringify(agentsList));
    } catch (e) {
      console.error('Failed to save agents to localStorage', e);
    }
  };

  const handleDeployAgent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('Provisioning Agent & Knowledge Base in Retell Engine...');

    try {
      // API call to create customized agent
      const res = await axios.post(`${API_BASE_URL}/create-custom-agent`, {
        agent_name: agentName,
        call_type: callType,
        prompt: prompt,
        knowledge_base: knowledgeBaseText,
        voice_id: voiceId
      });

      if (res.data && res.data.success) {
        const newAgent = res.data.agent;
        setMyAgents(prev => {
          const updated = [newAgent, ...prev];
          saveAgentsToStorage(updated);
          return updated;
        });
        setStatusMsg(`✅ Agent "${agentName}" deployed successfully! Agent ID: ${newAgent.agent_id}`);
        // Reset form
        setAgentName('');
        setPrompt('');
        setKnowledgeBaseText('');
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

  const handleDeleteAgent = (agentIdToDelete) => {
    setMyAgents(prev => {
      const updated = prev.filter(a => a.agent_id !== agentIdToDelete);
      saveAgentsToStorage(updated);
      return updated;
    });
  };

  return (
    <div className="retell-container" style={{ maxWidth: '1200px' }}>
      <div className="retell-card">
        <h2>🛠️ Custom AI Voice Agent Builder</h2>
        <p className="retell-subtitle">Configure your script, knowledge base, and launch live Inbound or Outbound Agents.</p>

        {/* Selection Switch */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            type="button"
            className="call-btn"
            onClick={() => setCallType('inbound')}
            style={{
              flex: 1,
              background: callType === 'inbound' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'rgba(255,255,255,0.05)',
              border: callType === 'inbound' ? 'none' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            📥 Inbound Voice Agent (Support & FAQs)
          </button>

          <button
            type="button"
            className="call-btn"
            onClick={() => setCallType('outbound')}
            style={{
              flex: 1,
              background: callType === 'outbound' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.05)',
              border: callType === 'outbound' ? 'none' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            📤 Outbound Campaign Agent (Sales & Calls)
          </button>
        </div>

        <form onSubmit={handleDeployAgent} className="retell-form">
          <div className="form-group">
            <label>Agent Name</label>
            <input
              type="text"
              placeholder={callType === 'inbound' ? "e.g. Banking Support Desk" : "e.g. Lead Qualification Bot"}
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>System Script / Instructions (Prompt)</label>
            <textarea
              rows={4}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '0.9rem'
              }}
              placeholder={callType === 'inbound'
                ? "You are a customer service representative for FinanceAI. Help callers answer account questions politely and concisely."
                : "You are an outbound sales representative. Call potential clients to pitch our financial software."
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Knowledge Base & FAQs (Custom Business Data)</label>
            <textarea
              rows={3}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '0.9rem'
              }}
              placeholder="Paste product policies, pricing details, or custom business FAQs here..."
              value={knowledgeBaseText}
              onChange={(e) => setKnowledgeBaseText(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Voice Persona</label>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff'
              }}
            >
              <option value="11labs-Adrian">Male Professional (Adrian - ElevenLabs)</option>
              <option value="11labs-Rachel">Female Friendly (Rachel - ElevenLabs)</option>
              <option value="11labs-Domi">Female Energetic (Domi - ElevenLabs)</option>
            </select>
          </div>

          <button type="submit" className="call-btn" disabled={loading} style={{ marginTop: '12px' }}>
            {loading ? 'Provisioning Live Agent...' : `⚡ Deploy Live ${callType === 'inbound' ? 'Inbound' : 'Outbound'} Agent`}
          </button>
        </form>

        {statusMsg && (
          <div className="status-badge" style={{ marginTop: '20px' }}>
            {statusMsg}
          </div>
        )}
      </div>

      {/* Active Deployed Agents Dashboard */}
      <div className="retell-card">
        <h3>📋 Deployed Agents ({myAgents.length})</h3>
        {myAgents.length === 0 ? (
          <p className="empty-log" style={{ marginTop: '60px' }}>No custom agents created yet. Use the builder on the left to deploy your first agent.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {myAgents.map((ag, idx) => (
              <div key={idx} style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{ag.agent_name}</strong>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: ag.call_type === 'inbound' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: ag.call_type === 'inbound' ? '#818cf8' : '#34d399'
                    }}>
                      {ag.call_type?.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteAgent(ag.agent_id)}
                      title="Remove Agent"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '0 4px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                  Agent ID: <code style={{ color: '#60a5fa' }}>{ag.agent_id}</code>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {activeCallAgentId !== ag.agent_id ? (
                    <button
                      type="button"
                      onClick={() => handleStartCall(ag)}
                      className="call-btn"
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      }}
                    >
                      🎙️ Test Voice Call
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopCall}
                      className="call-btn"
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.82rem',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      }}
                    >
                      ⏹️ End Call
                    </button>
                  )}
                </div>

                {activeCallAgentId === ag.agent_id && (
                  <div className="status-badge" style={{ marginTop: '10px', fontSize: '0.8rem' }}>
                    {activeCallStatus}
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

export default AgentBuilder;
