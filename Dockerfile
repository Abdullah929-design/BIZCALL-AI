# Production Dockerfile for Hugging Face Spaces (CPU Basic: 2 vCPU, 16 GB RAM)
FROM python:3.10-slim

# Prevent interactive prompts and Python output buffering
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    KMP_DUPLICATE_LIB_OK=TRUE \
    PORT=7860 \
    HOST=0.0.0.0

# Install minimal OS dependencies for sentence-transformers, faiss, and networking
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces standard: create and switch to non-root user (UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy and install python dependencies first for layer caching
COPY --chown=user:user api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY --chown=user:user api/ ./api/
COPY --chown=user:user faq_engine/ ./faq_engine/
COPY --chown=user:user intent_detection_model/ ./intent_detection_model/
COPY --chown=user:user intent_config.py ./intent_config.py

# Set working directory to api for execution
WORKDIR $HOME/app/api

EXPOSE 7860

# Launch FastAPI on port 7860 (Hugging Face Spaces default)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
