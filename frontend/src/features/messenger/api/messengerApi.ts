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
    lead_last_messaged_at?: string | null;
    follow_up_sent_at?: string | null;
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

    // Deduplicate drafts by lead_id (keep only the latest draft per lead)
    const seenLeads = new Set<string>();
    const deduplicatedDrafts: any[] = [];
    for (const d of (drafts as any[])) {
        if (!seenLeads.has(d.lead_id)) {
            seenLeads.add(d.lead_id);
            deduplicatedDrafts.push(d);
        }
    }

    const leadIds = [...seenLeads];

    // 2. Join with messenger_leads to get real PSID, name, and window timing
    const { data: leads } = await supabase
        .from('messenger_leads')
        .select('id, psid, name, lead_last_messaged_at, follow_up_sent_at')
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

    return deduplicatedDrafts.map((d: any) => {
        const lead = leadMap.get(d.lead_id);
        return {
            draft_message_id: d.id,
            lead_id: d.lead_id,
            psid: lead?.psid || '',
            lead_name: lead?.name || 'Unknown Facebook User',
            draft_body: d.body,
            inbound_body: inboundMap.get(d.lead_id) || 'No incoming text available',
            created_at: d.created_at,
            send_status: 'idle',
            lead_last_messaged_at: lead?.lead_last_messaged_at || null,
            follow_up_sent_at: lead?.follow_up_sent_at || null
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
    followUpDelayMins?: number;
    enable23hFollowUp?: boolean;
    leads: Array<{ psid: string; name: string }>;
}): Promise<string> => {
    const campaignId = crypto.randomUUID();
    const delayMins = params.enable23hFollowUp ? 1380 : (params.followUpDelayMins || 0);

    // Encode campaign name into message_body for DB persistence since table has no name column
    const bodyForDb = params.campaignName?.trim()
        ? `[Campaign: ${params.campaignName.trim()}]\n${params.messageBody}`
        : params.messageBody;

    // 1. Create client-side campaign record in Supabase
    const { error: campErr } = await supabase.from('messenger_campaigns').insert({
        id: campaignId,
        user_id: params.userId,
        message_body: bodyForDb,
        follow_up_delay_mins: delayMins,
        status: 'draft'
    });

    if (campErr) {
        console.error('Error creating campaign record:', campErr);
        throw new Error(`Failed to create campaign in Supabase: ${campErr.message}`);
    }

    // 2. Ensure all recipient leads exist in messenger_leads (native Postgres upsert on unique psid)
    if (params.leads && params.leads.length > 0) {
        const leadsToUpsert = params.leads.map(l => ({
            user_id: params.userId,
            campaign_id: campaignId,
            psid: l.psid,
            name: l.name || 'Lead',
            lead_status: 'no_reply' as const,
            follow_up_count: 0,
            last_contacted_at: new Date().toISOString()
        }));

        const { error: leadsErr } = await supabase
            .from('messenger_leads')
            .upsert(leadsToUpsert, { onConflict: 'psid' });

        if (leadsErr) {
            console.warn('Warning pre-upserting leads in Supabase:', leadsErr);
        }
    }

    // 3. Dispatch clean message body to WF1 (Meta recipients won't see [Campaign: Name] tag)
    const payload = {
        user_id: params.userId,
        campaign_id: campaignId,
        message_body: params.messageBody,
        follow_up_delay_mins: delayMins,
        enable_23h_followup: !!params.enable23hFollowUp,
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

    return ((data || []) as any[]).map((c: any) => {
        let name = 'Messenger Campaign';
        let cleanBody = c.message_body || '';
        const match = cleanBody.match(/^\[Campaign:\s*(.*?)\]\n?/);
        if (match) {
            name = match[1];
            cleanBody = cleanBody.replace(/^\[Campaign:\s*(.*?)\]\n?/, '');
        }
        return {
            ...c,
            name,
            message_body: cleanBody
        };
    });
};

export const calculateMessengerStats = (leads: MessengerLead[], campaigns: MessengerCampaign[]): MessengerStats => {
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

export const fetchMessengerStats = async (userId: string): Promise<MessengerStats> => {
    const [leads, campaigns] = await Promise.all([
        fetchMessengerLeads(userId),
        fetchMessengerCampaigns(userId)
    ]);

    return calculateMessengerStats(leads, campaigns);
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

    const cleanToken = params.pageAccessToken.trim().replace(/^Bearer\s+/i, '');

    if (existing) {
        // Update existing connection
        const { data, error } = await supabase
            .from('facebook_pages')
            .update({
                page_id: params.pageId.trim(),
                page_name: params.pageName?.trim() || 'Connected Facebook Page',
                page_access_token: cleanToken
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
                page_access_token: cleanToken
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
