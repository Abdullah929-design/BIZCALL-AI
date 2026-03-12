import React, { useState, useEffect, useRef } from 'react';
import { useChatSession } from '../hooks/useChatSession.jsx';
import { useStreamingResponse } from '../hooks/useStreamingResponse.jsx';
import { bankingAPI } from '../services/api.jsx';

const BankingChat = () => {
  const [inputText, setInputText] = useState('');
  const [intentResults, setIntentResults] = useState(null);
  const [responseMode, setResponseMode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const chatSession = useChatSession('banking');
  const streamingResponse = useStreamingResponse();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatSession.messages, streamingResponse.streamedText]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const text = inputText.trim();
    setInputText('');
    setIsProcessing(true);
    setIntentResults(null);
    setResponseMode('');

    try {
      let sessionId = chatSession.sessionId;
      if (!sessionId) {
        sessionId = await chatSession.createSession();
      }

      chatSession.addMessage('user', text);

      const intentData = await bankingAPI.detectIntents(text, sessionId);
      setIntentResults(intentData);

      const queryResult = await bankingAPI.processQuery(text, sessionId);
      setResponseMode(queryResult.mode);

      if (queryResult.mode === 'faq') {
        chatSession.addMessage('assistant', `FAQ Answer: ${queryResult.faq.answer}`);
      } else if (queryResult.mode === 'llm') {
        streamingResponse.startStreaming(
          bankingAPI.getStreamUrl(sessionId),
          (chunk) => {},
          (fullResponse) => {
            chatSession.addMessage('assistant', fullResponse);
            setIsProcessing(false);
          },
          (error) => {
            console.error('Streaming error:', error);
            setIsProcessing(false);
          }
        );
        setIsProcessing(false);
        return;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      chatSession.addMessage('assistant', `Error: ${error.message || 'Failed to process message'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewSession = async () => {
    streamingResponse.reset();
    await chatSession.reset();
    await chatSession.createSession();
  };

  const handleClearSession = async () => {
    streamingResponse.reset();
    await chatSession.clearSession();
  };

  const isBusy = isProcessing || streamingResponse.isStreaming;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap');

        .bc-root * { box-sizing: border-box; margin: 0; padding: 0; }

        .bc-root {
          font-family: 'DM Sans', sans-serif;
          background: #0a0d14;
          min-height: 100vh;
          color: #e8e4dc;
          display: flex;
          flex-direction: column;
        }

        .bc-header {
          padding: 28px 40px;
          border-bottom: 1px solid rgba(212, 175, 90, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(180deg, rgba(212,175,90,0.04) 0%, transparent 100%);
        }

        .bc-title-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .bc-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #d4af5a 0%, #f0d080 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .bc-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.75rem;
          font-weight: 600;
          color: #f0e6c8;
          letter-spacing: 0.02em;
        }

        .bc-subtitle {
          font-size: 0.72rem;
          color: rgba(212,175,90,0.7);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .bc-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .bc-btn {
          padding: 8px 18px;
          background: transparent;
          border: 1px solid rgba(212,175,90,0.3);
          border-radius: 6px;
          color: rgba(212,175,90,0.85);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
        }

        .bc-btn:hover {
          background: rgba(212,175,90,0.08);
          border-color: rgba(212,175,90,0.6);
          color: #d4af5a;
        }

        .bc-session-badge {
          padding: 5px 12px;
          background: rgba(212,175,90,0.07);
          border: 1px solid rgba(212,175,90,0.15);
          border-radius: 20px;
          font-size: 0.7rem;
          color: rgba(212,175,90,0.5);
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.05em;
        }

        .bc-alert {
          margin: 16px 40px 0;
          padding: 12px 18px;
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.25);
          border-radius: 8px;
          color: #f08080;
          font-size: 0.82rem;
        }

        .bc-messages {
          flex: 1;
          overflow-y: auto;
          padding: 32px 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-height: 380px;
          max-height: 460px;
        }

        .bc-messages::-webkit-scrollbar { width: 4px; }
        .bc-messages::-webkit-scrollbar-track { background: transparent; }
        .bc-messages::-webkit-scrollbar-thumb { background: rgba(212,175,90,0.2); border-radius: 2px; }

        .bc-msg {
          display: flex;
          flex-direction: column;
          gap: 6px;
          animation: msgFade 0.3s ease;
        }

        @keyframes msgFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .bc-msg-user { align-items: flex-end; }
        .bc-msg-assistant { align-items: flex-start; }

        .bc-msg-label {
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(212,175,90,0.5);
          font-weight: 500;
        }

        .bc-msg-bubble {
          max-width: 72%;
          padding: 14px 18px;
          border-radius: 16px;
          font-size: 0.875rem;
          line-height: 1.65;
          font-weight: 300;
        }

        .bc-msg-user .bc-msg-bubble {
          background: linear-gradient(135deg, rgba(212,175,90,0.18) 0%, rgba(212,175,90,0.1) 100%);
          border: 1px solid rgba(212,175,90,0.25);
          border-bottom-right-radius: 4px;
          color: #f0e6c8;
        }

        .bc-msg-assistant .bc-msg-bubble {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-bottom-left-radius: 4px;
          color: #c8c4bc;
        }

        .bc-cursor {
          display: inline-block;
          width: 2px;
          height: 14px;
          background: #d4af5a;
          margin-left: 3px;
          vertical-align: middle;
          animation: blink 1s step-end infinite;
          border-radius: 1px;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .bc-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: rgba(212,175,90,0.2);
          padding: 40px;
        }

        .bc-empty-icon { font-size: 2.5rem; opacity: 0.4; }
        .bc-empty-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          letter-spacing: 0.05em;
          font-style: italic;
        }

        .bc-intents {
          margin: 0 40px;
          padding: 18px 24px;
          background: rgba(99,179,237,0.06);
          border: 1px solid rgba(99,179,237,0.15);
          border-radius: 12px;
          font-size: 0.8rem;
          color: #8ab8d4;
        }

        .bc-intents-title {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(99,179,237,0.6);
          margin-bottom: 10px;
          font-weight: 500;
        }

        .bc-intents-row {
          display: flex;
          gap: 20px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .bc-intents-chip {
          padding: 3px 10px;
          background: rgba(99,179,237,0.1);
          border: 1px solid rgba(99,179,237,0.2);
          border-radius: 20px;
          font-size: 0.72rem;
          color: #7aaecc;
        }

        .bc-segment {
          margin-top: 8px;
          padding: 8px 12px;
          background: rgba(0,0,0,0.2);
          border-radius: 6px;
          border-left: 2px solid rgba(99,179,237,0.3);
        }

        .bc-segment-text {
          color: #a0c4d8;
          margin-bottom: 4px;
          font-style: italic;
        }

        .bc-intent-list {
          list-style: none;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }

        .bc-intent-list li {
          font-size: 0.7rem;
          color: #7aaecc;
          background: rgba(99,179,237,0.07);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .bc-input-area {
          padding: 24px 40px 32px;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: rgba(0,0,0,0.2);
        }

        .bc-input-wrap {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .bc-textarea {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 14px 18px;
          color: #e8e4dc;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 300;
          resize: none;
          transition: border-color 0.2s;
          line-height: 1.5;
        }

        .bc-textarea::placeholder { color: rgba(232,228,220,0.25); }
        .bc-textarea:focus { outline: none; border-color: rgba(212,175,90,0.35); }
        .bc-textarea:disabled { opacity: 0.4; cursor: not-allowed; }

        .bc-send-btn {
          padding: 14px 28px;
          background: linear-gradient(135deg, #d4af5a 0%, #c09a42 100%);
          border: none;
          border-radius: 12px;
          color: #0a0d14;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          align-self: flex-end;
        }

        .bc-send-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #e0bc66 0%, #ccaa4e 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(212,175,90,0.3);
        }

        .bc-send-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          transform: none;
        }

        .bc-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }

        .bc-hint {
          font-size: 0.68rem;
          color: rgba(232,228,220,0.2);
          letter-spacing: 0.04em;
        }

        .bc-mode {
          font-size: 0.7rem;
          color: rgba(212,175,90,0.45);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .bc-mode span { color: rgba(212,175,90,0.75); font-weight: 500; }

        .bc-processing-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d4af5a;
          margin-right: 4px;
          animation: pulse 1.2s ease infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      <div className="bc-root">
        <div className="bc-header">
          <div className="bc-title-group">
            <div className="bc-icon-wrap">🏦</div>
            <div>
              <div className="bc-title">Banking Assistant</div>
              <div className="bc-subtitle">Intelligent Financial Concierge</div>
            </div>
          </div>
          <div className="bc-controls">
            <button onClick={handleNewSession} className="bc-btn">New Session</button>
            <button onClick={handleClearSession} className="bc-btn">Clear</button>
            {chatSession.sessionId && (
              <span className="bc-session-badge">
                {chatSession.sessionId.slice(0, 8)}…
              </span>
            )}
          </div>
        </div>

        {chatSession.error && (
          <div className="bc-alert">⚠ {chatSession.error}</div>
        )}
        {streamingResponse.error && (
          <div className="bc-alert">⚠ Streaming: {streamingResponse.error}</div>
        )}

        <div className="bc-messages">
          {chatSession.messages.length === 0 && !streamingResponse.isStreaming && (
            <div className="bc-empty">
              <div className="bc-empty-icon">◈</div>
              <div className="bc-empty-text">How may I assist you today?</div>
            </div>
          )}

          {chatSession.messages.map((message, index) => (
            <div key={index} className={`bc-msg bc-msg-${message.role}`}>
              <div className="bc-msg-label">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="bc-msg-bubble">{message.content}</div>
            </div>
          ))}

          {streamingResponse.isStreaming && (
            <div className="bc-msg bc-msg-assistant">
              <div className="bc-msg-label">Assistant</div>
              <div className="bc-msg-bubble">
                {streamingResponse.streamedText}
                <span className="bc-cursor" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {intentResults && (
          <div className="bc-intents">
            <div className="bc-intents-title">🎯 Intent Analysis</div>
            <div className="bc-intents-row">
              <span className="bc-intents-chip">Complexity: {intentResults.complexity}</span>
              {intentResults.detected_intents.map((intent, i) => (
                <span key={i} className="bc-intents-chip">{intent}</span>
              ))}
            </div>
            {intentResults.segments.map((segment, idx) => (
              <div key={idx} className="bc-segment">
                <div className="bc-segment-text">"{segment.text}"</div>
                <ul className="bc-intent-list">
                  {segment.intents.map((intent, i) => (
                    <li key={i}>{intent.intent} — {(intent.confidence * 100).toFixed(1)}%</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="bc-input-area">
          <div className="bc-input-wrap">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your banking query here…"
              className="bc-textarea"
              disabled={isBusy}
              rows={3}
            />
            <button
              onClick={handleSendMessage}
              disabled={isBusy || !inputText.trim()}
              className="bc-send-btn"
            >
              {isBusy ? (
                <><span className="bc-processing-dot" />Processing</>
              ) : 'Send'}
            </button>
          </div>
          <div className="bc-footer-row">
            <span className="bc-hint">Press Enter to send · Shift+Enter for new line</span>
            {responseMode && (
              <span className="bc-mode">Mode: <span>{responseMode}</span></span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BankingChat;
