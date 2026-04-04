import React, { useState, useEffect, useRef } from 'react';
import { useChatSession } from '../hooks/useChatSession.jsx';
import { useStreamingResponse } from '../hooks/useStreamingResponse.jsx';
import { marketingAPI } from '../services/api.jsx';

const MarketingChat = () => {
  const [inputText, setInputText] = useState('');
  const [businessContext, setBusinessContext] = useState('We are a community bank serving small businesses with personalized financial solutions.');
  const [responseMode, setResponseMode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInitialResponse, setHasInitialResponse] = useState(false);
  const [sessionBusinessContext, setSessionBusinessContext] = useState('');
  
  const chatSession = useChatSession('marketing');
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
    setResponseMode('');

    try {
      let sessionId = chatSession.sessionId;
      if (!sessionId) {
        sessionId = await chatSession.createSession();
      }

      chatSession.addMessage('user', text);

      let queryResult;
      if (!hasInitialResponse) {
        const instruction = `behave like a sales agent for my business and generate a marketing speech for my business using details: ${businessContext}. ${text}`;
        
        queryResult = await marketingAPI.processQuery(instruction, sessionId);
        if (queryResult) setResponseMode(queryResult.mode);
        
        if (queryResult && queryResult.mode === 'marketing') {
          setSessionBusinessContext(businessContext);
          setHasInitialResponse(true);
          
          streamingResponse.startStreaming(
            marketingAPI.getStreamUrl(sessionId),
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
      } else {
        queryResult = await marketingAPI.processQuery(text, sessionId, sessionBusinessContext);
        if (queryResult) setResponseMode(queryResult.mode);
        
        if (queryResult && queryResult.mode === 'marketing') {
          streamingResponse.startStreaming(
            marketingAPI.getStreamUrl(sessionId),
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
      }

      if (queryResult && queryResult.mode === 'faq') {
        chatSession.addMessage('assistant', queryResult.text);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      chatSession.addMessage('assistant', `Error: ${error.message || 'Failed to process message'}`);
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
    setHasInitialResponse(false);
    setSessionBusinessContext('');
  };

  const handleClearSession = async () => {
    streamingResponse.reset();
    await chatSession.clearSession();
    setHasInitialResponse(false);
    setSessionBusinessContext('');
  };

  const handleGenerateResponse = async () => {
    if (!inputText.trim() || isProcessing) return;

    const text = inputText.trim();
    setInputText('');
    setIsProcessing(true);
    setResponseMode('');

    try {
      let sessionId = chatSession.sessionId;
      if (!sessionId) {
        sessionId = await chatSession.createSession();
      }

      chatSession.addMessage('user', text);

      const response = await marketingAPI.generateChatResponse(
        text, 
        sessionId, 
        businessContext
      );
      
      if (response) {
        setResponseMode(response.mode);
        chatSession.addMessage('assistant', response.text);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      chatSession.addMessage('assistant', `Error: ${error.message || 'Failed to generate response'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isBusy = isProcessing || streamingResponse.isStreaming;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&display=swap');

        .mc-root * { box-sizing: border-box; margin: 0; padding: 0; }

        .mc-root {
          font-family: 'DM Sans', sans-serif;
          background: #0d0a14;
          height: 100%;
          width: 100%;
          color: #e8e4dc;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .mc-header {
          padding: 28px 40px;
          border-bottom: 1px solid rgba(180, 120, 220, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(180deg, rgba(150,80,200,0.06) 0%, transparent 100%);
        }

        .mc-title-group { display: flex; align-items: center; gap: 16px; }

        .mc-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #9b59d0 0%, #c084f5 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .mc-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.75rem;
          font-weight: 600;
          color: #f0e8f8;
          letter-spacing: 0.02em;
        }

        .mc-subtitle {
          font-size: 0.72rem;
          color: rgba(180,120,220,0.65);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .mc-controls { display: flex; align-items: center; gap: 12px; }

        .mc-btn {
          padding: 8px 18px;
          background: transparent;
          border: 1px solid rgba(180,120,220,0.25);
          border-radius: 6px;
          color: rgba(180,120,220,0.8);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
        }

        .mc-btn:hover {
          background: rgba(180,120,220,0.08);
          border-color: rgba(180,120,220,0.5);
          color: #b478dc;
        }

        .mc-session-badge {
          padding: 5px 12px;
          background: rgba(180,120,220,0.07);
          border: 1px solid rgba(180,120,220,0.15);
          border-radius: 20px;
          font-size: 0.7rem;
          color: rgba(180,120,220,0.45);
          font-family: monospace;
          letter-spacing: 0.05em;
        }

        .mc-alert {
          margin: 16px 40px 0;
          padding: 12px 18px;
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.25);
          border-radius: 8px;
          color: #f08080;
          font-size: 0.82rem;
        }

        /* Phase panel */
        .mc-phase-panel {
          margin: 24px 40px 0;
          padding: 20px 24px;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(180,120,220,0.18);
        }

        .mc-phase-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(180,120,220,0.6);
          margin-bottom: 10px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mc-phase-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #b478dc;
          animation: phasePulse 2s ease infinite;
        }

        @keyframes phasePulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        .mc-ctx-textarea {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(180,120,220,0.2);
          border-radius: 10px;
          padding: 12px 16px;
          color: #e0d8ec;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 300;
          resize: none;
          transition: border-color 0.2s;
          line-height: 1.5;
        }

        .mc-ctx-textarea::placeholder { color: rgba(224,216,236,0.22); }
        .mc-ctx-textarea:focus { outline: none; border-color: rgba(180,120,220,0.45); }

        .mc-ctx-display {
          padding: 12px 16px;
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
          border: 1px solid rgba(180,120,220,0.12);
          font-size: 0.8rem;
          color: rgba(180,120,220,0.55);
          line-height: 1.5;
          font-style: italic;
        }

        .mc-phase-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          background: rgba(180,120,220,0.12);
          border: 1px solid rgba(180,120,220,0.2);
          border-radius: 20px;
          font-size: 0.68rem;
          color: rgba(180,120,220,0.7);
          letter-spacing: 0.06em;
        }

        /* Scrollable body — phase panel + messages scroll together */
        .mc-body {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .mc-body::-webkit-scrollbar { width: 4px; }
        .mc-body::-webkit-scrollbar-track { background: transparent; }
        .mc-body::-webkit-scrollbar-thumb { background: rgba(180,120,220,0.2); border-radius: 2px; }

        /* Messages */
        .mc-messages {
          flex: 1;
          padding: 28px 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-height: 0;
        }

        .mc-messages::-webkit-scrollbar { display: none; }

        .mc-msg {
          display: flex;
          flex-direction: column;
          gap: 6px;
          animation: mcFade 0.3s ease;
        }

        @keyframes mcFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mc-msg-customer { align-items: flex-end; }
        .mc-msg-agent { align-items: flex-start; }

        .mc-msg-label {
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(180,120,220,0.45);
          font-weight: 500;
        }

        .mc-msg-bubble {
          max-width: 72%;
          padding: 14px 18px;
          border-radius: 16px;
          font-size: 0.875rem;
          line-height: 1.7;
          font-weight: 300;
        }

        .mc-msg-customer .mc-msg-bubble {
          background: linear-gradient(135deg, rgba(180,120,220,0.16) 0%, rgba(180,120,220,0.08) 100%);
          border: 1px solid rgba(180,120,220,0.22);
          border-bottom-right-radius: 4px;
          color: #f0e8f8;
        }

        .mc-msg-agent .mc-msg-bubble {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-bottom-left-radius: 4px;
          color: #c4bcd4;
        }

        .mc-cursor {
          display: inline-block;
          width: 2px;
          height: 14px;
          background: #b478dc;
          margin-left: 3px;
          vertical-align: middle;
          animation: blink 1s step-end infinite;
          border-radius: 1px;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .mc-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: rgba(180,120,220,0.18);
          padding: 40px;
        }

        .mc-empty-icon { font-size: 2.5rem; opacity: 0.35; }

        .mc-empty-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          letter-spacing: 0.05em;
          font-style: italic;
        }

        /* Input area */
        .mc-input-area {
          padding: 20px 40px 32px;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: rgba(0,0,0,0.15);
        }

        .mc-textarea {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 12px;
          padding: 14px 18px;
          color: #e8e4dc;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 300;
          resize: none;
          transition: border-color 0.2s;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .mc-textarea::placeholder { color: rgba(232,228,220,0.22); }
        .mc-textarea:focus { outline: none; border-color: rgba(180,120,220,0.35); }
        .mc-textarea:disabled { opacity: 0.35; cursor: not-allowed; }

        .mc-btn-row {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
        }

        .mc-action-btns { display: flex; gap: 10px; }

        .mc-send-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #9b59d0 0%, #7b3dae 100%);
          border: none;
          border-radius: 10px;
          color: #f0e8f8;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .mc-send-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #a966d8 0%, #8944bc 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(155,89,208,0.35);
        }

        .mc-send-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

        .mc-gen-btn {
          padding: 12px 24px;
          background: transparent;
          border: 1px solid rgba(180,120,220,0.3);
          border-radius: 10px;
          color: rgba(180,120,220,0.8);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .mc-gen-btn:hover:not(:disabled) {
          background: rgba(180,120,220,0.1);
          border-color: rgba(180,120,220,0.5);
        }

        .mc-gen-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .mc-hint { font-size: 0.68rem; color: rgba(232,228,220,0.18); letter-spacing: 0.04em; }

        .mc-mode {
          font-size: 0.7rem;
          color: rgba(180,120,220,0.4);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .mc-mode span { color: rgba(180,120,220,0.7); font-weight: 500; }

        .mc-processing-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          margin-right: 5px;
          animation: pulse 1.2s ease infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      <div className="mc-root">
        <div className="mc-header">
          <div className="mc-title-group">
            <div className="mc-icon-wrap">📢</div>
            <div>
              <div className="mc-title">Marketing Assistant</div>
              <div className="mc-subtitle">AI-Powered Sales Agent</div>
            </div>
          </div>
          <div className="mc-controls">
            <button onClick={handleNewSession} className="mc-btn">New Session</button>
            <button onClick={handleClearSession} className="mc-btn">Clear</button>
            {chatSession.sessionId && (
              <span className="mc-session-badge">{chatSession.sessionId.slice(0, 8)}…</span>
            )}
          </div>
        </div>

        {chatSession.error && <div className="mc-alert">⚠ {chatSession.error}</div>}
        {streamingResponse.error && <div className="mc-alert">⚠ Streaming: {streamingResponse.error}</div>}

        {/* scrollable body: phase panel + messages as one region */}
        <div className="mc-body">

        <div className="mc-phase-panel">
          {!hasInitialResponse ? (
            <>
              <div className="mc-phase-label">
                <span className="mc-phase-dot" />
                Step 1 — Configure Your Business Context
              </div>
              <textarea
                value={businessContext}
                onChange={(e) => setBusinessContext(e.target.value)}
                className="mc-ctx-textarea"
                rows={3}
                placeholder="Describe your business: products, target audience, unique value propositions, special offers…"
              />
            </>
          ) : (
            <>
              <div className="mc-phase-label" style={{marginBottom: '8px'}}>
                <span className="mc-phase-dot" style={{background: '#4caf50'}} />
                Step 2 — Live Conversation
                <span className="mc-phase-badge" style={{marginLeft: 'auto'}}>Agent Active</span>
              </div>
              <div className="mc-ctx-display">
                Context loaded: {sessionBusinessContext.substring(0, 120)}{sessionBusinessContext.length > 120 ? '…' : ''}
              </div>
            </>
          )}
        </div>

        <div className="mc-messages">
          {chatSession.messages.length === 0 && !streamingResponse.isStreaming && (
            <div className="mc-empty">
              <div className="mc-empty-icon">◈</div>
              <div className="mc-empty-text">
                {!hasInitialResponse ? 'Configure your agent above, then start the conversation' : 'Your marketing agent is ready'}
              </div>
            </div>
          )}

          {chatSession.messages.map((message, index) => (
            <div key={index} className={`mc-msg mc-msg-${message.role === 'user' ? 'customer' : 'agent'}`}>
              <div className="mc-msg-label">
                {message.role === 'user' ? 'Customer' : 'Marketing Agent'}
              </div>
              <div className="mc-msg-bubble">{message.content}</div>
            </div>
          ))}

          {streamingResponse.isStreaming && (
            <div className="mc-msg mc-msg-agent">
              <div className="mc-msg-label">Marketing Agent</div>
              <div className="mc-msg-bubble">
                {streamingResponse.streamedText}
                <span className="mc-cursor" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>{/* end mc-messages */}

        </div>{/* end mc-body */}

        <div className="mc-input-area">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !hasInitialResponse
                ? "Instruct your agent — e.g. 'Generate a compelling opening pitch for our services…'"
                : "Ask questions, request modifications, or explore new angles…"
            }
            className="mc-textarea"
            disabled={isBusy}
            rows={3}
          />
          <div className="mc-btn-row">
            <span className="mc-hint">Enter to send · Shift+Enter for new line</span>
            <div className="mc-action-btns">
              {responseMode && <span className="mc-mode">Mode: <span>{responseMode}</span></span>}
              <button
                onClick={handleGenerateResponse}
                disabled={isBusy || !inputText.trim()}
                className="mc-gen-btn"
              >
                {isBusy ? <><span className="mc-processing-dot" />Working…</> : 'Generate'}
              </button>
              <button
                onClick={handleSendMessage}
                disabled={isBusy || !inputText.trim()}
                className="mc-send-btn"
              >
                {isBusy ? <><span className="mc-processing-dot" />Processing…</> :
                  !hasInitialResponse ? 'Launch Agent' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MarketingChat;