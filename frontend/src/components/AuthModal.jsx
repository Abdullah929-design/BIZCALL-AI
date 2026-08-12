import React, { useState } from 'react';
import axios from 'axios';
import { supabase } from '../services/supabaseClient';
import './AuthModal.css';

const AuthModal = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        const res = await axios.post('/api/auth/signup', { email, password });
        if (res.data && res.data.success) {
          const userData = res.data.data?.user || { email };
          onLoginSuccess(userData);
        }
      } else {
        const res = await axios.post('/api/auth/login', { email, password });
        if (res.data && res.data.success) {
          const userData = res.data.data?.user || { email };
          onLoginSuccess(userData);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <h2>{isSignUp ? '🚀 Create Your SaaS Account' : '🔑 Log In to BIZ CALL AI'}</h2>
        <p className="auth-subtitle">
          {isSignUp ? 'Build and launch custom Inbound & Outbound AI Voice Agents' : 'Manage your AI Voice Agents and live campaigns'}
        </p>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        <form onSubmit={handleAuth} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="call-btn auth-submit" disabled={loading}>
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="auth-toggle">
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <span onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Log In' : 'Sign Up Free'}
          </span>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            type="button"
            onClick={() => onLoginSuccess({ email: 'demo@bizcall.ai' })}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            ⚡ Continue as Demo User (Bypass Auth)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
