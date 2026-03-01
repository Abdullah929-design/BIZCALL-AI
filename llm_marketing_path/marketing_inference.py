import json
import os
import re
from typing import Any, Optional
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen


OLLAMA_MARKETING_BASE_URL = os.getenv("OLLAMA_MARKETING_BASE_URL", os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
OLLAMA_MARKETING_MODEL = os.getenv("OLLAMA_MARKETING_MODEL", "finance-chat:latest").strip()
OLLAMA_MARKETING_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_MARKETING_TIMEOUT_SECONDS", os.getenv("OLLAMA_TIMEOUT_SECONDS", "180")))
OLLAMA_MARKETING_STREAM_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_MARKETING_STREAM_TIMEOUT_SECONDS", os.getenv("OLLAMA_MARKETING_TIMEOUT_SECONDS", os.getenv("OLLAMA_TIMEOUT_SECONDS", "300"))))
OLLAMA_MARKETING_KEEP_ALIVE = os.getenv("OLLAMA_MARKETING_KEEP_ALIVE", os.getenv("OLLAMA_KEEP_ALIVE", "30m"))
OLLAMA_MARKETING_TRUNCATION_NUM_PREDICT = os.getenv("OLLAMA_MARKETING_TRUNCATION_NUM_PREDICT", "320")

_cpu_count = os.cpu_count() or 4
DEFAULT_MARKETING_NUM_THREAD = max(2, min(4, _cpu_count))
DEFAULT_MARKETING_NUM_CTX = int(os.getenv("OLLAMA_MARKETING_DEFAULT_NUM_CTX", "768"))
DEFAULT_MARKETING_NUM_PREDICT = int(os.getenv("OLLAMA_MARKETING_DEFAULT_NUM_PREDICT", "256"))


LOW_QUALITY_OUTPUT_MARKERS = (
    "lorem ipsum",
    "<p>",
    "</p>",
    "additional resources",
    "### response:",
    "understood, i will",
    "please let me know if you have any questions",
)

PROMPT_ARTIFACT_MARKERS = (
    "[INST]",
    "[INST",
    "[/INST]",
    "[/INST",
    "<<SYS>>",
    "<</SYS>>",
)

MARKETING_CHAT_SYSTEM_PROMPT = (
    "You are an expert outbound calling marketing agent. "
    "Your job is to generate persuasive spoken sales pitches and handle follow-up customer questions or objections naturally. "
    "Keep continuity with prior turns, reuse earlier business facts, and never contradict previous accepted facts. "
    "If the user asks for a speech, provide a ready-to-speak pitch with: hook, value, offer-fit, and clear CTA. "
    "If the user asks a question or raises an objection, answer directly in a conversational call-center style and then guide toward next step. "
    "Do not invent missing facts, numbers, offers, audiences, or channels. "
    "No placeholders, no HTML, no meta commentary."
)


def _get_env_float(name: str) -> Optional[float]:
    value = os.getenv(name)
    if value in (None, ""):
        return None
    return float(value)


def _get_env_int(name: str) -> Optional[int]:
    value = os.getenv(name)
    if value in (None, ""):
        return None
    return int(value)


def _build_marketing_options(temperature: Optional[float] = None) -> dict[str, Any]:
    options: dict[str, Any] = {}

    if temperature is not None:
        options["temperature"] = temperature

    top_p = _get_env_float("OLLAMA_MARKETING_TOP_P")
    if top_p is not None:
        options["top_p"] = top_p

    repeat_penalty = _get_env_float("OLLAMA_MARKETING_REPEAT_PENALTY")
    if repeat_penalty is not None:
        options["repeat_penalty"] = repeat_penalty

    num_predict = _get_env_int("OLLAMA_MARKETING_NUM_PREDICT")
    options["num_predict"] = num_predict if num_predict is not None else DEFAULT_MARKETING_NUM_PREDICT

    num_ctx = _get_env_int("OLLAMA_MARKETING_NUM_CTX")
    options["num_ctx"] = num_ctx if num_ctx is not None else DEFAULT_MARKETING_NUM_CTX

    num_thread = _get_env_int("OLLAMA_MARKETING_NUM_THREAD")
    options["num_thread"] = num_thread if num_thread is not None else DEFAULT_MARKETING_NUM_THREAD

    return options


def _sanitize_prompt_text(text: str) -> str:
    cleaned = text or ""
    for marker in PROMPT_ARTIFACT_MARKERS:
        cleaned = cleaned.replace(marker, " ")
    cleaned = cleaned.replace("### Instruction:", " ")
    cleaned = cleaned.replace("### Response:", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _extract_response_text(text: str) -> str:
    cleaned = (text or "").strip()
    
    # Remove prompt artifacts
    if "### Response:" in cleaned:
        cleaned = cleaned.split("### Response:", 1)[1].strip()
    if "### Instruction:" in cleaned:
        cleaned = cleaned.split("### Instruction:", 1)[0].strip()
    
    # Remove marketing slide artifacts and special tokens
    artifacts_to_remove = [
        r'\[Slide \d+: [^\]]*\]',  # [Slide 5: Value], [Slide 6: Offer-Fit], etc.
        r'<unk>',                    # <unk> tokens
        r'<s>',                      # <s> tokens
        r'</s>',                     # </s> tokens
        r'Customer:',                 # Customer: prefix
        r'Agent:',                   # Agent: prefix
    ]
    
    for artifact in artifacts_to_remove:
        cleaned = re.sub(artifact, '', cleaned, flags=re.IGNORECASE)
    
    # Remove duplicate sentences and clean up whitespace
    sentences = cleaned.split('. ')
    unique_sentences = []
    seen = set()
    
    for sentence in sentences:
        sentence = sentence.strip()
        if sentence and sentence.lower() not in seen:
            seen.add(sentence.lower())
            unique_sentences.append(sentence)
    
    # Rejoin with proper spacing
    cleaned = '. '.join(unique_sentences)
    
    # Clean up extra whitespace and ensure proper ending
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    if cleaned and not cleaned.endswith(('.', '!', '?')):
        cleaned += '.'
    
    return cleaned


def _clean_streaming_chunk(chunk: str, accumulated_text: str = "") -> str:
    """Clean streaming chunks while preserving flow"""
    if not chunk:
        return ""
    
    # Remove obvious artifacts from chunks
    chunk_cleaned = re.sub(r'\[Slide \d+: [^\]]*\]', '', chunk, flags=re.IGNORECASE)
    chunk_cleaned = re.sub(r'<unk>', '', chunk_cleaned)
    chunk_cleaned = re.sub(r'<s>', '', chunk_cleaned)
    chunk_cleaned = re.sub(r'</s>', '', chunk_cleaned)
    chunk_cleaned = re.sub(r'Customer:', '', chunk_cleaned, flags=re.IGNORECASE)
    chunk_cleaned = re.sub(r'Agent:', '', chunk_cleaned, flags=re.IGNORECASE)
    
    # Remove repeated phrases that commonly appear
    chunk_cleaned = re.sub(r'Come check us out today!\s*Come check us out today!', 'Come check us out today!', chunk_cleaned)
    chunk_cleaned = re.sub(r'great price\.\s*great price\.', 'great price.', chunk_cleaned)
    
    # Clean up extra whitespace
    chunk_cleaned = re.sub(r'\s+', ' ', chunk_cleaned)
    
    return chunk_cleaned


def _maybe_retry_on_truncation(path: str, payload: dict[str, Any], response: dict[str, Any]) -> dict[str, Any]:
    done_reason = response.get("done_reason")
    if done_reason != "length":
        return response

    retry_num_predict = _get_env_int("OLLAMA_MARKETING_TRUNCATION_NUM_PREDICT")
    if retry_num_predict is None:
        retry_num_predict = int(OLLAMA_MARKETING_TRUNCATION_NUM_PREDICT)

    options = dict(payload.get("options") or {})
    options["num_predict"] = retry_num_predict
    retry_payload = dict(payload)
    retry_payload["options"] = options
    return _post_json(path, retry_payload)


def _post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = f"{OLLAMA_MARKETING_BASE_URL.rstrip('/')}{path}"
    body = json.dumps(payload).encode("utf-8")
    request = Request(url, data=body, headers={"Content-Type": "application/json"})

    try:
        with urlopen(request, timeout=OLLAMA_MARKETING_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8") if exc.fp else str(exc)
        raise RuntimeError(f"Ollama HTTP error {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError("Failed to reach Ollama. Is the server running on 11434?") from exc

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Invalid JSON response from Ollama.") from exc


def _post_json_stream(path: str, payload: dict[str, Any]):
    url = f"{OLLAMA_MARKETING_BASE_URL.rstrip('/')}{path}"
    body = json.dumps(payload).encode("utf-8")
    request = Request(url, data=body, headers={"Content-Type": "application/json"})

    try:
        with urlopen(request, timeout=OLLAMA_MARKETING_STREAM_TIMEOUT_SECONDS) as response:
            for raw_line in response:
                line = raw_line.decode("utf-8").strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue
    except HTTPError as exc:
        detail = exc.read().decode("utf-8") if exc.fp else str(exc)
        raise RuntimeError(f"Ollama HTTP error {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError("Failed to reach Ollama. Is the server running on 11434?") from exc


def build_marketing_prompt(marketing_details: str, strict: bool = False) -> str:
    normalized_details = _sanitize_prompt_text(marketing_details)
    key_details = _extract_key_details(normalized_details)
    key_details_text = ", ".join(key_details) if key_details else "all provided business details"

    base_instruction = (
        "Create a compelling marketing speech using only the business details provided in instruction. "
        "Use exact facts, numbers, audience, channels, and goals from the instruction. "
        "Do not invent missing details."
        "Directly start the response by a speech like a sales agent"
    )

    output_format = (
        "Output format:\n"
        "1) Hook (1 sentence)\n"
        "2) Core Value Proposition (2-3 sentences)\n"
        "3) Audience + Offer + Channel Fit (2-3 sentences)\n"
        "4) Clear Call-To-Action (1 sentence)\n"
    )

    quality_rules = (
        "Quality rules:\n"
        "- No placeholders, no lorem ipsum, no HTML tags.\n"
        "- No meta commentary such as 'Here is the pitch'.\n"
        f"- Include these key details verbatim where relevant: {key_details_text}.\n"
        "- Keep it natural, persuasive, and ready to speak aloud in 45-90 seconds.\n"
    )

    if strict:
        quality_rules += (
            "- Rewrite with precise business details and stronger specificity.\n"
            "- If any detail is missing, mention only one short assumption line at the end prefixed with 'Assumption:'.\n"
        )

    return (
        f"{base_instruction}\n\n"
        f"{output_format}\n"
        f"{quality_rules}\n"
        f"Business details:\n{normalized_details.strip()}"
    )


def _is_low_quality_marketing_output(text: str) -> bool:
    text_lower = (text or "").strip().lower()
    if not text_lower:
        return True
    return any(marker in text_lower for marker in LOW_QUALITY_OUTPUT_MARKERS)


def _extract_key_details(marketing_details: str) -> list[str]:
    details = _sanitize_prompt_text(marketing_details or "")
    extracted: list[str] = []

    regex_patterns = [
        r"\$\s?\d+[\d,]*(?:\.\d+)?\s*[kKmMbB]?",           # $30k, $49, $1,200
        r"₹\s?\d+[\d,]*(?:\.\d+)?\s*(?:crore|lakh|k|m)?",   # ₹3 crore
        r"\d+\s?%",                                              # 20%
        r"\d+\s?(?:day|days|week|weeks|month|months|year|years)",
        r"\d+\s?-\s?\d+",                                      # 22-35
        r"q[1-4]",                                                 # Q2
    ]

    for pattern in regex_patterns:
        for match in re.findall(pattern, details, flags=re.IGNORECASE):
            normalized = " ".join(match.strip().split())
            if normalized and normalized.lower() not in {x.lower() for x in extracted}:
                extracted.append(normalized)

    channel_keywords = [
        "instagram", "reels", "youtube", "linkedin", "facebook", "meta ads",
        "google ads", "whatsapp", "telegram", "email", "csr", "influencer",
        "campus events", "tv", "webinar",
    ]
    details_lower = details.lower()
    for keyword in channel_keywords:
        if keyword in details_lower and keyword.lower() not in {x.lower() for x in extracted}:
            extracted.append(keyword)

    return extracted[:12]


def _missing_key_details(marketing_details: str, generated_text: str) -> list[str]:
    expected = _extract_key_details(marketing_details)
    output_lower = (generated_text or "").lower()
    missing = [item for item in expected if item.lower() not in output_lower]
    return missing[:6]


def _build_retry_prompt(marketing_details: str, missing_details: list[str]) -> str:
    normalized_details = _sanitize_prompt_text(marketing_details)
    missing_text = ", ".join(missing_details) if missing_details else "all provided key details"
    return (
        "Rewrite the marketing speech with strict fidelity to the provided business details.\n"
        f"You must include these missing details verbatim: {missing_text}.\n"
        "Do not add new facts and do not alter provided numbers, age ranges, budgets, channels, or goals.\n"
        "No placeholders, no HTML, no meta commentary.\n\n"
        "Business details:\n"
        f"{normalized_details.strip()}"
    )


def _format_messages_for_prompt(messages: list[dict]) -> str:
    lines: list[str] = []
    trimmed = messages[-10:]

    for message in trimmed:
        role = (message.get("role") or "").strip().lower()
        content = _sanitize_prompt_text((message.get("content") or "").strip())
        if not content:
            continue

        if role == "assistant":
            lines.append(f"Agent: {content}")
        elif role == "system":
            lines.append(f"System: {content}")
        else:
            lines.append(f"Customer: {content}")

    return "\n".join(lines)


def build_marketing_chat_prompt(messages: list[dict], business_context: str = "", strict: bool = False) -> str:
    context_text = _sanitize_prompt_text((business_context or "").strip())
    conversation = _format_messages_for_prompt(messages)
    extracted = _extract_key_details(context_text)
    key_details_text = ", ".join(extracted) if extracted else "all provided business details"

    strict_rules = ""
    if strict:
        strict_rules = (
            "\nStrict rewrite rules:\n"
            f"- Include these details verbatim where relevant: {key_details_text}.\n"
            "- Keep the response specific and actionable for a live outbound call.\n"
        )

    return (
        f"{MARKETING_CHAT_SYSTEM_PROMPT}\n\n"
        "Operating style:\n"
        "- Spoken, human, and concise unless user asks for long form.\n"
        "- Handle objections with empathy + factual response + transition to CTA.\n"
        "- Use only facts from business context and chat history.\n"
        f"{strict_rules}\n"
        "Business context:\n"
        f"{context_text if context_text else 'No business context provided yet.'}\n\n"
        "Conversation so far:\n"
        f"{conversation if conversation else 'Customer has not spoken yet.'}\n\n"
        "Now respond as Agent."
    )


def _generate_once_with_model(prompt: str, temperature: Optional[float], model_name: str) -> str:
    options = _build_marketing_options(temperature=temperature)
    payload: dict[str, Any] = {
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "keep_alive": OLLAMA_MARKETING_KEEP_ALIVE,
    }
    if options:
        payload["options"] = options

    response = _post_json("/api/generate", payload)
    response = _maybe_retry_on_truncation("/api/generate", payload, response)
    return _extract_response_text((response.get("response") or "").strip())


def _generate_once(prompt: str, temperature: Optional[float], model_name: Optional[str] = None) -> tuple[str, str]:
    selected_model = model_name or OLLAMA_MARKETING_MODEL
    if not selected_model:
        raise RuntimeError("OLLAMA_MARKETING_MODEL is empty. Set it to your local Ollama model tag.")
    return _generate_once_with_model(prompt, temperature, selected_model), selected_model


def _stream_with_model(prompt: str, temperature: Optional[float], model_name: str):
    options = _build_marketing_options(temperature=temperature)
    payload: dict[str, Any] = {
        "model": model_name,
        "prompt": prompt,
        "stream": True,
        "keep_alive": OLLAMA_MARKETING_KEEP_ALIVE,
    }
    if options:
        payload["options"] = options

    streamed_text = ""
    final_done_reason = None
    for chunk in _post_json_stream("/api/generate", payload):
        if chunk.get("done"):
            final_done_reason = chunk.get("done_reason")
        chunk_text = chunk.get("response")
        if chunk_text:
            # Clean the chunk before yielding
            clean_chunk = _clean_streaming_chunk(chunk_text, streamed_text)
            streamed_text += clean_chunk
            yield clean_chunk

    if final_done_reason == "length":
        retry_num_predict = _get_env_int("OLLAMA_MARKETING_TRUNCATION_NUM_PREDICT")
        if retry_num_predict is None:
            retry_num_predict = int(OLLAMA_MARKETING_TRUNCATION_NUM_PREDICT)

        options = dict(options)
        options["num_predict"] = retry_num_predict

        continuation_prompt = (
            f"{prompt}\n\n"
            "Current draft that may have been cut due to length:\n"
            f"{streamed_text}\n\n"
            "Continue from exactly where this draft stopped. Do not repeat lines."
        )
        continuation_payload: dict[str, Any] = {
            "model": model_name,
            "prompt": continuation_prompt,
            "stream": False,
            "keep_alive": OLLAMA_MARKETING_KEEP_ALIVE,
            "options": options,
        }
        continuation_response = _post_json("/api/generate", continuation_payload)
        continuation_text = _extract_response_text((continuation_response.get("response") or "").strip())
        if continuation_text:
            yield continuation_text


def generate_marketing_response(marketing_details: str, temperature: Optional[float] = 0.7) -> str:
    prompt = build_marketing_prompt(marketing_details, strict=False)
    text, selected_model = _generate_once(prompt, temperature=temperature)

    if _is_low_quality_marketing_output(text):
        retry_prompt = build_marketing_prompt(marketing_details, strict=True)
        retry_temperature = 0.4 if temperature is None else min(temperature, 0.5)
        retry_text, _ = _generate_once(retry_prompt, temperature=retry_temperature, model_name=selected_model)
        if retry_text.strip() and not _is_low_quality_marketing_output(retry_text):
            text = retry_text

    return text


def generate_marketing_response_stream(marketing_details: str, temperature: Optional[float] = 0.7):
    prompt = build_marketing_prompt(marketing_details, strict=False)
    selected_model = OLLAMA_MARKETING_MODEL
    
    # Stream and clean chunks in real-time
    for chunk_text in _stream_with_model(prompt, temperature=temperature, model_name=selected_model):
        yield chunk_text


def generate_marketing_chat_response(messages: list[dict], business_context: str = "", temperature: Optional[float] = 0.7) -> str:
    prompt = build_marketing_chat_prompt(messages, business_context=business_context, strict=False)
    text, selected_model = _generate_once(prompt, temperature=temperature)

    if _is_low_quality_marketing_output(text):
        retry_temperature = 0.4 if temperature is None else min(temperature, 0.5)
        retry_prompt = build_marketing_chat_prompt(messages, business_context=business_context, strict=True)
        retry_text, _ = _generate_once(retry_prompt, temperature=retry_temperature, model_name=selected_model)
        if retry_text.strip() and not _is_low_quality_marketing_output(retry_text):
            text = retry_text

    return text


def generate_marketing_chat_response_stream(messages: list[dict], business_context: str = "", temperature: Optional[float] = 0.7):
    prompt = build_marketing_chat_prompt(messages, business_context=business_context, strict=False)
    selected_model = OLLAMA_MARKETING_MODEL
    
    # Stream and clean chunks in real-time
    accumulated_text = ""
    for chunk_text in _stream_with_model(prompt, temperature=temperature, model_name=selected_model):
        accumulated_text += chunk_text
        yield chunk_text
