"""
download_models_video.py
Downloads the exact models + LoRAs needed for the pure I2V Docker image (Wan 2.2 + Lightning).
Called during Docker build.
"""

import os
import sys
import requests
import time

HF_TOKEN = os.environ.get("HF_TOKEN", "")
CIVITAI_TOKEN = os.environ.get("CIVITAI_TOKEN", "")

DIFFUSION_DIR    = "/comfyui/models/diffusion_models"
TEXT_ENCODER_DIR = "/comfyui/models/text_encoders"
VAE_DIR          = "/comfyui/models/vae"
CLIP_VISION_DIR  = "/comfyui/models/clip_vision"
LORAS_DIR        = "/comfyui/models/loras"

for d in [DIFFUSION_DIR, TEXT_ENCODER_DIR, VAE_DIR, CLIP_VISION_DIR, LORAS_DIR]:
    os.makedirs(d, exist_ok=True)

# ── Core models (Wan 2.2) ─────────────────────────────────────────────────
MODELS = [
    # High noise
    (
        "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors",
        f"{DIFFUSION_DIR}/wan2.2_i2v_high_noise_14B_fp8.safetensors",
        "I2V High Noise 14B"
    ),
    # Low noise
    (
        "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors",
        f"{DIFFUSION_DIR}/wan2.2_i2v_low_noise_14B_fp8.safetensors",
        "I2V Low Noise 14B"
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
    # CLIP Vision H
    (
        "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/clip_vision/clip_vision_h.safetensors",
        f"{CLIP_VISION_DIR}/clip_vision_h.safetensors",
        "CLIP Vision H"
    ),
]

# Fixed OpenCLIP – use the known working Kijai file
OPENCLIP_CANDIDATES = [
    "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors",
]

# Style LoRAs + proper Wan 2.2 Lightning
LORAS = [
    ("https://civitaiarchive.com/api/download/models/2496698", f"{LORAS_DIR}/lora_missionary.safetensors", "LoRA: Missionary / Undress"),
    ("https://civitaiarchive.com/api/download/models/2513548", f"{LORAS_DIR}/lora_doggy.safetensors", "LoRA: Doggy"),
    ("https://civitaiarchive.com/api/download/models/2446660", f"{LORAS_DIR}/lora_blowjob.safetensors", "LoRA: Blowjob"),
    ("https://civitaiarchive.com/api/download/models/2508339", f"{LORAS_DIR}/lora_facial_cumshot.safetensors", "LoRA: Facial Cumshot"),

    # Proper Wan 2.2 Lightning / Distilled LoRA (4-8 step)
    (
        "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors",
        f"{LORAS_DIR}/lora_lightning_4step.safetensors",
        "LoRA: Lightning 4-step (Wan 2.2 compatible)"
    ),
]

def download(url, path, label, retries=4):
    if os.path.exists(path) and os.path.getsize(path) > 1024 * 1024:
        size_gb = os.path.getsize(path) / (1024 ** 3)
        print(f"  ✓ {label} already exists ({size_gb:.2f} GB) – skipping")
        return True

    print(f"\nDownloading {label}...")
    print(f"  URL: {url}")

    for attempt in range(retries):
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            if "huggingface.co" in url and HF_TOKEN:
                headers["Authorization"] = f"Bearer {HF_TOKEN}"
            if "civitai" in url.lower() and CIVITAI_TOKEN:
                headers["Authorization"] = f"Bearer {CIVITAI_TOKEN}"

            with requests.get(url, headers=headers, stream=True, timeout=900) as r:
                r.raise_for_status()
                total = int(r.headers.get("content-length", 0))
                downloaded = 0

                with open(path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=16 * 1024 * 1024):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total > 0:
                                pct = downloaded / total * 100
                                print(f"\r  {pct:5.1f}%  ({downloaded/(1024**3):.2f}/{total/(1024**3):.2f} GB)", end="", flush=True)

            print(f"\n  ✓ {label} done ({os.path.getsize(path)/(1024**3):.2f} GB)")
            return True

        except Exception as e:
            print(f"\n  Attempt {attempt+1}/{retries} failed: {e}")
            if os.path.exists(path):
                os.remove(path)
            if attempt < retries - 1:
                wait = 20 * (attempt + 1)
                print(f"  Waiting {wait}s before retry...")
                time.sleep(wait)

    print(f"  ✗ FAILED after {retries} attempts: {label}")
    return False

def download_openclip():
    target = f"{CLIP_VISION_DIR}/open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors"
    for url in OPENCLIP_CANDIDATES:
        print(f"\nTrying OpenCLIP candidate:\n  {url}")
        if download(url, target, "OpenCLIP XLM-RoBERTa"):
            return True
    return False

if __name__ == "__main__":
    print("=" * 60)
    print("Nudely Video – Model Download (Wan 2.2 + Lightning)")
    print("=" * 60)

    failed = []

    print("\n=== Core Models ===")
    for url, path, label in MODELS:
        if not download(url, path, label):
            failed.append(label)

    print("\n=== OpenCLIP ===")
    if not download_openclip():
        failed.append("OpenCLIP")

    print("\n=== Style + Lightning LoRAs ===")
    for url, path, label in LORAS:
        if not download(url, path, label):
            failed.append(label)

    if failed:
        print("\n" + "=" * 60)
        print("❌ The following downloads FAILED:")
        for f in failed:
            print(f"   - {f}")
        print("=" * 60)
        sys.exit(1)

    print("\n" + "=" * 60)
    print("✅ All models downloaded successfully")
    print("=" * 60)
