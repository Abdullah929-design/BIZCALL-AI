import React, { useState, useEffect, useRef } from 'react';
import { useChatSession } from '../hooks/useChatSession.jsx';
import { useStreamingResponse } from '../hooks/useStreamingResponse.jsx';
import { bankingAPI } from '../services/api.jsx';

/* ─────────────────────────────────────────
   Inline styles live in a <style> tag so
   BankingChat is fully self-contained.
───────────────────────────────────────── */
const CSS = `
  .bc { display:flex; flex-direction:column; height:100%; min-height:0; background:transparent; }

  /* ── Top bar ── */
  .bc-bar {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 28px;
    border-bottom:1px solid rgba(255,255,255,0.07);
    flex-shrink:0;
    gap:12px;
  }
  .bc-bar-left { display:flex; align-items:center; gap:14px; min-width:0; }
  .bc-bar-avatar {
    width:36px; height:36px; border-radius:10px; flex-shrink:0;
    background:linear-gradient(135deg,#c9a84c,#8a6820);
    display:flex; align-items:center; justify-content:center;
    font-size:16px;
    box-shadow:0 2px 12px rgba(201,168,76,0.2);
  }
  .bc-bar-title { font-size:0.88rem; font-weight:500; color:#edeae2; }
  .bc-bar-sub   { font-size:0.68rem; letter-spacing:0.1em; text-transform:uppercase; color:rgba(201,168,76,0.55); margin-top:1px; }
  .bc-bar-right { display:flex; gap:8px; flex-shrink:0; }

  .bc-action {
    padding:7px 15px; border-radius:8px; cursor:pointer; font-size:0.75rem;
    font-weight:500; letter-spacing:0.06em; text-transform:uppercase;
    border:1px solid rgba(255,255,255,0.1); background:transparent;
    color:rgba(237,234,226,0.5); transition:all 0.18s ease;
    font-family:inherit;
  }
  .bc-action:hover { background:rgba(255,255,255,0.05); color:rgba(237,234,226,0.85); border-color:rgba(255,255,255,0.18); }

  .bc-session-pill {
    padding:4px 11px; border-radius:20px; font-size:0.66rem;
    font-family:'DM Mono',monospace; letter-spacing:0.05em;
    border:1px solid rgba(201,168,76,0.15); background:rgba(201,168,76,0.06);
    color:rgba(201,168,76,0.45);
  }

  /* ── Body ── */
  .bc-body { flex:1; display:flex; flex-direction:column; min-height:0; overflow:hidden; }

  /* ── Messages ── */
  .bc-messages {
    flex:1; overflow-y:auto; padding:28px 28px 16px;
    display:flex; flex-direction:column; gap:20px;
    min-height:0;
  }
  .bc-messages::-webkit-scrollbar{width:3px;}
  .bc-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}

  .bc-empty {
    flex:1; display:flex; flex-direction:column; align-items:center;
    justify-content:center; gap:16px; color:rgba(201,168,76,0.2);
  }
  .bc-empty-ring {
    width:72px; height:72px; border-radius:50%;
    border:1px solid rgba(201,168,76,0.12);
    display:flex; align-items:center; justify-content:center;
    font-size:28px; opacity:0.6;
  }
  .bc-empty-text { font-family:'Cormorant Garamond',serif; font-size:1.05rem; font-style:italic; letter-spacing:0.04em; }
  .bc-empty-hint { font-size:0.71rem; letter-spacing:0.08em; text-transform:uppercase; opacity:0.7; }

  .bc-msg { display:flex; flex-direction:column; gap:5px; animation:msgIn 0.25s ease; }
  @keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

  .bc-msg-user      { align-items:flex-end; }
  .bc-msg-assistant { align-items:flex-start; }

  .bc-msg-meta {
    display:flex; align-items:center; gap:7px;
    font-size:0.65rem; letter-spacing:0.09em; text-transform:uppercase;
    color:rgba(237,234,226,0.28);
  }
  .bc-msg-meta-dot {
    width:16px; height:16px; border-radius:5px; display:flex;
    align-items:center; justify-content:center; font-size:8px;
  }
  .bc-msg-user      .bc-msg-meta-dot { background:rgba(201,168,76,0.15); }
  .bc-msg-assistant .bc-msg-meta-dot { background:rgba(255,255,255,0.06); }

  .bc-bubble {
    max-width:68%; padding:13px 17px; border-radius:14px;
    font-size:0.875rem; line-height:1.7; font-weight:300;
  }
  .bc-msg-user .bc-bubble {
    background:linear-gradient(135deg,rgba(201,168,76,0.16),rgba(201,168,76,0.08));
    border:1px solid rgba(201,168,76,0.22);
    border-bottom-right-radius:4px;
    color:#f0ece4;
  }
  .bc-msg-assistant .bc-bubble {
    background:rgba(255,255,255,0.04);
    border:1px solid rgba(255,255,255,0.07);
    border-bottom-left-radius:4px;
    color:#ccc9c1;
  }

  .bc-cursor {
    display:inline-block; width:2px; height:13px;
    background:#c9a84c; margin-left:3px; vertical-align:middle;
    border-radius:1px; animation:cur 0.9s step-end infinite;
  }
  @keyframes cur { 0%,100%{opacity:1} 50%{opacity:0} }

  /* ── Info panels ── */
  .bc-panels { display:flex; flex-direction:column; gap:0; flex-shrink:0; }

  .bc-panel {
    margin:0 20px 10px;
    border-radius:10px;
    overflow:hidden;
    border:1px solid rgba(255,255,255,0.07);
    background:rgba(255,255,255,0.025);
  }

  .bc-panel-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:9px 14px;
    border-bottom:1px solid rgba(255,255,255,0.05);
    background:rgba(255,255,255,0.02);
    cursor:pointer;
  }
  .bc-panel-title {
    font-size:0.68rem; font-weight:600; letter-spacing:0.12em;
    text-transform:uppercase;
  }
  .bc-panel.intent  .bc-panel-title { color:rgba(99,179,237,0.8); }
  .bc-panel.rag     .bc-panel-title { color:rgba(167,139,250,0.85); }
  .bc-panel.waiting .bc-panel-title { color:rgba(251,191,36,0.7); }

  .bc-panel-caret { font-size:0.6rem; color:rgba(255,255,255,0.25); }

  .bc-panel-body { padding:10px 14px 12px; display:flex; gap:10px; flex-wrap:wrap; align-items:flex-start; }
  .bc-panel-body.hidden { display:none; }

  .bc-chip {
    padding:3px 10px; border-radius:20px; font-size:0.7rem; font-weight:400;
    letter-spacing:0.03em;
  }
  .bc-panel.intent .bc-chip { background:rgba(99,179,237,0.08); border:1px solid rgba(99,179,237,0.18); color:#7ec8e3; }
  .bc-panel.rag    .bc-chip { background:rgba(167,139,250,0.08); border:1px solid rgba(167,139,250,0.2);  color:#c4b5fd; }

  .bc-seg {
    width:100%; margin-top:6px; padding:8px 12px;
    background:rgba(0,0,0,0.18); border-radius:7px;
    border-left:2px solid rgba(99,179,237,0.25);
    font-size:0.78rem;
  }
  .bc-panel.rag .bc-seg { border-color:rgba(167,139,250,0.25); }

  .bc-seg-q { color:rgba(237,234,226,0.6); font-style:italic; margin-bottom:5px; }
  .bc-seg-pills { display:flex; flex-wrap:wrap; gap:5px; }
  .bc-seg-pill {
    font-size:0.68rem; padding:1px 7px; border-radius:4px;
    background:rgba(99,179,237,0.06); color:#7aaecc;
  }

  .bc-rag-row { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .bc-rag-stats {
    width:100%; margin-top:8px; padding:8px 12px;
    background:rgba(167,139,250,0.04); border-radius:7px;
    border:1px solid rgba(167,139,250,0.1);
    font-size:0.74rem; color:rgba(196,181,253,0.7);
    display:flex; gap:16px; flex-wrap:wrap;
  }
  .bc-rag-stat strong { color:#c4b5fd; font-weight:500; }

  /* ── Alert ── */
  .bc-alert {
    margin:10px 20px 0;
    padding:10px 16px;
    border-radius:8px;
    background:rgba(248,113,113,0.08);
    border:1px solid rgba(248,113,113,0.2);
    color:#fca5a5; font-size:0.8rem;
    flex-shrink:0;
  }

  /* ── Input ── */
  .bc-input-area {
    padding:16px 20px 20px;
    border-top:1px solid rgba(255,255,255,0.06);
    background:rgba(0,0,0,0.15);
    flex-shrink:0;
  }
  .bc-input-row { display:flex; gap:10px; align-items:flex-end; }

  .bc-textarea {
    flex:1; background:rgba(255,255,255,0.04);
    border:1px solid rgba(255,255,255,0.09);
    border-radius:11px; padding:12px 16px;
    color:#edeae2; font-family:inherit; font-size:0.88rem;
    font-weight:300; resize:none; line-height:1.5;
    transition:border-color 0.18s;
    min-height:46px; max-height:140px;
  }
  .bc-textarea::placeholder { color:rgba(237,234,226,0.2); }
  .bc-textarea:focus { outline:none; border-color:rgba(201,168,76,0.3); }
  .bc-textarea:disabled { opacity:0.35; cursor:not-allowed; }

  .bc-send {
    padding:12px 22px; border-radius:11px; border:none; cursor:pointer;
    background:linear-gradient(135deg,#c9a84c,#a8882e);
    color:#080c12; font-family:inherit; font-size:0.78rem;
    font-weight:600; letter-spacing:0.07em; text-transform:uppercase;
    transition:all 0.18s ease; white-space:nowrap; align-self:flex-end;
  }
  .bc-send:hover:not(:disabled) {
    background:linear-gradient(135deg,#ddb95e,#baa040);
    transform:translateY(-1px); box-shadow:0 4px 14px rgba(201,168,76,0.28);
  }
  .bc-send:disabled { opacity:0.3; cursor:not-allowed; transform:none; }

  .bc-input-footer {
    display:flex; justify-content:space-between; align-items:center;
    margin-top:8px; padding:0 2px;
  }
  .bc-hint { font-size:0.65rem; color:rgba(237,234,226,0.18); letter-spacing:0.04em; }
  .bc-mode-tag {
    font-size:0.65rem; letter-spacing:0.1em; text-transform:uppercase;
    color:rgba(201,168,76,0.4);
  }
  .bc-mode-tag b { color:rgba(201,168,76,0.7); font-weight:500; }

  .bc-spinner {
    display:inline-block; width:5px; height:5px; border-radius:50%;
    background:#c9a84c; margin-right:5px;
    animation:spin 1.1s ease infinite;
  }
  @keyframes spin { 0%,100%{opacity:0.25;transform:scale(0.7)} 50%{opacity:1;transform:scale(1.2)} }
`;

/* ──────────────────────────────────── */

const BankingChat = () => {
  const [inputText, setInputText]       = useState('');
  const [intentResults, setIntentResults] = useState(null);
  const [responseMode, setResponseMode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ragInfo, setRagInfo]           = useState(null);
  const [intentOpen, setIntentOpen]     = useState(true);
  const [ragOpen, setRagOpen]           = useState(true);

  const chatSession     = useChatSession('banking');
  const streamingResponse = useStreamingResponse();
  const messagesEndRef  = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatSession.messages, streamingResponse.streamedText]);

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;
    const text = inputText.trim();
    setInputText('');
    setIsProcessing(true);
    setIntentResults(null);
    setResponseMode('');
    setRagInfo(null);

    try {
      let sessionId = chatSession.sessionId;
      if (!sessionId) sessionId = await chatSession.createSession();

      chatSession.addMessage('user', text);

      const intentData = await bankingAPI.detectIntents(text, sessionId);
      setIntentResults(intentData);

      const queryResult = await bankingAPI.processQuery(text, sessionId);
      setResponseMode(queryResult.mode);

      if (queryResult.mode === 'faq') {
        chatSession.addMessage('assistant', `FAQ: ${queryResult.faq.answer}`);
      } else if (queryResult.mode === 'llm') {
        streamingResponse.startStreaming(
          bankingAPI.getStreamUrl(sessionId),
          (_chunk, fullData) => {
            if (fullData.rag_context_used != null) {
              setRagInfo({
                used:       fullData.rag_context_used,
                confidence: fullData.rag_confidence || 0,
                intent:     fullData.rag_intent || null,
              });
            }
          },
          (full) => { chatSession.addMessage('assistant', full); setIsProcessing(false); },
          ()    => { setIsProcessing(false); }
        );
        setIsProcessing(false);
        return;
      }
    } catch (err) {
      chatSession.addMessage('assistant', `Error: ${err.message || 'Failed to process'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isBusy = isProcessing || streamingResponse.isStreaming;

  return (
    <>
      <style>{CSS}</style>
      <div className="bc">

        {/* ── Top bar ── */}
        <div className="bc-bar">
          <div className="bc-bar-left">
            <div className="bc-bar-avatar">🏦</div>
            <div>
              <div className="bc-bar-title">Banking Assistant</div>
              <div className="bc-bar-sub">Intelligent Inbound Support</div>
            </div>
          </div>
          <div className="bc-bar-right">
            {chatSession.sessionId && (
              <span className="bc-session-pill">{chatSession.sessionId.slice(0,8)}…</span>
            )}
            <button className="bc-action" onClick={async () => {
              streamingResponse.reset();
              await chatSession.reset();
              await chatSession.createSession();
              setRagInfo(null); setIntentResults(null); setResponseMode('');
            }}>New</button>
            <button className="bc-action" onClick={async () => {
              streamingResponse.reset(); await chatSession.clearSession();
            }}>Clear</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="bc-body">

          {/* Errors */}
          {chatSession.error && <div className="bc-alert">⚠ {chatSession.error}</div>}
          {streamingResponse.error && <div className="bc-alert">⚠ Stream: {streamingResponse.error}</div>}

          {/* Messages */}
          <div className="bc-messages">
            {chatSession.messages.length === 0 && !streamingResponse.isStreaming && (
              <div className="bc-empty">
                <div className="bc-empty-ring">◈</div>
                <div className="bc-empty-text">How may I assist you today?</div>
                <div className="bc-empty-hint">Ask a banking question to begin</div>
              </div>
            )}

            {chatSession.messages.map((msg, i) => (
              <div key={i} className={`bc-msg bc-msg-${msg.role}`}>
                <div className="bc-msg-meta">
                  <span className="bc-msg-meta-dot">{msg.role === 'user' ? '👤' : '🤖'}</span>
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="bc-bubble">{msg.content}</div>
              </div>
            ))}

            {streamingResponse.isStreaming && (
              <div className="bc-msg bc-msg-assistant">
                <div className="bc-msg-meta">
                  <span className="bc-msg-meta-dot">🤖</span>
                  Assistant
                </div>
                <div className="bc-bubble">
                  {streamingResponse.streamedText}
                  <span className="bc-cursor" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Info panels ── */}
          <div className="bc-panels">

            {/* Intent panel */}
            {intentResults && (
              <div className="bc-panel intent">
                <div className="bc-panel-header" onClick={() => setIntentOpen(o => !o)}>
                  <span className="bc-panel-title">🎯 Intent Analysis</span>
                  <span className="bc-panel-caret">{intentOpen ? '▲' : '▼'}</span>
                </div>
                <div className={`bc-panel-body ${intentOpen ? '' : 'hidden'}`}>
                  <span className="bc-chip">Complexity: {intentResults.complexity}</span>
                  {intentResults.detected_intents.map((d, i) => (
                    <span key={i} className="bc-chip">{d}</span>
                  ))}
                  {intentResults.segments.map((seg, i) => (
                    <div key={i} className="bc-seg" style={{width:'100%'}}>
                      <div className="bc-seg-q">"{seg.text}"</div>
                      <div className="bc-seg-pills">
                        {seg.intents.map((it, j) => (
                          <span key={j} className="bc-seg-pill">
                            {it.intent} — {(it.confidence * 100).toFixed(1)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RAG waiting */}
            {responseMode === 'llm' && !ragInfo && (
              <div className="bc-panel rag waiting">
                <div className="bc-panel-header">
                  <span className="bc-panel-title">🔍 RAG Analysis</span>
                </div>
                <div className="bc-panel-body">
                  <span className="bc-chip" style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.2)',color:'#fbbf24'}}>
                    ⏳ Awaiting context data…
                  </span>
                </div>
              </div>
            )}

            {/* RAG result */}
            {ragInfo && (
              <div className="bc-panel rag">
                <div className="bc-panel-header" onClick={() => setRagOpen(o => !o)}>
                  <span className="bc-panel-title">🔍 RAG Context</span>
                  <span className="bc-panel-caret">{ragOpen ? '▲' : '▼'}</span>
                </div>
                <div className={`bc-panel-body ${ragOpen ? '' : 'hidden'}`}>
                  <div className="bc-rag-row">
                    <span className="bc-chip">
                      {ragInfo.used ? '✅ Context injected' : '❌ No match found'}
                    </span>
                    {ragInfo.used && ragInfo.confidence > 0 && (
                      <>
                        <span className="bc-chip">
                          {(ragInfo.confidence * 100).toFixed(1)}% similarity
                        </span>
                        <span className="bc-chip">{ragInfo.intent}</span>
                      </>
                    )}
                    {!ragInfo.used && ragInfo.confidence > 0 && (
                      <span className="bc-chip" style={{color:'rgba(251,191,36,0.8)',borderColor:'rgba(251,191,36,0.2)'}}>
                        Best: {(ragInfo.confidence * 100).toFixed(1)}% (below threshold)
                      </span>
                    )}
                  </div>
                  {ragInfo.used && (
                    <div className="bc-rag-stats">
                      <span><strong>Source:</strong> FAQ knowledge base</span>
                      <span><strong>Score:</strong> {(ragInfo.confidence * 100).toFixed(1)}%</span>
                      <span><strong>Intent:</strong> {ragInfo.intent}</span>
                      <span><strong>Mode:</strong> Enhanced LLM</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Input ── */}
          <div className="bc-input-area">
            <div className="bc-input-row">
              <textarea
                className="bc-textarea"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyPress={handleKey}
                placeholder="Type your banking query…"
                disabled={isBusy}
                rows={2}
              />
              <button className="bc-send" onClick={handleSend} disabled={isBusy || !inputText.trim()}>
                {isBusy ? <><span className="bc-spinner"/>Processing</> : 'Send →'}
              </button>
            </div>
            <div className="bc-input-footer">
              <span className="bc-hint">Enter to send · Shift+Enter for newline</span>
              {responseMode && (
                <span className="bc-mode-tag">Mode: <b>{responseMode.toUpperCase()}</b></span>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default BankingChat;
