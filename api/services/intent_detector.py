"""
Refactored intent detection service adapted from your Streamlit logic.
This module loads the intent classification model once and exposes:
- predict_multiple_intents(text) -> (results, complexity)
"""
import os
import re
import time
from functools import lru_cache
from typing import List, Tuple, Dict

import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from classification import classify_query_complexity
from intent_config import (
    INTENT_CLASSES,
    INTENT_PRIORITY,
    INTENT_RELATIONSHIPS,
    CRITICAL_KEYWORD_OVERRIDES,
    SUPPRESSION_RULES,
    SOFT_KEYWORD_HINTS,
)

# Minimal preprocessing reused from your streamlit app (keeps negations)
def preprocess_text(text: str) -> str:
    text = (text or "").lower()
    # remove repeated words (the the -> the)
    text = re.sub(r'\b(\w+)( \1\b)+', r'\1', text)
    # remove some filler words
    filler_words = {'um', 'uh', 'actually', 'basically', 'like', 'you know', 'i mean'}
    words = [w for w in text.split() if w not in filler_words]
    return " ".join(words)

@lru_cache(maxsize=1)
def load_intent_model(model_dir: str = None):
    if not model_dir:
        env_dir = os.getenv("INTENT_MODEL_PATH")
        if env_dir and os.path.exists(env_dir):
            model_dir = env_dir
        else:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            candidate = os.path.join(base_dir, "intent_detection_model")
            model_dir = candidate if os.path.exists(candidate) else "../intent_detection_model"

    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model.eval()
    return model, tokenizer

def predict_top_k(text: str, model, tokenizer, top_k: int = 5, temperature: float = 0.96, min_confidence: float = 0.05):
    text_proc = preprocess_text(text)
    inputs = tokenizer(
        text_proc,
        padding="max_length",
        truncation=True,
        max_length=128,
        return_tensors="pt",
    )
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
    logits_scaled = logits / temperature
    probs = F.softmax(logits_scaled, dim=1)[0].cpu().numpy()
    top_idx = probs.argsort()[::-1][:top_k]
    result = []
    for idx in top_idx:
        p = float(probs[idx])
        if p < min_confidence:
            continue
        result.append({
            "intent_label": int(idx),
            "intent_name": INTENT_CLASSES.get(int(idx), "unknown_intent"),
            "confidence": p,
            "priority": INTENT_PRIORITY.get(INTENT_CLASSES.get(int(idx), ""), 0)
        })
    return result

def apply_overrides_and_hints(text: str, intents: List[Dict]):
    text_lower = text.lower()
    banking77_set = set(INTENT_CLASSES.values())
    custom_domain_matched = False

    # hard overrides
    for intent_name, keywords in CRITICAL_KEYWORD_OVERRIDES.items():
        for kw in keywords:
            if kw and kw in text_lower:
                if intent_name not in banking77_set:
                    custom_domain_matched = True
                intents.append({
                    "intent_label": -1,
                    "intent_name": intent_name,
                    "confidence": 0.97 if intent_name not in banking77_set else 1.0,
                    "priority": INTENT_PRIORITY.get(intent_name, 10)
                })
                break

    # soft hints
    for hint in SOFT_KEYWORD_HINTS:
        for kw in hint["keywords"]:
            if kw in text_lower:
                if hint["intent"] not in banking77_set:
                    custom_domain_matched = True
                exists = next((i for i in intents if i["intent_name"] == hint["intent"]), None)
                if exists:
                    exists["confidence"] = max(exists["confidence"], hint["confidence"])
                else:
                    intents.append({
                        "intent_label": -1,
                        "intent_name": hint["intent"],
                        "confidence": hint["confidence"],
                        "priority": INTENT_PRIORITY.get(hint["intent"], 0)
                    })
                break

    # If an out-of-Banking77 custom banking product (e.g. personal loan, fixed deposit, mortgage)
    # matched explicitly, remove out-of-distribution Banking77 fallback guesses (< 0.88 confidence)
    if custom_domain_matched:
        intents = [
            i for i in intents
            if i["intent_label"] == -1 or i["confidence"] >= 0.88
        ]

    # Enrich with semantically related intents from INTENT_RELATIONSHIPS for the top detected intent
    strong_intents = [i for i in intents if i["confidence"] >= 0.50]
    if strong_intents:
        best_primary = max(strong_intents, key=lambda x: (x.get("priority", 0), x.get("confidence", 0)))
        related_list = INTENT_RELATIONSHIPS.get(best_primary["intent_name"], [])
        existing_names = {i["intent_name"] for i in intents if i["confidence"] >= 0.25}
        rel_conf_schedule = [0.84, 0.76]
        added_rel = 0
        for rel_intent in related_list:
            if len(existing_names) >= 3 or added_rel >= len(rel_conf_schedule):
                break
            if rel_intent not in existing_names:
                intents.append({
                    "intent_label": -1,
                    "intent_name": rel_intent,
                    "confidence": rel_conf_schedule[added_rel],
                    "priority": INTENT_PRIORITY.get(rel_intent, 1)
                })
                existing_names.add(rel_intent)
                added_rel += 1

    # suppression
    filtered = []
    for intent in intents:
        name = intent["intent_name"]
        suppress = SUPPRESSION_RULES.get(name, [])
        if any(s in text_lower for s in suppress):
            continue
        filtered.append(intent)
    return filtered

def prioritize_and_format(intents: List[Dict], top_n=3):
    # Deduplicate by intent_name keeping highest confidence first
    best_by_name: Dict[str, Dict] = {}
    for i in intents:
        name = i["intent_name"]
        if name not in best_by_name or i["confidence"] > best_by_name[name]["confidence"]:
            best_by_name[name] = i

    # Sort so high-confidence predictions (>= 0.25) always precede low-confidence tail noise,
    # then rank by banking severity priority and confidence
    intents_sorted = sorted(
        best_by_name.values(),
        key=lambda x: (x.get("confidence", 0) >= 0.25, x.get("priority", 0) >= 9, round(x.get("confidence", 0), 2), x.get("priority", 0)),
        reverse=True
    )
    out = []
    for i in intents_sorted[:top_n]:
        out.append({
            "intent": i["intent_name"],
            "confidence": round(float(i["confidence"]), 4),
            "priority": int(i.get("priority", 0))
        })
    return out

def predict_multiple_intents(text: str) -> Tuple[List[Dict], str]:
    model, tokenizer = load_intent_model()
    # Clause-aware splitting: split on contrastive/additive connectors, or on 'and'/'then'
    # only when followed by a new clause starter (pronoun, auxiliary, or question word)
    # so noun phrases like "eligibility criteria and documents" remain intact.
    split_pattern = (
        r'\b(?:but|however|additionally|plus)\b'
        r'|\b(?:and|then)\s+(?:also\s+)?(?=(?:i|my|we|what|how|why|where|when|who|can|could|do|does|did|is|are|was|were|will|would|should|please)\b)'
        r'|\balso\b'
    )
    raw_segments = re.split(split_pattern, text, flags=re.IGNORECASE)
    segments = []
    carry = ""
    for s in raw_segments:
        s_clean = s.strip(" ,;:-")
        if not s_clean:
            continue
        if carry:
            s_clean = f"{carry} {s_clean}".strip()
            carry = ""
        # Prevent 1-word or 2-word孤立 pronoun fragments (e.g. "I") from forming a standalone segment
        if len(s_clean.split()) < 3:
            carry = s_clean
        else:
            segments.append(s_clean)
    if carry:
        if segments:
            segments[-1] = f"{segments[-1]} {carry}".strip()
        else:
            segments.append(carry)
    if not segments:
        segments = [text.strip()]

    results = []
    detected = []
    for seg in segments:
        top = predict_top_k(seg, model, tokenizer, top_k=5, temperature=0.96, min_confidence=0.05)
        top = apply_overrides_and_hints(seg, top)
        formatted = prioritize_and_format(top, top_n=3)
        primary = formatted[0]["intent"] if formatted else None
        results.append({
            "text": seg,
            "primary_intent": primary,
            "intents": formatted
        })
        detected.extend([f["intent"] for f in formatted])

    # dedupe
    unique = list(dict.fromkeys(detected))
    complexity = classify_query_complexity(unique)
    return results, complexity