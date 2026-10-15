import os
import sys

# Ensure root and api directories are on Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)
sys.path.insert(0, os.path.join(CURRENT_DIR, "api"))

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from api.main import app as fastapi_app

try:
    import gradio as gr
    # Gradio Interface displayed on the Hugging Face Space page
    with gr.Blocks(title="BizCall AI Backend API", theme=gr.themes.Soft()) as demo:
        gr.Markdown("# ⚡ BizCall AI Enterprise Backend API")
        gr.Markdown("The production FastAPI backend is **online and serving requests**.")
        with gr.Row():
            gr.Markdown(
                """
                ### Active Endpoints
                - **Interactive API Documentation (Swagger)**: [/docs](/docs)
                - **Health Check**: [/api/health](/api/health)
                - **Retell AI Webhook Receiver**: `/api/retell/webhook`
                - **Models-on-Demand Inference**: `/api/models-on-demand/inference`
                - **Cold Email System**: `/api/cold-email/...`
                - **Lead Scraper & Enrichment**: `/api/scraper/...`
                """
            )

    # Mount Gradio UI at root while serving all FastAPI routes (/api/..., /docs, etc.)
    app = gr.mount_gradio_app(fastapi_app, demo, path="/")
except ImportError:
    # If running in an environment without gradio, serve FastAPI directly
    app = fastapi_app

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
