from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

import requests as _requests
from services import db_manager

RETELL_API_KEY = (os.getenv("RETELL_API_KEY") or "").strip('"').strip("'")
RETELL_AGENT_ID = (os.getenv("RETELL_AGENT_ID") or "").strip('"').strip("'")
RETELL_CONVERSATION_FLOW_ID = (os.getenv("RETELL_CONVERSATION_FLOW_ID") or "").strip('"').strip("'")

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
def register_web_call(req: RegisterCallRequest):
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
def create_custom_agent(req: CreateCustomAgentRequest):
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
def create_phone_call(req: CreatePhoneCallRequest):
    """Initiate an outbound phone call using Retell AI, capped at 5 concurrent outbound calls."""
    client = get_retell_client()
    agent_id = req.override_agent_id
    if not agent_id:
        raise HTTPException(
            status_code=400,
            detail="An agent ID is required to place calls. Please create or select your custom voice agent first."
        )

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

    clean_from = (req.from_number or os.getenv("TWILIO_PHONE_NUMBER") or "").strip('"').strip("'")
    clean_to = (req.to_number or "").strip('"').strip("'")

    if not clean_from:
        raise HTTPException(
            status_code=400,
            detail="A 'from_number' is required to place calls. Configure TWILIO_PHONE_NUMBER or pass from_number."
        )

    try:
        call = client.call.create_phone_call(
            from_number=clean_from,
            to_number=clean_to,
            override_agent_id=agent_id,
            retell_llm_dynamic_variables=req.retell_llm_dynamic_variables or {},
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

class SetActiveInboundAgentRequest(BaseModel):
    agent_id: str
    phone_number: Optional[str] = None

@router.get("/active-inbound-agent")
def get_active_inbound_agent():
    """Retrieve the currently active live inbound agent and bound phone number.
    
    Returns env-variable defaults immediately if RETELL_API_KEY is not configured
    or if the external Retell API call fails, so the frontend never hangs on login.
    """
    active_agent_id = os.getenv("RETELL_AGENT_ID", "")
    bound_phone = os.getenv("TWILIO_PHONE_NUMBER", "")

    # Short-circuit if no API key — avoids blocking HTTP call on startup
    if not RETELL_API_KEY:
        return {"success": True, "phone_number": bound_phone, "agent_id": active_agent_id}

    try:
        client = get_retell_client()
        numbers_resp = client.phone_number.list()
        items = numbers_resp if isinstance(numbers_resp, list) else (
            numbers_resp[1] if isinstance(numbers_resp, tuple) else getattr(numbers_resp, "items", [])
        )
        if items:
            first_phone = items[0]
            bound_phone = getattr(first_phone, "phone_number", bound_phone)
            inbound_agents = getattr(first_phone, "inbound_agents", []) or []
            if inbound_agents:
                active_agent_id = getattr(inbound_agents[0], "agent_id", active_agent_id)
    except Exception as e:
        print(f"[retell active-inbound-agent] could not fetch live phone number list (using env fallback): {e}")

    return {
        "success": True,
        "phone_number": bound_phone,
        "agent_id": active_agent_id
    }

@router.post("/set-active-inbound-agent")
def set_active_inbound_agent(req: SetActiveInboundAgentRequest):
    """Binds the selected inbound agent to the live Retell phone number so it handles 100% of live inbound calls."""
    client = get_retell_client()
    target_phone = req.phone_number
    
    try:
        if not target_phone:
            numbers_resp = client.phone_number.list()
            items = numbers_resp if isinstance(numbers_resp, list) else (
                numbers_resp[1] if isinstance(numbers_resp, tuple) else getattr(numbers_resp, "items", [])
            )
            if items:
                target_phone = getattr(items[0], "phone_number", None)
            
        if not target_phone:
            target_phone = os.getenv("TWILIO_PHONE_NUMBER")
            
        if target_phone:
            client.phone_number.update(
                target_phone,
                inbound_agents=[{"agent_id": req.agent_id, "weight": 1.0}]
            )
            print(f"[Retell Live Phone Updated] Phone {target_phone} bound to inbound agent {req.agent_id}")
            
        os.environ["RETELL_AGENT_ID"] = req.agent_id

        # Auto-configure agent webhook_url to ngrok so hangup events are immediately delivered
        ngrok_url = (os.getenv("NGROK_URL") or "").rstrip("/")
        if ngrok_url:
            webhook_endpoint = f"{ngrok_url}/api/retell/webhook"
            try:
                client.agent.update(req.agent_id, webhook_url=webhook_endpoint)
                print(f"[Retell Webhook Configured] Agent {req.agent_id} bound to {webhook_endpoint}")
            except Exception as w_err:
                print(f"[Retell Webhook Warning] non-fatal: could not update agent webhook_url: {w_err}")
        
        return {
            "success": True,
            "phone_number": target_phone,
            "agent_id": req.agent_id,
            "message": f"Inbound agent {req.agent_id} marked LIVE for {target_phone or 'all inbound calls'}"
        }
    except Exception as e:
        print(f"[Retell Set Active Inbound Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update active inbound agent: {str(e)}")

@router.delete("/delete-agent/{agent_id}")
def delete_agent(agent_id: str):
    """Delete the custom agent from Retell AI servers."""
    client = get_retell_client()
    try:
        client.agent.delete(agent_id)
        print(f"[Retell API] Agent {agent_id} deleted successfully.")
        return {"success": True}
    except Exception as e:
        print(f"[Retell Agent Deletion Error]: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete agent on Retell AI: {str(e)}")

@router.get("/agent-context/{agent_id}")
def get_agent_context(agent_id: str):
    """Retrieve the current prompt/context of an existing Retell agent without altering any settings."""
    client = get_retell_client()
    try:
        agent = client.agent.retrieve(agent_id)
        llm_id = None
        if hasattr(agent, "response_engine") and getattr(agent.response_engine, "type", None) == "retell-llm":
            llm_id = getattr(agent.response_engine, "llm_id", None)
            
        if not llm_id:
            raise HTTPException(
                status_code=400,
                detail="This agent does not use a direct Retell LLM response engine with editable context."
            )
            
        llm = client.llm.retrieve(llm_id)
        return {
            "success": True,
            "agent_id": agent_id,
            "agent_name": getattr(agent, "agent_name", ""),
            "llm_id": llm_id,
            "prompt": getattr(llm, "general_prompt", "") or "",
            "begin_message": getattr(llm, "begin_message", "") or ""
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[get_agent_context error]: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve agent context: {str(e)}")

class UpdateAgentContextRequest(BaseModel):
    agent_id: str
    prompt: str
    begin_message: Optional[str] = None

@router.post("/update-agent-context")
def update_agent_context(req: UpdateAgentContextRequest):
    """Update ONLY the prompt/context of an existing Retell agent, preserving all voice, telephony, and routing settings."""
    client = get_retell_client()
    try:
        agent = client.agent.retrieve(req.agent_id)
        llm_id = None
        if hasattr(agent, "response_engine") and getattr(agent.response_engine, "type", None) == "retell-llm":
            llm_id = getattr(agent.response_engine, "llm_id", None)
            
        if not llm_id:
            raise HTTPException(
                status_code=400,
                detail="Agent does not have an editable Retell LLM response engine."
            )
            
        update_kwargs = {"general_prompt": req.prompt}
        if req.begin_message is not None:
            update_kwargs["begin_message"] = req.begin_message

        updated_llm = client.llm.update(llm_id, **update_kwargs)
        print(f"[Retell Context Updated] Agent ID: {req.agent_id} | LLM ID: {llm_id}")
        
        return {
            "success": True,
            "agent_id": req.agent_id,
            "llm_id": llm_id,
            "prompt": getattr(updated_llm, "general_prompt", req.prompt),
            "message": "Agent context updated successfully. Voice persona, telephony, and routing remain untouched."
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[update_agent_context error]: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update agent context: {str(e)}")

class FilteredCallsRequest(BaseModel):
    agent_ids: list[str]
    limit: Optional[int] = 50

@router.post("/calls/filter")
def list_filtered_calls(req: FilteredCallsRequest):
    """Fetch call logs belonging only to the user's agents."""
    try:
        if not req.agent_ids:
            return {"success": True, "calls": []}
            
        agent_filter = ",".join(req.agent_ids)
        headers = {
            "apikey": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
            "Authorization": f"Bearer {os.getenv('SUPABASE_SERVICE_ROLE_KEY')}"
        }
        params = {
            "agent_id": f"in.({agent_filter})",
            "order": "created_at.desc",
            "limit": str(req.limit)
        }
        url = f"{os.getenv('SUPABASE_URL')}/rest/v1/calls"
        resp = _requests.get(url, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        return {"success": True, "calls": resp.json()}
    except Exception as e:
        print(f"[calls/filter] error: {e}")
        return {"success": False, "calls": [], "error": str(e)}


@router.get("/calls")
def list_calls(limit: int = 50):
    """Fetch recent call logs and sync latest transcripts/durations from Retell AI."""
    # 1. Sync latest call metadata directly from Retell AI API
    try:
        client = get_retell_client()
        res = client.call.list(limit=20)
        items = getattr(res, "items", res) if not isinstance(res, list) else res
        
        for item in items:
            c_id = getattr(item, "call_id", None)
            if not c_id:
                continue
            
            dur_ms = getattr(item, "duration_ms", None) or 0
            dur_sec = dur_ms // 1000 if dur_ms else 0
            
            analysis = getattr(item, "call_analysis", None)
            summary = getattr(analysis, "call_summary", None) if analysis else None
            sentiment = getattr(analysis, "user_sentiment", None) if analysis else None
            
            db_manager.upsert_call({
                "call_id": c_id,
                "agent_id": getattr(item, "agent_id", None),
                "agent_name": getattr(item, "agent_name", None),
                "direction": getattr(item, "direction", "inbound"),
                "from_number": getattr(item, "from_number", None),
                "to_number": getattr(item, "to_number", None),
                "status": "completed" if getattr(item, "call_status", "") == "ended" else "active",
                "duration": dur_sec,
                "recording_url": getattr(item, "recording_url", None),
                "transcript": getattr(item, "transcript", None),
                "summary": summary,
                "sentiment": sentiment,
            })
    except Exception as sync_err:
        print(f"[retell sync notice]: could not sync live calls from Retell API: {sync_err}")

    # 2. Return latest calls from database
    try:
        calls = db_manager.list_recent_calls(limit=limit)
        return {"success": True, "calls": calls}
    except Exception as e:
        print(f"[db_manager] error fetching calls: {e}")
        return {"success": False, "calls": [], "error": str(e)}

@router.get("/calls/{call_id}")
def get_call_detail(call_id: str):
    """Fetch detailed metadata for a single call."""
    try:
        client = get_retell_client()
        item = None
        db_status = "active"
        dur_sec = 0
        try:
            item = client.call.retrieve(call_id)
            if item:
                dur_ms = getattr(item, "duration_ms", None) or 0
                dur_sec = dur_ms // 1000 if dur_ms else 0
                analysis = getattr(item, "call_analysis", None)
                summary = getattr(analysis, "call_summary", None) if analysis else None
                sentiment = getattr(analysis, "user_sentiment", None) if analysis else None
                
                raw_status = getattr(item, "call_status", "")
                if raw_status in ("ended", "not_connected", "error"):
                    db_status = "completed" if raw_status == "ended" else "failed"
                elif raw_status in ("registered", "ongoing"):
                    db_status = "active"
                else:
                    db_status = "completed"
                
                db_manager.upsert_call({
                    "call_id": call_id,
                    "agent_id": getattr(item, "agent_id", None),
                    "agent_name": getattr(item, "agent_name", None),
                    "direction": getattr(item, "direction", "inbound"),
                    "from_number": getattr(item, "from_number", None),
                    "to_number": getattr(item, "to_number", None),
                    "status": db_status,
                    "duration": dur_sec,
                    "recording_url": getattr(item, "recording_url", None),
                    "transcript": getattr(item, "transcript", None),
                    "summary": summary,
                    "sentiment": sentiment,
                })
        except Exception as e:
            print(f"[get_call_detail] retrieve error: {e}")

        call = db_manager.get_call(call_id)
        if not call and item:
            call = {
                "call_id": call_id,
                "agent_id": getattr(item, "agent_id", None),
                "direction": getattr(item, "direction", "inbound"),
                "status": db_status,
                "duration": dur_sec,
            }
        if not call:
            raise HTTPException(status_code=404, detail="Call record not found")
        return {"success": True, "call": call}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/webhook")
@router.head("/webhook")
async def retell_webhook_verify():
    """Endpoint for Retell AI dashboard verification or GET checks."""
    return {"status": "ok", "message": "Retell Webhook endpoint active"}

@router.post("/webhook")
def retell_webhook(payload: Dict[str, Any]):
    """Handle Webhook events from Retell AI (call_started, call_ended, call_analyzed)."""
    try:
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
            try:
                db_manager.upsert_call({
                    "call_id": call_id,
                    "agent_id": data.get("agent_id"),
                    "direction": direction,
                    "from_number": data.get("from_number"),
                    "to_number": data.get("to_number"),
                    "status": "active",
                    "twilio_call_sid": twilio_call_sid,
                })
            except Exception as e:
                print(f"[db_manager] webhook upsert_call warning: {e}")

        elif event_type in ("call_ended", "call_analyzed", "call_completed"):
            disconnection_reason = data.get("disconnection_reason", "")
            duration_seconds = None
            if data.get("start_timestamp") and data.get("end_timestamp"):
                duration_seconds = int(
                    (data["end_timestamp"] - data["start_timestamp"]) / 1000
                )
            analysis = data.get("call_analysis", {}) or {}
            
            # Map disconnection reasons (e.g. dial_busy, dial_failed) to appropriate status
            status = "completed"
            if disconnection_reason in ("dial_busy", "dial_failed", "error"):
                status = "failed"

            try:
                db_manager.update_call_status(
                    call_id,
                    status=status,
                    extra_data={
                        "duration": duration_seconds or (data.get("duration_ms", 0) // 1000 if data.get("duration_ms") else 0),
                        "recording_url": data.get("recording_url"),
                        "transcript": data.get("transcript"),
                        "summary": analysis.get("call_summary"),
                        "sentiment": analysis.get("user_sentiment"),
                        "twilio_call_sid": twilio_call_sid,
                        "disconnection_reason": disconnection_reason
                    },
                )
            except Exception as e:
                print(f"[db_manager] webhook update_call_status warning: {e}")

        return {"status": "received"}
    except Exception as e:
        print(f"Error handling Retell webhook: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/hangup-call/{call_id}")
def hangup_call(call_id: str):
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
                    twilio_url, data={"Status": "completed"}, auth=(account_sid, auth_token), timeout=4
                )
                ended_via = "twilio"
        except Exception as e:
            print(f"[hangup] twilio fallback failed: {e}")

    try:
        db_manager.update_call_status(call_id, status="completed")
    except Exception as e:
        print(f"[db_manager] non-fatal: failed to mark call completed: {e}")

    # Also update simulated call_requests if applicable
    try:
        supabase_url = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").rstrip("/")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")
        if supabase_url and service_key:
            _requests.patch(
                f"{supabase_url}/rest/v1/call_requests?id=eq.{call_id}",
                headers={"apikey": service_key, "Authorization": f"Bearer {service_key}", "Content-Type": "application/json"},
                json={"status": "completed"},
                timeout=3
            )
    except Exception:
        pass

    return {"success": True, "call_id": call_id, "ended_via": ended_via or "marked_completed_only"}
