from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

RETELL_API_KEY = os.getenv("RETELL_API_KEY")
RETELL_AGENT_ID = os.getenv("RETELL_AGENT_ID")
RETELL_CONVERSATION_FLOW_ID = os.getenv("RETELL_CONVERSATION_FLOW_ID")

class RegisterCallRequest(BaseModel):
    agent_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class CreateCustomAgentRequest(BaseModel):
    agent_name: str
    call_type: str  # inbound or outbound
    prompt: str
    knowledge_base: Optional[str] = None
    voice_id: Optional[str] = None

class CreatePhoneCallRequest(BaseModel):
    from_number: str
    to_number: str
    override_agent_id: Optional[str] = None
    retell_llm_dynamic_variables: Optional[Dict[str, Any]] = None

def get_retell_client():
    if not RETELL_API_KEY:
        raise HTTPException(status_code=500, detail="RETELL_API_KEY environment variable is not configured.")
    try:
        from retell import Retell
        return Retell(api_key=RETELL_API_KEY)
    except ImportError:
        raise HTTPException(status_code=500, detail="retell-sdk python package is missing. Install with 'pip install retell-sdk'.")

@router.post("/register-call")
async def register_web_call(req: RegisterCallRequest):
    """Register a web/browser voice call session with Retell AI using direct HTTP API."""
    api_key = os.getenv("RETELL_API_KEY")
    agent_id = req.agent_id or os.getenv("RETELL_AGENT_ID")
    
    if not api_key:
        raise HTTPException(status_code=500, detail="RETELL_API_KEY environment variable is not configured.")
    if not agent_id:
        raise HTTPException(status_code=400, detail="agent_id is required or set RETELL_AGENT_ID in .env")
        
    try:
        import urllib.request
        import json
        
        url = "https://api.retellai.com/v2/create-web-call"
        payload = json.dumps({"agent_id": agent_id}).encode('utf-8')
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        request = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(request) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            print(f"[Retell API Success] Created Web Call: {res_data.get('call_id')}")
            return {"success": True, "call_data": res_data}
            
    except Exception as e:
        print(f"[Retell API Direct Call Error]: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Retell Direct API Error: {str(e)}")

@router.post("/create-custom-agent")
async def create_custom_agent(req: CreateCustomAgentRequest):
    """Provision a real custom Retell AI Agent dynamically using Retell SDK."""
    client = get_retell_client()
    
    try:
        # 1. Create LLM / Conversation Flow for prompt + knowledge base
        full_prompt = f"{req.prompt}"
        if req.knowledge_base and req.knowledge_base.strip():
            full_prompt += f"\n\n[Knowledge Base & FAQs]:\n{req.knowledge_base.strip()}"
            
        llm = client.llm.create(
            general_prompt=full_prompt
        )
        llm_id = llm.llm_id
        print(f"[Retell LLM Created] LLM ID: {llm_id}")

        # 2. Create Agent using newly created Retell LLM
        agent_name = req.agent_name or "Custom Voice Agent"
        voice_id = req.voice_id or "11labs-Adrian"
        
        try:
            agent = client.agent.create(
                agent_name=agent_name,
                response_engine={
                    "type": "retell-llm",
                    "llm_id": llm_id
                },
                voice_id=voice_id
            )
        except Exception as voice_err:
            print(f"[Retell Voice Warning] Voice ID '{voice_id}' not found, falling back to '11labs-Adrian': {voice_err}")
            voice_id = "11labs-Adrian"
            agent = client.agent.create(
                agent_name=agent_name,
                response_engine={
                    "type": "retell-llm",
                    "llm_id": llm_id
                },
                voice_id=voice_id
            )
        
        agent_id = agent.agent_id
        print(f"[Retell Agent Provisioned Successfully] Agent ID: {agent_id} | Name: {agent_name} | Voice: {voice_id}")

        return {
            "success": True,
            "agent": {
                "agent_id": agent_id,
                "agent_name": agent_name,
                "call_type": req.call_type,
                "voice_id": voice_id,
                "llm_id": llm_id
            }
        }
            
    except Exception as e:
        print(f"[Retell Agent Provisioning Error]: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create agent on Retell AI: {str(e)}")

@router.post("/create-phone-call")
async def create_phone_call(req: CreatePhoneCallRequest):
    """Initiate an outbound phone call using Retell AI."""
    client = get_retell_client()
    agent_id = req.override_agent_id or RETELL_AGENT_ID
    try:
        call = client.call.create_phone_call(
            from_number=req.from_number,
            to_number=req.to_number,
            override_agent_id=agent_id,
            retell_llm_dynamic_variables=req.retell_llm_dynamic_variables
        )
        return {"success": True, "call": call}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retell Call Creation Error: {str(e)}")

@router.get("/config")
async def get_config():
    """Get active Retell credentials configuration for testing UI."""
    return {
        "agent_id": RETELL_AGENT_ID,
        "conversation_flow_id": RETELL_CONVERSATION_FLOW_ID,
        "has_api_key": bool(RETELL_API_KEY)
    }

@router.delete("/delete-agent/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete the custom agent from Retell AI servers."""
    client = get_retell_client()
    try:
        client.agent.delete(agent_id)
        print(f"[Retell API] Agent {agent_id} deleted successfully.")
        return {"success": True}
    except Exception as e:
        print(f"[Retell Agent Deletion Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete agent on Retell AI: {str(e)}")


@router.get("/webhook")
@router.head("/webhook")
async def retell_webhook_verify():
    """Endpoint for Retell AI dashboard verification or GET checks."""
    return {"status": "ok", "message": "Retell Webhook endpoint active"}

@router.post("/webhook")
async def retell_webhook(request: Request):
    """Handle Webhook events from Retell AI (e.g. call_started, call_ended, post_call_analysis)."""
    try:
        payload = await request.json()
        event_type = payload.get("event")
        data = payload.get("data", {})
        call_id = data.get("call_id")
        
        print(f"[Retell Webhook Received] Event: {event_type} | Call ID: {call_id}")
        return {"status": "received"}
    except Exception as e:
        print(f"Error handling Retell webhook: {e}")
        return {"status": "error", "message": str(e)}
