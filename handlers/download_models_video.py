"""
download_models_video.py
Downloads the exact models + LoRAs needed for the pure I2V Docker image.
Called during Docker build (no network volume).
"""

import os
import sys
import requests
import time

HF_TOKEN = os.environ.get("HF_TOKEN", "")
CIVITAI_TOKEN = os.environ.get("CIVITAI_TOKEN", "")

# Target paths inside the final image
DIFFUSION_DIR = "/comfyui/models/diffusion_models"
TEXT_ENCODER_DIR = "/comfyui/models/text_encoders"
VAE_DIR = "/comfyui/models/vae"
CLIP_VISION_DIR = "/comfyui/models/clip_vision"
LORAS_DIR = "/comfyui/models/loras"

os.makedirs(DIFFUSION_DIR, exist_ok=True)
os.makedirs(TEXT_ENCODER_DIR, exist_ok=True)
os.makedirs(VAE_DIR, exist_ok=True)
os.makedirs(CLIP_VISION_DIR, exist_ok=True)
os.makedirs(LORAS_DIR, exist_ok=True)

# ── Core models (Comfy-Org repackaged – exact names the handler expects) ──
MODELS = [
    # Diffusion
    (
        "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_i2v_480p_14B_fp8_scaled.safetensors",
        f"{DIFFUSION_DIR}/wan2.1_i2v_480p_14B_fp8.safetensors",
        "I2V 14B fp8"
    ),
    # Text encoder
    (
        "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp16.safetensors",
        f"{TEXT_ENCODER_DIR}/umt5_xxl_fp16.safetensors",
        "UMT5 XXL fp16"
    ),
    # VAE
    (
        "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors",
        f"{VAE_DIR}/wan_2.1_vae.safetensors",
        "Wan 2.1 VAE"
    ),
    # CLIP Vision
    (
        "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/clip_vision/clip_vision_h.safetensors",
        f"{CLIP_VISION_DIR}/clip_vision_h.safetensors",
        "CLIP Vision H"
    ),
    # OpenCLIP (required by WanVideoWrapper)
    (
        "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/clip_vision/open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors",
        f"{CLIP_VISION_DIR}/open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors",
        "OpenCLIP XLM-RoBERTa"
    ),
]

# ── Style LoRAs (civitaiarchive) ──────────────────────────────────────────
LORAS = [
    (
        "https://civitaiarchive.com/api/download/models/2496698",
        f"{LORAS_DIR}/lora_missionary.safetensors",
        "LoRA: Missionary / Undress"
    ),
    (
        "https://civitaiarchive.com/api/download/models/2513548",
        f"{LORAS_DIR}/lora_doggy.safetensors",
        "LoRA: Doggy"
    ),
    (
        "https://civitaiarchive.com/api/download/models/2446660",
        f"{LORAS_DIR}/lora_blowjob.safetensors",
        "LoRA: Blowjob"
    ),
    (
        "https://civitaiarchive.com/api/download/models/2508339",
        f"{LORAS_DIR}/lora_facial_cumshot.safetensors",
        "LoRA: Facial Cumshot"
    ),
]

def download(url, path, label, retries=3):
    if os.path.exists(path) and os.path.getsize(path) > 1024 * 1024:
        size_gb = os.path.getsize(path) / (1024 ** 3)
        print(f"  ✓ {label} already exists ({size_gb:.2f} GB) – skipping")
        return True

    print(f"\nDownloading {label}...")
    for attempt in range(retries):
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            if "huggingface.co" in url and HF_TOKEN:
                headers["Authorization"] = f"Bearer {HF_TOKEN}"
            if "civitai" in url and CIVITAI_TOKEN:
                headers["Authorization"] = f"Bearer {CIVITAI_TOKEN}"

            r = requests.get(url, headers=headers, stream=True, timeout=600)
            r.raise_for_status()

            total = int(r.headers.get("content-length", 0))
            downloaded = 0
            with open(path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8 * 1024 * 1024):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total:
                            pct = downloaded / total * 100
                            print(f"\r  {pct:5.1f}%  ({downloaded/(1024**3):.2f}/{total/(1024**3):.2f} GB)", end="", flush=True)
            print(f"\n  ✓ {label} done")
            return True
        except Exception as e:
            print(f"\n  Attempt {attempt+1} failed: {e}")
            if os.path.exists(path):
                os.remove(path)
            if attempt < retries - 1:
                time.sleep(15)
    print(f"  ✗ FAILED: {label}")
    return False

if __name__ == "__main__":
    print("=" * 60)
    print("Nudely Video – Model Download (Docker build)")
    print("=" * 60)

    print("\n=== Core Models ===")
    success = True
    for url, path, label in MODELS:
        if not download(url, path, label):
            success = False

    print("\n=== Style LoRAs ===")
    for url, path, label in LORAS:
        if not download(url, path, label):
            success = False

    if not success:
        print("\n❌ Some downloads failed")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("✅ All models downloaded successfully")
    print("=" * 60)
