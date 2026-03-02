#!/usr/bin/env python3
"""
Integration test script for FastAPI backend
"""

import requests
import json
import time

def test_backend():
    base_url = "http://localhost:8002"
    
    print("🧪 Testing FastAPI Backend Integration...")
    print(f"🌐 Base URL: {base_url}")
    
    # Test 1: Health Check
    print("\n1️⃣ Testing Health Check...")
    try:
        response = requests.get(f"{base_url}/api/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        assert response.status_code == 200
        print("   ✅ Health check passed!")
    except Exception as e:
        print(f"   ❌ Health check failed: {e}")
        return False
    
    # Test 2: Root Endpoint
    print("\n2️⃣ Testing Root Endpoint...")
    try:
        response = requests.get(f"{base_url}/")
        print(f"   Status: {response.status_code}")
        data = response.json()
        print(f"   API Name: {data.get('message')}")
        print(f"   Version: {data.get('version')}")
        assert response.status_code == 200
        print("   ✅ Root endpoint passed!")
    except Exception as e:
        print(f"   ❌ Root endpoint failed: {e}")
        return False
    
    # Test 3: Banking Session Creation
    print("\n3️⃣ Testing Banking Session Creation...")
    try:
        response = requests.post(f"{base_url}/api/banking/session/create")
        print(f"   Status: {response.status_code}")
        session_data = response.json()
        print(f"   Session ID: {session_data.get('session_id')}")
        print(f"   Call Type: {session_data.get('call_type')}")
        session_id = session_data.get('session_id')
        assert response.status_code == 200
        assert session_id is not None
        print("   ✅ Banking session creation passed!")
    except Exception as e:
        print(f"   ❌ Banking session creation failed: {e}")
        return False
    
    # Test 4: Intent Detection
    print("\n4️⃣ Testing Intent Detection...")
    try:
        test_text = "I want to activate my debit card"
        response = requests.post(f"{base_url}/api/banking/detect", 
                               json={"text": test_text, "session_id": session_id})
        print(f"   Status: {response.status_code}")
        intent_data = response.json()
        print(f"   Complexity: {intent_data.get('complexity')}")
        print(f"   Detected Intents: {intent_data.get('detected_intents')}")
        print(f"   Segments: {len(intent_data.get('segments', []))}")
        assert response.status_code == 200
        print("   ✅ Intent detection passed!")
    except Exception as e:
        print(f"   ❌ Intent detection failed: {e}")
        return False
    
    # Test 5: Banking Query
    print("\n5️⃣ Testing Banking Query...")
    try:
        test_query = "How do I check my account balance?"
        response = requests.post(f"{base_url}/api/banking/query", 
                               json={"text": test_query, "session_id": session_id})
        print(f"   Status: {response.status_code}")
        query_data = response.json()
        print(f"   Mode: {query_data.get('mode')}")
        print(f"   Session ID: {query_data.get('session_id')}")
        if query_data.get('mode') == 'llm':
            print(f"   Stream URL: {query_data.get('stream_url')}")
        assert response.status_code == 200
        print("   ✅ Banking query passed!")
    except Exception as e:
        print(f"   ❌ Banking query failed: {e}")
        return False
    
    # Test 6: Marketing Session Creation
    print("\n6️⃣ Testing Marketing Session Creation...")
    try:
        response = requests.post(f"{base_url}/api/marketing/session/create")
        print(f"   Status: {response.status_code}")
        marketing_session = response.json()
        marketing_session_id = marketing_session.get('session_id')
        print(f"   Marketing Session ID: {marketing_session_id}")
        assert response.status_code == 200
        assert marketing_session_id is not None
        print("   ✅ Marketing session creation passed!")
    except Exception as e:
        print(f"   ❌ Marketing session creation failed: {e}")
        return False
    
    # Test 7: Marketing Query
    print("\n7️⃣ Testing Marketing Query...")
    try:
        test_marketing_query = "What business accounts do you offer?"
        response = requests.post(f"{base_url}/api/marketing/query", 
                               json={"text": test_marketing_query, 
                                     "session_id": marketing_session_id,
                                     "business_context": "We are a community bank"})
        print(f"   Status: {response.status_code}")
        marketing_data = response.json()
        print(f"   Mode: {marketing_data.get('mode')}")
        print(f"   Session ID: {marketing_data.get('session_id')}")
        assert response.status_code == 200
        print("   ✅ Marketing query passed!")
    except Exception as e:
        print(f"   ❌ Marketing query failed: {e}")
        return False
    
    print("\n🎉 All tests passed! Backend is ready for frontend integration.")
    print(f"📚 API Documentation: {base_url}/docs")
    print(f"🌐 Frontend should be available at: http://localhost:5173")
    print(f"🔗 Backend API: {base_url}")
    
    return True

if __name__ == "__main__":
    success = test_backend()
    if success:
        print("\n✅ Integration test completed successfully!")
    else:
        print("\n❌ Integration test failed!")
