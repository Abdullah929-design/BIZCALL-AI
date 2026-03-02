# Banking & Marketing Call Center API

FastAPI backend for AI-powered banking and marketing call center operations.

## 🚀 Features

### Banking (Inbound Calls)
- **Intent Detection**: Multi-intent classification with complexity analysis
- **FAQ Engine**: RAG-based responses for simple banking queries
- **LLM Complex Path**: Contextual AI responses for complex banking issues
- **Session Management**: Maintains conversation history across interactions
- **Streaming Responses**: Real-time response streaming via Server-Sent Events

### Marketing (Outbound Calls)
- **Outbound Marketing**: AI-powered marketing agent for outbound calls
- **Context Awareness**: Maintains conversation context and business context
- **FAQ Integration**: Handles customer questions during marketing calls
- **Clean Responses**: Automatically removes formatting artifacts from LLM outputs

## 📁 API Structure

```
api/
├── main.py              # FastAPI application entry point
├── run.py               # Startup script
├── requirements.txt     # Python dependencies
├── .env.example         # Environment configuration template
├── schemas.py           # Pydantic models for API requests/responses
├── routers/             # API endpoint definitions
│   ├── banking.py       # Banking endpoints
│   ├── marketing.py     # Marketing endpoints
│   └── health.py        # Health check endpoints
└── services/            # Business logic services
    ├── intent_detector.py    # Intent classification service
    └── session_manager.py    # Session management service
```

## 🛠️ Installation

1. **Install Dependencies**
   ```bash
   cd api
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Ollama Services**
   ```bash
   # Make sure Ollama is running with your models
   ollama serve
   ```

4. **Run the API**
   ```bash
   python run.py
   ```

## 📚 API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🔗 API Endpoints

### Banking Endpoints

#### Session Management
- `POST /api/banking/session/create` - Create new banking session
- `GET /api/banking/session/{session_id}` - Get session information
- `DELETE /api/banking/session/{session_id}` - Clear session

#### Query Processing
- `POST /api/banking/detect` - Detect intents in text
- `POST /api/banking/query` - Process query (returns streaming URL)
- `POST /api/banking/query/sync` - Process query (blocking response)
- `GET /api/banking/stream?session_id={id}` - Stream LLM response

### Marketing Endpoints

#### Session Management
- `POST /api/marketing/session/create` - Create new marketing session
- `GET /api/marketing/session/{session_id}` - Get session information
- `DELETE /api/marketing/session/{session_id}` - Clear session

#### Query Processing
- `POST /api/marketing/generate` - Generate marketing response
- `POST /api/marketing/generate/chat` - Generate with chat context
- `POST /api/marketing/query` - Process marketing query
- `GET /api/marketing/stream?session_id={id}` - Stream marketing response

### Health Check
- `GET /api/health` - API health status

## 📝 Usage Examples

### Banking Inbound Call

```javascript
// 1. Create session
const sessionResponse = await fetch('/api/banking/session/create');
const { session_id } = await sessionResponse.json();

// 2. Process query
const queryResponse = await fetch('/api/banking/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "My card was stolen and I need to block it",
    session_id: session_id
  })
});

const result = await queryResponse.json();
if (result.mode === 'llm') {
  // Connect to streaming endpoint
  const eventSource = new EventSource(result.stream_url);
  eventSource.onmessage = (event) => {
    const chunk = JSON.parse(event.data);
    if (!chunk.finished) {
      console.log(chunk.chunk); // Stream chunk
    }
  };
}
```

### Marketing Outbound Call

```javascript
// 1. Create session
const sessionResponse = await fetch('/api/marketing/session/create');
const { session_id } = await sessionResponse.json();

// 2. Generate marketing response
const response = await fetch('/api/marketing/generate/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Do you offer business accounts?",
    session_id: session_id,
    business_context: "We are a community bank serving small businesses"
  })
});

const result = await response.json();
console.log(result.text); // Marketing response
```

## 🔄 Session Management

The API maintains conversation context through session management:

- **Session Creation**: Automatically creates system prompts based on call type
- **Message Storage**: Stores all user/assistant interactions
- **Context Retrieval**: Provides full conversation history to LLMs
- **Session Cleanup**: Clear sessions while preserving system prompts

## 🎯 Call Flow Logic

### Banking Inbound
1. **Intent Detection** → Classify user intent(s) and complexity
2. **Simple Intent + FAQ** → Return FAQ answer
3. **Simple Intent + No FAQ** → LLM response with session context
4. **Complex Intent** → LLM response with session context
5. **No Intent Detected** → LLM response with session context

### Marketing Outbound
1. **User Query** → Process with marketing context
2. **Short Simple Query** → Try FAQ fallback first
3. **Marketing Response** → Generate with business context
4. **Session Context** → Maintain conversation history

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Banking Query Test
```bash
curl -X POST http://localhost:8000/api/banking/query \
  -H "Content-Type: application/json" \
  -d '{"text": "How do I activate my debit card?"}'
```

### Marketing Query Test
```bash
curl -X POST http://localhost:8000/api/marketing/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "What business accounts do you offer?"}'
```

## 🔧 Configuration

Key environment variables:

- `OLLAMA_BASE_URL`: Ollama server URL
- `OLLAMA_MODEL`: Banking LLM model name
- `OLLAMA_MARKETING_MODEL`: Marketing LLM model name
- `INTENT_MODEL_PATH`: Path to intent detection model
- `FAQ_INDEX_PATH`: Path to FAQ knowledge base

## 🚀 Deployment

### Docker (Recommended)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "run.py"]
```

### Direct Deployment
```bash
# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📊 Monitoring

- **Health Endpoint**: `/api/health` for service status
- **Session Metrics**: Track active sessions via session manager
- **Response Times**: Included in API responses
- **Error Handling**: Structured error responses with details

## 🔒 Security Considerations

- **CORS**: Configured for specific origins
- **Session Isolation**: Each session has unique ID
- **Input Validation**: Pydantic models validate all inputs
- **Error Sanitization**: Errors don't expose internal details

## 🤝 Integration with React Frontend

The API is designed for easy React integration:

1. **CORS Enabled**: Pre-configured for React dev servers
2. **JSON Responses**: Standard JSON API format
3. **Streaming Support**: Server-Sent Events for real-time responses
4. **Session Management**: Client-side session ID handling
5. **Error Handling**: Consistent error response format

## 📞 Next Steps for Frontend

1. **Authentication**: Add JWT/API key authentication
2. **Audio Support**: Add audio upload/transcription endpoints
3. **WebSocket**: Consider WebSocket for bidirectional communication
4. **Rate Limiting**: Add rate limiting for production use
5. **Monitoring**: Add logging and metrics collection
