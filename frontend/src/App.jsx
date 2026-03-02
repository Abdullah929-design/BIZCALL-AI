import React, { useState, useEffect } from 'react';
import BankingChat from './components/BankingChat.jsx';
import MarketingChat from './components/MarketingChat.jsx';
import TestAPI from './components/TestAPI.jsx';
import { healthAPI } from './services/api.jsx';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('banking');
  const [apiStatus, setApiStatus] = useState('checking');
  const [apiInfo, setApiInfo] = useState(null);

  useEffect(() => {
    checkAPIHealth();
  }, []);

  const checkAPIHealth = async () => {
    try {
      const health = await healthAPI.check();
      setApiStatus('healthy');
      console.log('API Health:', health);
    } catch (error) {
      console.error('API Health check failed:', error);
      setApiStatus('unhealthy');
    }

    try {
      const info = await healthAPI.getRoot();
      setApiInfo(info);
    } catch (error) {
      console.error('API Info check failed:', error);
    }
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'healthy':
        return '#28a745';
      case 'unhealthy':
        return '#dc3545';
      default:
        return '#ffc107';
    }
  };

  const getStatusText = () => {
    switch (apiStatus) {
      case 'healthy':
        return '🟢 API Connected';
      case 'unhealthy':
        return '🔴 API Disconnected';
      default:
        return '🟡 Checking...';
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏦 Banking & Marketing Call Center</h1>
        <div className="api-status" style={{ color: getStatusColor() }}>
          {getStatusText()}
        </div>
        {apiInfo && (
          <div className="api-info">
            <small>
              Version: {apiInfo.version} | 
              Docs: <a href={apiInfo.docs} target="_blank" rel="noopener noreferrer">
                {apiInfo.docs}
              </a>
            </small>
          </div>
        )}
      </header>

      <div className="tab-container">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'banking' ? 'active' : ''}`}
            onClick={() => setActiveTab('banking')}
          >
            🏦 Banking (Inbound)
          </button>
          <button
            className={`tab-button ${activeTab === 'marketing' ? 'active' : ''}`}
            onClick={() => setActiveTab('marketing')}
          >
            📢 Marketing (Outbound)
          </button>
          <button
            className={`tab-button ${activeTab === 'test' ? 'active' : ''}`}
            onClick={() => setActiveTab('test')}
          >
            🧪 API Test
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'banking' && <BankingChat />}
          {activeTab === 'marketing' && <MarketingChat />}
          {activeTab === 'test' && <TestAPI />}
        </div>
      </div>

      <footer className="App-footer">
        <p>
          <small>
            Powered by FastAPI + React | 
            Banking handles inbound customer calls | 
            Marketing handles outbound calls
          </small>
        </p>
      </footer>
    </div>
  );
}

export default App;
