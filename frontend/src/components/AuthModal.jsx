import React, { useState } from 'react';
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        onLoginSuccess(data.session.user);
      } else {
        setErrorMsg(
          'Account created. Please check your email and confirm your account before signing in.'
        );
        setIsSignUp(false);
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error('No Supabase session was returned.');
      }

      onLoginSuccess(data.session.user);
    }
  } catch (error) {
    console.error('Authentication error:', error);
    setErrorMsg(error.message || 'Authentication failed.');
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
      </div>
    </div>
  );
};

export default AuthModal;
