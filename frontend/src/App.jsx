import React, { useState, useEffect } from 'react';
import BankingChat from './components/BankingChat.jsx';
import MarketingChat from './components/MarketingChat.jsx';
import TwilioCallDemo from './components/TwilioCallDemo.jsx';
import WebCallDemo from './components/WebCallDemo.jsx';
import { ColdEmailDashboard } from './features/cold-email/pages/ColdEmailDashboard';
import AgentBuilder from './components/AgentBuilder.jsx';
import { MessengerDashboard } from './features/messenger/pages/MessengerDashboard';
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
import LeadFinder from './components/LeadFinder.jsx';
import ModelsOnDemand from './components/ModelsOnDemand.jsx';
import LandingPage from './components/LandingPage.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(() => {
    return typeof window !== 'undefined' && (
      window.location.search.includes('login') || 
      window.location.hash === '#login'
    );
  });
  const [activeTab, setActiveTab] = useState('builder');
  const [prefilledCallData, setPrefilledCallData] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(true);

  const handleInitiateOutboundCall = (callData) => {
    setPrefilledCallData(callData);
    setActiveTab('live-calls');
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    setShowAuthModal(false);
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
    {
      id: 'builder',
      label: 'Inbound/Outbound Builder',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="3" x2="6" y2="15"></line>
          <circle cx="18" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
          <path d="M18 9a9 9 0 0 1-9 9"></path>
        </svg>
      )
    },
    {
      id: 'live-calls',
      label: 'Retell Live Calls',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
      )
    },
    {
      id: 'lead-finder',
      label: 'Lead Finder & Scraper',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      )
    },
    {
      id: 'company',
      label: 'Company Settings',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      )
    },
    {
      id: 'cold-email',
      label: 'Cold Email',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
      )
    },
    {
      id: 'messenger',
      label: 'Messenger CRM',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    {
      id: 'models-on-demand',
      label: 'Models on Demand',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
          <rect x="9" y="9" width="6" height="6"></rect>
          <line x1="9" y1="1" x2="9" y2="4"></line>
          <line x1="15" y1="1" x2="15" y2="4"></line>
          <line x1="9" y1="20" x2="9" y2="23"></line>
          <line x1="15" y1="20" x2="15" y2="23"></line>
          <line x1="20" y1="9" x2="23" y2="9"></line>
          <line x1="20" y1="14" x2="23" y2="14"></line>
          <line x1="1" y1="9" x2="4" y2="9"></line>
          <line x1="1" y1="14" x2="4" y2="14"></line>
        </svg>
      )
    },
  ];

  const activeNav = navItems.find(n => n.id === activeTab);

  if (!user) {
    return (
      <>
        <LandingPage onLoginClick={() => setShowAuthModal(true)} />
        {showAuthModal && (
          <AuthModal 
            onLoginSuccess={handleLoginSuccess} 
            onClose={() => setShowAuthModal(false)} 
          />
        )}
      </>
    );
  }

  if (user && !isOnboarded) {
    return <OnboardingSplash user={user} onComplete={() => setIsOnboarded(true)} />;
  }

  return (
    <div className="app-shell">
      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
        ☰
      </button>

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5v14M7 8v8M2 11v2M22 11v2" />
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">BizCall AI</div>
            <div className="sidebar-logo-sub">VOICE PLATFORM</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">WORKSPACES</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span className="nav-item-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-conn-row">
            <span className="sidebar-conn-status">
              <span className="sidebar-conn-dot" />
              Connected
            </span>
            <button onClick={handleLogout} className="sidebar-signout-btn">
              Sign out
            </button>
          </div>
          {user && (
            <div className="sidebar-user-email" title={user.email}>
              {user.email}
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <main className="app-main">
        <div className="app-topbar">
          <div className="topbar-breadcrumb">
            <span className="topbar-crumb-prefix">BIZ CALL SAAS</span>
            <span className="topbar-crumb-sep">&gt;</span>
            <span className="topbar-crumb-active">{activeNav?.label || 'Inbound/Outbound Builder'}</span>
          </div>

          <div className="topbar-right">
            <span className="topbar-version-badge">V2.0 SAAS</span>
            <button className="topbar-avatar-btn" title={user?.email || 'User Profile'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className={`app-content ${activeTab === 'builder' || activeTab === 'live-calls' || activeTab === 'lead-finder' || activeTab === 'analytics' || activeTab === 'company' || activeTab === 'cold-email' || activeTab === 'messenger' || activeTab === 'models-on-demand' ? 'builder-tab-active' : ''}`}>
          {activeTab === 'lead-finder' && (
            <LeadFinder user={user} onInitiateOutboundCall={handleInitiateOutboundCall} />
          )}
          {activeTab === 'builder' && <AgentBuilder user={user} />}
          {activeTab === 'retell' && <WebCallDemo />}
          {activeTab === 'live-calls' && (
            <RetellLiveCalls
              user={user}
              prefilledCallData={prefilledCallData}
              onClearPrefilledData={() => setPrefilledCallData(null)}
            />
          )}
          {activeTab === 'banking' && <BankingChat />}
          {activeTab === 'marketing' && <MarketingChat />}
          {activeTab === 'voice' && <TwilioCallDemo />}
          {activeTab === 'test' && <TestAPI />}
          {activeTab === 'analytics' && <AnalyticsDashboard user={user} />}
          {activeTab === 'agents' && <HumanAgentSupport />}
          {activeTab === 'company' && <CompanySettings user={user} />}
          {activeTab === 'cold-email' && <ColdEmailDashboard />}
          {activeTab === 'messenger' && <MessengerDashboard user={user} />}
          {activeTab === 'models-on-demand' && <ModelsOnDemand user={user} />}
        </div>
      </main>
    </div>
  );
}

export default App;
