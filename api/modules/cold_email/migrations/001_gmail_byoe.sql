-- Migration: Personal Gmail BYOE (SMTP/IMAP) Support for Cold Email CRM
-- Run this once in Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS public.user_gmail_connections (
    user_id UUID PRIMARY KEY,
    gmail_address TEXT NOT NULL,
    encrypted_app_password TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gmail_crm_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lead_id TEXT,
    name TEXT DEFAULT '',
    email TEXT NOT NULL,
    company TEXT DEFAULT '',
    classification TEXT NOT NULL CHECK (classification IN ('hot', 'neutral', 'failed')),
    reply_body TEXT DEFAULT '',
    reply_summary TEXT DEFAULT '',
    draft_reply TEXT DEFAULT '',
    confidence INTEGER DEFAULT 0,
    rejection_reason TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    message_id TEXT NOT NULL,
    human_action TEXT DEFAULT '',
    actioned_at TIMESTAMPTZ,
    classified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_gmail_crm_replies_user_class
    ON public.gmail_crm_replies (user_id, classification, classified_at DESC);
