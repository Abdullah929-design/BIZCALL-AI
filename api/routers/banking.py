from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Form, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional
import asyncio
import json
import time
import sys
import os

# Add parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from schemas import (
    QueryRequest, IntentDetectionResponse, FAQResult, LLMResponse, 
    ErrorResponse, SessionInfo, StreamingResponse as StreamingChunk
)
from services.intent_detector import predict_multiple_intents
from services.session_manager import session_manager
from faq_engine.faiss_search import search_faq
from llm_complex_path.llm_inference import generate_llm_response_chat_stream, generate_llm_response_chat
from classification import SIMPLE_INTENTS

router = APIRouter()

@router.post("/detect", response_model=IntentDetectionResponse)
async def detect_intents(req: QueryRequest):
    """
    Detect multiple intents and return segments + complexity.
    """
    try:
        text = req.text or ""
        results, complexity = predict_multiple_intents(text)
        detected = []
        for seg in results:
            detected.extend([i["intent"] for i in seg["intents"]])
        
        return IntentDetectionResponse(
            segments=results, 
            complexity=complexity, 
            detected_intents=list(dict.fromkeys(detected)),
            session_id=req.session_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intent detection failed: {str(e)}")

@router.post("/session/create")
async def create_session(call_type: str = "inbound"):
    """Create a new session for banking calls"""
    try:
        session_id = session_manager.create_session(call_type)
        return {"session_id": session_id, "call_type": call_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session creation failed: {str(e)}")

@router.get("/session/{session_id}", response_model=SessionInfo)
async def get_session(session_id: str):
    """Get session information"""
    session_info = session_manager.get_session_info(session_id)
    if not session_info:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_info

@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear session messages"""
    success = session_manager.clear_session(session_id, "inbound")
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session cleared successfully"}

@router.post("/query")
async def handle_query(req: QueryRequest):
    """
    Single endpoint that:
    - runs intent detection
    - if simple primary intent and FAQ found -> return FAQ
    - otherwise -> stream LLM response with session context
    """
    try:
        start_time = time.time()
        text = req.text or ""
        
        # Get or create session
        session_id = req.session_id
        if not session_id:
            session_id = session_manager.create_session("inbound")
        
        # Add user message to session
        session_manager.add_message(session_id, "user", text)
        
        # Run intent detection
        results, complexity = predict_multiple_intents(text)
        
        # Check for FAQ response for simple intents
        if complexity == "simple":
            for seg in results:
                if seg["intents"]:
                    primary = seg["intents"][0]["intent"]
                    if primary in SIMPLE_INTENTS:
                        faq = search_faq(seg["text"], predicted_intent=primary)
                        if faq:
                            # Add FAQ response to session
                            session_manager.add_message(session_id, "assistant", 
                                f"FAQ Answer for {primary}: {faq['answer']}")
                            
                            response_time = time.time() - start_time
                            return JSONResponse({
                                "mode": "faq",
                                "faq": {
                                    "answer": faq["answer"],
                                    "confidence": faq["confidence"],
                                    "intent": faq["intent"],
                                    "priority": faq["priority"],
                                    "pii": faq["pii"],
                                    "authentication_required": faq["authentication_required"]
                                },
                                "session_id": session_id,
                                "segments": results,
                                "complexity": complexity,
                                "response_time": response_time
                            })
        
        # For complex queries or simple without FAQ, return streaming endpoint info
        response_time = time.time() - start_time
        return JSONResponse({
            "mode": "llm",
            "message": "Connect to streaming endpoint for LLM response",
            "session_id": session_id,
            "segments": results,
            "complexity": complexity,
            "stream_url": f"/api/banking/stream?session_id={session_id}",
            "response_time": response_time
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")

@router.get("/stream")
async def banking_stream(session_id: str):
    """
    SSE streaming endpoint with session context.
    Connect from frontend with EventSource("/api/banking/stream?session_id=...")
    """
    try:
        # Check if session exists
        session_messages = session_manager.get_session(session_id)
        if not session_messages:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages in LLM format
        messages = session_manager.get_messages_for_llm(session_id)
        
        # Enhanced RAG for complex queries - Phase 1
        rag_context_added = False
        rag_confidence = 0.0
        rag_intent = None
        if messages:
            # Get the last user message for RAG search
            last_user_message = ""
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    last_user_message = msg.get("content", "")
                    break
            
            if last_user_message:
                # Search FAQ for relevant context
                faq = search_faq(last_user_message)
                if faq and faq['confidence'] >= 0.10:
                    # 450 chars — enough for 2-3 specific factual points
                    MAX_FAQ_CHARS = 450
                    faq_text = faq['answer']
                    if len(faq_text) > MAX_FAQ_CHARS:
                        faq_text = faq_text[:MAX_FAQ_CHARS].rsplit(' ', 1)[0] + "\u2026"

                    # Plain labelled format — NO bracket tags.
                    # Bracket/markdown tags leak into output on small models;
                    # plain labels are treated as context, not as text to continue.
                    grounded_content = (
                        f"Knowledge base answer: {faq_text}\n\n"
                        f"Customer question: {last_user_message}"
                    )
                    for i in reversed(range(len(messages))):
                        if messages[i].get("role") == "user":
                            messages[i] = {"role": "user", "content": grounded_content}
                            break
                    rag_context_added = True
                    rag_confidence = faq['confidence']
                    rag_intent = faq['intent']
        
        async def sse():
            try:
                full_response = ""
                # Send initial chunk with RAG info
                rag_info_chunk = StreamingChunk(
                    chunk="",
                    session_id=session_id,
                    finished=False,
                    rag_confidence=rag_confidence if rag_context_added else None,
                    rag_intent=rag_intent if rag_context_added else None,
                    rag_context_used=rag_context_added
                )
                yield f"data: {rag_info_chunk.json()}\n\n"
                
                # Stream LLM response with session context and RAG
                for chunk in generate_llm_response_chat_stream(messages, temperature=0.25):
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
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")

@router.post("/query/sync")
async def handle_query_sync(req: QueryRequest):
    """
    Non-streaming version for clients that prefer blocking responses.
    """
    try:
        start_time = time.time()
        text = req.text or ""
        
        # Get or create session
        session_id = req.session_id
        if not session_id:
            session_id = session_manager.create_session("inbound")
        
        # Add user message to session
        session_manager.add_message(session_id, "user", text)
        
        # Run intent detection
        results, complexity = predict_multiple_intents(text)
        
        # Check for FAQ response
        if complexity == "simple":
            for seg in results:
                if seg["intents"]:
                    primary = seg["intents"][0]["intent"]
                    if primary in SIMPLE_INTENTS:
                        faq = search_faq(seg["text"], predicted_intent=primary)
                        if faq:
                            session_manager.add_message(session_id, "assistant", 
                                f"FAQ Answer for {primary}: {faq['answer']}")
                            
                            response_time = time.time() - start_time
                            return LLMResponse(
                                text=f"FAQ Answer for {primary}: {faq['answer']}",
                                session_id=session_id,
                                mode="faq",
                                response_time=response_time
                            )
        
        # Generate LLM response with enhanced RAG
        messages = session_manager.get_messages_for_llm(session_id)
        
        # Enhanced RAG for complex queries - Phase 1 (same as stream)
        if messages:
            # Get the last user message for RAG search
            last_user_message = ""
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    last_user_message = msg.get("content", "")
                    break
            
            if last_user_message:
                # Search FAQ for relevant context
                faq = search_faq(last_user_message)
                if faq and faq['confidence'] >= 0.10:  # Reduced threshold to 10% for testing
                    # Add FAQ context to messages for better LLM response
                    rag_context = f"Relevant banking information: {faq['answer']}"
                    messages.insert(0, {"role": "system", "content": rag_context})
        
        response = generate_llm_response_chat(messages, temperature=0.25)
        
        # Add response to session
        session_manager.add_message(session_id, "assistant", response.strip())
        
        response_time = time.time() - start_time
        return LLMResponse(
            text=response,
            session_id=session_id,
            mode="llm",
            response_time=response_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")