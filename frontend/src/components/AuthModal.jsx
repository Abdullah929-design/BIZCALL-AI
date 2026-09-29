import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import brainLogo from '../assets/brain-logo.svg';
import './AuthModal.css';

// Clean vector SVG icons
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const AuthModal = ({ onLoginSuccess, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div
      className="auth-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="auth-modal">
        {onClose && (
          <button
            type="button"
            className="auth-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        )}

        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-brand-badge">
            <img src={brainLogo} alt="BizCall AI Logo" className="auth-brand-logo" />
            <span className="auth-brand-name">BIZCALL AI</span>
          </div>

          <h2 className="auth-title">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h2>
          <p className="auth-subtitle">
            {isSignUp
              ? 'Start building and launching your AI Voice Agents.'
              : 'Enter your credentials to access your voice workspace.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${!isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg('');
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="auth-error">
            <AlertCircleIcon />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="auth-form">
          <div className="auth-field-group">
            <label className="auth-label">Email address</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <MailIcon />
              </span>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <LockIcon />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="auth-spinner" />
                <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
              </>
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="auth-footer">
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}
          <button
            type="button"
            className="auth-footer-link"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
          >
            {isSignUp ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
