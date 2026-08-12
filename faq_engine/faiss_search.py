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

index = None
meta = []

try:
    index_path = os.path.join(SCRIPT_DIR, "faiss.index")
    meta_path = os.path.join(SCRIPT_DIR, "faq_meta.pkl")
    if os.path.exists(index_path) and os.path.exists(meta_path):
        index = faiss.read_index(index_path)
        with open(meta_path, "rb") as f:
            meta = pickle.load(f)
    else:
        print(f"⚠️ FAISS index or metadata missing in {SCRIPT_DIR}. FAQ RAG fallback will be disabled.")
except Exception as e:
    print(f"⚠️ Failed to load FAISS index: {e}")

def search_faq(query_text, predicted_intent=None):
    if index is None or not meta:
        return None
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
