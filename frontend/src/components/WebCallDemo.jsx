import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { RetellWebClient } from 'retell-client-js-sdk';
import './RetellCallDemo.css';

const API_BASE_URL = 'http://localhost:8002/api/retell';

const WebCallDemo = () => {
  const [agentId, setAgentId] = useState('agent_a84bfa12b9d61b4e168f9e4201');
  const [callStatus, setCallStatus] = useState('Idle');
  const [isCalling, setIsCalling] = useState(false);
  const [logs, setLogs] = useState([]);
  const [callId, setCallId] = useState(null);
  const retellWebClientRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev]);
  };

  useEffect(() => {
    try {
      const client = new RetellWebClient();
      retellWebClientRef.current = client;

      client.on('call_started', () => {
        setCallStatus('🎙️ Call Active - Speak into your microphone!');
        addLog('Web call active! Listening & speaking live...', 'success');
      });

      client.on('call_ended', () => {
        setCallStatus('Call ended');
        setIsCalling(false);
        addLog('Web call ended.', 'info');
      });

      client.on('agent_start_talking', () => {
        addLog('🤖 AI Agent is speaking...', 'info');
      });

      client.on('agent_stop_talking', () => {
        addLog('👤 AI Agent finished speaking.', 'info');
      });

      client.on('error', (err) => {
        setCallStatus(`Error: ${err?.message || 'Web call error'}`);
        addLog(`Web Call Error: ${err?.message || JSON.stringify(err)}`, 'error');
        setIsCalling(false);
      });
    } catch (e) {
      addLog(`SDK init error: ${e.message}`, 'error');
    }
  }, []);

  const startWebCall = async () => {
    setIsCalling(true);
    setCallStatus('Registering web call session...');
    addLog('Requesting web call access token...', 'info');

    try {
      // 1. Get access token from backend
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

      // 2. Start Retell Web Call via WebRTC
      setCallStatus('Connecting audio & microphone...');

      let client = retellWebClientRef.current;
      if (!client) {
        client = new RetellWebClient();
        retellWebClientRef.current = client;

        client.on('call_started', () => {
          setCallStatus('🎙️ Call Active - Speak into your microphone!');
          addLog('Web call active! Listening & speaking live...', 'success');
        });

        client.on('call_ended', () => {
          setCallStatus('Call ended');
          setIsCalling(false);
          addLog('Web call ended.', 'info');
        });

        client.on('agent_start_talking', () => {
          addLog('🤖 AI Agent is speaking...', 'info');
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
    if (retellWebClientRef.current && typeof retellWebClientRef.current.stopCall === 'function') {
      retellWebClientRef.current.stopCall();
    }
    setIsCalling(false);
    setCallStatus('Call manually ended');
    addLog('Ending call...', 'info');
  };

  return (
    <div className="retell-container">
      <div className="retell-card">
        <h2>🌐 Browser Web Call (Microphone Testing)</h2>
        <p className="retell-subtitle">Test your Retell AI Agent directly using your web browser without a phone number!</p>

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

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            {!isCalling ? (
              <button onClick={startWebCall} className="call-btn" style={{ flex: 1, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                🎙️ Start Browser Web Call
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
            <strong>Current Session Call ID:</strong> <code style={{ color: '#60a5fa' }}>{callId}</code>
          </div>
        )}
      </div>

      <div className="retell-card logs-card">
        <h3>📋 Web Call Event Logs</h3>
        <div className="log-container">
          {logs.length === 0 ? (
            <p className="empty-log">Click "Start Browser Web Call" to test using your mic.</p>
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
