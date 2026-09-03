// frontend/src/features/cold-email/types.ts

export interface ColdEmailLead {
    _row_number: number;
    user_id?: string;
    lead_id?: string;
    name?: string;
    email?: string;
    company?: string;
    status?: string;
    sent_at?: string;
    reply_content?: string;
    replied_at?: string;
    classification?: string;
    thread_id?: string;
    reply_summary?: string;
    draft_reply?: string;
    confidence?: string | number;
    gmail_thread_id?: string;
    human_action?: string;
    actioned_at?: string;
    rejection_reason?: string;
    classified_at?: string;
    [key: string]: any;
}

export interface SendReplyPayload {
    lead_id: string;
    lead_email: string;
    subject: string;
    message: string;
}
