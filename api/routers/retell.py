from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

import requests as _requests
from services import db_manager

RETELL_API_KEY = os.getenv("RETELL_API_KEY")
RETELL_AGENT_ID = os.getenv("RETELL_AGENT_ID")
RETELL_CONVERSATION_FLOW_ID = os.getenv("RETELL_CONVERSATION_FLOW_ID")

MAX_CONCURRENT_CALLS_PER_DIRECTION = 5

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
            try:
                db_manager.upsert_call({
                    "call_id": res_data.get("call_id"),
                    "agent_id": agent_id,
                    "direction": "inbound",
                    "status": "registered",
                })
            except Exception as db_err:
                print(f"[db_manager] non-fatal: failed to log web call: {db_err}")
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
    """Initiate an outbound phone call using Retell AI, capped at 5 concurrent outbound calls."""
    client = get_retell_client()
    agent_id = req.override_agent_id or RETELL_AGENT_ID

    try:
        active_outbound = db_manager.get_active_calls_count("outbound")
    except Exception as e:
        print(f"[db_manager] warning: could not check active call count: {e}")
        active_outbound = 0

    if active_outbound >= MAX_CONCURRENT_CALLS_PER_DIRECTION:
        raise HTTPException(
            status_code=429,
            detail=f"Outbound call limit reached ({MAX_CONCURRENT_CALLS_PER_DIRECTION} concurrent calls). "
                   "Wait for a call to finish before starting another.",
        )

    try:
        call = client.call.create_phone_call(
            from_number=req.from_number,
            to_number=req.to_number,
            override_agent_id=agent_id,
            retell_llm_dynamic_variables=req.retell_llm_dynamic_variables,
        )

        # Extract Twilio SID if available in the response model attributes
        twilio_call_sid = None
        telephony = getattr(call, "telephony_identifier", None)
        if telephony:
            if isinstance(telephony, dict):
                twilio_call_sid = telephony.get("twilio_call_sid")
            else:
                twilio_call_sid = getattr(telephony, "twilio_call_sid", None)

        try:
            db_manager.upsert_call({
                "call_id": call.call_id,
                "agent_id": agent_id,
                "direction": "outbound",
                "from_number": req.from_number,
                "to_number": req.to_number,
                "status": "registered",
                "twilio_call_sid": twilio_call_sid,
                "dynamic_variables": req.retell_llm_dynamic_variables or {},
            })
        except Exception as db_err:
            print(f"[db_manager] non-fatal: failed to log outbound call: {db_err}")

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
    """Handle Webhook events from Retell AI (call_started, call_ended, call_analyzed)."""
    try:
        payload = await request.json()
        event_type = payload.get("event")
        
        # Check both "call" (Retell v2 standard) and "data" (legacy/fallback)
        data = payload.get("call") or payload.get("data") or {}
        call_id = data.get("call_id")

        print(f"[Retell Webhook Received] Event: {event_type} | Call ID: {call_id}")

        if not call_id:
            return {"status": "ignored", "reason": "missing call_id"}

        direction = "outbound" if data.get("direction") == "outbound" else "inbound"
        
        # Extract twilio_call_sid if nested inside telephony_identifier
        telephony = data.get("telephony_identifier") or {}
        twilio_call_sid = telephony.get("twilio_call_sid")

        if event_type == "call_started":
            db_manager.upsert_call({
                "call_id": call_id,
                "agent_id": data.get("agent_id"),
                "direction": direction,
                "from_number": data.get("from_number"),
                "to_number": data.get("to_number"),
                "status": "active",
                "twilio_call_sid": twilio_call_sid,
            })

        elif event_type == "call_ended":
            duration_seconds = None
            if data.get("start_timestamp") and data.get("end_timestamp"):
                duration_seconds = int(
                    (data["end_timestamp"] - data["start_timestamp"]) / 1000
                )
            db_manager.update_call_status(
                call_id,
                status="completed",
                extra_data={
                    "duration": duration_seconds,
                    "recording_url": data.get("recording_url"),
                    "transcript": data.get("transcript"),
                    "twilio_call_sid": twilio_call_sid,
                },
            )

        elif event_type in ("call_analyzed", "call_completed"):
            analysis = data.get("call_analysis", {}) or {}
            db_manager.update_call_status(
                call_id,
                status="completed",
                extra_data={
                    "transcript": data.get("transcript"),
                    "summary": analysis.get("call_summary"),
                    "sentiment": analysis.get("user_sentiment"),
                    "twilio_call_sid": twilio_call_sid,
                },
            )

        return {"status": "received"}
    except Exception as e:
        print(f"Error handling Retell webhook: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/hangup-call/{call_id}")
async def hangup_call(call_id: str):
    """Terminate an active call and mark it completed in Supabase."""
    ended_via = None

        # 1. Try the Retell SDK's native call.stop() (for active/browser calls)
    try:
        client = get_retell_client()
        if hasattr(client.call, "stop"):
            client.call.stop(call_id)
            ended_via = "retell_sdk"
    except Exception as e:
        print(f"[hangup] retell sdk attempt failed (continuing): {e}")

    # 2. Fallback / PSTN calls: end the Twilio leg
    if not ended_via:
        try:
            call_row = db_manager.get_call(call_id)
            twilio_sid = (call_row or {}).get("twilio_call_sid")
            account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            auth_token = os.getenv("TWILIO_AUTH_TOKEN")
            if twilio_sid and account_sid and auth_token:
                twilio_url = (
                    f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls/{twilio_sid}.json"
                )
                _requests.post(
                    twilio_url, data={"Status": "completed"}, auth=(account_sid, auth_token), timeout=10
                )
                ended_via = "twilio"
        except Exception as e:
            print(f"[hangup] twilio fallback failed: {e}")

    try:
        db_manager.update_call_status(call_id, status="completed")
    except Exception as e:
        print(f"[db_manager] non-fatal: failed to mark call completed: {e}")

    return {"success": True, "call_id": call_id, "ended_via": ended_via or "marked_completed_only"}
