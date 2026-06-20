"""
Run this ONCE on a temporary RunPod pod with the network volume attached.
It downloads all models and LoRAs into /runpod-volume so cold starts are instant.

Usage:
    python download_models_video.py
"""

import os
os.environ["HF_HOME"] = "/workspace/huggingface"

import requests
from huggingface_hub import snapshot_download

CIVITAI_TOKEN = os.environ.get("CIVITAI_TOKEN", "")

# ── LoRAs ─────────────────────────────────────────────────────────────────
LORAS = [
    ("https://civitai.com/api/download/models/2747549?type=Model&format=SafeTensor", "/workspace/loras/lora_allinone_nsfw.safetensors",  "LoRA: All-In-One NSFW"),
    ("https://civitai.red/api/download/models/2391828?type=Model&format=SafeTensor", "/workspace/loras/lora_posing_nude.safetensors",    "LoRA: Posing Nude"),
    ("https://civitai.com/api/download/models/2674954?type=Model&format=SafeTensor", "/workspace/loras/lora_sex_thrust.safetensors",     "LoRA: Sex Thrust"),
    ("https://civitai.red/api/download/models/2422587?type=Model&format=SafeTensor", "/workspace/loras/lora_blowjob.safetensors",        "LoRA: Blowjob"),
    ("https://civitai.red/api/download/models/2460386?type=Model&format=SafeTensor", "/workspace/loras/lora_cum_facial.safetensors",     "LoRA: Cum Facial"),
    ("https://civitai.red/api/download/models/2430424?type=Model&format=SafeTensor", "/workspace/loras/lora_cumshot_i2v.safetensors",    "LoRA: Cumshot I2V"),
]

def download(url, path, label, retries=3):
    if os.path.exists(path):
        print(f"  {label} already exists, skipping")
        return
    for attempt in range(retries):
        try:
            print(f"Downloading {label} (attempt {attempt+1})...")
            headers = {"User-Agent": "Mozilla/5.0"}
            if "civitai" in url and CIVITAI_TOKEN:
                headers["Authorization"] = f"Bearer {CIVITAI_TOKEN}"
            r = requests.get(url, headers=headers, stream=True, timeout=300)
            r.raise_for_status()
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024 * 1024):
                    f.write(chunk)
            print(f"  {label} done")
            return
        except Exception as e:
            print(f"  Attempt {attempt+1} failed: {e}")
            if os.path.exists(path):
                os.remove(path)
            if attempt < retries - 1:
                import time; time.sleep(10)
    print(f"  WARNING: Could not download {label}")

# ── Download LoRAs ─────────────────────────────────────────────────────────
print("\n=== Downloading LoRAs ===")
for url, path, label in LORAS:
    download(url, path, label)

# ── Download Wan models ────────────────────────────────────────────────────
print("\n=== Downloading Wan2.1 T2V 14B (this will take a while) ===")
snapshot_download("Wan-AI/Wan2.1-T2V-14B-Diffusers")

print("\n=== Downloading Wan2.1 I2V 14B 480P (this will take a while) ===")
snapshot_download("Wan-AI/Wan2.1-I2V-14B-480P-Diffusers")

print("\n✅ All models and LoRAs saved to /runpod-volume — cold starts will now be fast!")
