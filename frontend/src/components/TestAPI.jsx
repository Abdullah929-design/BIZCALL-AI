import React, { useState, useEffect } from 'react';
import { healthAPI, bankingAPI, marketingAPI } from '../services/api.jsx';

const TestAPI = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (testName, status, message, data = null) => {
    setTestResults(prev => [...prev, {
      test: testName,
      status,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Health Check
    try {
      const health = await healthAPI.check();
      addResult('Health Check', 'pass', 'API is healthy', health);
    } catch (error) {
      addResult('Health Check', 'fail', error.message);
    }

    // Test 2: Root Endpoint
    try {
      const root = await healthAPI.getRoot();
      addResult('Root Endpoint', 'pass', `API: ${root.message}`, root);
    } catch (error) {
      addResult('Root Endpoint', 'fail', error.message);
    }

    // Test 3: Banking Session
    try {
      const session = await bankingAPI.createSession();
      addResult('Banking Session', 'pass', `Session: ${session.session_id.slice(0, 8)}...`, session);
      
      try {
        const intents = await bankingAPI.detectIntents('I want to activate my card', session.session_id);
        addResult('Intent Detection', 'pass', `Complexity: ${intents.complexity}`, intents);
      } catch (error) {
        addResult('Intent Detection', 'fail', error.message);
      }

      try {
        const query = await bankingAPI.processQuery('How do I check my balance?', session.session_id);
        addResult('Banking Query', 'pass', `Mode: ${query.mode}`, query);
      } catch (error) {
        addResult('Banking Query', 'fail', error.message);
      }
    } catch (error) {
      addResult('Banking Session', 'fail', error.message);
    }

    // Test 6: Marketing Session
    try {
      const marketingSession = await marketingAPI.createSession();
      addResult('Marketing Session', 'pass', `Session: ${marketingSession.session_id.slice(0, 8)}...`, marketingSession);

      try {
        const marketingQuery = await marketingAPI.processQuery('What accounts do you offer?', marketingSession.session_id);
        addResult('Marketing Query', 'pass', `Mode: ${marketingQuery.mode}`, marketingQuery);
      } catch (error) {
        addResult('Marketing Query', 'fail', error.message);
      }
    } catch (error) {
      addResult('Marketing Session', 'fail', error.message);
    }

    setIsRunning(false);
  };

  const passCount = testResults.filter(r => r.status === 'pass').length;
  const failCount = testResults.filter(r => r.status === 'fail').length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap');

        .ta-root * { box-sizing: border-box; margin: 0; padding: 0; }

        .ta-root {
          font-family: 'DM Sans', sans-serif;
          background: #0b0e18;
          min-height: 100%;
          color: #e0ddd8;
          padding: 32px 40px;
        }

        .ta-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .ta-title-group { display: flex; align-items: center; gap: 14px; }

        .ta-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .ta-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #f0eee8;
          letter-spacing: 0.02em;
        }

        .ta-subtitle {
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(96,165,250,0.55);
          margin-top: 2px;
        }

        .ta-run-btn {
          padding: 12px 28px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          border: none;
          border-radius: 10px;
          color: #eff6ff;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ta-run-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(59,130,246,0.35);
        }

        .ta-run-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        .ta-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Summary bar */
        .ta-summary {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          padding: 14px 20px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          align-items: center;
        }

        .ta-summary-total {
          font-size: 0.8rem;
          color: rgba(224,221,216,0.5);
          margin-right: 8px;
          letter-spacing: 0.04em;
        }

        .ta-pill {
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.04em;
        }

        .ta-pill-pass {
          background: rgba(34,197,94,0.12);
          border: 1px solid rgba(34,197,94,0.25);
          color: #4ade80;
        }

        .ta-pill-fail {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.25);
          color: #f87171;
        }

        /* Results */
        .ta-results { display: flex; flex-direction: column; gap: 8px; }

        .ta-result {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 14px 18px;
          animation: rFade 0.25s ease;
          transition: border-color 0.2s;
        }

        .ta-result:hover { border-color: rgba(255,255,255,0.12); }

        .ta-result-pass { border-left: 3px solid rgba(34,197,94,0.5); }
        .ta-result-fail { border-left: 3px solid rgba(239,68,68,0.5); }

        @keyframes rFade {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .ta-result-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 6px;
        }

        .ta-status-badge {
          padding: 2px 10px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-family: 'DM Mono', monospace;
        }

        .ta-status-pass {
          background: rgba(34,197,94,0.12);
          color: #4ade80;
        }

        .ta-status-fail {
          background: rgba(239,68,68,0.12);
          color: #f87171;
        }

        .ta-result-name {
          font-weight: 500;
          font-size: 0.875rem;
          color: #e8e5e0;
          flex: 1;
        }

        .ta-result-time {
          font-size: 0.7rem;
          color: rgba(224,221,216,0.3);
          font-family: 'DM Mono', monospace;
        }

        .ta-result-msg {
          font-size: 0.8rem;
          color: rgba(224,221,216,0.5);
          margin-left: 2px;
        }

        .ta-details {
          margin-top: 10px;
          border: none;
          cursor: pointer;
        }

        .ta-details summary {
          font-size: 0.72rem;
          color: rgba(96,165,250,0.5);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          list-style: none;
          cursor: pointer;
          transition: color 0.15s;
        }

        .ta-details summary:hover { color: rgba(96,165,250,0.8); }
        .ta-details summary::-webkit-details-marker { display: none; }

        .ta-details[open] summary { margin-bottom: 8px; }

        .ta-data-pre {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-family: 'DM Mono', monospace;
          color: rgba(224,221,216,0.55);
          overflow: auto;
          max-height: 180px;
          line-height: 1.6;
        }

        .ta-empty {
          text-align: center;
          padding: 60px 20px;
          color: rgba(224,221,216,0.15);
        }

        .ta-empty-icon { font-size: 2rem; margin-bottom: 12px; opacity: 0.4; }

        .ta-empty-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1rem;
          letter-spacing: 0.05em;
          font-style: italic;
        }
      `}</style>

      <div className="ta-root">
        <div className="ta-header">
          <div className="ta-title-group">
            <div className="ta-icon">🧪</div>
            <div>
              <div className="ta-title">API Integration Tests</div>
              <div className="ta-subtitle">System Diagnostics</div>
            </div>
          </div>
          <button
            onClick={runTests}
            disabled={isRunning}
            className="ta-run-btn"
          >
            {isRunning ? (
              <><div className="ta-spinner" /> Running Tests</>
            ) : (
              <>▶ Run Tests</>
            )}
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="ta-summary">
            <span className="ta-summary-total">{testResults.length} tests</span>
            {passCount > 0 && <span className="ta-pill ta-pill-pass">✓ {passCount} Passed</span>}
            {failCount > 0 && <span className="ta-pill ta-pill-fail">✗ {failCount} Failed</span>}
          </div>
        )}

        {testResults.length === 0 && !isRunning ? (
          <div className="ta-empty">
            <div className="ta-empty-icon">⬡</div>
            <div className="ta-empty-text">Click "Run Tests" to begin diagnostics</div>
          </div>
        ) : (
          <div className="ta-results">
            {testResults.map((result, index) => (
              <div key={index} className={`ta-result ta-result-${result.status}`}>
                <div className="ta-result-header">
                  <span className={`ta-status-badge ta-status-${result.status}`}>
                    {result.status === 'pass' ? 'Pass' : 'Fail'}
                  </span>
                  <span className="ta-result-name">{result.test}</span>
                  <span className="ta-result-time">{result.timestamp}</span>
                </div>
                <div className="ta-result-msg">{result.message}</div>
                {result.data && (
                  <details className="ta-details">
                    <summary>▸ View Details</summary>
                    <pre className="ta-data-pre">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default TestAPI;
