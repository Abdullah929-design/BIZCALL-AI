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
      // Create session if not exists
      let sessionId = chatSession.sessionId;
      if (!sessionId) {
        sessionId = await chatSession.createSession();
      }

      // Add user message
      chatSession.addMessage('user', text);

      // Detect intents first
      const intentData = await bankingAPI.detectIntents(text, sessionId);
      setIntentResults(intentData);

      // Process query
      const queryResult = await bankingAPI.processQuery(text, sessionId);
      setResponseMode(queryResult.mode);

      if (queryResult.mode === 'faq') {
        // FAQ response - add assistant message
        chatSession.addMessage('assistant', `FAQ Answer: ${queryResult.faq.answer}`);
      } else if (queryResult.mode === 'llm') {
        // Start streaming LLM response
        streamingResponse.startStreaming(
          bankingAPI.getStreamUrl(sessionId),
          (chunk) => {
            // Chunk is handled by the hook
          },
          (fullResponse) => {
            // Add complete response to messages
            chatSession.addMessage('assistant', fullResponse);
            setIsProcessing(false);
          },
          (error) => {
            console.error('Streaming error:', error);
            setIsProcessing(false);
          }
        );
        setIsProcessing(false);
        return; // Don't set isProcessing to false here, let streaming handle it
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>🏦 Banking Assistant</h2>
        <div style={styles.sessionControls}>
          <button onClick={handleNewSession} style={styles.button}>
            New Session
          </button>
          <button onClick={handleClearSession} style={styles.button}>
            Clear Session
          </button>
          {chatSession.sessionId && (
            <span style={styles.sessionId}>
              Session: {chatSession.sessionId.slice(0, 8)}...
            </span>
          )}
        </div>
      </div>

      {chatSession.error && (
        <div style={styles.error}>
          Error: {chatSession.error}
        </div>
      )}

      {streamingResponse.error && (
        <div style={styles.error}>
          Streaming Error: {streamingResponse.error}
        </div>
      )}

      <div style={styles.messagesContainer}>
        {chatSession.messages.map((message, index) => (
          <div key={index} style={styles.message}>
            <div style={styles.messageRole}>
              {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
            </div>
            <div style={styles.messageContent}>
              {message.content}
            </div>
          </div>
        ))}

        {streamingResponse.isStreaming && (
          <div style={styles.message}>
            <div style={styles.messageRole}>🤖 Assistant</div>
            <div style={styles.messageContent}>
              {streamingResponse.streamedText}
              <span style={styles.cursor}>|</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {intentResults && (
        <div style={styles.intentsContainer}>
          <h4>🎯 Detected Intents:</h4>
          <div><strong>Complexity:</strong> {intentResults.complexity}</div>
          <div><strong>Detected:</strong> {intentResults.detected_intents.join(', ')}</div>
          {intentResults.segments.map((segment, idx) => (
            <div key={idx} style={styles.segment}>
              <strong>Segment {idx + 1}:</strong> "{segment.text}"
              <ul>
                {segment.intents.map((intent, i) => (
                  <li key={i}>
                    {intent.intent} (confidence: {(intent.confidence * 100).toFixed(1)}%)
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div style={styles.inputContainer}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your banking query here..."
          style={styles.textInput}
          disabled={isProcessing || streamingResponse.isStreaming}
          rows={3}
        />
        <button
          onClick={handleSendMessage}
          disabled={isProcessing || streamingResponse.isStreaming || !inputText.trim()}
          style={styles.sendButton}
        >
          {isProcessing || streamingResponse.isStreaming ? 'Processing...' : 'Send'}
        </button>
      </div>

      {responseMode && (
        <div style={styles.modeIndicator}>
          Response Mode: <strong>{responseMode}</strong>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #e0e0e0',
    paddingBottom: '10px',
  },
  sessionControls: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  sessionId: {
    fontSize: '12px',
    color: '#666',
    fontFamily: 'monospace',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '10px',
  },
  messagesContainer: {
    height: '400px',
    overflowY: 'auto',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '10px',
    marginBottom: '20px',
    backgroundColor: '#f9f9f9',
  },
  message: {
    marginBottom: '15px',
  },
  messageRole: {
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#333',
  },
  messageContent: {
    backgroundColor: 'white',
    padding: '10px',
    borderRadius: '4px',
    lineHeight: '1.4',
  },
  cursor: {
    animation: 'blink 1s infinite',
  },
  intentsContainer: {
    backgroundColor: '#e8f4fd',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  segment: {
    marginTop: '10px',
    marginLeft: '20px',
  },
  inputContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },
  textInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    resize: 'vertical',
    fontSize: '14px',
  },
  sendButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  modeIndicator: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#666',
  },
};

export default BankingChat;
