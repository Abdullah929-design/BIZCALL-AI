from fastapi import APIRouter, HTTPException
from typing import Optional
from fastapi.responses import StreamingResponse, JSONResponse
import time
import sys
import os

# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from schemas import (
    QueryRequest, LLMResponse, ErrorResponse, SessionInfo, 
    StreamingResponse as StreamingChunk
)
from services.session_manager import session_manager
from llm_marketing_path.marketing_inference import (
    generate_marketing_response_stream, 
    generate_marketing_chat_response_stream,
    generate_marketing_response
)
from faq_engine.faiss_search import search_faq
from classification import SIMPLE_INTENTS

router = APIRouter()

@router.post("/session/create")
async def create_marketing_session():
    """Create a new session for marketing outbound calls"""
    try:
        session_id = session_manager.create_session("outbound")
        return {"session_id": session_id, "call_type": "outbound"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session creation failed: {str(e)}")

@router.get("/session/{session_id}", response_model=SessionInfo)
async def get_marketing_session(session_id: str):
    """Get marketing session information"""
    session_info = session_manager.get_session_info(session_id)
    if not session_info:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_info

@router.delete("/session/{session_id}")
async def clear_marketing_session(session_id: str):
    """Clear marketing session messages"""
    success = session_manager.clear_session(session_id, "outbound")
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session cleared successfully"}

@router.post("/generate")
async def generate_marketing(req: QueryRequest, temperature: Optional[float] = 0.7):
    """
    Non-streaming marketing generation (blocking).
    Returns generated marketing text. Use /stream for streaming output.
    """
    try:
        start_time = time.time()
        text = req.text or ""
        business_context = req.business_context or ""
        
        # Get or create session
        session_id = req.session_id
        if not session_id:
            session_id = session_manager.create_session("outbound")
        
        # Add user message to session
        session_manager.add_message(session_id, "user", text)
        
        # Try FAQ fallback for short simple queries
        if len(text.split()) < 8:
            faq = search_faq(text)
            if faq:
                session_manager.add_message(session_id, "assistant", faq["answer"])
                response_time = time.time() - start_time
                return LLMResponse(
                    text=faq["answer"],
                    session_id=session_id,
                    mode="faq",
                    response_time=response_time
                )
        
        # Generate marketing response with session context
        messages = session_manager.get_messages_for_llm(session_id)
        response = generate_marketing_response(text, temperature=temperature)
        
        # Add response to session
        session_manager.add_message(session_id, "assistant", response.strip())
        
        response_time = time.time() - start_time
        return LLMResponse(
            text=response,
            session_id=session_id,
            mode="marketing",
            response_time=response_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Marketing generation failed: {str(e)}")

@router.post("/generate/chat")
async def generate_marketing_chat(req: QueryRequest, temperature: Optional[float] = 0.7):
    """
    Generate marketing response with full chat context and business context.
    """
    try:
        start_time = time.time()
        text = req.text or ""
        business_context = req.business_context or ""
        
        # Get or create session
        session_id = req.session_id
        if not session_id:
            session_id = session_manager.create_session("outbound")
        
        # Add user message to session
        session_manager.add_message(session_id, "user", text)
        
        # Try FAQ fallback for short simple queries
        if len(text.split()) < 8:
            faq = search_faq(text)
            if faq:
                session_manager.add_message(session_id, "assistant", faq["answer"])
                response_time = time.time() - start_time
                return LLMResponse(
                    text=faq["answer"],
                    session_id=session_id,
                    mode="faq",
                    response_time=response_time
                )
        
        # Generate marketing response with chat context
        messages = session_manager.get_messages_for_llm(session_id)
        response = generate_marketing_chat_response_stream(messages, business_context, temperature)
        
        # For non-streaming, collect all chunks
        full_response = ""
        for chunk in response:
            full_response += chunk
        
        # Add response to session
        session_manager.add_message(session_id, "assistant", full_response.strip())
        
        response_time = time.time() - start_time
        return LLMResponse(
            text=full_response.strip(),
            session_id=session_id,
            mode="marketing",
            response_time=response_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Marketing chat generation failed: {str(e)}")

@router.get("/stream")
async def marketing_stream(session_id: str, temperature: Optional[float] = 0.7):
    """
    SSE streaming endpoint for marketing generation with session context.
    """
    try:
        # Check if session exists
        session_messages = session_manager.get_session(session_id)
        if not session_messages:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages in LLM format
        messages = session_manager.get_messages_for_llm(session_id)
        
        async def sse():
            try:
                full_response = ""
                # Stream marketing response with session context
                for chunk in generate_marketing_chat_response_stream(messages, "", temperature):
                    full_response += chunk
                    # SSE format: "data: {json}\n\n"
                    chunk_data = StreamingChunk(
                        chunk=chunk,
                        session_id=session_id,
                        finished=False
                    )
                    yield f"data: {chunk_data.json()}\n\n"
                
                # Add final response to session
                session_manager.add_message(session_id, "assistant", full_response.strip())
                
                # Send finished signal
                final_chunk = StreamingChunk(
                    chunk="",
                    session_id=session_id,
                    finished=True
                )
                yield f"data: {final_chunk.json()}\n\n"
                
            except Exception as e:
                # Send error as SSE
                error_data = ErrorResponse(
                    error="streaming_error",
                    message=str(e)
                )
                yield f"data: {error_data.json()}\n\n"
        
        return StreamingResponse(sse(), media_type="text/event-stream")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Marketing streaming failed: {str(e)}")

@router.post("/query")
async def handle_marketing_query(req: QueryRequest, temperature: Optional[float] = 0.7):
    """
    Handle marketing query with session context.
    Returns streaming endpoint info for real-time responses.
    """
    try:
        start_time = time.time()
        text = req.text or ""
        
        # Get or create session
        session_id = req.session_id
        if not session_id:
            session_id = session_manager.create_session("outbound")
        
        # Add user message to session
        session_manager.add_message(session_id, "user", text)
        
        # Try FAQ fallback for short simple queries
        if len(text.split()) < 8:
            faq = search_faq(text)
            if faq:
                session_manager.add_message(session_id, "assistant", faq["answer"])
                response_time = time.time() - start_time
                return LLMResponse(
                    text=faq["answer"],
                    session_id=session_id,
                    mode="faq",
                    response_time=response_time
                )
        
        # Return streaming endpoint info
        response_time = time.time() - start_time
        return JSONResponse({
            "mode": "marketing",
            "message": "Connect to streaming endpoint for marketing response",
            "session_id": session_id,
            "stream_url": f"/api/marketing/stream?session_id={session_id}",
            "response_time": response_time
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Marketing query processing failed: {str(e)}")