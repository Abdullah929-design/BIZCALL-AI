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
      addResult('Health Check', '✅ PASS', 'API is healthy', health);
    } catch (error) {
      addResult('Health Check', '❌ FAIL', error.message);
    }

    // Test 2: Root Endpoint
    try {
      const root = await healthAPI.getRoot();
      addResult('Root Endpoint', '✅ PASS', `API: ${root.message}`, root);
    } catch (error) {
      addResult('Root Endpoint', '❌ FAIL', error.message);
    }

    // Test 3: Banking Session
    try {
      const session = await bankingAPI.createSession();
      addResult('Banking Session', '✅ PASS', `Session: ${session.session_id.slice(0, 8)}...`, session);
      
      // Test 4: Intent Detection
      try {
        const intents = await bankingAPI.detectIntents('I want to activate my card', session.session_id);
        addResult('Intent Detection', '✅ PASS', `Complexity: ${intents.complexity}`, intents);
      } catch (error) {
        addResult('Intent Detection', '❌ FAIL', error.message);
      }

      // Test 5: Banking Query
      try {
        const query = await bankingAPI.processQuery('How do I check my balance?', session.session_id);
        addResult('Banking Query', '✅ PASS', `Mode: ${query.mode}`, query);
      } catch (error) {
        addResult('Banking Query', '❌ FAIL', error.message);
      }
    } catch (error) {
      addResult('Banking Session', '❌ FAIL', error.message);
    }

    // Test 6: Marketing Session
    try {
      const marketingSession = await marketingAPI.createSession();
      addResult('Marketing Session', '✅ PASS', `Session: ${marketingSession.session_id.slice(0, 8)}...`, marketingSession);

      // Test 7: Marketing Query
      try {
        const marketingQuery = await marketingAPI.processQuery('What accounts do you offer?', marketingSession.session_id);
        addResult('Marketing Query', '✅ PASS', `Mode: ${marketingQuery.mode}`, marketingQuery);
      } catch (error) {
        addResult('Marketing Query', '❌ FAIL', error.message);
      }
    } catch (error) {
      addResult('Marketing Session', '❌ FAIL', error.message);
    }

    setIsRunning(false);
  };

  return (
    <div style={styles.container}>
      <h3>🧪 API Integration Test</h3>
      <button 
        onClick={runTests} 
        disabled={isRunning}
        style={styles.testButton}
      >
        {isRunning ? '🔄 Running Tests...' : '🚀 Run Integration Tests'}
      </button>

      {testResults.length > 0 && (
        <div style={styles.resultsContainer}>
          <h4>Test Results:</h4>
          {testResults.map((result, index) => (
            <div key={index} style={styles.resultItem}>
              <div style={styles.resultHeader}>
                <span style={styles.resultStatus}>{result.status}</span>
                <span style={styles.resultTest}>{result.test}</span>
                <span style={styles.resultTime}>{result.timestamp}</span>
              </div>
              <div style={styles.resultMessage}>{result.message}</div>
              {result.data && (
                <details style={styles.resultDetails}>
                  <summary>View Details</summary>
                  <pre style={styles.resultData}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    margin: '20px 0',
  },
  testButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  resultsContainer: {
    marginTop: '20px',
  },
  resultItem: {
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '10px',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  resultStatus: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  resultTest: {
    fontWeight: 'bold',
  },
  resultTime: {
    fontSize: '12px',
    color: '#6c757d',
  },
  resultMessage: {
    color: '#495057',
    marginBottom: '8px',
  },
  resultDetails: {
    marginTop: '8px',
  },
  resultData: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '200px',
  },
};

export default TestAPI;
