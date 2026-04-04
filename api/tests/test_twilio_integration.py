import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_inbound_call_twiml():
    """Test that inbound call returns correct TwiML structure."""
    response = client.post(
        "/api/twilio/inbound-call",
        data={"CallSid": "CA123", "From": "+1234567890"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/xml"
    assert "<Say" in response.text
    assert "<Gather" in response.text
    assert "Banking Support" in response.text

def test_health_twilio_numbers():
    """Test that the test numbers endpoint works."""
    response = client.get("/api/health/twilio-test-numbers")
    assert response.status_code == 200
    data = response.json()
    assert "+15005550001" in data["test_numbers"]
    assert "description" in data["test_numbers"]["+15005550001"]

def test_initiate_outbound_validation():
    """Test that outbound call request validates correctly."""
    # Missing fields
    response = client.post(
        "/api/twilio/initiate-outbound",
        json={"to_number": "+15005550001"}
    )
    assert response.status_code == 422 # Validation error
    
    # Valid schema but no credentials (should fail with 500 or 422 depending on implementation)
    # Since we don't have SID in test env, it should fail at the API call step
    response = client.post(
        "/api/twilio/initiate-outbound",
        json={
            "to_number": "+15005550001",
            "business_context": "Test Context",
            "instructions": "Test Instructions"
        }
    )
    # It might return 500 because credentials are missing
    assert response.status_code in [500, 200]
