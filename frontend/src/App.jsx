import React, { useState, useEffect } from 'react';
import BankingChat from './components/BankingChat.jsx';
import MarketingChat from './components/MarketingChat.jsx';
import TwilioCallDemo from './components/TwilioCallDemo.jsx';
import WebCallDemo from './components/WebCallDemo.jsx';
import AgentBuilder from './components/AgentBuilder.jsx';
import AuthModal from './components/AuthModal.jsx';
import TestAPI from './components/TestAPI.jsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import HumanAgentSupport from './components/HumanAgentSupport.jsx';
import { supabase } from './services/supabaseClient.js';
import { healthAPI } from './services/api.jsx';
import './App.css';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('bizcall_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('builder');
  const [apiStatus, setApiStatus] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem('bizcall_user', JSON.stringify(userData));
    } catch (e) {
      console.error('Failed to save user session', e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('bizcall_user');
    } catch (e) {
      console.error('Failed to clear user session', e);
    }
    supabase.auth.signOut().catch(() => {});
  };

  useEffect(() => {
    checkAPIHealth();

    // Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleLoginSuccess(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleLoginSuccess(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAPIHealth = async () => {
    try {
      await healthAPI.check();
      setApiStatus('healthy');
    } catch {
      setApiStatus('unhealthy');
    }
  };

  const navItems = [
    { id: 'builder', icon: '🛠️', label: 'Inbound/Outbound Builder', sub: 'Create AI Agents' },
    { id: 'retell', icon: '🎙️', label: 'Retell AI Voice Tester', sub: 'Active Call Engine' },
    { id: 'banking', icon: '🏦', label: 'Banking Assistant', sub: 'Inbound support' },
    { id: 'marketing', icon: '📢', label: 'Marketing Agent', sub: 'Chat interface' },
    { id: 'voice', icon: '📞', label: 'Legacy Voice Call (Twilio)', sub: 'Inbound & Outbound' },
    { id: 'test', icon: '🧪', label: 'API Explorer', sub: 'Dev tools' },
    { id: 'analytics', icon: '📊', label: 'Analytics', sub: 'Logs & sentiment' },
    { id: 'agents', icon: '👥', label: 'Agent Support', sub: 'Human escalation desk' },
  ];

  const activeNav = navItems.find(n => n.id === activeTab);

  return (
    <div className="app-shell">
      {/* Show Supabase Auth Modal if not logged in */}
      {!user && <AuthModal onLoginSuccess={handleLoginSuccess} />}

      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
        ☰
      </button>

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🏦</div>
          <div className="sidebar-logo-name">BIZ CALL AI</div>
          <div className="sidebar-logo-sub">SaaS Voice Platform</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Workspaces</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <div>
                <div>{item.label}</div>
              </div>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div style={{ marginBottom: '12px', fontSize: '0.8rem', color: '#94a3b8' }}>
              👤 <strong style={{ color: '#fff' }}>{user.email}</strong>
              <button
                onClick={handleLogout}
                style={{
                  display: 'block',
                  marginTop: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Log Out
              </button>
            </div>
          )}
          <div className="api-badge">
            <span className={`api-dot ${apiStatus === 'healthy' ? '' : apiStatus === 'unhealthy' ? 'offline' : 'checking'}`} />
            {apiStatus === 'healthy' ? 'API connected' : apiStatus === 'unhealthy' ? 'API offline' : 'Connecting…'}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="app-main">
        <div className="app-topbar">
          <div className="topbar-breadcrumb">
            <span style={{ color: 'var(--text-muted)' }}>BIZ CALL SaaS</span>
            <span style={{ color: 'var(--text-muted)' }}>›</span>
            <span>{activeNav?.label}</span>
          </div>
          <span className="topbar-version">v2.0 SaaS</span>
        </div>

        <div className="app-content">
          {activeTab === 'builder' && <AgentBuilder />}
          {activeTab === 'retell' && <WebCallDemo />}
          {activeTab === 'banking' && <BankingChat />}
          {activeTab === 'marketing' && <MarketingChat />}
          {activeTab === 'voice' && <TwilioCallDemo />}
          {activeTab === 'test' && <TestAPI />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'agents' && <HumanAgentSupport />}
        </div>
      </main>
    </div>
  );
}

export default App;
