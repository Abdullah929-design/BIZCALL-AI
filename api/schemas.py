from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

class CallType(str, Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"

class QueryRequest(BaseModel):
    text: Optional[str] = None
    session_id: Optional[str] = None
    call_type: Optional[CallType] = CallType.INBOUND
    business_context: Optional[str] = None  # For marketing outbound calls

class IntentItem(BaseModel):
    intent: str
    confidence: float
    priority: int

class SegmentResult(BaseModel):
    text: str
    primary_intent: Optional[str]
    intents: List[IntentItem]

class IntentDetectionResponse(BaseModel):
    segments: List[SegmentResult]
    complexity: str
    detected_intents: List[str]
    session_id: Optional[str] = None

class FAQResult(BaseModel):
    answer: str
    confidence: float
    intent: str
    priority: int
    pii: bool
    authentication_required: bool

class ChatMessage(BaseModel):
    role: str  # "system", "user", "assistant"
    content: str
    timestamp: Optional[str] = None

class SessionInfo(BaseModel):
    session_id: str
    messages: List[ChatMessage]
    created_at: Optional[str] = None
    last_updated: Optional[str] = None

class LLMResponse(BaseModel):
    text: str
    session_id: Optional[str] = None
    mode: str  # "faq", "llm", "marketing"
    response_time: Optional[float] = None

class StreamingResponse(BaseModel):
    chunk: str
    session_id: Optional[str] = None
    finished: bool = False
    rag_confidence: Optional[float] = None
    rag_intent: Optional[str] = None
    rag_context_used: Optional[bool] = None

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None

# New Twilio Schemas
class InitiateOutboundRequest(BaseModel):
    to_number: str = Field(..., description="E.164 format phone number (+15005550001)")
    business_context: str = Field(..., description="Business context for marketing call")
    instructions: str = Field(..., description="Instructions for LLM behavior during call")

class CallStatusResponse(BaseModel):
    call_sid: str
    status: str  # queued, ringing, in-progress, completed, failed
    from_number: str
    to_number: str
    duration: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class TwilioWebhookPayload(BaseModel):
    CallSid: str
    From: str
    To: str
    CallStatus: Optional[str] = None
    SpeechResult: Optional[str] = None
    Digits: Optional[str] = None