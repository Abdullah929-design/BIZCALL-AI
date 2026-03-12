import axios from 'axios';

// Base API configuration - using relative URLs since Vite proxy handles routing
const API_BASE_URL = ''; // Use empty string for relative URLs with Vite proxy

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Banking API endpoints
export const bankingAPI = {
  // Session management
  createSession: async (callType = 'inbound') => {
    const response = await api.post('/api/banking/session/create', { call_type: callType });
    return response.data;
  },

  getSession: async (sessionId) => {
    const response = await api.get(`/api/banking/session/${sessionId}`);
    return response.data;
  },

  clearSession: async (sessionId) => {
    const response = await api.delete(`/api/banking/session/${sessionId}`);
    return response.data;
  },

  // Intent detection
  detectIntents: async (text, sessionId = null) => {
    const response = await api.post('/api/banking/detect', {
      text,
      session_id: sessionId,
    });
    return response.data;
  },

  // Query processing
  processQuery: async (text, sessionId = null) => {
    const response = await api.post('/api/banking/query', {
      text,
      session_id: sessionId,
    });
    return response.data;
  },

  // Sync query (blocking)
  processQuerySync: async (text, sessionId = null) => {
    const response = await api.post('/api/banking/query/sync', {
      text,
      session_id: sessionId,
    });
    return response.data;
  },

  // Get streaming URL
  getStreamUrl: (sessionId) => {
    return `/api/banking/stream?session_id=${sessionId}`;
  },
};

// Marketing API endpoints
export const marketingAPI = {
  // Session management
  createSession: async () => {
    const response = await api.post('/api/marketing/session/create');
    return response.data;
  },

  getSession: async (sessionId) => {
    const response = await api.get(`/api/marketing/session/${sessionId}`);
    return response.data;
  },

  clearSession: async (sessionId) => {
    const response = await api.delete(`/api/marketing/session/${sessionId}`);
    return response.data;
  },

  // Generate marketing response
  generateResponse: async (text, sessionId = null, businessContext = '') => {
    const response = await api.post('/api/marketing/generate', {
      text,
      session_id: sessionId,
      business_context: businessContext,
    });
    return response.data;
  },

  // Generate with chat context
  generateChatResponse: async (text, sessionId = null, businessContext = '') => {
    const response = await api.post('/api/marketing/generate/chat', {
      text,
      session_id: sessionId,
      business_context: businessContext,
    });
    return response.data;
  },

  // Process marketing query
  processQuery: async (text, sessionId = null, businessContext = '') => {
    const response = await api.post('/api/marketing/query', {
      text,
      session_id: sessionId,
      business_context: businessContext,
    });
    return response.data;
  },

  // Get streaming URL
  getStreamUrl: (sessionId) => {
    return `/api/marketing/stream?session_id=${sessionId}`;
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await api.get('/api/health');
    return response.data;
  },

  getRoot: async () => {
    const response = await api.get('/');
    return response.data;
  },
};

// Error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

export default api;
