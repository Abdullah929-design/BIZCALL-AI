import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { RetellWebClient } from 'retell-client-js-sdk';
import './RetellCallDemo.css';

const API_BASE_URL = '/api/retell';

const WebCallDemo = () => {
  const [agentId, setAgentId] = useState('agent_a84bfa12b9d61b4e168f9e4201');
  const [flowId, setFlowId] = useState('conversation_flow_143042efc02b');
  const [callStatus, setCallStatus] = useState('Idle');
  const [isCalling, setIsCalling] = useState(false);
  const [logs, setLogs] = useState([]);
  const [callId, setCallId] = useState(null);
  const retellWebClientRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev]);
  };

  useEffect(() => {
    // Fetch configuration from backend if available
    axios.get(`${API_BASE_URL}/config`)
      .then(res => {
        if (res.data.agent_id) setAgentId(res.data.agent_id);
        if (res.data.conversation_flow_id) setFlowId(res.data.conversation_flow_id);
      })
      .catch(() => {});

    try {
      const client = new RetellWebClient();
      retellWebClientRef.current = client;

      client.on('call_started', () => {
        setCallStatus('🎙️ Call Active - Listening & Speaking Live');
        addLog('Web call active! Speak into your microphone.', 'success');
      });

      client.on('call_ended', () => {
        setCallStatus('Call ended');
        setIsCalling(false);
        addLog('Web call ended.', 'info');
      });

      client.on('agent_start_talking', () => {
        addLog('🤖 Retell AI Agent is speaking...', 'info');
      });

      client.on('agent_stop_talking', () => {
        addLog('👤 AI Agent finished speaking.', 'info');
      });

      client.on('error', (err) => {
        const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
        setCallStatus(`Error: ${msg}`);
        addLog(`Web Call Error: ${msg}`, 'error');
        setIsCalling(false);
      });
    } catch (e) {
      addLog(`SDK init error: ${e.message}`, 'error');
    }
  }, []);

  const startWebCall = async () => {
    setIsCalling(true);
    setCallStatus('Registering web call session with Retell AI...');
    addLog('Requesting web call access token...', 'info');

    try {
      const res = await axios.post(`${API_BASE_URL}/register-call`, {
        agent_id: agentId,
      });

      if (!res.data || !res.data.success) {
        throw new Error(res.data?.detail || 'Failed to register call');
      }

      const callData = res.data.call_data;
      const accessToken = callData.access_token;
      setCallId(callData.call_id);
      addLog(`Call registered! ID: ${callData.call_id}`, 'success');

      setCallStatus('Connecting audio & microphone...');

      let client = retellWebClientRef.current;
      if (!client) {
        client = new RetellWebClient();
        retellWebClientRef.current = client;
      }

      await client.startCall({
        accessToken: accessToken,
      });

    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message;
      setCallStatus(`Error: ${errorMsg}`);
      addLog(`Failed to start Web Call: ${errorMsg}`, 'error');
      setIsCalling(false);
    }
  };

  const stopWebCall = () => {
    if (retellWebClientRef.current) {
      try {
        retellWebClientRef.current.stopCall();
      } catch (e) {}
    }
    setIsCalling(false);
    setCallStatus('Call manually ended');
    addLog('Ending call...', 'info');
  };

  return (
    <div className="retell-container">
      <div className="retell-card">
        <h2>🎙️ Retell AI Call Testing Console</h2>
        <p className="retell-subtitle">Active Retell AI Voice Agent integration page with Conversation Flow support.</p>

        <div className="retell-form">
          <div className="form-group">
            <label>Retell Agent ID</label>
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="agent_a84bfa12b9d61b4e168f9e4201"
              required
            />
          </div>

          <div className="form-group">
            <label>Conversation Flow ID</label>
            <input
              type="text"
              value={flowId}
              onChange={(e) => setFlowId(e.target.value)}
              placeholder="conversation_flow_143042efc02b"
              readOnly
              style={{ opacity: 0.8 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            {!isCalling ? (
              <button onClick={startWebCall} className="call-btn" style={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                🎙️ Start Retell AI Voice Call
              </button>
            ) : (
              <button onClick={stopWebCall} className="call-btn" style={{ flex: 1, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                ⏹️ End Call
              </button>
            )}
          </div>
        </div>

        {callStatus && (
          <div className="status-badge" style={{ marginTop: '20px' }}>
            <strong>Status:</strong> {callStatus}
          </div>
        )}

        {callId && (
          <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#94a3b8' }}>
            <strong>Current Call Session ID:</strong> <code style={{ color: '#60a5fa' }}>{callId}</code>
          </div>
        )}
      </div>

      <div className="retell-card logs-card">
        <h3>📋 Live Retell AI Event Logs</h3>
        <div className="log-container">
          {logs.length === 0 ? (
            <p className="empty-log">Click "Start Retell AI Voice Call" to initiate a browser voice test.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`log-entry ${log.type}`}>
                <span className="log-time">[{log.time}]</span> {log.msg}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WebCallDemo;
