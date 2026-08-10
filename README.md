# 🎯 BIZCALL AI

> **An intelligent AI-powered phone assistant system for banking support and outbound marketing campaigns**

BIZCALL AI is a full-stack conversational AI platform that handles both **inbound support calls** and **outbound marketing calls** using advanced intent detection, RAG-based FAQ retrieval, and LLM inference. Built with FastAPI, React, and Twilio integration.

---

## ✨ Features

### 🧠 **Intelligent Intent Detection**
- **Multi-intent detection** with confidence scoring
- **Complexity classification** (simple vs. complex queries)
- **Priority-based routing** for critical banking issues
- **Intent relationships** and semantic understanding
- **Suppression rules** to filter false positives

### 💬 **Banking Support Assistant**
- Real-time response generation with streaming
- FAQ knowledge base using FAISS (vector search)
- Fallback to LLM for complex queries
- Session-aware conversation history
- Speech-to-text transcription (Whisper)

### 📱 **Marketing Call Generator**
- Outbound campaign call creation
- Context-aware speech generation
- Objection handling and follow-up Q&A
- Customizable tone and CTA

### 📞 **Twilio Integration**
- **Inbound call handling** with speech collection
- **Outbound call initiation** with custom context
- **SIP-based phone calling** (MicroSIP support)
- **Webhook-based call routing**
- **Call session persistence**

### 🔄 **RAG Pipeline**
- FAISS-based FAQ vector search
- Multi-turn conversation context
- Confidence-weighted answer retrieval
- Automatic fallback to LLM

---

## 🎥 Video Demos
### 📺 System Overview & Architecture

[![BIZCALL AI System Overview](https://github.com/user-attachments/assets/a038004f-6b8d-48fb-ac4b-c92b213938fa)](https://youtube.com/placeholder)

Click above and watch a complete walkthrough of the system architecture, components, and data flow.

---

### 💬 Banking Intent Detection Demo

[![Banking Intent Detection Demo](https://github.com/user-attachments/assets/50800e83-8633-4856-8994-fc142d9760cf)](https://res.cloudinary.com/dv7fu8gwf/video/upload/v1786346740/frontend_-_Google_Chrome_2026-05-10_22-40-50_aikwba.mp4)

Click above and see how the system detects multiple intents, handles edge cases, and prioritizes responses.

---

### 📞 Twilio Call Integration Demo

[![Twilio Call Integration Demo](https://github.com/user-attachments/assets/d69dd99a-9d29-4165-8ff9-d929985ab3f5)](https://res.cloudinary.com/dv7fu8gwf/video/upload/v1786346725/frontend_-_Google_Chrome_2026-05-10_19-01-11_nutzhf.mp4)

Click above and watch live demonstration of inbound calls, speech processing, and real-time AI responses.
---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
├──────────────────┬──────────────────────────────────────────┤
│  React Frontend  │  Streamlit Dashboard  │  Phone (Twilio)  │
├──────────────────────────────────────────────────────────────┤
│                     API Layer (FastAPI)                      │
├──────────────────┬──────────────────┬──────────────────────┤
│  Twilio Routes   │  Banking Routes  │  Intent Detection   │
└──────────────────┴──────────────────┴──────────────────────┘
         ↓                  ↓                      ↓
    ┌────────────┬────────────────┬──────────────────────┐
    │ Intent     │ FAQ Engine     │ LLM Inference       │
    │ Detector   │ (FAISS)        │ (Ollama/Remote)     │
    │ (DistilBERT)              │                      │
    └────────────┴────────────────┴──────────────────────┘
```

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend** | FastAPI (Python) | REST API, Twilio webhooks, LLM integration |
| **Frontend** | React + Vite | Web dashboard, real-time chat |
| **ML/NLP** | DistilBERT, Whisper, spaCy | Intent detection, transcription, NER |
| **Knowledge Base** | FAISS | Fast vector similarity search |
| **LLM** | Ollama (local) or remote | Response generation |
| **Phone** | Twilio + MicroSIP | Calling infrastructure |
| **Data** | Session Manager (in-memory) | Call session storage |
| **UI/UX** | Streamlit | Analytics & debugging dashboard |

---

## 📊 Language Composition

```
Python          36.7%  ████████████████░░░░░░░░░░░░
Jupyter NB      32.5%  ███████████████░░░░░░░░░░░░░
JavaScript      28.7%  █████████████░░░░░░░░░░░░░░░
CSS              1.6%  █░░░░░░░░░░░░░░░░░░░░░░░░░░░
Other            0.5%  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

---

## 🚀 Quick Start

### Prerequisites

```bash
✅ Python 3.11+
✅ Node.js 16+
✅ ngrok (for Twilio webhooks)
✅ MicroSIP (for phone calls)
```

### Step 1: Start AI Models on Google Colab

1. Open the [Google Colab notebook](https://colab.research.google.com/drive/1mxMxPadctgr0nYlUFSpJfC4odFOaTboL)
2. Set runtime to **T4 GPU**: `Runtime → Change runtime type → T4 GPU`
3. Click **`Runtime → Run all`**
4. Wait for: `✅ Tunnel active!` and the ngrok URL
5. **Leave this tab open** (do not close)

### Step 2: Open MicroSIP

- Launch MicroSIP on your laptop
- Verify it shows **green/registered** status
- **SIP Server:** `zi-test-123.sip.us1.twilio.com`
- **Username:** `tester`

### Step 3: Start Local ngrok Tunnel

```bash
ngrok http --domain=authorizable-zavier-jocundly.ngrok-free.dev 8002
```

### Step 4: Start FastAPI Backend

```bash
cd api
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

📚 **API Docs:** http://localhost:8002/docs

### Step 5: Start React Frontend

```bash
cd frontend
npm run dev
```

🌐 **Web UI:** http://localhost:5173

### Step 6: (Optional) Start Streamlit Dashboard

```bash
streamlit run app.py
```

📊 **Dashboard:** http://localhost:8501

---

## 🌐 Endpoints Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/intent/detect` | Multi-intent classification |
| `POST` | `/api/faq/search` | FAQ knowledge base lookup |
| `POST` | `/api/llm/generate` | LLM-powered response generation |
| `POST` | `/api/twilio/inbound-call` | Incoming call webhook |
| `POST` | `/api/twilio/process-call` | Call transcription & processing |
| `POST` | `/api/twilio/initiate-outbound` | Start outbound marketing call |

**Full API documentation:** See `api/routers/` for implementation details.

---

## 📋 Project Structure

```
BIZCALL-AI/
├── api/                              # FastAPI Backend
│   ├── main.py                       # Entry point & route initialization
│   ├── routers/
│   │   ├── twilio.py                # Twilio call handling
│   │   ├── banking.py               # Banking intent endpoints
│   │   └── faq.py                   # FAQ search routes
│   ├── .env                         # API credentials & config
│   └── requirements.txt             # Python dependencies
│
├── frontend/                         # React Web Dashboard
│   ├── src/
│   │   ├── App.jsx                  # Main app component
│   │   ├── components/              # React components
│   │   └── styles/                  # CSS styling
│   ├── package.json
│   └── vite.config.js
│
├── faq_engine/                       # Knowledge Base
│   └── faiss_search.py              # FAISS vector search implementation
│
├── intent_detection_model/          # Pre-trained DistilBERT
│   ├── config.json
│   ├── pytorch_model.bin
│   └── tokenizer.json
│
├── intent_config.py                 # Intent definitions & rules
├── classification.py                # Complexity classification logic
│
├── llm_complex_path/                # Complex Query LLM Inference
│   └── llm_inference.py             # Ollama integration
│
├── llm_marketing_path/              # Marketing Speech Generation
│   └── marketing_inference.py       # Marketing LLM pipeline
│
├── app.py                           # Streamlit Analytics Dashboard
├── BizCallAI_Run_Guide.md           # Detailed setup instructions
├── TWILIO_INTEGRATION.md            # Twilio configuration guide
└── README.md                        # This file
```

---

## 🔑 Configuration

### Environment Variables (`.env`)

```bash
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+13613208235

# URLs
NGROK_URL=https://authorizable-zavier-jocundly.ngrok-free.dev
OLLAMA_BASE_URL=https://unexercisable-wabbly-gala.ngrok-free.dev

# LLM Config
LLM_MODEL=finance-chat:latest
LLM_TEMPERATURE=0.25

# FAQEngine
FAISS_INDEX_PATH=faq_engine/faiss_index.pkl
FAQ_DATA_PATH=faq_engine/faq_data.json

# Ports
API_PORT=8002
FRONTEND_PORT=5173
STREAMLIT_PORT=8501
```

See `BizCallAI_Run_Guide.md` for detailed step-by-step configuration.

---

## 📞 Twilio Call Testing

### Inbound Test Numbers (Simulator)

| Number | Behavior |
|--------|----------|
| `+15005550001` | ✅ Call connects successfully |
| `+15005550006` | ⏱️ Triggers busy signal |
| `+15005550004` | ⏸️ Triggers no-answer timeout |

### Making a Test Call

1. Use MicroSIP to dial: `sip:tester@zi-test-123.sip.us1.twilio.com`
2. System will pick up and request speech input
3. Speak your banking query
4. AI processes and responds
5. Continue multi-turn conversation

---

## 🧠 Intent Detection System

### Supported Intents

**Banking Intents:**
- `card_declined`
- `card_expired`
- `card_lost_or_stolen`
- `transaction_dispute`
- `balance_inquiry`
- `funds_transfer`
- And 20+ more banking-specific intents

**Complexity Levels:**
- **Simple:** Single, FAQ-answerable intent → Direct FAQ response
- **Complex:** Multiple intents, edge cases → LLM reasoning required

### Processing Pipeline

```
User Input
    ↓
[Text Normalization]
    ↓
[Smart Segment Splitting] ← Handles connectors: "but", "also", "then"
    ↓
[Multi-Intent Detection] ← Top-K predictions per segment
    ↓
[Override & Suppression Rules] ← Safety checks & false positive filtering
    ↓
[Priority Ranking] ← Severity-based sorting
    ↓
Complexity Classification
```

---

## 🎬 Demo Walkthrough

### Banking Support Scenario

```
User: "My card was declined at the ATM, and I also can't see my recent transaction"
      ↓
System detects:
  - Intent 1: card_declined (Confidence: 0.89, Priority: 9)
  - Intent 2: transaction_dispute (Confidence: 0.76, Priority: 8)
  - Complexity: COMPLEX (multiple intents)
      ↓
System searches FAQ for both intents
      ↓
If no FAQ match → LLM generates multi-issue response:
  "I understand you're experiencing two issues:
   1. Card Declined at ATM
      - May indicate insufficient funds or fraud protection
      - Next steps: Check available balance, contact branch
   2. Missing Transaction
      - Could be processing delay or technical issue
      - Next steps: Check transaction history, wait 24-48 hours"
```

---

## 🔧 Advanced Usage

### Custom Intent Training

1. Add new intents to `intent_config.py`:
   ```python
   INTENT_CLASSES = {
       40: "your_new_intent"
   }
   INTENT_PRIORITY = {
       "your_new_intent": 7  # severity (0-10)
   }
   ```

2. Fine-tune the DistilBERT model on your dataset

3. Replace model in `intent_detection_model/`

### RAG Knowledge Base Update

1. Prepare FAQ pairs: `{"question": "...", "answer": "..."}`

2. Embed with the same encoder:
   ```python
   from faq_engine.faiss_search import build_index
   build_index(faq_pairs, output_path="faq_engine/faiss_index.pkl")
   ```

3. Deploy new index

### LLM Temperature Tuning

- **Lower (0.1-0.3):** More deterministic, safer banking responses
- **Higher (0.7-1.0):** More creative, for marketing campaigns

---

## 📈 Monitoring & Debugging

### Streamlit Analytics Dashboard

```bash
streamlit run app.py
```

Features:
- Real-time intent detection visualization
- Response latency profiling
- LLM inference timing
- FAQ hit rates
- Chat history replay

### API Health Check

```bash
curl http://localhost:8002/health
```

### Log Monitoring

```bash
tail -f logs/api.log
tail -f logs/twilio.log
```

---

## ⚠️ Common Issues & Fixes

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| LLM not responding | Colab not running on T4 GPU | Check `Runtime → Change runtime type → T4 GPU` |
| ngrok domain already online | Both Colab and local using same account | Use separate ngrok account for local |
| MicroSIP not registering | Wrong credentials | Verify: `tester` / `zi-test-123.sip.us1.twilio.com` |
| Intent detection fails | Model not found | Ensure `intent_detection_model/` exists in project root |
| FAQ returns empty | FAISS index corrupted | Rebuild index: `python faq_engine/build_index.py` |
| Twilio webhook timeout | Ngrok tunnel not active | Restart: `ngrok http 8002` |

**Full troubleshooting guide:** See `BizCallAI_Run_Guide.md`

---

## 📚 Documentation

- **[Setup & Deployment Guide](./BizCallAI_Run_Guide.md)** — Step-by-step running instructions
- **[Twilio Integration Guide](./TWILIO_INTEGRATION.md)** — Phone calling architecture & testing
- **[API Docs](./api/README.md)** — Endpoint specifications
- **[Intent Config Reference](./intent_config.py)** — Intent definitions & rules

---

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- [ ] Additional intent classes for other industries (healthcare, e-commerce)
- [ ] Streaming audio processing (real-time transcription)
- [ ] Multi-language support
- [ ] Enhanced RAG with semantic chunking
- [ ] CI/CD pipeline & automated testing
- [ ] Deployment to cloud (AWS, GCP, Azure)

---

## 📄 License

This project is provided as-is for educational and commercial use.

---

## 📧 Support & Contact

For issues, feature requests, or questions:

1. Check `BizCallAI_Run_Guide.md` for common solutions
2. Review API logs at `logs/api.log`
3. Test endpoints using FastAPI Swagger UI: `http://localhost:8002/docs`

---

## 🎓 Learning Resources

- **Twilio SDK:** https://www.twilio.com/docs/libraries/python
- **FAISS:** https://github.com/facebookresearch/faiss
- **Ollama:** https://github.com/ollama/ollama
- **FastAPI:** https://fastapi.tiangolo.com/
- **Streamlit:** https://streamlit.io/docs

---

**Built with ❤️ by Abdullah929-design**

⭐ If you find this useful, please star the repository!
