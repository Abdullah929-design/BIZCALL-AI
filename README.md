# Cold Email Automation Module — Engineering Reference & Tenancy Guide

## 1. System Overview
This module integrates an n8n cold email automation pipeline (3 live workflows deployed on Oracle Cloud) into the FastAPI backend and React frontend.

* **Workflow 1**: Cold Email Batch Sending (`POST /webhook/send-batch`) via Brevo.
* **Workflow 2**: Gmail Reply Monitor (Polling every 1m, AI Sentiment via Gemini into HOT, NEUTRAL, FAILED).
* **Workflow 3**: Manual Reply Dispatch (`POST /webhook/send-reply`).
* **Database / CRM**: Google Sheets ("Email Automation CRM") with 5 tabs: `Leads`, `Hot Leads`, `Neutral Queue`, `Failed Leads`, `Analytics`.

---

## 2. Multi-Tenancy Architecture & Privacy Rules

### Non-Negotiable Rule: Server-Derived Identity
* `user_id` is **NEVER** accepted from the client / browser in any request body or query string.
* Every endpoint in `/api/cold-email/*` resolves `user_id` exclusively from the verified Supabase JWT Bearer token (`Depends(get_current_user)`).
* All Google Sheet reads (`sheets_client.py`) execute server-side filtering:
  ```python
  if row_user_id != user_id:
      continue
  ```
  Unfiltered rows are **never** returned to the browser.

### Defense-in-Depth for Replies
* Before `send_reply` forwards a reply payload to n8n Workflow 3, the backend verifies that the specified `lead_id` or `lead_email` actually exists in the authenticated tenant's `Hot Leads` or `Neutral Queue`.

### Rate-Limiting / Debounce
* `POST /api/cold-email/send-batch` enforces a server-side cooldown window per user to prevent duplicate batch triggers and race conditions.

---

## 3. Known Residual Risk (Workflow 2 Inherited Limitation)

> [!WARNING]
> **Workflow 2 (Gmail Reply Monitor) Email-Only Lookup Risk:**
> Workflow 2 (running on the n8n instance) matches incoming Gmail replies against the `Leads` sheet by contact email address only, rather than `(email + user_id)`.
> If two different tenants in the system ever contact the identical lead email address, incoming replies will match the first occurrence in the sheet.
> *Status*: Inherited MVP limitation of Workflow 2's n8n design. If multi-tenant collision becomes an issue in production, update Workflow 2's lookup node in n8n to filter by `(email AND user_id)`.

---

## 4. Secret Storage & Isolation
* `N8N_API_KEY`, `N8N_BASE_URL`, and Google Service Account credentials (`GOOGLE_SERVICE_ACCOUNT_JSON`) are strictly stored server-side in `api/.env` and `api/secrets/`.
* Neither secret is ever exposed to the client, logged, or included in client bundle builds.
* Git tracking for service accounts is blocked via `.gitignore`.
