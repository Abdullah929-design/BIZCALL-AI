import React, { useState } from 'react';
import axios from 'axios';
import './RetellCallDemo.css';

const API_BASE_URL = 'http://localhost:8002/api/retell';

const RetellCallDemo = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [agentId, setAgentId] = useState('agent_a84bfa12b9d61b4e168f9e4201');
  const [callStatus, setCallStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev]);
  };

  const handleMakeCall = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      alert('Please enter a target phone number.');
      return;
    }
    setLoading(true);
    setCallStatus('Initiating call...');
    addLog(`Initiating Retell outbound call to ${phoneNumber}...`);

    try {
      const res = await axios.post(`${API_BASE_URL}/create-phone-call`, {
        from_number: fromNumber || '+1234567890',
        to_number: phoneNumber,
        override_agent_id: agentId,
      });

      if (res.data && res.data.success) {
        setCallStatus('Call connected successfully!');
        addLog(`Call created successfully! Call SID: ${res.data.call?.call_id || 'N/A'}`, 'success');
      } else {
        setCallStatus('Call failed to initiate.');
        addLog(`Failed to make call: ${JSON.stringify(res.data)}`, 'error');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message;
      setCallStatus(`Error: ${errorMsg}`);
      addLog(`Error initiating call: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="retell-container">
      <div className="retell-card">
        <h2>🎙️ Retell AI Outbound Call Center</h2>
        <p className="retell-subtitle">Trigger AI voice agent calls directly via Retell AI Engine</p>

        <form onSubmit={handleMakeCall} className="retell-form">
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
            <label>Customer Phone Number (E.164 format)</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+12345678901"
              required
            />
          </div>

          <div className="form-group">
            <label>From Phone Number (Your Retell/Twilio Number)</label>
            <input
              type="tel"
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
              placeholder="+12345678900"
            />
          </div>

          <button type="submit" className="call-btn" disabled={loading}>
            {loading ? 'Dialing...' : '📞 Make AI Voice Call'}
          </button>
        </form>

        {callStatus && <div className="status-badge">{callStatus}</div>}
      </div>

      <div className="retell-card logs-card">
        <h3>📋 Real-Time Retell Event Logs</h3>
        <div className="log-container">
          {logs.length === 0 ? (
            <p className="empty-log">No calls initiated yet.</p>
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

export default RetellCallDemo;
