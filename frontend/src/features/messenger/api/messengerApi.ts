// frontend/src/features/messenger/api/messengerApi.ts
import axios from 'axios';
// @ts-ignore
import { supabase } from '../../../services/supabaseClient';
import type {
    HotLeadDraftItem,
    MessengerScheduledCall,
    MessengerLead,
    MessengerCampaign,
    MessengerStats,
    ConnectedFacebookPage
} from '../types';

const N8N_BASE_URL = 'https://130-210-37-190.nip.io';

interface SupabaseLeadRow {
    id: string;
    psid: string;
    name: string;
}

// --- 1. Fetch Hot Leads Queue (Drafts) ---
export const fetchHotLeadDrafts = async (userId: string): Promise<HotLeadDraftItem[]> => {
    // 1. Fetch messages where classification = 'hot_draft'
    const { data: drafts, error: draftsErr } = await supabase
        .from('messenger_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('classification', 'hot_draft')
        .order('sent_at', { ascending: false });

    if (draftsErr || !drafts) {
        console.error('Error fetching hot drafts:', draftsErr);
        return [];
    }

    if (drafts.length === 0) return [];

    const leadIds = [...new Set((drafts as any[]).map((d: any) => d.lead_id))];

    // 2. Join with messenger_leads to get real PSID and name
    const { data: leads } = await supabase
        .from('messenger_leads')
        .select('id, psid, name')
        .in('id', leadIds);

    const leadMap = new Map<string, SupabaseLeadRow>();
    ((leads as SupabaseLeadRow[]) || []).forEach((l: SupabaseLeadRow) => {
        leadMap.set(l.id, l);
    });

    // 3. Fetch latest inbound messages for context
    const { data: inbounds } = await supabase
        .from('messenger_messages')
        .select('lead_id, body, sent_at')
        .in('lead_id', leadIds)
        .eq('direction', 'inbound')
        .order('sent_at', { ascending: false });

    const inboundMap = new Map<string, string>();
    ((inbounds as any[]) || []).forEach((inMsg: any) => {
        if (!inboundMap.has(inMsg.lead_id)) {
            inboundMap.set(inMsg.lead_id, inMsg.body);
        }
    });

    return (drafts as any[]).map((d: any) => {
        const lead = leadMap.get(d.lead_id);
        return {
            draft_message_id: d.id,
            lead_id: d.lead_id,
            psid: lead?.psid || '',
            lead_name: lead?.name || 'Unknown Facebook User',
            draft_body: d.body,
            inbound_body: inboundMap.get(d.lead_id) || 'No incoming text available',
            created_at: d.created_at,
            send_status: 'idle'
        };
    });
};

// --- 2. Send Human Reply via WF4 & Poll for Confirmation ---
export const sendReplyWF4 = async (params: {
    userId: string;
    leadId: string;
    psid: string;
    message: string;
    draftMessageId: string;
}): Promise<void> => {
    if (!params.psid || params.psid.startsWith('TEST_')) {
        throw new Error('Cannot send message: Invalid or fake Facebook PSID. A real Facebook user must message the Page first.');
    }

    const payload = {
        user_id: params.userId,
        lead_id: params.leadId,
        psid: params.psid,
        message: params.message,
        draft_message_id: params.draftMessageId
    };

    // WF4 returns immediate 200 before Meta delivers
    await axios.post(`${N8N_BASE_URL}/webhook/messenger-send-reply`, payload);
};

// Polls Supabase every 2.5s for up to 15s to confirm classification flipped to 'sent_draft'
export const pollDraftConfirmation = async (draftMessageId: string): Promise<boolean> => {
    const maxAttempts = 6;
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(res => setTimeout(res, 2500));
        const { data } = await supabase
            .from('messenger_messages')
            .select('classification')
            .eq('id', draftMessageId)
            .single();

        if (data?.classification === 'sent_draft') {
            return true;
        }
    }
    return false;
};

// --- 3. Launch Campaign via WF1 ---
export const launchCampaignWF1 = async (params: {
    userId: string;
    campaignName?: string;
    messageBody: string;
    followUpDelayMins: number;
    leads: Array<{ psid: string; name: string }>;
}): Promise<string> => {
    const campaignId = crypto.randomUUID();

    // 1. Create client-side campaign record in Supabase
    const { error: campErr } = await supabase.from('messenger_campaigns').insert({
        id: campaignId,
        user_id: params.userId,
        message_body: params.messageBody,
        follow_up_delay_mins: params.followUpDelayMins,
        status: 'draft'
    });

    if (campErr) {
        console.error('Error creating campaign record:', campErr);
        throw new Error(`Failed to create campaign in Supabase: ${campErr.message}`);
    }


    // 2. Dispatch to WF1
    const payload = {
        user_id: params.userId,
        campaign_id: campaignId,
        message_body: params.messageBody,
        follow_up_delay_mins: params.followUpDelayMins,
        leads: params.leads
    };

    await axios.post(`${N8N_BASE_URL}/webhook/messenger-launch-campaign`, payload);
    return campaignId;
};

// --- 4. Scheduled Calls / Sensitive Escalations ---
export const fetchScheduledCalls = async (userId: string): Promise<MessengerScheduledCall[]> => {
    const { data: calls, error } = await supabase
        .from('messenger_scheduled_calls')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: false });

    if (error || !calls) return [];

    const leadIds = (calls as any[]).map((c: any) => c.lead_id);
    const { data: leads } = await supabase
        .from('messenger_leads')
        .select('id, name, psid')
        .in('id', leadIds);

    const leadMap = new Map<string, SupabaseLeadRow>();
    ((leads as SupabaseLeadRow[]) || []).forEach((l: SupabaseLeadRow) => {
        leadMap.set(l.id, l);
    });

    return (calls as any[]).map((c: any) => ({
        ...c,
        lead_name: leadMap.get(c.lead_id)?.name || 'Unknown Lead',
        psid: leadMap.get(c.lead_id)?.psid || ''
    }));
};

export const completeScheduledCall = async (callId: string): Promise<void> => {
    // 1. Mark scheduled call completed and return lead_id
    const { data } = await supabase
        .from('messenger_scheduled_calls')
        .update({ status: 'completed' })
        .eq('id', callId)
        .select('lead_id')
        .single();

    // 2. Reset lead_status in messenger_leads back to 'no_reply' so future messages are classified by AI
    if (data?.lead_id) {
        await supabase
            .from('messenger_leads')
            .update({ lead_status: 'no_reply' })
            .eq('id', data.lead_id);
    }
};

// --- 5. Messenger Leads & Analytics ---
export const fetchMessengerLeads = async (userId: string): Promise<MessengerLead[]> => {
    const { data, error } = await supabase
        .from('messenger_leads')
        .select('*')
        .eq('user_id', userId)
        .order('last_contacted_at', { ascending: false });

    if (error || !data) return [];
    return data as MessengerLead[];
};

export const fetchMessengerCampaigns = async (userId: string): Promise<MessengerCampaign[]> => {
    const { data } = await supabase
        .from('messenger_campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    return (data || []) as MessengerCampaign[];
};

export const fetchMessengerStats = async (userId: string): Promise<MessengerStats> => {
    const [leads, campaigns] = await Promise.all([
        fetchMessengerLeads(userId),
        fetchMessengerCampaigns(userId)
    ]);

    return {
        total_campaigns: campaigns.length,
        total_leads: leads.length,
        hot_leads: leads.filter(l => l.lead_status === 'hot').length,
        no_reply_leads: leads.filter(l => l.lead_status === 'no_reply').length,
        uninterested_leads: leads.filter(l => l.lead_status === 'uninterested').length,
        sensitive_leads: leads.filter(l => l.lead_status === 'sensitive').length,
        archived_leads: leads.filter(l => l.lead_status === 'archived').length
    };
};

// --- 6. Connected Facebook Page (Multi-Tenant) ---
export const fetchConnectedFacebookPage = async (userId: string): Promise<ConnectedFacebookPage | null> => {
    const { data, error } = await supabase
        .from('facebook_pages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;
    return data as ConnectedFacebookPage;
};

export const saveConnectedFacebookPage = async (params: {
    userId: string;
    pageId: string;
    pageName?: string;
    pageAccessToken: string;
}): Promise<ConnectedFacebookPage> => {
    // Check if user already has a page connected
    const existing = await fetchConnectedFacebookPage(params.userId);

    if (existing) {
        // Update existing connection
        const { data, error } = await supabase
            .from('facebook_pages')
            .update({
                page_id: params.pageId.trim(),
                page_name: params.pageName?.trim() || 'Connected Facebook Page',
                page_access_token: params.pageAccessToken.trim()
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw new Error(`Failed to update page connection: ${error.message}`);
        return data as ConnectedFacebookPage;
    } else {
        // Insert new connection
        const { data, error } = await supabase
            .from('facebook_pages')
            .insert({
                user_id: params.userId,
                page_id: params.pageId.trim(),
                page_name: params.pageName?.trim() || 'Connected Facebook Page',
                page_access_token: params.pageAccessToken.trim()
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to save page connection: ${error.message}`);
        return data as ConnectedFacebookPage;
    }
};

export const disconnectFacebookPage = async (pageDbId: string): Promise<void> => {
    const { error } = await supabase
        .from('facebook_pages')
        .delete()
        .eq('id', pageDbId);

    if (error) throw new Error(`Failed to disconnect page: ${error.message}`);
};
