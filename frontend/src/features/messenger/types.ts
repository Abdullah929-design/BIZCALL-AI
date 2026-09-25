// frontend/src/features/messenger/types.ts

export type LeadStatus = 'no_reply' | 'hot' | 'uninterested' | 'sensitive' | 'archived';

export type MessageClassification =
    | 'hot'
    | 'hot_draft'
    | 'sent_draft'
    | 'human_reply'
    | 'followup'
    | 'uninterested'
    | 'sensitive'
    | null;

export interface MessengerCampaign {
    id: string;
    user_id: string;
    name?: string;
    message_body?: string;
    follow_up_delay_mins?: number;
    status: 'draft' | 'active' | 'completed' | 'paused';
    created_at: string;
}


export interface MessengerLead {
    id: string;
    user_id: string;
    campaign_id?: string;
    psid: string;
    name: string;
    lead_status: LeadStatus;
    follow_up_count: number;
    last_contacted_at: string;
    follow_up_delay_mins?: number;
    lead_last_messaged_at?: string | null;
    follow_up_sent_at?: string | null;
}

export interface MessengerMessage {
    id: string;
    lead_id: string;
    user_id: string;
    direction: 'inbound' | 'outbound' | 'draft';
    classification: MessageClassification;
    body: string;
    created_at: string;
}

export interface HotLeadDraftItem {
    draft_message_id: string;
    lead_id: string;
    psid: string;
    lead_name: string;
    draft_body: string;
    inbound_body?: string;
    created_at: string;
    send_status?: 'idle' | 'sending' | 'confirmed' | 'failed';
    lead_last_messaged_at?: string | null;
    follow_up_sent_at?: string | null;
}

export interface MessengerScheduledCall {
    id: string;
    user_id: string;
    lead_id: string;
    lead_name?: string;
    psid?: string;
    reason: string;
    lead_message: string;
    status: 'pending' | 'completed';
    created_at?: string;
    scheduled_at?: string;
}

export interface MessengerStats {
    total_campaigns: number;
    total_leads: number;
    hot_leads: number;
    no_reply_leads: number;
    uninterested_leads: number;
    sensitive_leads: number;
    archived_leads: number;
}

export interface ConnectedFacebookPage {
    id: string;
    user_id: string;
    page_id: string;
    page_name: string;
    page_access_token: string;
    created_at: string;
}

