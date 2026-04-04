from fastapi import APIRouter, HTTPException, Request, Response, Query
from fastapi.responses import JSONResponse
import os
import asyncio
import requests
import sys
from datetime import datetime
from typing import Optional

# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from schemas import (
    InitiateOutboundRequest, 
    CallStatusResponse, 
    TwilioWebhookPayload
)
from services.session_manager import session_manager
from services.intent_detector import predict_multiple_intents
from faq_engine.faiss_search import search_faq
from llm_complex_path.llm_inference import generate_llm_response_chat
from llm_marketing_path.marketing_inference import generate_marketing_chat_response
from classification import SIMPLE_INTENTS

router = APIRouter()

# Twilio Config (should be in .env)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
NGROK_URL = os.getenv("NGROK_URL", "").strip().rstrip("/")

def get_twiml_response(content: str) -> str:
    """Helper to wrap content in TwiML XML structure."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    {content}
</Response>"""

@router.post("/inbound-call")
async def inbound_call(request: Request):
    """
    Handle initial inbound call webhook from Twilio.
    
    Args:
        request: The incoming FastAPI request.
        
    Returns:
        TwiML response with greeting and speech gather.
    """
    try:
        form_data = await request.form()
        call_sid = form_data.get("CallSid")
        from_number = form_data.get("From")
        
        # Create session
        session_id = session_manager.create_session("inbound")
        
        # Store metadata
        session_manager.session_metadata[session_id].update({
            "call_sid": call_sid,
            "from_number": from_number,
            "platform": "twilio"
        })
        
        twiml = f"""
        <Say voice="alice">Welcome to Banking Support. Please describe your issue.</Say>
        <Gather input="speech" timeout="10" action="{NGROK_URL}/api/twilio/process-call?session_id={session_id}" />
        """
        return Response(content=get_twiml_response(twiml), media_type="application/xml")
        
    except Exception as e:
        print(f"Error in inbound_call: {e}")
        return Response(content=get_twiml_response('<Say>Sorry, an internal error occurred.</Say>'), 
                        media_type="application/xml")

@router.post("/process-call")
async def process_call(session_id: str, request: Request):
    """
    Process speech result from Twilio and generate response.
    
    Args:
        session_id: The session ID for the call.
        request: The incoming FastAPI request containing SpeechResult.
        
    Returns:
        TwiML response with AI answer and another gather.
    """
    try:
        form_data = await request.form()
        user_input = form_data.get("SpeechResult") or form_data.get("Digits") or ""
        
        if not user_input:
            twiml = f"""
            <Say voice="alice">I didn't hear anything. Please try again or describe your issue.</Say>
            <Gather input="speech" timeout="10" action="{NGROK_URL}/api/twilio/process-call?session_id={session_id}" />
            """
            return Response(content=get_twiml_response(twiml), media_type="application/xml")

        # 1. Add user message to session
        session_manager.add_message(session_id, "user", user_input)
        
        # 2. Run intent detection
        results, complexity = predict_multiple_intents(user_input)
        
        response_text = ""
        
        # 3. Check for FAQ (RAG) logic for simple intents
        if complexity == "simple":
            for seg in results:
                if seg["intents"]:
                    primary = seg["intents"][0]["intent"]
                    if primary in SIMPLE_INTENTS:
                        faq = search_faq(seg["text"], predicted_intent=primary)
                        if faq:
                            response_text = faq["answer"]
                            break
        
        # 4. Fallback to LLM if no FAQ found
        if not response_text:
            messages = session_manager.get_messages_for_llm(session_id)
            # RAG Injection
            faq = search_faq(user_input)
            if faq and faq['confidence'] >= 0.10:
                rag_context = f"Relevant information: {faq['answer']}"
                messages.insert(0, {"role": "system", "content": rag_context})
            
            # Run blocking LLM call in thread pool — keeps the async event loop free
            response_text = await asyncio.to_thread(
                generate_llm_response_chat, messages, 0.25
            )
            
        # 5. Trim for voice (TwiML Say limit/optimization)
        if len(response_text) > 1000:
            response_text = response_text[:997] + "..."
            
        # 6. Add assistant message to session
        session_manager.add_message(session_id, "assistant", response_text)
        
        twiml = f"""
        <Say voice="alice">{response_text}</Say>
        <Gather input="speech" timeout="10" action="{NGROK_URL}/api/twilio/process-call?session_id={session_id}" />
        """
        return Response(content=get_twiml_response(twiml), media_type="application/xml")
        
    except Exception as e:
        print(f"Error in process_call: {e}")
        return Response(content=get_twiml_response('<Say>Sorry, I encountered an error processing your request.</Say>'), 
                        media_type="application/xml")

@router.post("/initiate-outbound")
async def initiate_outbound(req: InitiateOutboundRequest):
    """
    Initiate an outbound call via Twilio API.
    
    Args:
        req: Request body with to_number, business_context, and instructions.
        
    Returns:
        JSON status info.
    """
    try:
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            raise HTTPException(status_code=500, detail="Twilio credentials not configured")

        # 1. Create outbound session
        session_id = session_manager.create_session("outbound")
        session_manager.set_business_context(session_id, req.business_context)
        
        # Store instructions in metadata
        session_manager.session_metadata[session_id]["instructions"] = req.instructions
        
        # 2. Call Twilio API
        twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json"
        
        data = {
            "To": req.to_number,
            "From": TWILIO_PHONE_NUMBER,
            "Url": f"{NGROK_URL}/api/twilio/outbound-greeting?session_id={session_id}"
        }
        
        auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        response = requests.post(twilio_url, data=data, auth=auth)
        
        if response.status_code != 201:
            raise HTTPException(status_code=response.status_code, 
                                detail=f"Twilio API Error: {response.text}")
        
        twilio_data = response.json()
        
        return {
            "success": True,
            "session_id": session_id,
            "call_sid": twilio_data.get("sid"),
            "status": twilio_data.get("status"),
            "to_number": req.to_number,
            "business_context": req.business_context,
            "instructions": req.instructions
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/outbound-greeting")
async def outbound_greeting(session_id: str):
    """Initial greeting for outbound call answered by recipient."""
    business_context = session_manager.get_business_context(session_id) or "our current offers"
    greeting = (
        f"Hello, this is Banking Support. I'm calling regarding {business_context}. "
        "Do you have a moment to discuss?"
    )
    
    twiml = f"""
    <Say voice="alice">{greeting}</Say>
    <Gather input="speech" timeout="10" action="{NGROK_URL}/api/twilio/outbound-process?session_id={session_id}" />
    """
    return Response(content=get_twiml_response(twiml), media_type="application/xml")

@router.post("/outbound-process")
async def outbound_process(session_id: str, request: Request):
    """Handle speech response from outbound call recipient."""
    try:
        form_data = await request.form()
        user_input = form_data.get("SpeechResult") or ""
        
        if not user_input or len(user_input.strip()) < 2:
            twiml = '<Say voice="alice">Thank you for your time. Goodbye.</Say><Hangup />'
            return Response(content=get_twiml_response(twiml), media_type="application/xml")

        # 1. Add user message
        session_manager.add_message(session_id, "user", user_input)
        
        # 2. Build prompt with instructions
        business_context = session_manager.get_business_context(session_id) or ""
        instructions = session_manager.session_metadata[session_id].get("instructions", "")
        
        messages = session_manager.get_messages_for_llm(session_id)
        
        # Inject context and instructions into system prompt
        if messages and messages[0]["role"] == "system":
            original_prompt = messages[0]["content"]
            messages[0]["content"] = (
                f"{original_prompt}\n\n"
                f"Business Context: {business_context}\n"
                f"Instructions: {instructions}"
            )
        
        # 3. Generate response — run in thread pool to keep event loop free
        response_text = await asyncio.to_thread(
            generate_marketing_chat_response, messages, business_context, 0.7
        )
        
        # 4. Limit for voice (Slightly longer for marketing)
        if not response_text or len(response_text.strip()) < 5:
            response_text = "I'm sorry, I missed that. Could you please repeat?"
        
        if len(response_text) > 1000:
            response_text = response_text[:997] + "..."
            
        session_manager.add_message(session_id, "assistant", response_text)
        
        twiml = f"""
        <Say voice="alice">{response_text}</Say>
        <Gather input="speech" timeout="10" action="{NGROK_URL}/api/twilio/outbound-process?session_id={session_id}" />
        """
        # For Tier 1 Simulator, we follow with another gather for multi-turn.
        return Response(content=get_twiml_response(twiml), media_type="application/xml")
        
    except Exception as e:
        print(f"Error in outbound_process: {e}")
        error_twiml = '<Say voice="alice">I am having some trouble connecting. Please try again later.</Say><Hangup />'
        return Response(content=get_twiml_response(error_twiml), media_type="application/xml")

@router.get("/call-status/{call_sid}", response_model=CallStatusResponse)
async def get_call_status(call_sid: str):
    """Get real-time status of a call from Twilio API."""
    try:
        twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls/{call_sid}.json"
        
        auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        response = requests.get(twilio_url, auth=auth)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch status")
            
        data = response.json()
        return CallStatusResponse(
            call_sid=data.get("sid"),
            status=data.get("status"),
            from_number=data.get("from"),
            to_number=data.get("to"),
            duration=int(data.get("duration")) if data.get("duration") else None,
            start_time=data.get("start_time"),
            end_time=data.get("end_time")
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/end-call/{call_sid}")
async def end_call(call_sid: str):
    """End an active call."""
    try:
        twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls/{call_sid}.json"
        
        data = {"Status": "completed"}
        auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        response = requests.post(twilio_url, data=data, auth=auth)
        
        return {"success": response.status_code == 200, "sid": call_sid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

