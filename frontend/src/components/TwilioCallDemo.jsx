import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Info, 
  Settings, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ShieldCheck,
  Zap,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8002/api';

const CSS = `
  .tc { display:flex; flex-direction:column; height:100%; min-height:0; background:transparent; font-family:'Inter',sans-serif; }
  
  /* -- Bar -- */
  .tc-bar {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 28px;
    border-bottom:1px solid rgba(255,255,255,0.07);
    flex-shrink:0;
    gap:12px;
  }
  .tc-bar-left { display:flex; align-items:center; gap:14px; }
  .tc-bar-avatar {
    width:36px; height:36px; border-radius:10px; flex-shrink:0;
    background:linear-gradient(135deg,#c9a84c,#8a6820);
    display:flex; align-items:center; justify-content:center;
    color:#000; box-shadow:0 2px 12px rgba(201,168,76,0.25);
  }
  .tc-bar-title { font-size:0.88rem; font-weight:500; color:#edeae2; }
  .tc-bar-sub { font-size:0.68rem; letter-spacing:0.1em; text-transform:uppercase; color:rgba(201,168,76,0.55); margin-top:1px; }

  /* -- Tabs/Grid -- */
  .tc-grid {
    display:grid; grid-template-columns: 1fr 340px; gap:20px;
    padding:24px; flex:1; min-height:0; overflow-y:auto;
  }
  @media (max-width: 1100px) { .tc-grid { grid-template-columns: 1fr; } }

  .tc-panel {
    background:rgba(255,255,255,0.02);
    border:1px solid rgba(255,255,255,0.06);
    border-radius:16px; padding:24px;
    display:flex; flex-direction:column; gap:20px;
  }

  .tc-panel-header {
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.05);
    margin-bottom:4px;
  }

  .tc-panel-title {
    display:flex; align-items:center; gap:8px;
    font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.12em;
    color:var(--gold-light);
  }

  .tc-status-badge {
    padding:4px 12px; border-radius:20px; font-size:0.65rem; font-weight:700;
    text-transform:uppercase; letter-spacing:0.08em;
  }
  .tc-status-idle { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.3); }
  .tc-status-initiating { background:rgba(99,102,241,0.15); color:#818cf8; animation: pulse 1.5s infinite; }
  .tc-status-ringing { background:rgba(251,191,36,0.15); color:#fbbf24; }
  .tc-status-in-progress { background:rgba(74,222,128,0.15); color:#4ade80; border:1px solid rgba(74,222,128,0.2); }
  .tc-status-completed { background:rgba(129,140,248,0.1); color:rgba(129,140,248,0.7); }
  .tc-status-failed { background:rgba(248,113,113,0.1); color:#f87171; }

  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

  /* -- Form -- */
  .tc-field { display:flex; flex-direction:column; gap:8px; }
  .tc-label { font-size:0.75rem; font-weight:500; color:rgba(237,234,226,0.4); letter-spacing:0.04em; }
  .tc-input {
    background:rgba(255,255,255,0.04);
    border:1px solid rgba(255,255,255,0.08);
    border-radius:10px; padding:12px 14px;
    color:#edeae2; font-family:inherit; font-size:0.85rem;
    transition: all 0.2s;
  }
  .tc-input:focus { outline:none; border-color:rgba(201,168,76,0.3); background:rgba(255,255,255,0.06); }
  .tc-input:disabled { opacity:0.3; cursor:not-allowed; }
  .tc-textarea { resize:none; min-height:80px; }

  .tc-btn {
    display:flex; align-items:center; justify-content:center; gap:10px;
    padding:16px; border-radius:12px; border:none; cursor:pointer;
    font-weight:600; font-family:inherit; text-transform:uppercase; letter-spacing:0.08em;
    transition: all 0.2s;
  }
  .tc-btn-primary { 
    background:linear-gradient(135deg,#c9a84c,#a8882e); color:#000;
    box-shadow: 0 4px 15px rgba(201,168,76,0.2);
  }
  .tc-btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow: 0 6px 20px rgba(201,168,76,0.3); background:#ddb95e; }
  .tc-btn-primary:disabled { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.15); cursor:not-allowed; }

  .tc-btn-danger { background:rgba(248,113,113,0.15); color:#f87171; border:1px solid rgba(248,113,113,0.2); }
  .tc-btn-danger:hover { background:rgba(248,113,113,0.25); color:#ff8a8a; }

  /* -- Blocks -- */
  .tc-block {
    display:flex; flex-direction:column; gap:12px; padding:16px;
    background:rgba(0,0,0,0.15); border-radius:12px; border:1px solid rgba(255,255,255,0.04);
  }
  .tc-block-title { font-size:0.75rem; font-weight:600; color:rgba(237,234,226,0.6); display:flex; align-items:center; gap:6px; }
  .tc-webhook-code {
    padding:10px; background:rgba(0,0,0,0.3); border-radius:8px;
    font-family:'DM Mono',monospace; font-size:0.65rem; color:#c9a84c;
    word-break:break-all; border:1px solid rgba(201,168,76,0.1);
  }

  .tc-log-scroll {
    height:140px; overflow-y:auto; padding:12px;
    background:rgba(0,0,0,0.2); border-radius:10px;
    font-family:'DM Mono',monospace; font-size:0.65rem;
    color:rgba(237,234,226,0.4); display:flex; flex-direction:column; gap:4px;
  }
  .tc-log-line { border-left:2px solid transparent; padding-left:8px; }
  .tc-log-system { border-color:rgba(255,255,255,0.1); }
  .tc-log-twilio { border-color:#c9a84c; color:rgba(201,168,76,0.7); }
  .tc-log-audio { border-color:#4ade80; color:rgba(74,222,128,0.6); }

  /* -- History -- */
  .tc-hist-item {
    padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05);
    display:flex; flex-direction:column; gap:4px;
  }
  .tc-hist-item:last-child { border-bottom:none; }
  .tc-hist-top { display:flex; justify-content:space-between; align-items:center; }
  .tc-hist-num { font-size:0.75rem; font-weight:600; color:#edeae2; font-family:'DM Mono'; }
  .tc-hist-time { font-size:0.62rem; color:rgba(255,255,255,0.2); }
  .tc-hist-meta { display:flex; align-items:center; gap:8px; font-size:0.65rem; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.04em; }
  .tc-hist-ctx { font-size:0.65rem; color:rgba(255,255,255,0.2); font-style:italic; line-clamp:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  .tc-dot-live { width:5px; height:5px; border-radius:50%; background:#4ade80; display:inline-block; margin-right:6px; animation:dot 1.5s infinite; }
  @keyframes dot { 0%,100%{opacity:0.3} 50%{opacity:1} }
`;

const TwilioCallDemo = () => {
  const [toNumber, setToNumber] = useState('+15005550001');
  const [businessContext, setBusinessContext] = useState('New savings account offer with 4% APY');
  const [instructions, setInstructions] = useState('Be polite and professional. Offer the 4% rate. If they mention competitors, emphasize our 24/7 human support.');
  const [isCalling, setIsCalling] = useState(false);
  const [callSid, setCallSid] = useState(null);
  const [currentCallStatus, setCurrentCallStatus] = useState('idle'); // idle, calling, in-progress, completed, failed
  const [callHistory, setCallHistory] = useState([]);
  const [testNumbers, setTestNumbers] = useState({});
  const [ngrokUrl, setNgrokUrl] = useState('https://...ngrok-free.dev');
  
  const statusPollRef = useRef(null);

  // Fetch test numbers and config on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/health/twilio-test-numbers`)
      .then(res => res.json())
      .then(data => setTestNumbers(data.test_numbers || {}))
      .catch(err => console.error("Failed to fetch test numbers:", err));

    fetch(`${API_BASE_URL}/health/config`)
      .then(res => res.json())
      .then(data => setNgrokUrl(data.NGROK_URL || ''))
      .catch(err => console.error("Failed to fetch config:", err));
  }, []);

  // Poll for call status if active
  useEffect(() => {
    if (callSid && (currentCallStatus === 'queued' || currentCallStatus === 'ringing' || currentCallStatus === 'in-progress')) {
      statusPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/twilio/call-status/${callSid}`);
          if (res.ok) {
            const data = await res.json();
            setCurrentCallStatus(data.status);
            
            if (data.status === 'completed' || data.status === 'failed' || data.status === 'no-answer') {
              stopPolling();
              setIsCalling(false);
              addCallToHistory({
                ...data,
                timestamp: new Date().toISOString(),
                business_context: businessContext
              });
            }
          }
        } catch (err) {
          console.error("Status check failed:", err);
        }
      }, 2000);
    } else {
      stopPolling();
    }
    
    return () => stopPolling();
  }, [callSid, currentCallStatus]);

  const stopPolling = () => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
  };

  const addCallToHistory = (call) => {
    setCallHistory(prev => [call, ...prev].slice(0, 5));
  };

  const handleInitiateCall = async () => {
    if (!toNumber || !businessContext || !instructions) return;
    
    setIsCalling(true);
    setCurrentCallStatus('initiating');
    
    try {
      const response = await fetch(`${API_BASE_URL}/twilio/initiate-outbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_number: toNumber,
          business_context: businessContext,
          instructions: instructions
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCallSid(data.call_sid);
        setCurrentCallStatus(data.status);
      } else {
        alert("Failed to initiate call: " + (data.detail || "Unknown error"));
        setIsCalling(false);
        setCurrentCallStatus('failed');
      }
    } catch (err) {
      console.error("Call initiation error:", err);
      setIsCalling(false);
      setCurrentCallStatus('failed');
    }
  };

  const handleHangUp = async () => {
    if (!callSid) return;
    try {
      await fetch(`${API_BASE_URL}/twilio/end-call/${callSid}`, { method: 'POST' });
      setCurrentCallStatus('completed');
      setIsCalling(false);
    } catch (err) { console.error("Hangup failed:", err); }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="tc">
        {/* -- Top Bar -- */}
        <div className="tc-bar">
          <div className="tc-bar-left">
            <div className="tc-bar-avatar"><PhoneCall size={18} /></div>
            <div>
              <div className="tc-bar-title">AI Voice Simulator</div>
              <div className="tc-bar-sub">Tier 1 Twilio Integration</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`tc-status-badge tc-status-${currentCallStatus}`}>
              {currentCallStatus}
            </div>
          </div>
        </div>

        <div className="tc-grid">
          {/* Main Config */}
          <div className="flex flex-col gap-5">
            <div className="tc-panel">
              <div className="tc-panel-header">
                <span className="tc-panel-title"><Settings size={14} /> Call Configuration</span>
                <ShieldCheck size={16} color="var(--gold-dim)" />
              </div>

              <div className="grid grid-cols-2 gap-5" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                <div className="tc-field">
                  <label className="tc-label">Destination Number</label>
                  <input 
                    className="tc-input" 
                    value={toNumber} 
                    onChange={e => setToNumber(e.target.value)}
                    disabled={isCalling}
                    placeholder="+1xxxx xxx xxx"
                  />
                </div>
                <div className="tc-field">
                  <label className="tc-label">Voice Agent</label>
                  <div className="tc-input" style={{display:'flex', alignItems:'center', gap:'8px', opacity:0.6}}>
                    <span style={{width:8, height:8, borderRadius:'50%', background:'var(--gold)'}}></span>
                    "Alice" - Professional
                  </div>
                </div>
              </div>

              <div className="tc-field">
                <label className="tc-label">Business Context</label>
                <textarea 
                  className="tc-input tc-textarea" 
                  value={businessContext}
                  onChange={e => setBusinessContext(e.target.value)}
                  disabled={isCalling}
                  placeholder="What is the objective of the call?"
                />
              </div>

              <div className="tc-field">
                <label className="tc-label">LLM Instructions</label>
                <textarea 
                  className="tc-input tc-textarea" 
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  disabled={isCalling}
                  placeholder="How should the agent handle the conversation?"
                />
              </div>

              {!isCalling ? (
                <button 
                  className="tc-btn tc-btn-primary" 
                  onClick={handleInitiateCall}
                  disabled={!toNumber || !businessContext}
                >
                  <Phone size={18} /> Initiate Outbound Call
                </button>
              ) : (
                <button className="tc-btn tc-btn-danger" onClick={handleHangUp}>
                  <PhoneOff size={18} /> Terminate Connection
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-5" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
              <div className="tc-panel" style={{padding:'20px'}}>
                <h3 className="tc-panel-title" style={{fontSize:'0.7rem', marginBottom:'12px'}}>
                  <PhoneCall size={12} /> Inbound Webhook
                </h3>
                <div className="tc-block">
                  <div className="tc-webhook-code">{ngrokUrl || '...loading'}/api/twilio/inbound-call</div>
                  <p style={{fontSize:'0.6rem', color:'rgba(255,255,255,0.2)', margin:0}}>
                    Paste this into Twilio "A Call Comes In" field to test inbound support.
                  </p>
                </div>
              </div>
              <div className="tc-panel" style={{padding:'20px'}}>
                <h3 className="tc-panel-title" style={{fontSize:'0.7rem', marginBottom:'12px'}}>
                  <Zap size={12} /> Live Events
                </h3>
                <div className="tc-log-scroll">
                  <div className="tc-log-line tc-log-system">[SYS] Initializing SIP Tunnel...</div>
                  {callSid && <div className="tc-log-line tc-log-twilio">[TWILIO] Created Session: {callSid.slice(0,10)}...</div>}
                  {currentCallStatus !== 'idle' && <div className="tc-log-line tc-log-twilio">[STATUS] Signaling: {currentCallStatus.toUpperCase()}</div>}
                  {isCalling && <div className="tc-log-line tc-log-audio">[AUDIO] Streaming AI response via TwiML...</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-5">
            <div className="tc-panel" style={{padding:'20px'}}>
              <h3 className="tc-panel-title" style={{fontSize:'0.7rem'}}>
                <ShieldCheck size={12} /> Magic Numbers
              </h3>
              <div className="flex flex-col gap-2 mt-3">
                {Object.entries(testNumbers).map(([num, info]) => (
                  <div key={num} className="tc-block" style={{padding:'10px', flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                    <div className="flex flex-col">
                      <span style={{fontSize:'0.7rem', color:'#fff', fontFamily:'DM Mono'}}>{num}</span>
                      <span style={{fontSize:'0.55rem', color:'rgba(255,255,255,0.2)'}}>{info.description}</span>
                    </div>
                    <span>{info.result}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tc-panel" style={{flex:1, padding:'20px'}}>
              <h3 className="tc-panel-title" style={{fontSize:'0.7rem'}}>
                <History size={12} /> Recent Analytics
              </h3>
              <div className="flex flex-col mt-3">
                {callHistory.length > 0 ? callHistory.map((call, i) => (
                  <div key={i} className="tc-hist-item">
                    <div className="tc-hist-top">
                      <span className="tc-hist-num">{call.to_number}</span>
                      <span className="tc-hist-time">{new Date(call.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="tc-hist-meta">
                      {call.status === 'completed' ? <CheckCircle2 size={10} color="#4ade80" /> : <XCircle size={10} color="#f87171" />}
                      {call.status} • {call.duration || 0}s
                    </div>
                    <div className="tc-hist-ctx">{call.business_context}</div>
                  </div>
                )) : (
                  <div style={{textAlign:'center', padding:'40px 0', opacity:0.2}}>
                    <Clock size={24} style={{marginBottom:8}} />
                    <div style={{fontSize:'0.65rem'}}>No history recorded</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TwilioCallDemo;
