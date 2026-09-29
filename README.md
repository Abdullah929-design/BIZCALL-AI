# BizCall AI — Enterprise Voice & Multi-Channel Sales Automation Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_|_Vite-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_|_Python_3.10+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Auth_&_DB-Supabase-3ECF8E.svg?style=flat&logo=supabase)](https://supabase.com)
[![Retell AI](https://img.shields.io/badge/Voice_Engine-Retell_AI-5855D6.svg?style=flat)](https://retellai.com)

**BizCall AI** is a multi-tenant enterprise voice and outreach automation platform. It blends sub-second conversational Voice AI (Retell AI & WebRTC), proprietary Small Language Models (fine-tuned Gemma-2B & DistilBERT with FAISS RAG), B2B Google Maps lead scraping, multi-channel Messenger CRM (Groq LLaMA-3), and automated Cold Email pipelines (Oracle Cloud n8n, Brevo, and Gemini sentiment analysis).

Designed with a **Google Stitch Dark Minimalist UI** (`#090a0f` void aesthetic, `Space Grotesk`, `Plus Jakarta Sans`, and `DM Mono` typography).

---

## Architecture & System Overview

```
                                ┌────────────────────────────────────────────────────────┐
                                │                    BIZCALL AI CLIENT                   │
                                │   (React 19 + Vite • Google Stitch Design System)      │
                                └───────────────────────────┬────────────────────────────┘
                                                            │
                                  ┌─────────────────────────┴────────────────────────┐
                                  │ HTTPS / WSS / JWT Bearer Tokens                  │
                                  ▼                                                  ▼
      ┌──────────────────────────────────────────────────────────┐    ┌─────────────────────────────────┐
      │                   FASTAPI CORE BACKEND                   │    │         RETELL AI VOICE         │
      │                  (Python 3.10+ • Port 8002)              │    │  (WebRTC Browser / Twilio PSTN) │
      └──────┬────────────────────┬────────────────────┬─────────┘    └────────────────┬────────────────┘
             │                    │                    │                               │
             ▼                    ▼                    ▼                               ▼
┌───────────────────────┐ ┌───────────────┐ ┌────────────────────────┐  ┌───────────────────────────────┐
│   SUPABASE DATABASE   │ │   MODELS ON   │ │    N8N WORKFLOWS       │  │       TELEPHONY & VOICE       │
│  • JWT Auth & Users   │ │    DEMAND     │ │   (Oracle Cloud VM)    │  │ • Twilio SIP Trunking         │
│  • Profiles & Tenants │ │ • Gemma-2B    │ │ • Brevo Cold Email     │  │ • Sub-second conversational   │
│  • Call Logs & Audio  │ │ • DistilBERT  │ │ • Gemini AI Sentiment  │  │   audio streaming             │
│  • CRM Data           │ │ • FAISS RAG   │ │ • Meta Messenger Groq  │  │ • Real-time Transcripts       │
└───────────────────────┘ └───────────────┘ └────────────────────────┘  └───────────────────────────────┘
```

---

## Core Features & Workspaces

### 1. Cinematic Fullscreen Landing Page
* **Edge-to-Edge Ambient Video**: Features an interactive, looping crystal monolith background video (`100vw × 100vh`) with atmospheric dark gradients and zero player chrome.
* **Top Navigation Bar**: White vector brain emblem logo, `Space Grotesk` branding, and a sleek `LOG IN ↗` button sitting directly on the video.
* **Animated Typography**:
  * *Middle-Left*: *"Voice Calling Automation Platform"* sliding in smoothly from the left boundary.
  * *Middle-Right*: *"Social Media Marketing Automation"* vertically aligned with calibrated entrance timing.
  * *Bottom Surfaces*: *"With customized LLM services"* and *"Customized Automated lead scrapping"* emerging upward from the bottom edges.
* **Seamless Authentication Trigger**: Clicking `LOG IN ↗` reveals the Google Stitch modal without disrupting the video ambience.

### 2. Authentication & Multi-Tenancy Architecture
* **Supabase JWT Integration**: Complete Email/Password Sign In and Sign Up flows with password visibility toggles and active state spinners.
* **Server-Derived Identity (Non-Negotiable)**: `user_id` is never accepted from client payloads. Every protected route resolves tenancy exclusively from verified Supabase JWT Bearer tokens (`Depends(get_current_user)`).
* **Onboarding Wizard**: Unonboarded tenants are routed through a configuration workflow (`OnboardingSplash.jsx`) to establish company profile, industry, and default agent parameters.

### 3. Inbound / Outbound Agent Builder
* **Custom AI Voice Persona**: Configure agent names, language models, system prompts, conversational temperature, voice speed, and interruption sensitivity.
* **Live In-Browser Simulation**: Test voice responses with real-time feedback before deploying to production phone lines.
* **Multi-Channel Fallbacks**: Automatically configure fallback actions for voicemail detection, call transfers, and post-call webhook dispatch.

### 4. Retell Live Calls & Telephony Engine
* **WebRTC Browser Calling**: Direct crystal-clear audio calling in the browser powered by `retell-client-js-sdk`.
* **Twilio Integration**: Dial out to PSTN phone numbers and receive incoming customer calls routed to the AI agent.
* **Real-Time Call Telemetry**: Active call monitor with audio wave visualizer, live status flags (`connecting`, `active`, `ended`), duration timers, and live transcripts.
* **Progressive Call Logs**: Display recent call history (initial 5 records + progressive "+5 show more" pagination) with duration, sentiment, and recording playback.

### 5. Lead Finder & Business Scraper
* **B2B Discovery**: Search local business leads across any industry and city (Google Maps & Apollo API).
* **Contact Enrichment**: Extracts company name, phone numbers, addresses, ratings, and websites.
* **CSV Export & Campaign Sync**: One-click CSV export and direct push to Cold Email and Messenger CRM queues.
* **Progressive Lead Table**: Streamlined grid with initial 10 leads + progressive "+10 show more" pagination.

### 6. Cold Email Automation Pipeline
* **3-Tier n8n Architecture (Oracle Cloud VM)**:
  * *Workflow 1*: Cold Email Batch Sending (`POST /webhook/send-batch`) via Brevo.
  * *Workflow 2*: Gmail Reply Polling & AI Sentiment Analysis (Google Gemini categorizes replies into `Hot Leads`, `Neutral Queue`, and `Failed Leads`).
  * *Workflow 3*: In-App Manual Reply Dispatch (`POST /webhook/send-reply`).
* **Multi-Tenant Google Sheets CRM**: Google Service Account sync with server-side tenant isolation (`sheets_client.py`).
* **Rate Limiting & Debounce**: Server-enforced cooldowns prevent duplicate batch dispatches.

### 7. Messenger CRM & Inbound Router
* **Meta Webhook Routing**: Inbound Facebook Messenger messages parsed and routed through Groq LLaMA-3.
* **24-Hour Policy Compliance**: Integrated window timer countdown badges ensure responses comply with Meta messaging policies.
* **Campaign History & Escalation Queue**: Tracks marketing campaigns with progressive "+5 show more" pagination, flags hot leads, and notifies human agents for complex escalations.

### 8. Models on Demand (Proprietary SLM Engine)
* **Domain-Specialized Small Language Models (2 Billion Parameters)**:
  1. **BizCall Banking SLM**: DistilBERT multi-intent decomposition + FAISS semantic vector RAG + fine-tuned Gemma-2B LoRA running on Nvidia A100 / CPU fallback.
  2. **BizCall Sales & Pitch Agent**: Quantized Gemma-2B Q4_K_M GGUF engine tuned for cold outreach, objection preemption, and high-converting B2B copy.
* **Testing Sandbox**: Pre-loaded industry prompt chips, custom prompt editor, and live inference execution.
* **3-Tier Diagnostic Pipeline Dashboard**: Detailed breakdown of intent classification scores, vector similarity confidence, latency benchmarking (ms), and model-generated reasoning.

### 9. Analytics Dashboard
* **Performance KPIs**: Total calls handled, average call duration, positive/neutral/negative sentiment ratios, total spend, and cost per minute.
* **Activity Breakdown**: Interactive visual cards for incoming vs outbound call distribution.
* **Comprehensive Call Records**: Paginated call logs (initial 10 records + "+5 show more") with searchable transcripts and metadata.

### 10. Company Settings & Tenant Isolation
* **Organization Profile**: Configure company name, business phone numbers, operating hours, and voice preferences.
* **Subdomain Isolation**: Dedicated DNS tenant subdomain banner with one-click clipboard copying.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, Vite 7, TypeScript, JavaScript (ES2023) |
| **Styling & Design** | Google Stitch Minimalist System, Vanilla CSS, DM Mono, Space Grotesk, Plus Jakarta Sans |
| **Voice & Audio** | Retell Web SDK (`retell-client-js-sdk`), WebRTC, Twilio Voice SDK |
| **Backend API** | FastAPI, Uvicorn, Pydantic, Python 3.10+ |
| **Authentication & DB** | Supabase (PostgreSQL, Row-Level Security, JWT Auth) |
| **AI / Machine Learning** | Google Gemma-2B (LoRA & GGUF Q4_K_M), DistilBERT, FAISS Vector Search, PyTorch, Transformers, Groq (LLaMA-3), Google Gemini |
| **Automation & Orchestration** | n8n (Oracle Cloud VM), Brevo API, Google Sheets API, Meta Messenger API |
| **Hosting & Network** | Cloudinary (Video Streaming), Ngrok (Webhook Tunnels) |

---

## Directory Structure

```
├── api/                                # FastAPI Backend
│   ├── main.py                         # Application entrypoint & router aggregation
│   ├── requirements.txt                # Python dependencies
│   ├── .env                            # Environment secrets & keys (git-ignored)
│   ├── modules/                        # Modular feature domains
│   │   ├── auth/                       # Supabase JWT verification dependencies
│   │   ├── company/                    # Tenant profile & onboarding APIs
│   │   ├── cold_email/                 # n8n workflows, sheets client & email endpoints
│   │   ├── messenger/                  # Messenger CRM router & campaign analytics
│   │   ├── models_on_demand/           # Gemma-2B & DistilBERT inference engine
│   │   ├── lead_finder/                # Business lead discovery & scraping
│   │   └── retell_calls/               # Call tracking & Retell webhook ingestion
│   └── secrets/                        # Service account JSON credentials
│
├── frontend/                           # React 19 + Vite Frontend
│   ├── index.html                      # HTML template
│   ├── package.json                    # Dependencies & build scripts
│   └── src/
│       ├── App.jsx / App.css           # Workspace router & Google Stitch shell
│       ├── main.tsx                    # React DOM root
│       ├── assets/                     # Vector icons & branding (brain-logo.svg)
│       ├── components/                 # Core view components
│       │   ├── LandingPage.jsx/.css    # Fullscreen cinematic video landing page
│       │   ├── AuthModal.jsx/.css      # Google Stitch Login & Signup modal
│       │   ├── AgentBuilder.jsx/.css   # Voice AI prompt & persona builder
│       │   ├── RetellLiveCalls.jsx/.css# Live call monitor & WebRTC caller
│       │   ├── LeadFinder.jsx/.css     # Google Maps lead finder & CSV exporter
│       │   ├── ModelsOnDemand.jsx/.css # Proprietary SLM testing sandbox
│       │   ├── AnalyticsDashboard.jsx  # Performance KPIs & call log records
│       │   └── CompanySettings.jsx     # Tenant profile & DNS isolation settings
│       ├── features/
│       │   ├── cold-email/             # Cold email dashboards, queues & modals
│       │   └── messenger/              # Messenger CRM campaigns & window badges
│       └── services/                   # Supabase client & Axios API services
│
├── n8n_workflows/                      # Production n8n Workflow JSON definitions
└── README.md                           # Project documentation
```

---

## Getting Started Locally

### Prerequisites
* **Node.js** (v18.0.0 or higher) & **npm**
* **Python** (3.10 or higher) & **pip**
* Active accounts/keys for:
  * **Supabase** (URL and Service Role / Anon Keys)
  * **Retell AI** (API Key & Agent ID)
  * **Twilio** (Account SID, Auth Token & Phone Number)
  * **n8n Instance** (Oracle Cloud or self-hosted)

---

### Backend Setup (`api/`)

1. Navigate to the `api` directory:
   ```bash
   cd api
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure your `api/.env` file:
   ```env
   # Retell AI
   RETELL_API_KEY="your_retell_api_key"
   RETELL_AGENT_ID="your_retell_agent_id"

   # Twilio Telephony
   TWILIO_ACCOUNT_SID="your_twilio_sid"
   TWILIO_AUTH_TOKEN="your_twilio_auth_token"
   TWILIO_PHONE_NUMBER="+1xxxxxxxxxx"

   # Supabase
   SUPABASE_URL="https://your_project.supabase.co"
   SUPABASE_ANON_KEY="your_anon_key"
   SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

   # n8n & Cold Email Automation
   N8N_BASE_URL="https://your-n8n-domain.com/webhook"
   N8N_API_KEY="your_n8n_api_key"
   COLD_EMAIL_SHEET_ID="your_google_sheet_id"
   GOOGLE_SERVICE_ACCOUNT_JSON="./secrets/cold-email-sheets-sa.json"

   # Apollo / Lead Scraping
   APOLLO_API_KEY="your_apollo_key"
   HF_TOKEN="your_huggingface_token"
   ```

5. Launch the FastAPI server:
   ```bash
   python main.py
   # Or using uvicorn directly:
   uvicorn main:app --host 0.0.0.0 --port 8002 --reload
   ```
   The backend will be live at `http://localhost:8002` (interactive Swagger docs at `http://localhost:8002/docs`).

---

### Frontend Setup (`frontend/`)

1. Open a new terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be live at `http://localhost:5173`.

---

### Webhook Tunneling (Ngrok)

To receive live telephony webhooks from Retell AI and Twilio on your local environment:
```bash
ngrok http 8002
```
Update `NGROK_URL` in `api/.env` with your active forwarding HTTPS URL and register the URL in your Retell AI dashboard webhook settings.

---

## Production Build & Verification

To verify that the frontend compiles cleanly with zero TypeScript or JSX bundling errors:
```bash
cd frontend
npm run build
```
This runs `tsc -b && vite build` and generates the optimized production bundle in `dist/`.

---

## Security, Multi-Tenancy & Privacy Rules

1. **Client Isolation**:
   * All requests to protected endpoints require an `Authorization: Bearer <token>` header issued by Supabase.
   * Endpoints resolve the tenant identity strictly via `Depends(get_current_user)`. Client-supplied user IDs are explicitly rejected.
2. **Sheet & CRM Row Security**:
   * Google Sheets CRM reads filter rows server-side by matching the authenticated tenant ID before sending data to the client. Unfiltered rows are never exposed.
3. **Secret Storage**:
   * All third-party secrets (`N8N_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `TWILIO_AUTH_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`) reside exclusively in `api/.env` or `api/secrets/`. None are packaged into client-side Vite bundles.

---

## License

Proprietary enterprise software developed for **BizCall AI**. All rights reserved.
