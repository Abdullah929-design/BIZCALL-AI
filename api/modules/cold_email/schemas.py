# api/modules/cold_email/schemas.py
from pydantic import BaseModel
from typing import Optional

class SendReplyRequest(BaseModel):
    lead_id: str
    lead_email: str
    subject: str
    message: str
    # NOTE: no user_id field here on purpose — derived exclusively on server

class SendBatchRequest(BaseModel):
    subject: Optional[str] = None
    message: Optional[str] = None
    content: Optional[str] = None

class LeadItem(BaseModel):
    row_number: int
    name: Optional[str] = ""
    email: Optional[str] = ""
    company: Optional[str] = ""
    status: Optional[str] = ""
    sent_at: Optional[str] = ""
    reply_content: Optional[str] = ""

class CreateLeadRequest(BaseModel):
    name: Optional[str] = ""
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    email: str
    company: Optional[str] = ""
    title: Optional[str] = ""
    industry: Optional[str] = ""
    notes: Optional[str] = ""
    status: Optional[str] = "pending"

class UpdateLeadRequest(BaseModel):
    row_number: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    industry: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

