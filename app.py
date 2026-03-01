import streamlit as st
import warnings
warnings.filterwarnings('ignore')

try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
except ImportError:
    from transformers import BertTokenizer as AutoTokenizer
    from transformers import BertForSequenceClassification as AutoModelForSequenceClassification

import torch
import torch.nn.functional as F
import nltk
from nltk.corpus import stopwords
import whisper
import tempfile
import os
import spacy
import re
import time  # For debugging timing
from faq_engine.faiss_search import search_faq
from classification import SIMPLE_INTENTS, COMPLEX_INTENTS
from classification import classify_query_complexity
from llm_complex_path.llm_inference import (
    generate_llm_response,
    generate_llm_response_chat,
    generate_llm_response_stream,
    generate_llm_response_chat_stream,
)
from llm_marketing_path.marketing_inference import generate_marketing_chat_response_stream
from intent_config import (
    INTENT_RELATIONSHIPS,
    CRITICAL_KEYWORD_OVERRIDES,
    SUPPRESSION_RULES,
    SOFT_KEYWORD_HINTS,
    INTENT_PRIORITY,
    INTENT_CLASSES
)


@st.cache_resource
def load_intent_model():
    start_time = time.time()
    print("[CACHE] Loading intent model...")

    model_dir = "intent_detection_model"
    model = AutoModelForSequenceClassification.from_pretrained(
        model_dir,
        low_cpu_mem_usage=False,
    )
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    try:
        model.to("cpu")
    except NotImplementedError as exc:
        if "meta tensor" in str(exc).lower():
            model = model.to_empty(device="cpu")
        else:
            raise
    model.eval()

    elapsed = time.time() - start_time
    print(f"[CACHE] Intent model loaded in {elapsed:.2f}s")
    return model, tokenizer


model, tokenizer = load_intent_model()


COMPLEX_QUERY_SYSTEM_PROMPT = (
    "You are a professional banking call-center support agent. "
    "Your job is to carefully read the customer's full message, identify ALL distinct problems they mention, and resolve them clearly. "
    "Follow this response format strictly: "
    "1. Start with one short empathetic sentence. "
    "2. List each issue in numbered sections (Issue 1, Issue 2, etc.). "
    "3. For each issue: "
    "- Briefly explain what it means. "
    "- Provide clear, practical next steps the customer should take. "
    "4. Do not speculate or invent causes. "
    "5. Use only information provided by the customer. "
    "6. Do not use placeholders or templates. "
    "7. Do not ask questions unless absolutely necessary. If needed, ask them only AFTER all solutions. "
    "Be specific, calm, and solution-focused."
)


def normalize_intent_name(name: str) -> str:
    """Normalize intent names to snake_case, lowercase, no punctuation."""
    name = name.lower()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name

# Rename imported classes for backwards compatibility
classes = INTENT_CLASSES

# Normalized lookup tables for consistent processing (computed from imports)
INTENT_PRIORITY_NORMALIZED = {normalize_intent_name(k): v for k, v in INTENT_PRIORITY.items()}
INTENT_RELATIONSHIPS_NORMALIZED = {
    normalize_intent_name(k): [normalize_intent_name(rel) for rel in v]
    for k, v in INTENT_RELATIONSHIPS.items()
}
CRITICAL_KEYWORD_OVERRIDES_NORMALIZED = {
    normalize_intent_name(k): [kw.lower() for kw in v]
    for k, v in CRITICAL_KEYWORD_OVERRIDES.items()
}
SUPPRESSION_RULES_NORMALIZED = {
    normalize_intent_name(k): [kw.lower() for kw in v]
    for k, v in SUPPRESSION_RULES.items()
}
SOFT_KEYWORD_HINTS_NORMALIZED = [
    {
        "intent": normalize_intent_name(h["intent"]),
        "keywords": [kw.lower() for kw in h["keywords"]],
        "confidence": h["confidence"],
    }
    for h in SOFT_KEYWORD_HINTS
]
SIMPLE_INTENTS_NORMALIZED = {normalize_intent_name(x) for x in SIMPLE_INTENTS}
COMPLEX_INTENTS_NORMALIZED = {normalize_intent_name(x) for x in COMPLEX_INTENTS}


# Load whisper model with lazy loading and caching
@st.cache_resource
def load_whisper_model():
    """Load whisper model with proper device handling"""
    try:
        # Try loading directly without device specification for meta tensor compatibility
        import os
        os.environ['CUDA_VISIBLE_DEVICES'] = '-1'  # Force CPU
        model = whisper.load_model("tiny")
        return model
    except Exception as e:
        st.warning(f"⚠️ Whisper model loading failed: {str(e)}")
        st.info("Audio transcription will be unavailable. Please refresh the page.")
        return None

whisper_model = load_whisper_model()


@st.cache_resource
def load_spacy_model():
    try:
        return spacy.load("en_core_web_sm")
    except OSError:
        st.warning("Downloading spaCy model...")
        os.system("python -m spacy download en_core_web_sm")
        return spacy.load("en_core_web_sm")


@st.cache_resource
def load_nltk_stopwords():
    nltk.download('stopwords')
    # Preserve negations so phrases like "not working" keep their meaning
    negation_words = {"not", "no", "nor", "n't", "never", "none", "nobody", "nothing", "neither", "nowhere", "hardly", "scarcely", "barely", "without"}
    return set(stopwords.words('english')) - negation_words


nlp = load_spacy_model()
stop_words = load_nltk_stopwords()

def preprocess_text(text):
    """Enhanced preprocessing for natural speech and varied inputs."""
    text = text.lower()
    
    # Remove repeated words (e.g., "the the" -> "the")
    text = re.sub(r'\b(\w+)( \1\b)+', r'\1', text)
    
    # Remove common filler words in speech
    filler_words = {'um', 'uh', 'actually', 'basically', 'like', 'you know', 'i mean', 'sort of', 'kind of', 'i guess'}
    words = text.split()
    words = [w for w in words if w not in filler_words]
    text = ' '.join(words)
    
    # Normalize common variations for card expiry
    text = text.replace('about to be expired', 'card expiring')
    text = text.replace('going to expire', 'card expiring')
    text = text.replace('gonna expire', 'card expiring')
    text = text.replace('is expired', 'card expired')
    text = text.replace('has expired', 'card expired')
    text = text.replace('already expired', 'card expired')
    text = text.replace('just expired', 'card expired')
    text = text.replace('card is now expired', 'card expired')
    
    # Remove stopwords but keep important negations
    text = ' '.join([word for word in text.split() if word not in stop_words])
    
    return text

def smart_split(text):
    """
    Splits text using banking-specific connectors with iterative application.
    
    Strategy:
    1. First try spaCy sentence segmentation for natural breaks
    2. If single sentence, apply banking-specific connectors iteratively
    3. Return list of meaningful text segments for multi-intent detection
    
    Banking connectors trigger intent boundaries:
    - "but", "however" = contrast in intents
    - "on top of that", "additionally", "also", "plus" = multiple intents
    - "then", "after" = sequential actions/intents
    """
    try:
        doc = nlp(text)
        
        # Step 1: Try spaCy sentence splitting first
        sentences = [sent.text.strip() for sent in doc.sents]
        if len(sentences) > 1:
            return sentences
    except Exception as e:
        st.warning(f"spaCy segmentation error: {str(e)}")
    
    # Step 2: Apply banking-specific connectors iteratively
    # Order matters: process longer connectors first to avoid partial matches
    banking_connectors = [
        ' on top of that ',
        ' additionally ',
        ' however ',
        ' but ',
        ' also ',
        ' plus ',
        ' then ',
        ' after ',
        ' and ',
        ' or ',
    ]
    
    parts = [text]
    
    for connector in banking_connectors:
        new_parts = []
        for part in parts:
            # Check if connector exists (case-insensitive)
            if connector.lower() in part.lower():
                # Split and keep non-empty parts
                split_result = part.split(connector) if connector == ' and ' or connector == ' or ' else part.split(connector)
                split_result = [p.strip() for p in split_result if p.strip()]
                new_parts.extend(split_result)
            else:
                new_parts.append(part)
        
        # Update parts list for next iteration
        # Only replace if we actually split something
        if len(new_parts) > len(parts):
            parts = new_parts
            break  # Stop at first successful split
    
    return parts if parts else [text]

def predict_top_k(text, model, tokenizer, top_k=5, confidence_threshold=0.15, max_length=128, temperature=1.5):
    """
    Predicts top-K intents for a given text using softmax + topk with temperature scaling.
    
    Temperature scaling widens probability distribution:
    - temperature=1.0 (default): Normal softmax, concentrates on top intent
    - temperature=1.5+: Flatter distribution, secondary intents get higher scores
    - temperature=2.0+: Very flat, spreads probability across many intents
    
    Returns:
        List of dicts: [{"intent_label": int, "intent_name": str, "confidence": float}, ...]
        Filtered by confidence_threshold. Empty list if no intents meet threshold.
    
    Args:
        text: Input banking query
        model: DistilBertForSequenceClassification model
        tokenizer: DistilBertTokenizer
        top_k: Number of top predictions to return
        confidence_threshold: Minimum confidence score (0.0 to 1.0)
        max_length: Maximum token length for truncation
        temperature: Controls probability distribution width (higher = wider)
    """
    text = preprocess_text(text)
    inputs = tokenizer(
        text,
        padding='max_length',
        truncation=True,
        max_length=max_length,
        return_tensors="pt"
    )
    model_device = next(model.parameters()).device
    inputs = {k: v.to(model_device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
    
    # Apply temperature scaling: divide logits by temperature
    # Higher temperature = flatter distribution = higher secondary intent confidence
    logits_scaled = logits / temperature
    
    # Apply softmax to convert logits to probabilities (confidence scores)
    probabilities = F.softmax(logits_scaled, dim=1)
    
    # Get top-k predictions using torch.topk
    top_k_probs, top_k_indices = torch.topk(probabilities, k=top_k, dim=1)
    
    # Extract values from tensors
    top_k_probs = top_k_probs[0].cpu().numpy()
    top_k_indices = top_k_indices[0].cpu().numpy()
    
    # Build result list with intent names and filter by confidence threshold
    results = []
    for prob, label_idx in zip(top_k_probs, top_k_indices):
        # Only include if confidence meets threshold
        if prob >= confidence_threshold:
            raw_intent_name = classes.get(int(label_idx), "unknown intent")
            intent_name = normalize_intent_name(raw_intent_name)
            results.append({
                "intent_label": int(label_idx),
                "intent_name": intent_name,
                "confidence": float(prob)
            })
    
    return results

def prioritize_intents(intents_list, confidence_threshold=0.20):
    """
    Prioritizes intents based on severity and confidence.
    Also adds semantically related intents via INTENT_RELATIONSHIPS.
    
    Strategy:
    - Keep ALL intents above confidence_threshold
    - For primary intent, add its related intents (from INTENT_RELATIONSHIPS)
    - If related intent also appears in top-k, boost its confidence
    - Sort by priority (severity)
    
    Returns:
        Sorted list of intents by priority (descending)
    """
    if not intents_list:
        return []
    
    # Get priority value for each intent (default to 0 if not in dict)
    for intent in intents_list:
        intent['priority'] = INTENT_PRIORITY_NORMALIZED.get(intent['intent_name'], 0)
    
    # Filter by confidence threshold
    above_threshold = [i for i in intents_list if i['confidence'] >= confidence_threshold]
    
    # If nothing above threshold, return highest priority one
    if not above_threshold:
        above_threshold = sorted(intents_list, key=lambda x: x['priority'], reverse=True)[:1]
    
    # Get primary intent (highest priority)
    primary_intent = above_threshold[0]['intent_name'] if above_threshold else None
    
    # Add related intents from INTENT_RELATIONSHIPS (normalized)
    if primary_intent and primary_intent in INTENT_RELATIONSHIPS_NORMALIZED:
        related_intents = INTENT_RELATIONSHIPS_NORMALIZED[primary_intent]
        existing_intent_names = {i['intent_name'] for i in above_threshold}
        
        # Check if any related intents are in the full list
        for related in related_intents:
            if related not in existing_intent_names:
                # Find in full list and add if present
                for intent in intents_list:
                    if intent['intent_name'] == related and intent not in above_threshold:
                        # Add related intent even if below threshold (they're semantically validated)
                        above_threshold.append(intent)
                        break
    
    # Sort by priority (descending) to show critical issues first
    above_threshold.sort(key=lambda x: x['priority'], reverse=True)
    
    return above_threshold

@st.cache_data(ttl=3600, show_spinner=False)
def cached_predict_multiple_intents(text, confidence_threshold=0.20):
    """
    Detects multiple intents in a banking query with severity prioritization.
    
    Process:
    1. Split text into contextual segments using smart_split()
    2. For each segment, predict top-K intents
    3. Prioritize intents by severity
    4. Calculate overall query complexity based on detected intents
    
    Returns:
        results: List of segments with detected intents
        complexity: "simple" or "complex" classification
        
    Output format:
    {
        "text": "...",
        "intents": [
            {"intent_name": "card_swallowed", "confidence": 0.87, "priority": 10},
            {"intent_name": "declined_cash_withdrawal", "confidence": 0.62, "priority": 9}
        ]
    }
    """
    start_time = time.time()
    print("[CACHE] Running intent detection...")
    model, tokenizer = load_intent_model()

    # Helper: apply keyword overrides (hard safety) and suppression rules
    def apply_overrides_and_suppression(segment_text, intents):
        text_lower = segment_text.lower()
        # 1) Hard safety overrides: if keyword matches, inject intent with conf=1.0, priority=10
        for intent_name, keywords in CRITICAL_KEYWORD_OVERRIDES_NORMALIZED.items():
            if any(kw in text_lower for kw in keywords):
                intents.append({
                    "intent_label": -1,
                    "intent_name": intent_name,
                    "confidence": 1.0,
                    "priority": 10
                })
        # 1b) Soft hints: add/boost common usability intents when keywords appear
        for hint in SOFT_KEYWORD_HINTS_NORMALIZED:
            if any(kw in text_lower for kw in hint["keywords"]):
                existing = next((i for i in intents if i["intent_name"] == hint["intent"]), None)
                hint_priority = INTENT_PRIORITY_NORMALIZED.get(hint["intent"], 0)
                if existing:
                    existing["confidence"] = max(existing.get("confidence", 0.0), hint["confidence"])
                    existing["priority"] = max(existing.get("priority", 0), hint_priority)
                else:
                    intents.append({
                        "intent_label": -1,
                        "intent_name": hint["intent"],
                        "confidence": hint["confidence"],
                        "priority": hint_priority,
                    })
        # 2) Suppression rules: remove intents if suppression keywords present
        filtered = []
        for intent in intents:
            intent_name = intent['intent_name']
            suppress_keywords = SUPPRESSION_RULES_NORMALIZED.get(intent_name, [])
            if suppress_keywords and any(kw in text_lower for kw in suppress_keywords):
                continue  # suppress
            filtered.append(intent)
        return filtered

    # Step 1: Split text into segments
    text_segments = smart_split(text)

    results = []
    all_detected_intents = []

    # Step 2: Predict intents for each segment
    for segment in text_segments:
        # Get top-K predictions for this segment
        # Lower threshold for natural speech variations
        top_k_intents = predict_top_k(
            segment,
            model,
            tokenizer,
            top_k=5,
            confidence_threshold=0.05,  # Lowered from 0.08 for better recall
            temperature=1.0
        )
        
        # Apply overrides and suppression
        top_k_intents = apply_overrides_and_suppression(segment, top_k_intents)
        
        # Prioritize intents within this segment
        prioritized_intents = prioritize_intents(top_k_intents, confidence_threshold=0.05)  # Lowered threshold
        prioritized_intents = prioritized_intents[:3]
        
        # Determine primary intent (highest priority within this segment)
        primary_intent = prioritized_intents[0]['intent_name'] if prioritized_intents else None
        
        # Format output: keep intent_name and confidence
        intent_output = [
            {
                "intent": intent['intent_name'],
                "confidence": round(intent['confidence'], 4),
                "priority": intent.get('priority', 0)
            }
            for intent in prioritized_intents
        ]
        
        results.append({
            "text": segment,
            "primary_intent": primary_intent,
            "intents": intent_output
        })
        
        all_detected_intents.extend([i['intent'] for i in intent_output if i['intent']])
    
    # Step 3: Determine overall query complexity
    # Multiple intents are complex; only a single simple intent is simple.
    unique_intents = list(set(all_detected_intents))

    if len(unique_intents) >= 2:
        complexity = "complex"
    elif len(unique_intents) == 1 and unique_intents[0] in SIMPLE_INTENTS_NORMALIZED:
        complexity = "simple"
    else:
        complexity = "complex"

    elapsed = time.time() - start_time
    print(f"[CACHE] Intent detection completed in {elapsed:.2f}s")
    return results, complexity


def predict_multiple_intents(text, model, tokenizer, confidence_threshold=0.20):
    return cached_predict_multiple_intents(text, confidence_threshold=confidence_threshold)


def collect_detected_intents(results):
    intents = []
    for segment_result in results:
        for intent_data in segment_result.get("intents", []):
            if intent_data.get("intent"):
                intents.append(intent_data["intent"])
    return intents


def should_use_llm(results, overall_complexity):
    has_any_intent = any(segment.get("intents") for segment in results)
    return overall_complexity == "complex" or not has_any_intent


def handle_complex_query(query: str):
    messages = [
        {"role": "system", "content": COMPLEX_QUERY_SYSTEM_PROMPT},
        {"role": "user", "content": query},
    ]
    return generate_llm_response_chat(messages, temperature=0.25)


def handle_complex_query_stream(query: str):
    messages = [
        {"role": "system", "content": COMPLEX_QUERY_SYSTEM_PROMPT},
        {"role": "user", "content": query},
    ]
    return generate_llm_response_chat_stream(messages, temperature=0.25)


def handle_complex_query_with_session(query: str):
    """Handle complex query using session state to maintain conversation context"""
    # Add user message to session state
    st.session_state["banking_chat_messages"].append({
        "role": "user", 
        "content": query
    })
    
    # Generate response using full conversation history
    response = generate_llm_response_chat(st.session_state["banking_chat_messages"], temperature=0.25)
    
    # Add assistant response to session state
    st.session_state["banking_chat_messages"].append({
        "role": "assistant",
        "content": response
    })
    
    return response


def handle_complex_query_stream_with_session(query: str):
    """Handle complex query with streaming using session state to maintain conversation context"""
    # Add user message to session state first
    st.session_state["banking_chat_messages"].append({
        "role": "user", 
        "content": query
    })
    
    # Stream response using full conversation history
    response_stream = generate_llm_response_chat_stream(st.session_state["banking_chat_messages"], temperature=0.25)
    
    # Collect the streamed response and add to session state
    full_response = ""
    for chunk in response_stream:
        full_response += chunk
        yield chunk
    
    # Add complete assistant response to session state
    st.session_state["banking_chat_messages"].append({
        "role": "assistant",
        "content": full_response.strip()
    })


st.title("Banking Intent Detection App")

assistant_mode = st.radio(
    "Choose assistant mode",
    ["Banking Assistant", "Marketing Assistant"],
    horizontal=True,
    key="assistant_mode_selector",
)

if assistant_mode == "Marketing Assistant":
    st.header("Marketing Speech Generator")
    st.caption("Uses local Ollama model finance-chat:latest (locked) in a context-aware chat for outbound speech + follow-up Q&A.")

    if "marketing_chat_messages" not in st.session_state:
        st.session_state["marketing_chat_messages"] = []

    marketing_details = st.text_area(
        "Business context",
        placeholder=(
            "Describe the product/service, target audience, campaign objective, channels, tone, and CTA.\n"
            "Example: Launching a student savings account for college students via Instagram and campus events."
        ),
        key="marketing_details_input",
    )

    marketing_temperature = st.slider(
        "Creativity (temperature)",
        min_value=0.1,
        max_value=2.0,
        value=0.7,
        step=0.1,
        key="marketing_temperature",
    )

    clear_col, _ = st.columns([1, 4])
    with clear_col:
        if st.button("Clear Chat", key="marketing_clear_chat"):
            st.session_state["marketing_chat_messages"] = []

    for message in st.session_state["marketing_chat_messages"]:
        role = "assistant" if message.get("role") == "assistant" else "user"
        with st.chat_message(role):
            st.write(message.get("content", ""))

    marketing_user_prompt = st.chat_input("Ask for a sales speech, objection handling, or customer Q&A response")

    if marketing_user_prompt:
        st.session_state["marketing_chat_messages"].append({
            "role": "user",
            "content": marketing_user_prompt,
        })

        with st.chat_message("user"):
            st.write(marketing_user_prompt)

        with st.chat_message("assistant"):
            marketing_start = time.time()
            marketing_box = st.empty()
            marketing_text = ""
            last_ui_flush = marketing_start
            ui_flush_interval_seconds = 0
            try:
                for chunk in generate_marketing_chat_response_stream(
                    st.session_state["marketing_chat_messages"],
                    business_context=marketing_details.strip(),
                    temperature=marketing_temperature,
                ):
                    marketing_text += chunk
                    now = time.time()
                    should_flush = (now - last_ui_flush) >= ui_flush_interval_seconds or chunk.endswith((".", "!", "?", "\n"))
                    if should_flush:
                        marketing_box.write(marketing_text)
                        last_ui_flush = now

                if marketing_text:
                    marketing_box.write(marketing_text)

                st.session_state["marketing_chat_messages"].append({
                    "role": "assistant",
                    "content": marketing_text.strip(),
                })
                marketing_elapsed = time.time() - marketing_start
                st.caption(f"⏱️ Marketing generation: {marketing_elapsed:.2f}s")
            except Exception as e:
                st.error(f"Error generating marketing response: {str(e)}")

    st.stop()

# Initialize complex banking chat session state
if "banking_chat_messages" not in st.session_state:
    st.session_state["banking_chat_messages"] = [
        {"role": "system", "content": COMPLEX_QUERY_SYSTEM_PROMPT}
    ]

# Display banking chat history and provide clear option
non_system_messages = [msg for msg in st.session_state["banking_chat_messages"] if msg.get("role") != "system"]
if non_system_messages:
    st.subheader("Banking Chat History")
    
    # Clear chat button
    clear_col, _ = st.columns([1, 4])
    with clear_col:
        if st.button("Clear Chat", key="banking_clear_chat"):
            st.session_state["banking_chat_messages"] = [
                {"role": "system", "content": COMPLEX_QUERY_SYSTEM_PROMPT}
            ]
            st.rerun()
    
    # Display chat messages (excluding system messages)
    for message in st.session_state["banking_chat_messages"]:
        if message.get("role") == "system":
            continue
        role = "assistant" if message.get("role") == "assistant" else "user"
        with st.chat_message(role):
            st.write(message.get("content", ""))

# Interface managing both text and speech input
st.write("### Enter your banking query")

col1, col2 = st.columns([4, 1])

with col1:
    text_input = st.text_input("Text", placeholder="Type your query or use the microphone to speak...")

with col2:
    audio_input = st.audio_input("🎤", key="audio_recorder")


if text_input:
    if st.button("Predict Intent", key="text_predict"):
        total_start = time.time()
        st.info("Analyzing query for multiple intents...")
        intent_start = time.time()
        results, overall_complexity = cached_predict_multiple_intents(text_input)
        intent_elapsed = time.time() - intent_start
        st.caption(f"⏱️ Intent detection: {intent_elapsed:.2f}s")
        
        # Display overall complexity
        complexity_color = "🟢" if overall_complexity == "simple" else "🔴"
        st.markdown(f"### {complexity_color} Overall Complexity: **{overall_complexity.upper()}**")
        
        st.subheader("Detected Intents by Segment:")
        for i, segment_result in enumerate(results, 1):
            st.write(f"**Segment {i}:** {segment_result['text']}")
            
            if segment_result['intents']:
                # Create a table-like display for intents
                for idx, intent_data in enumerate(segment_result['intents']):
                    intent_name = intent_data['intent']
                    confidence = intent_data['confidence']
                    priority = intent_data['priority']
                    
                    # Determine complexity badge for individual intent
                    intent_complexity = "🟢 Simple" if intent_name in SIMPLE_INTENTS_NORMALIZED else "🔴 Complex"
                    
                    # Color code confidence: green if high, yellow if medium, red if low
                    if confidence >= 0.7:
                        confidence_badge = "🟢"
                    elif confidence >= 0.5:
                        confidence_badge = "🟡"
                    else:
                        confidence_badge = "🔵"
                    
                    col1, col2, col3, col4 = st.columns([2, 1.5, 1.5, 1])
                    with col1:
                        st.write(f"├─ **{intent_name}**")
                    with col2:
                        st.write(f"Confidence: {confidence_badge} {confidence:.1%}")
                    with col3:
                        st.write(f"Priority: {priority}")
                    with col4:
                        st.write(intent_complexity)
                    
                    # Only show FAQ if:
                    # 1. Overall query is SIMPLE
                    # 2. Intent is SIMPLE
                    # 3. It's the PRIMARY intent (first one, idx == 0)
                    if overall_complexity == "simple" and intent_name in SIMPLE_INTENTS_NORMALIZED and idx == 0:
                        faq_result = search_faq(segment_result['text'], predicted_intent=intent_name)
                        if faq_result:
                            with st.expander(f"📚 FAQ Answer for {intent_name}"):
                                st.write(faq_result['answer'])
                                st.caption(f"FAQ Confidence: {faq_result['confidence']:.1%}")
                            
                            # Add FAQ response to session state
                            st.session_state["banking_chat_messages"].append({
                                "role": "user", 
                                "content": text_input
                            })
                            st.session_state["banking_chat_messages"].append({
                                "role": "assistant",
                                "content": f"FAQ Answer for {intent_name}: {faq_result['answer']}"
                            })
            else:
                st.warning(f"├─ No intents detected with sufficient confidence")
            
            st.divider()

        # Handle LLM responses for complex queries or simple queries without FAQ answers
        should_use_llm_for_simple = False
        faq_provided = False
        
        # Check if FAQ was provided for simple intent
        if overall_complexity == "simple":
            for segment_result in results:
                if segment_result['intents']:
                    primary_intent = segment_result['intents'][0]['intent']
                    if primary_intent in SIMPLE_INTENTS_NORMALIZED:
                        faq_result = search_faq(segment_result['text'], predicted_intent=primary_intent)
                        if faq_result:
                            faq_provided = True
                            break
        
        # Use LLM if complex, no intents detected, or simple intent without FAQ
        if overall_complexity == "complex" or not bool(collect_detected_intents(results)) or (overall_complexity == "simple" and not faq_provided):
            has_any_intent = bool(collect_detected_intents(results))
            llm_start = time.time()
            st.subheader("LLM Response")
            response_box = st.empty()
            llm_text = ""
            if overall_complexity == "complex" or not has_any_intent:
                stream = handle_complex_query_stream_with_session(text_input)
            else:
                # For simple intents without FAQ, use regular LLM but add to session state
                stream = generate_llm_response_stream(text_input)
            for chunk in stream:
                llm_text += chunk
                response_box.write(llm_text)
            llm_elapsed = time.time() - llm_start
            st.caption(f"⏱️ LLM: {llm_elapsed:.2f}s")
            
            # Add simple intent LLM response to session state
            if overall_complexity == "simple" and not faq_provided:
                st.session_state["banking_chat_messages"].append({
                    "role": "user", 
                    "content": text_input
                })
                st.session_state["banking_chat_messages"].append({
                    "role": "assistant",
                    "content": llm_text.strip()
                })

        total_elapsed = time.time() - total_start
        st.success(f"✅ Total time: {total_elapsed:.2f}s")
        
        # Rerun to update chat history display
        st.rerun()



if audio_input is not None:
    if whisper_model is None:
        st.error("❌ Whisper model is not available. Please try with text input or refresh the page.")
    else:
        tmp_dir = tempfile.gettempdir()
        tmp_path = os.path.join(tmp_dir, "banking_audio.wav")
        
        try:
            with open(tmp_path, "wb") as f:
                f.write(audio_input.getbuffer())
            
            st.info("Transcribing audio...")
            result = whisper_model.transcribe(tmp_path)
            transcribed_text = result["text"]
            st.write(f"**Transcribed Text:** {transcribed_text}")
            
            total_start = time.time()
            st.info("Analyzing query for multiple intents...")
            intent_start = time.time()
            results, overall_complexity = cached_predict_multiple_intents(transcribed_text)
            intent_elapsed = time.time() - intent_start
            st.caption(f"⏱️ Intent detection: {intent_elapsed:.2f}s")
            
            # Display overall complexity
            complexity_color = "🟢" if overall_complexity == "simple" else "🔴"
            st.markdown(f"### {complexity_color} Overall Complexity: **{overall_complexity.upper()}**")
            
            st.subheader("Detected Intents by Segment:")
            for i, segment_result in enumerate(results, 1):
                st.write(f"**Segment {i}:** {segment_result['text']}")
                
                if segment_result['intents']:
                    # Create a table-like display for intents
                    for idx, intent_data in enumerate(segment_result['intents']):
                        intent_name = intent_data['intent']
                        confidence = intent_data['confidence']
                        priority = intent_data['priority']
                        
                        # Determine complexity badge for individual intent
                        intent_complexity = "🟢 Simple" if intent_name in SIMPLE_INTENTS_NORMALIZED else "🔴 Complex"
                        
                        # Color code confidence: green if high, yellow if medium, red if low
                        if confidence >= 0.7:
                            confidence_badge = "🟢"
                        elif confidence >= 0.5:
                            confidence_badge = "🟡"
                        else:
                            confidence_badge = "🔵"
                        
                        col1, col2, col3, col4 = st.columns([2, 1.5, 1.5, 1])
                        with col1:
                            st.write(f"├─ **{intent_name}**")
                        with col2:
                            st.write(f"Confidence: {confidence_badge} {confidence:.1%}")
                        with col3:
                            st.write(f"Priority: {priority}")
                        with col4:
                            st.write(intent_complexity)
                        
                        # Only show FAQ if:
                        # 1. Overall query is SIMPLE
                        # 2. Intent is SIMPLE
                        # 3. It's the PRIMARY intent (first one, idx == 0)
                        if overall_complexity == "simple" and intent_name in SIMPLE_INTENTS_NORMALIZED and idx == 0:
                            faq_result = search_faq(segment_result['text'], predicted_intent=intent_name)
                            if faq_result:
                                with st.expander(f"📚 FAQ Answer for {intent_name}"):
                                    st.write(faq_result['answer'])
                                    st.caption(f"FAQ Confidence: {faq_result['confidence']:.1%}")
                                
                                # Add FAQ response to session state
                                st.session_state["banking_chat_messages"].append({
                                    "role": "user", 
                                    "content": transcribed_text
                                })
                                st.session_state["banking_chat_messages"].append({
                                    "role": "assistant",
                                    "content": f"FAQ Answer for {intent_name}: {faq_result['answer']}"
                                })
                else:
                    st.warning(f"├─ No intents detected with sufficient confidence")
                
                st.divider()

            # Handle LLM responses for complex queries or simple queries without FAQ answers
            faq_provided = False
            
            # Check if FAQ was provided for simple intent
            if overall_complexity == "simple":
                for segment_result in results:
                    if segment_result['intents']:
                        primary_intent = segment_result['intents'][0]['intent']
                        if primary_intent in SIMPLE_INTENTS_NORMALIZED:
                            faq_result = search_faq(segment_result['text'], predicted_intent=primary_intent)
                            if faq_result:
                                faq_provided = True
                                break
            
            # Use LLM if complex, no intents detected, or simple intent without FAQ
            if overall_complexity == "complex" or not bool(collect_detected_intents(results)) or (overall_complexity == "simple" and not faq_provided):
                has_any_intent = bool(collect_detected_intents(results))
                llm_start = time.time()
                st.subheader("LLM Response")
                response_box = st.empty()
                llm_text = ""
                if overall_complexity == "complex" or not has_any_intent:
                    stream = handle_complex_query_stream_with_session(transcribed_text)
                else:
                    # For simple intents without FAQ, use regular LLM but add to session state
                    stream = generate_llm_response_stream(transcribed_text)
                for chunk in stream:
                    llm_text += chunk
                    response_box.write(llm_text)
                llm_elapsed = time.time() - llm_start
                st.caption(f"⏱️ LLM: {llm_elapsed:.2f}s")
                
                # Add simple intent LLM response to session state
                if overall_complexity == "simple" and not faq_provided:
                    st.session_state["banking_chat_messages"].append({
                        "role": "user", 
                        "content": transcribed_text
                    })
                    st.session_state["banking_chat_messages"].append({
                        "role": "assistant",
                        "content": llm_text.strip()
                    })

            total_elapsed = time.time() - total_start
            st.success(f"✅ Total time: {total_elapsed:.2f}s")
            
            # Rerun to update chat history display
            st.rerun()
        except Exception as e:
            st.error(f"Error processing audio: {str(e)}")
        finally:
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except:
                pass
