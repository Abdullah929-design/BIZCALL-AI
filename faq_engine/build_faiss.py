import json
import os
import warnings
warnings.filterwarnings('ignore')

import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

with open(os.path.join(SCRIPT_DIR, "faq_data.json"), "r",encoding="utf-8") as f:
    data = json.load(f)["faqs"]

texts = []
meta = []

for faq in data:
    for q in faq["questions"]:
        texts.append(q)
        meta.append({
            "intent": faq["intent"],
            "answer": faq["answer"]["text"],
            "pii": faq["safety"]["pii"],
            "authentication_required": faq["safety"]["authentication_required"],
            "priority": faq["priority"]
        })

embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=True)

index = faiss.IndexFlatIP(embeddings.shape[1])
faiss.normalize_L2(embeddings)
index.add(embeddings)

faiss.write_index(index, os.path.join(SCRIPT_DIR, "faiss.index"))

with open(os.path.join(SCRIPT_DIR, "faq_meta.pkl"), "wb") as f:
    pickle.dump(meta, f)

print("✅ FAISS index built successfully")
