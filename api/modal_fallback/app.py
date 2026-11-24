"""
Modal Serverless GPU Fallback for BizCall AI (Banking Gemma-2B + Sales Qwen2.5-7B).
- Scales to zero after 2 minutes of inactivity ($0 idle cost).
- Caches Hugging Face weights in a persistent Modal Volume for fast cold starts.
- Protected by MODAL_FALLBACK_SECRET Bearer token.

Deploy:
    modal secret create bizcall-modal-secrets HF_TOKEN=<your_hf_token> MODAL_FALLBACK_SECRET=<random_secret>
    modal deploy api/modal_fallback/app.py
"""

import os
import modal
from fastapi import Header, HTTPException
from pydantic import BaseModel

app = modal.App("bizcall-slm-fallback")

hf_cache_vol = modal.Volume.from_name("bizcall-hf-cache", create_if_missing=True)
MODAL_SECRETS = modal.Secret.from_name("bizcall-modal-secrets")

gpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch",
        "transformers>=4.45.0",
        "peft>=0.13.0",
        "accelerate",
        "huggingface_hub",
        "fastapi[standard]",
        "pydantic",
    )
    .env({"HF_HOME": "/root/.cache/huggingface"})
)


class SalesRequest(BaseModel):
    prompt: str
    temperature: float = 0.68
    max_tokens: int = 800


class BankingRequest(BaseModel):
    customer_query: str


def _verify_bearer(authorization: str | None) -> None:
    expected = (os.getenv("MODAL_FALLBACK_SECRET") or "").strip()
    if not expected:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")
    token = authorization.split(" ", 1)[1].strip()
    if token != expected:
        raise HTTPException(status_code=403, detail="Invalid Modal fallback token")


# ---------------------------------------------------------------------------
# 1. Sales SLM: Qwen2.5-7B-Instruct + LoRA on NVIDIA L4 (24 GB VRAM)
# ---------------------------------------------------------------------------
@app.cls(
    image=gpu_image,
    gpu="L4",
    scaledown_window=300,
    timeout=180,
    enable_memory_snapshot=True,
    volumes={"/root/.cache/huggingface": hf_cache_vol},
    secrets=[MODAL_SECRETS],
)
class SalesSLM:
    @modal.enter(snap=True)
    def load(self):
        import torch
        from huggingface_hub import snapshot_download
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer

        hf_token = os.getenv("HF_TOKEN")
        lora_dir = snapshot_download(
            repo_id="abdullahsallehaqeel123/finance-chat-api",
            repo_type="space",
            token=hf_token,
            allow_patterns=[
                "adapter_*",
                "tokenizer*",
                "vocab.json",
                "merges.txt",
                "added_tokens.json",
                "special_tokens_map.json",
                "chat_template.jinja",
            ],
        )

        self.tokenizer = AutoTokenizer.from_pretrained(lora_dir, trust_remote_code=True)
        base = AutoModelForCausalLM.from_pretrained(
            "Qwen/Qwen2.5-7B-Instruct",
            torch_dtype=torch.bfloat16,
            low_cpu_mem_usage=True,
            trust_remote_code=True,
            token=hf_token,
        )
        peft_model = PeftModel.from_pretrained(base, lora_dir)
        for _, module in peft_model.named_modules():
            if hasattr(module, "scaling") and isinstance(module.scaling, dict) and "default" in module.scaling:
                module.scaling["default"] *= 0.35
        self.model = peft_model.merge_and_unload()
        self.model.eval()
        hf_cache_vol.commit()

        self.system_prompt = (
            "You are a senior B2B SaaS outbound sales copywriter for BizCall AI "
            "(AI voice calling, Messenger, and cold email automation). "
            "Write sharp, human, concrete, high-converting copy tailored to real operational pain points "
            "(missed calls, slow lead response, manual follow-ups). "
            "NEVER use generic clichés like 'unlock your full potential', 'cutting-edge technology', "
            "'revolutionize', 'game-changer', or 'streamline your workflow'. "
            "Strictly follow any length or format constraint in the user's request. "
            "Do NOT invent fake customer case studies, fabricated percentages, or made-up statistics "
            "unless provided by the user. End with a clear, low-friction call-to-action."
        )

    @modal.enter(snap=False)
    def to_gpu(self):
        self.model.to("cuda")

    @modal.fastapi_endpoint(method="POST")
    def generate(self, req: SalesRequest, authorization: str | None = Header(default=None)):
        import torch

        _verify_bearer(authorization)
        prompt = (req.prompt or "").strip()
        if not prompt:
            return {"output": "Please enter a sales or marketing prompt.", "engine": "modal_l4_qwen7b"}

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt},
        ]
        formatted = self.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = self.tokenizer(formatted, return_tensors="pt").to(self.model.device)

        temp = max(0.1, min(float(req.temperature or 0.68), 1.2))
        max_new = max(64, min(int(req.max_tokens or 800), 1500))

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new,
                temperature=temp,
                top_p=0.9,
                repetition_penalty=1.08,
                do_sample=True,
                eos_token_id=self.tokenizer.eos_token_id,
                pad_token_id=self.tokenizer.pad_token_id or self.tokenizer.eos_token_id,
            )

        generated_ids = outputs[0][inputs["input_ids"].shape[1]:]
        text = self.tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
        return {"output": text, "engine": "modal_l4_qwen7b"}


# ---------------------------------------------------------------------------
# 2. Banking SLM: Gemma-2B + LoRA on NVIDIA T4 (16 GB VRAM)
# ---------------------------------------------------------------------------
@app.cls(
    image=gpu_image,
    gpu="T4",
    scaledown_window=300,
    timeout=120,
    enable_memory_snapshot=True,
    volumes={"/root/.cache/huggingface": hf_cache_vol},
    secrets=[MODAL_SECRETS],
)
class BankingSLM:
    @modal.enter(snap=True)
    def load(self):
        import torch
        from huggingface_hub import snapshot_download
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer

        hf_token = os.getenv("HF_TOKEN")
        lora_dir = snapshot_download(
            repo_id="abdullahsallehaqeel123/bizcall-banking-slm",
            repo_type="space",
            token=hf_token,
            allow_patterns=[
                "adapter_*",
                "tokenizer*",
                "special_tokens_map.json",
            ],
        )

        self.tokenizer = AutoTokenizer.from_pretrained("google/gemma-2b", token=hf_token)
        base = AutoModelForCausalLM.from_pretrained(
            "google/gemma-2b",
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
            token=hf_token,
        )
        self.model = PeftModel.from_pretrained(base, lora_dir)
        self.model.eval()
        hf_cache_vol.commit()

    @modal.enter(snap=False)
    def to_gpu(self):
        self.model.to("cuda")

    @modal.fastapi_endpoint(method="POST")
    def generate(self, req: BankingRequest, authorization: str | None = Header(default=None)):
        import torch

        _verify_bearer(authorization)
        q = (req.customer_query or "").strip()
        if not q:
            return {"output": "Please enter a banking question.", "engine": "modal_t4_gemma2b"}

        prompt = f"### Instruction:\n{q}\n\n### Response:\n"
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=300,
                temperature=0.35,
                top_p=0.88,
                top_k=40,
                repetition_penalty=1.15,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
            )

        decoded = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        if "### Response:" in decoded:
            text = decoded.split("### Response:")[-1].strip()
        else:
            text = self.tokenizer.decode(outputs[0][inputs.input_ids.shape[-1]:], skip_special_tokens=True).strip()
        return {"output": text, "engine": "modal_t4_gemma2b"}
