import json
import os
from typing import Any, Optional
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "banking-model:latest")
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60"))
OLLAMA_KEEP_ALIVE = os.getenv("OLLAMA_KEEP_ALIVE", "3m")
OLLAMA_TRUNCATION_NUM_PREDICT = os.getenv("OLLAMA_TRUNCATION_NUM_PREDICT", "200")


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


def _build_options(temperature: Optional[float] = None) -> dict[str, Any]:
    options: dict[str, Any] = {}

    if temperature is not None:
        options["temperature"] = temperature

    top_p = _get_env_float("OLLAMA_TOP_P")
    if top_p is not None:
        options["top_p"] = top_p
    else:
        options["top_p"] = 0.8  # Default for faster responses

    repeat_penalty = _get_env_float("OLLAMA_REPEAT_PENALTY")
    if repeat_penalty is not None:
        options["repeat_penalty"] = repeat_penalty
    else:
        options["repeat_penalty"] = 1.05  # Reduced for faster flow

    num_predict = _get_env_int("OLLAMA_NUM_PREDICT")
    if num_predict is not None:
        options["num_predict"] = num_predict
    else:
        # Voice agent: 220 tokens ≈ 3-4 concise sentences with specific facts.
        # Still ~45% fewer tokens than the original 400, saving ~2-3s on CPU.
        options["num_predict"] = 220

    num_ctx = _get_env_int("OLLAMA_NUM_CTX")
    if num_ctx is not None:
        options["num_ctx"] = num_ctx
    else:
        # 768 = sweet spot: fits system prompt + 2-turn history + 300-char RAG snippet.
        # 1024 added ~4s prefill on this CPU; 512 was too tight for RAG. 768 is the balance.
        options["num_ctx"] = 768

    # i5 7th gen optimizations
    options["num_thread"] = 4   # Match physical CPU cores
    options["num_batch"] = 256  # Halved from 512 — reduces RAM bandwidth per step

    return options


def _post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = f"{OLLAMA_BASE_URL.rstrip('/')}{path}"
    body = json.dumps(payload).encode("utf-8")
    request = Request(url, data=body, headers={"Content-Type": "application/json"})

    try:
        with urlopen(request, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
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
    url = f"{OLLAMA_BASE_URL.rstrip('/')}{path}"
    body = json.dumps(payload).encode("utf-8")
    request = Request(url, data=body, headers={"Content-Type": "application/json"})

    try:
        with urlopen(request, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
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


def build_prompt(user_text: str) -> str:
    # Optimized prompt for i5 7th gen - shorter, more direct
    return (
        f"Q: {user_text}\n"
        "A:"
    )


def build_chat_prompt(messages: list[dict]) -> str:
    # Optimized chat prompt for i5 7th gen - shorter format
    system_text = ""
    user_texts = []

    for message in messages:
        role = (message.get("role") or "").strip().lower()
        content = (message.get("content") or "").strip()
        if not content:
            continue
        if role == "system":
            system_text = content
        elif role == "user":
            user_texts.append(content)

    # Use only last 3 messages to reduce context for i5
    recent_messages = user_texts[-3:] if len(user_texts) > 3 else user_texts
    user_text = "\n".join([f"Q: {msg}" for msg in recent_messages])
    
    if system_text:
        return f"System: {system_text}\n{user_text}\nA:"
    else:
        return f"{user_text}\nA:"


def _maybe_retry_on_truncation(path: str, payload: dict[str, Any], response: dict[str, Any]) -> dict[str, Any]:
    done_reason = response.get("done_reason")
    if done_reason != "length":
        return response

    if not OLLAMA_TRUNCATION_NUM_PREDICT:
        return response

    options = dict(payload.get("options") or {})
    options["num_predict"] = int(OLLAMA_TRUNCATION_NUM_PREDICT)
    retry_payload = dict(payload)
    retry_payload["options"] = options
    return _post_json(path, retry_payload)


def generate_llm_response(user_text: str) -> str:
    prompt = build_prompt(user_text)
    options = _build_options()
    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "keep_alive": OLLAMA_KEEP_ALIVE,
    }
    if options:
        payload["options"] = options

    response = _post_json("/api/generate", payload)
    response = _maybe_retry_on_truncation("/api/generate", payload, response)
    text = (response.get("response") or "").strip()
    # Optimized extraction for new Q: A: format
    if "A:" in text:
        return text.split("A:", 1)[1].strip()
    return text


def generate_llm_response_stream(user_text: str):
    prompt = build_prompt(user_text)
    options = _build_options()
    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": True,
        "keep_alive": OLLAMA_KEEP_ALIVE,
    }
    if options:
        payload["options"] = options

    for chunk in _post_json_stream("/api/generate", payload):
        text = chunk.get("response")
        if text:
            yield text


def generate_llm_response_chat(messages: list[dict], temperature: Optional[float] = None) -> str:
    options = _build_options(temperature=temperature)
    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "keep_alive": OLLAMA_KEEP_ALIVE,
    }
    if options:
        payload["options"] = options

    response = _post_json("/api/chat", payload)
    response = _maybe_retry_on_truncation("/api/chat", payload, response)
    message = response.get("message") or {}
    content = (message.get("content") or "").strip()
    if content:
        return content

    fallback_prompt = build_chat_prompt(messages)
    fallback_options = _build_options(temperature=temperature)
    fallback_payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "prompt": fallback_prompt,
        "stream": False,
        "keep_alive": OLLAMA_KEEP_ALIVE,
    }
    if fallback_options:
        fallback_payload["options"] = fallback_options

    fallback_response = _post_json("/api/generate", fallback_payload)
    fallback_response = _maybe_retry_on_truncation("/api/generate", fallback_payload, fallback_response)
    fallback_text = (fallback_response.get("response") or "").strip()
    # Optimized extraction for new Q: A: format
    if "A:" in fallback_text:
        return fallback_text.split("A:", 1)[1].strip()
    return fallback_text


def generate_llm_response_chat_stream(messages: list[dict], temperature: Optional[float] = None):
    options = _build_options(temperature=temperature)
    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": True,
        "keep_alive": OLLAMA_KEEP_ALIVE,
    }
    if options:
        payload["options"] = options

    for chunk in _post_json_stream("/api/chat", payload):
        message = chunk.get("message") or {}
        content = message.get("content")
        if content:
            yield content
