// frontend/src/features/cold-email/api/coldEmailApi.ts
// @ts-ignore
import { supabase } from '../../../services/supabaseClient';
import type { ColdEmailLead, SendReplyPayload } from '../types';

export async function uploadBulkCsv(file: File): Promise<{ success: boolean; count: number; message: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/cold-email/leads/bulk-csv", {
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
    const res = await fetch("/api/cold-email/leads", {
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
    const res = await fetch(`/api/cold-email/leads/${rowNumber}`, {
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
    const res = await fetch(`/api/cold-email/leads/${rowNumber}`, {
        method: "DELETE",
        headers
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete lead");
    }
    return res.json();
}


async function getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

export async function sendBatch(): Promise<{ status: string; n8n_response: any }> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/cold-email/send-batch", { method: "POST", headers });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to start batch send");
    }
    return res.json();
}

export async function fetchLeads(status?: string): Promise<ColdEmailLead[]> {
    const headers = await getAuthHeaders();
    const url = status
        ? `/api/cold-email/leads?status=${encodeURIComponent(status)}`
        : '/api/cold-email/leads';
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Failed to load leads");
    const json = await res.json();
    return json.data || [];
}

export async function fetchHotLeads(): Promise<ColdEmailLead[]> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/cold-email/hot-leads", { headers });
    if (!res.ok) throw new Error("Failed to load hot leads");
    const json = await res.json();
    return json.data || [];
}

export async function fetchNeutralQueue(): Promise<ColdEmailLead[]> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/cold-email/neutral-leads", { headers });
    if (!res.ok) throw new Error("Failed to load neutral queue");
    const json = await res.json();
    return json.data || [];
}

export async function fetchFailedLeads(): Promise<ColdEmailLead[]> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/cold-email/failed-leads", { headers });
    if (!res.ok) throw new Error("Failed to load failed leads");
    const json = await res.json();
    return json.data || [];
}

export async function sendReply(payload: SendReplyPayload): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch("/api/cold-email/send-reply", {
        method: "POST",
        headers,
        body: JSON.stringify(payload), // no user_id here — backend injects it
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to send reply");
    }
    return res.json();
}
