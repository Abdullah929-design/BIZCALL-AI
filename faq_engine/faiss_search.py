import faiss
import pickle
import numpy as np
import os
import warnings
warnings.filterwarnings('ignore')
from sentence_transformers import SentenceTransformer

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
SIMILARITY_THRESHOLD = 0.10

model = SentenceTransformer(MODEL_NAME)

index = faiss.read_index(os.path.join(SCRIPT_DIR, "faiss.index"))
with open(os.path.join(SCRIPT_DIR, "faq_meta.pkl"), "rb") as f:
    meta = pickle.load(f)

def search_faq(query_text, predicted_intent=None):
    query_vec = model.encode([query_text], convert_to_numpy=True)
    faiss.normalize_L2(query_vec)

    scores, indices = index.search(query_vec, k=3)

    for score, idx in zip(scores[0], indices[0]):
        if score < SIMILARITY_THRESHOLD:
            continue

        candidate = meta[idx]

        if predicted_intent and candidate["intent"] != predicted_intent:
            continue

        return {
            "answer": candidate["answer"],
            "confidence": float(score),
            "priority": candidate["priority"],
            "intent": candidate["intent"],
            "pii": candidate["pii"],
            "authentication_required": candidate["authentication_required"]
        }

    return None
