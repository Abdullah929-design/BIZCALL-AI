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
def load_intent_model(model_dir: str = "../intent_detection_model"):
    # model_dir should be the folder you have pushed that contains the intent model
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model.eval()
    return model, tokenizer

def predict_top_k(text: str, model, tokenizer, top_k: int = 5, temperature: float = 1.0, min_confidence: float = 0.05):
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
    # hard overrides
    for intent_name, keywords in CRITICAL_KEYWORD_OVERRIDES.items():
        for kw in keywords:
            if kw and kw in text_lower:
                intents.append({
                    "intent_label": -1,
                    "intent_name": intent_name,
                    "confidence": 1.0,
                    "priority": INTENT_PRIORITY.get(intent_name, 10)
                })
    # soft hints
    for hint in SOFT_KEYWORD_HINTS:
        for kw in hint["keywords"]:
            if kw in text_lower:
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
    intents_sorted = sorted(intents, key=lambda x: x.get("priority", 0), reverse=True)
    out = []
    seen = set()
    for i in intents_sorted:
        name = i["intent_name"]
        if name in seen:
            continue
        seen.add(name)
        out.append({
            "intent": name,
            "confidence": round(float(i["confidence"]), 4),
            "priority": int(i.get("priority", 0))
        })
        if len(out) >= top_n:
            break
    return out

def predict_multiple_intents(text: str) -> Tuple[List[Dict], str]:
    model, tokenizer = load_intent_model()
    # basic splitting strategy: split on "but", "and", "also" - keep it simple
    segments = re.split(r'\b(?:but|however|also|and|then|additionally|plus)\b', text)
    segments = [s.strip() for s in segments if s.strip()]

    results = []
    detected = []
    for seg in segments:
        top = predict_top_k(seg, model, tokenizer, top_k=5, temperature=1.0, min_confidence=0.05)
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