import React, { useState, useEffect } from 'react';
import BankingChat from './components/BankingChat.jsx';
import MarketingChat from './components/MarketingChat.jsx';
import TwilioCallDemo from './components/TwilioCallDemo.jsx';
import WebCallDemo from './components/WebCallDemo.jsx';
import { ColdEmailDashboard } from './features/cold-email/pages/ColdEmailDashboard';
import AgentBuilder from './components/AgentBuilder.jsx';
import AuthModal from './components/AuthModal.jsx';
import TestAPI from './components/TestAPI.jsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import HumanAgentSupport from './components/HumanAgentSupport.jsx';
import { supabase } from './services/supabaseClient.js';
import { healthAPI } from './services/api.jsx';
import './App.css';
import axios from 'axios';
import RetellLiveCalls from './components/RetellLiveCalls.jsx';
import CompanySettings from './components/CompanySettings.jsx';
import OnboardingSplash from './components/OnboardingSplash.jsx';


function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('builder');
  const [apiStatus, setApiStatus] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(true);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    supabase.auth.signOut().catch(() => { });
  };


  useEffect(() => {
    checkAPIHealth();

    let mounted = true;

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setUser(session?.user ?? null);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      checkOnboardingStatus(user.id || user.email);
    } else {
      setIsOnboarded(true);
    }
  }, [user]);
  const checkAPIHealth = async () => {
    try {
      await healthAPI.check();
      setApiStatus('healthy');
    } catch {
      setApiStatus('unhealthy');
    }
  };
  const checkOnboardingStatus = async (userId) => {
    try {
      const res = await axios.get(`/api/company/profile/${encodeURIComponent(userId)}`);
      if (res.data?.success && res.data?.profile) {
        // If onboarding_completed is true, bypass splash screen
        setIsOnboarded(!!res.data.profile.onboarding_completed);
      } else {
        setIsOnboarded(false);
      }
    } catch (err) {
      console.log('Error verifying onboarding profile status:', err);
      setIsOnboarded(false);
    }
  };

  const navItems = [
    { id: 'builder', icon: '🛠️', label: 'Inbound/Outbound Builder', sub: 'Create AI Agents' },
    { id: 'live-calls', icon: '⚡', label: 'Retell Live Calls', sub: 'Twilio Live Console' },
    { id: 'analytics', icon: '📊', label: 'Analytics', sub: 'Logs & sentiment' },
    { id: 'company', icon: '⚙️', label: 'Company Settings', sub: 'Profile & AI KB' },
    { id: 'cold-email', icon: '📧', label: '📧 Cold Email', sub: 'Automated outreach' },

  ];

  const activeNav = navItems.find(n => n.id === activeTab);

  if (user && !isOnboarded) {
    return <OnboardingSplash user={user} onComplete={() => setIsOnboarded(true)} />;
  }

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
          {activeTab === 'builder' && <AgentBuilder user={user} />}
          {activeTab === 'retell' && <WebCallDemo />}
          {activeTab === 'live-calls' && <RetellLiveCalls user={user} />}
          {activeTab === 'banking' && <BankingChat />}
          {activeTab === 'marketing' && <MarketingChat />}
          {activeTab === 'voice' && <TwilioCallDemo />}
          {activeTab === 'test' && <TestAPI />}
          {activeTab === 'analytics' && <AnalyticsDashboard user={user} />}
          {activeTab === 'agents' && <HumanAgentSupport />}
          {activeTab === 'company' && <CompanySettings user={user} />}
          {activeTab === 'cold-email' && <ColdEmailDashboard />}

        </div>
      </main>
    </div>
  );
}

export default App;
