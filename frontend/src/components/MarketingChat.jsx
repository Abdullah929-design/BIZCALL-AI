import React, { useState, useEffect, useRef } from 'react';
import { useChatSession } from '../hooks/useChatSession.jsx';
import { useStreamingResponse } from '../hooks/useStreamingResponse.jsx';
import { marketingAPI } from '../services/api.jsx';

const MarketingChat = () => {
  const [inputText, setInputText] = useState('');
  const [businessContext, setBusinessContext] = useState('We are a community bank serving small businesses with personalized financial solutions.');
  const [responseMode, setResponseMode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  
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
      // Create session if not exists
      let sessionId = chatSession.sessionId;
      if (!sessionId) {
        sessionId = await chatSession.createSession();
      }

      // Add user message
      chatSession.addMessage('user', text);

      // Process marketing query
      const queryResult = await marketingAPI.processQuery(text, sessionId, businessContext);
      setResponseMode(queryResult.mode);

      if (queryResult.mode === 'faq') {
        // FAQ response - add assistant message
        chatSession.addMessage('assistant', queryResult.text);
      } else if (queryResult.mode === 'marketing') {
        // Start streaming marketing response
        streamingResponse.startStreaming(
          marketingAPI.getStreamUrl(sessionId),
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

  const handleGenerateResponse = async () => {
    if (!inputText.trim() || isProcessing) return;

    const text = inputText.trim();
    setInputText('');
    setIsProcessing(true);
    setResponseMode('');

    try {
      // Create session if not exists
      let sessionId = chatSession.sessionId;
      if (!sessionId) {
        sessionId = await chatSession.createSession();
      }

      // Add user message
      chatSession.addMessage('user', text);

      // Generate marketing response (blocking)
      const response = await marketingAPI.generateChatResponse(
        text, 
        sessionId, 
        businessContext, 
        temperature
      );
      
      setResponseMode(response.mode);
      chatSession.addMessage('assistant', response.text);
    } catch (error) {
      console.error('Error generating response:', error);
      chatSession.addMessage('assistant', `Error: ${error.message || 'Failed to generate response'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>📢 Marketing Assistant</h2>
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

      <div style={styles.businessContextContainer}>
        <label style={styles.label}>
          📋 Business Context:
        </label>
        <textarea
          value={businessContext}
          onChange={(e) => setBusinessContext(e.target.value)}
          style={styles.contextInput}
          rows={2}
          placeholder="Describe your business context for marketing calls..."
        />
      </div>

      <div style={styles.temperatureContainer}>
        <label style={styles.label}>
          🌡️ Creativity Level: {temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          style={styles.slider}
        />
      </div>

      <div style={styles.messagesContainer}>
        {chatSession.messages.map((message, index) => (
          <div key={index} style={styles.message}>
            <div style={styles.messageRole}>
              {message.role === 'user' ? '👤 Customer' : '📢 Marketing Agent'}
            </div>
            <div style={styles.messageContent}>
              {message.content}
            </div>
          </div>
        ))}

        {streamingResponse.isStreaming && (
          <div style={styles.message}>
            <div style={styles.messageRole}>📢 Marketing Agent</div>
            <div style={styles.messageContent}>
              {streamingResponse.streamedText}
              <span style={styles.cursor}>|</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputContainer}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type customer query or marketing scenario..."
          style={styles.textInput}
          disabled={isProcessing || streamingResponse.isStreaming}
          rows={3}
        />
        <div style={styles.buttonContainer}>
          <button
            onClick={handleSendMessage}
            disabled={isProcessing || streamingResponse.isStreaming || !inputText.trim()}
            style={styles.sendButton}
          >
            {isProcessing || streamingResponse.isStreaming ? 'Processing...' : 'Stream Response'}
          </button>
          <button
            onClick={handleGenerateResponse}
            disabled={isProcessing || streamingResponse.isStreaming || !inputText.trim()}
            style={styles.generateButton}
          >
            Generate Response
          </button>
        </div>
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
  businessContextContainer: {
    marginBottom: '15px',
  },
  temperatureContainer: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#333',
  },
  contextInput: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    resize: 'vertical',
    fontSize: '14px',
  },
  slider: {
    width: '200px',
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
  inputContainer: {
    marginBottom: '10px',
  },
  textInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    resize: 'vertical',
    fontSize: '14px',
    marginBottom: '10px',
  },
  buttonContainer: {
    display: 'flex',
    gap: '10px',
  },
  sendButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  generateButton: {
    padding: '10px 20px',
    backgroundColor: '#6f42c1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  modeIndicator: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#666',
  },
};

export default MarketingChat;
