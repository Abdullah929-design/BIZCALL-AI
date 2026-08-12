import React, { useState, useEffect } from 'react';
import RetellCallDemo from './components/RetellCallDemo.jsx';
import WebCallDemo from './components/WebCallDemo.jsx';
import TestAPI from './components/TestAPI.jsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import HumanAgentSupport from './components/HumanAgentSupport.jsx';
import { healthAPI } from './services/api.jsx';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('webcall');
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
    { id: 'webcall', icon: '🌐', label: 'Browser Web Call', sub: 'Mic & WebRTC Test' },
    { id: 'retell', icon: '📞', label: 'Phone Call Center', sub: 'PSTN / Outbound' },
    { id: 'test', icon: '🧪', label: 'API Explorer', sub: 'Dev tools' },
    { id: 'analytics', icon: '📊', label: 'Analytics', sub: 'Logs & sentiment' },
    { id: 'agents', icon: '👥', label: 'Agent Support', sub: 'Human escalation desk' },
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
          {activeTab === 'webcall' && <WebCallDemo />}
          {activeTab === 'retell' && <RetellCallDemo />}
          {activeTab === 'test' && <TestAPI />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'agents' && <HumanAgentSupport />}
        </div>

      </main>
    </div>
  );
}

export default App;
