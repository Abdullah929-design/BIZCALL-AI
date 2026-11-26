// frontend/src/features/cold-email/api/coldEmailApi.ts
// @ts-ignore
import { supabase } from '../../../services/supabaseClient';
import type { ColdEmailLead, SendReplyPayload, EmailChannel, GmailConnectionStatus } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

async function getAuthHeaders(): Promise<HeadersInit> {
    let { data: { session } } = await supabase.auth.getSession();
    const isExpiringSoon =
        !session?.access_token ||
        (typeof session.expires_at === 'number' && session.expires_at * 1000 < Date.now() + 60_000);

    if (isExpiringSoon) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed?.session) {
            session = refreshed.session;
        }
    }

    const token = session?.access_token || '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

export async function uploadBulkCsv(file: File): Promise<{ success: boolean; count: number; message: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/cold-email/leads/bulk-csv`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formData
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to import CSV");
    }
    return res.json();
}

export async function createLead(leadData: Partial<ColdEmailLead>): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/leads`, {
        method: "POST",
        headers,
        body: JSON.stringify(leadData)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create lead");
    }
    return res.json();
}

export async function updateLead(rowNumber: number, leadData: Partial<ColdEmailLead>): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/leads/${rowNumber}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(leadData)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update lead");
    }
    return res.json();
}

export async function deleteLead(rowNumber: number): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/leads/${rowNumber}`, {
        method: "DELETE",
        headers
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete lead");
    }
    return res.json();
}

export async function sendBatch(campaign?: { subject?: string; message?: string; channel?: EmailChannel }): Promise<{ status: string; channel?: EmailChannel; sender_inbox?: string; n8n_response: any }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/send-batch`, {
        method: "POST",
        headers,
        body: JSON.stringify(campaign || { channel: 'managed' })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to start batch send");
    }
    return res.json();
}

export interface DashboardBundleData {
    leads: ColdEmailLead[];
    hot_leads: ColdEmailLead[];
    neutral_leads: ColdEmailLead[];
    failed_leads: ColdEmailLead[];
}

export async function fetchDashboardBundle(force: boolean = false, channel: EmailChannel = 'managed'): Promise<DashboardBundleData> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (force) params.set("force", "true");
    params.set("channel", channel);
    const url = `${API_BASE}/api/cold-email/bundle?${params.toString()}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
        if (res.status === 401) {
            const err = new Error("Authentication session expired or invalid");
            err.name = "AuthError";
            throw err;
        }
        throw new Error("Failed to load dashboard bundle");
    }
    const json = await res.json();
    return json.data || { leads: [], hot_leads: [], neutral_leads: [], failed_leads: [] };
}

export async function fetchLeads(status?: string): Promise<ColdEmailLead[]> {
    const headers = await getAuthHeaders();
    const url = status
        ? `${API_BASE}/api/cold-email/leads?status=${encodeURIComponent(status)}`
        : `${API_BASE}/api/cold-email/leads`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Failed to load leads");
    const json = await res.json();
    return json.data || [];
}

export async function fetchHotLeads(): Promise<ColdEmailLead[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/hot-leads`, { headers });
    if (!res.ok) throw new Error("Failed to load hot leads");
    const json = await res.json();
    return json.data || [];
}

export async function fetchNeutralQueue(): Promise<ColdEmailLead[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/neutral-leads`, { headers });
    if (!res.ok) throw new Error("Failed to load neutral queue");
    const json = await res.json();
    return json.data || [];
}

export async function fetchFailedLeads(): Promise<ColdEmailLead[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/failed-leads`, { headers });
    if (!res.ok) throw new Error("Failed to load failed leads");
    const json = await res.json();
    return json.data || [];
}

export async function sendReply(payload: SendReplyPayload): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/send-reply`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to send reply");
    }
    return res.json();
}

export async function fetchGmailStatus(): Promise<GmailConnectionStatus> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/gmail/status`, { headers });
    if (!res.ok) return { connected: false, gmail_address: null };
    return res.json();
}

export async function connectGmail(gmail_address: string, app_password: string): Promise<GmailConnectionStatus> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/gmail/connect`, {
        method: "POST",
        headers,
        body: JSON.stringify({ gmail_address, app_password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to connect Gmail");
    }
    return res.json();
}

export async function disconnectGmail(): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/gmail/disconnect`, {
        method: "DELETE",
        headers,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to disconnect Gmail");
    }
}

export async function syncGmailInbox(): Promise<{ synced: number; new_replies: number }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/cold-email/gmail/sync`, {
        method: "POST",
        headers,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to sync Gmail inbox");
    }
    return res.json();
}
