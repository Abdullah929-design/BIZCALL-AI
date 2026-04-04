import { useState, useCallback, useRef } from 'react';
import { bankingAPI, marketingAPI } from '../services/api';

export const useChatSession = (callType = 'banking') => {
  const [sessionId, setSessionId] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);

  const api = callType === 'banking' ? bankingAPI : marketingAPI;

  const createSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const sessionData = await api.createSession(callType === 'banking' ? 'inbound' : 'outbound');
      setSessionId(sessionData.session_id);
      setSessionInfo(sessionData);
      messagesRef.current = [];
      setMessages([]);
      return sessionData.session_id;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [callType, api]);

  const getSession = useCallback(async (id) => {
    if (!id) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const sessionData = await api.getSession(id);
      setSessionInfo(sessionData);
      messagesRef.current = sessionData.messages || [];
      return sessionData;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const clearSession = useCallback(async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await api.clearSession(sessionId);
      messagesRef.current = [];
      setMessages([]);
      setSessionInfo(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to clear session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, api]);

  const addMessage = useCallback((role, content) => {
    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    messagesRef.current.push(message);
    // Use a new array reference so React detects the state change and re-renders
    setMessages([...messagesRef.current]);
    return message;
  }, []);

  const getMessages = useCallback(() => {
    return messagesRef.current;
  }, []);

  const reset = useCallback(() => {
    setSessionId(null);
    setSessionInfo(null);
    setError(null);
    messagesRef.current = [];
    setMessages([]);
  }, []);

  return {
    sessionId,
    sessionInfo,
    isLoading,
    error,
    messages,
    createSession,
    getSession,
    clearSession,
    addMessage,
    reset,
  };
};
