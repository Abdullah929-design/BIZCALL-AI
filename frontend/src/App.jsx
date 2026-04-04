import React, { useState, useEffect } from 'react';
import BankingChat from './components/BankingChat.jsx';
import MarketingChat from './components/MarketingChat.jsx';
import TwilioCallDemo from './components/TwilioCallDemo.jsx';
import TestAPI from './components/TestAPI.jsx';
import { healthAPI } from './services/api.jsx';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('banking');
  const [apiStatus, setApiStatus] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAPIHealth();
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
    { id: 'banking', icon: '🏦', label: 'Banking Assistant', sub: 'Inbound support' },
    { id: 'marketing', icon: '📢', label: 'Marketing Agent', sub: 'Chat interface' },
    { id: 'voice', icon: '📞', label: 'AI Voice Simulator', sub: 'Inbound & Outbound' },
    { id: 'test', icon: '🧪', label: 'API Explorer', sub: 'Dev tools' },
  ];

  const activeNav = navItems.find(n => n.id === activeTab);

  return (
    <div className="app-shell">
      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
        ☰
      </button>

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🏦</div>
          <div className="sidebar-logo-name">BIZ CALL AI</div>
          <div className="sidebar-logo-sub">Call Centre Intelligence</div>
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
            <span style={{ color: 'var(--text-muted)' }}>FinanceAI</span>
            <span style={{ color: 'var(--text-muted)' }}>›</span>
            <span>{activeNav?.label}</span>
          </div>
          <span className="topbar-version">v1.0</span>
        </div>

        <div className="app-content">
          {activeTab === 'banking' && <BankingChat />}
          {activeTab === 'marketing' && <MarketingChat />}
          {activeTab === 'voice' && <TwilioCallDemo />}
          {activeTab === 'test' && <TestAPI />}
        </div>
      </main>
    </div>
  );
}

export default App;
