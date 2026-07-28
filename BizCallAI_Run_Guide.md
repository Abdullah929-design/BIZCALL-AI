# 🚀 BizCall AI — Complete Run Guide
> Every time you want to run the project, follow these steps **in order**.

---

## ✅ PRE-CHECK (Before Starting)
Make sure these are installed on your laptop:
- ✅ Python 3.11
- ✅ Node.js
- ✅ ngrok
- ✅ MicroSIP (for Twilio calling feature)

---

## STEP 1 — Google Colab (Start AI Models on GPU)

1. Open this notebook in your browser:
   👉 `https://colab.research.google.com/drive/1mxMxPadctgr0nYlUFSpJfC4odFOaTboL`

2. Make sure runtime is set to **T4 GPU**:
   `Runtime → Change runtime type → T4 GPU → Save`

3. Click **`Runtime → Run all`** and wait until you see:
   ```
   ✅ Tunnel active!
   🔗 URL: https://unexercisable-wabbly-gala.ngrok-free.dev
   ```

4. ✅ Colab is running — **leave this tab open** (do not close it)

> ⚠️ If Colab generates a **different ngrok URL**, update line 17 in:
> `d:\intent-detector-banking - Copy (3)\api\.env`
> ```
> OLLAMA_BASE_URL=https://NEW-URL-HERE.ngrok-free.dev
> ```

---

## STEP 2 — Open MicroSIP (For Twilio Phone Calls)

1. Open **MicroSIP** on your laptop
2. Make sure it shows **green / registered** status
3. Your SIP credentials:
   - **SIP Server:** `zi-test-123.sip.us1.twilio.com`
   - **Username / Login:** `tester`
   - **Domain:** `zi-test-123.sip.us1.twilio.com`

> ⚠️ MicroSIP must be running and green **before** you make any Twilio calls

---

## STEP 3 — Start Local ngrok (For Twilio Webhooks)

Open **Terminal 1** and run:
```powershell
ngrok http --domain=authorizable-zavier-jocundly.ngrok-free.dev 8002
```

Wait until you see:
```
Forwarding  https://authorizable-zavier-jocundly.ngrok-free.dev -> http://localhost:8002
```

✅ Leave this terminal open.

---

## STEP 4 — Start FastAPI Backend

Open **Terminal 2** and run:
```powershell
cd "d:\intent-detector-banking - Copy (3)\api"
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

Wait until you see:
```
✅ Intent detection model loaded successfully
✅ API is ready to serve requests!
INFO: Application startup complete.
```

✅ API is live at: `http://localhost:8002`
📚 API Docs at: `http://localhost:8002/docs`

---

## STEP 5 — Start React Frontend

Open **Terminal 3** and run:
```powershell
cd "d:\intent-detector-banking - Copy (3)\frontend"
npm run dev
```

Wait until you see:
```
VITE ready in XXX ms
➜  Local: http://localhost:5173/
```

✅ Open Chrome and go to: **`http://localhost:5173`**

---

## STEP 6 — (Optional) Start Streamlit App

Open **Terminal 4** and run:
```powershell
cd "d:\intent-detector-banking - Copy (3)"
streamlit run app.py
```

✅ Streamlit opens automatically in Chrome at: `http://localhost:8501`

---

## 📋 Summary — Run Order

| # | What | Terminal | Command |
|---|---|---|---|
| 1 | AI Models (GPU) | Google Colab | Run all cells |
| 2 | SIP Phone | MicroSIP app | Open & verify green |
| 3 | Twilio Webhook Tunnel | Terminal 1 | `ngrok http --domain=authorizable-zavier-jocundly.ngrok-free.dev 8002` |
| 4 | FastAPI Backend | Terminal 2 | `cd api` → `uvicorn main:app --host 0.0.0.0 --port 8002 --reload` |
| 5 | React Frontend | Terminal 3 | `cd frontend` → `npm run dev` |
| 6 | Streamlit (Optional) | Terminal 4 | `streamlit run app.py` |

---

## 🌐 URLs When Everything is Running

| Service | URL |
|---|---|
| React Frontend | http://localhost:5173 |
| Streamlit App | http://localhost:8501 |
| FastAPI Docs | http://localhost:8002/docs |
| Twilio ngrok | https://authorizable-zavier-jocundly.ngrok-free.dev |
| Colab Ollama | https://unexercisable-wabbly-gala.ngrok-free.dev |

---

## 📞 Twilio Call Testing

- **To Number (SIP):** `sip:tester@zi-test-123.sip.us1.twilio.com`
- **From Number:** `+13613208235` (your Twilio number)

---

## 🔑 Key Files

| File | Purpose |
|---|---|
| `api\.env` | All API keys, URLs, ports |
| `api\routers\twilio.py` | Twilio call logic |
| `api\routers\banking.py` | Banking AI logic |
| `llm_complex_path\llm_inference.py` | Ollama LLM connection |
| `faq_engine\faiss_search.py` | RAG knowledge base |

---

## ⚠️ Common Issues & Fixes

| Problem | Fix |
|---|---|
| LLM not responding | Check Colab is running on **T4 GPU** runtime |
| ngrok domain already online | Colab is using same account — use separate account for local ngrok |
| `python` not recognized | Use full path or check PATH env variable |
| MicroSIP not registering | Check username=`tester`, domain=`zi-test-123.sip.us1.twilio.com` |
| Colab URL changed | Update `OLLAMA_BASE_URL` in `api\.env` |
