import uuid
from typing import Dict, List, Optional
from datetime import datetime
import json

from api.schemas import ChatMessage, SessionInfo

class SessionManager:
    def __init__(self):
        # In production, use Redis or database for persistence
        self.sessions: Dict[str, List[ChatMessage]] = {}
        self.session_metadata: Dict[str, Dict] = {}
    
    def create_session(self, call_type: str = "inbound") -> str:
        """Create a new session and return session ID"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = []
        
        # Add system message based on call type
        if call_type == "inbound":
            system_prompt = (
                "You are a professional banking call-centre support agent. "
                "Answer customer questions thoroughly and helpfully. "
                "If a 'Knowledge base answer' is provided in the message, use it as your "
                "primary source and summarise the key facts clearly. "
                "If no knowledge base answer is provided, draw on your general banking "
                "knowledge to give a clear, accurate answer — never say you don't have "
                "information. Avoid repeating 'In many cases' or 'In some cases'. "
                "Be direct, specific, and professional."
            )
        else:  # outbound marketing
            system_prompt = "You are a professional outbound marketing agent. Engage potential customers, handle objections gracefully, and guide them toward your products/services."
        
        self.sessions[session_id].append(ChatMessage(
            role="system",
            content=system_prompt,
            timestamp=datetime.now().isoformat()
        ))
        
        self.session_metadata[session_id] = {
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "call_type": call_type
        }
        
        return session_id
    
    def get_session(self, session_id: str) -> Optional[List[ChatMessage]]:
        """Get session messages by ID"""
        return self.sessions.get(session_id)
    
    def add_message(self, session_id: str, role: str, content: str) -> bool:
        """Add a message to the session"""
        if session_id not in self.sessions:
            return False
        
        self.sessions[session_id].append(ChatMessage(
            role=role,
            content=content,
            timestamp=datetime.now().isoformat()
        ))
        
        # Update metadata
        self.session_metadata[session_id]["last_updated"] = datetime.now().isoformat()
        return True
    
    def get_session_info(self, session_id: str) -> Optional[SessionInfo]:
        """Get complete session information"""
        if session_id not in self.sessions:
            return None
        
        metadata = self.session_metadata.get(session_id, {})
        return SessionInfo(
            session_id=session_id,
            messages=self.sessions[session_id],
            created_at=metadata.get("created_at"),
            last_updated=metadata.get("last_updated")
        )
    
    def clear_session(self, session_id: str, call_type: str = "inbound") -> bool:
        """Clear session messages but keep system prompt"""
        if session_id not in self.sessions:
            return False
        
        # Keep only the system message
        system_messages = [msg for msg in self.sessions[session_id] if msg.role == "system"]
        self.sessions[session_id] = system_messages
        
        # Update metadata
        self.session_metadata[session_id]["last_updated"] = datetime.now().isoformat()
        return True
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session completely"""
        if session_id in self.sessions:
            del self.sessions[session_id]
        if session_id in self.session_metadata:
            del self.session_metadata[session_id]
        return True
    
    def get_messages_for_llm(self, session_id: str) -> List[Dict[str, str]]:
        """Convert session messages to LLM format"""
        messages = self.get_session(session_id)
        if not messages:
            return []
        
        return [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
    
    def get_session_count(self) -> int:
        """Get total number of active sessions"""
        return len(self.sessions)
    
    def set_business_context(self, session_id: str, business_context: str) -> bool:
        """Store business context for a session"""
        if session_id not in self.session_metadata:
            return False
        
        self.session_metadata[session_id]["business_context"] = business_context
        return True
    
    def get_business_context(self, session_id: str) -> Optional[str]:
        """Get business context for a session"""
        if session_id not in self.session_metadata:
            return None
        
        return self.session_metadata[session_id].get("business_context", "")

# Global session manager instance
session_manager = SessionManager()

