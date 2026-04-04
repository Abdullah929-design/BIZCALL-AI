import requests
import xml.etree.ElementTree as ET
import sys

# BASE_URL = "http://localhost:8002"
BASE_URL = "http://localhost:8002"

def simulate_inbound_call():
    print("--- STEP 1: Initial Inbound Call ---")
    url = f"{BASE_URL}/api/twilio/inbound-call"
    data = {
        "CallSid": "test_call_123",
        "From": "+1234567890",
        "To": "+13613208235",
        "Direction": "inbound"
    }
    
    response = requests.post(url, data=data)
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return
    
    twiml = response.text
    print("Response TwiML:")
    print(twiml)
    
    # Extract session_id from the action URL in Gather tag
    # Example: action="https://.../api/twilio/process-call?session_id=UUID"
    try:
        root = ET.fromstring(twiml)
        gather = root.find("Gather")
        action_url = gather.get("action")
        session_id = action_url.split("session_id=")[1]
        print(f"\nExtracted Session ID: {session_id}")
        return session_id
    except Exception as e:
        print(f"Failed to extract session ID: {e}")
        return None

def simulate_speech(session_id, user_speech):
    print(f"\n--- STEP 2: Processing Speech: '{user_speech}' ---")
    url = f"{BASE_URL}/api/twilio/process-call"
    params = {"session_id": session_id}
    data = {
        "SpeechResult": user_speech,
        "CallSid": "test_call_123"
    }
    
    response = requests.post(url, params=params, data=data)
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return
    
    twiml = response.text
    print("Response TwiML:")
    print(twiml)
    
    try:
        root = ET.fromstring(twiml)
        say = root.find("Say")
        print(f"\nAI Response: {say.text}")
    except Exception as e:
        print(f"Failed to parse AI response: {e}")

if __name__ == "__main__":
    sid = simulate_inbound_call()
    if sid:
        # Simulate a user asking a question
        simulate_speech(sid, "What are the requirements for opening a savings account?")
        
        # Simulate a follow-up
        simulate_speech(sid, "Do I need to come to the branch in person?")
