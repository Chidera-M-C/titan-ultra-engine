"""
download_models_video.py
Run this ONCE on a temporary RunPod pod with the network volume attached at /workspace.
Downloads ComfyUI-compatible Wan2.1 checkpoints and any missing LoRAs.

Usage:
    CIVITAI_TOKEN=xxx HF_TOKEN=xxx python download_models_video.py

Since your volume already has the HuggingFace diffusers cache at /workspace/huggingface,
this script ONLY downloads the ComfyUI-native checkpoint format for Wan2.1
and checks/fills in any missing LoRAs.
"""

import os
import sys
import requests
from pathlib import Path

CIVITAI_TOKEN = os.environ.get("CIVITAI_TOKEN", "")
HF_TOKEN      = os.environ.get("HF_TOKEN", "")

WORKSPACE = "/runpod-volume"
LORAS_DIR = f"{WORKSPACE}/loras"
CKPT_DIR  = f"{WORKSPACE}/wan_checkpoints"  # ComfyUI-native format

os.makedirs(LORAS_DIR, exist_ok=True)
os.makedirs(CKPT_DIR, exist_ok=True)

# ── LoRAs (CivitAI — ComfyUI format, same files work) ─────────────────────
LORAS = [
    ("https://civitai.com/api/download/models/2747549?type=Model&format=SafeTensor",
     f"{LORAS_DIR}/lora_allinone_nsfw.safetensors",  "LoRA: All-In-One NSFW"),

    ("https://civitai.red/api/download/models/2391828?type=Model&format=SafeTensor",
     f"{LORAS_DIR}/lora_posing_nude.safetensors",    "LoRA: Posing Nude"),

    ("https://civitai.com/api/download/models/2674954?type=Model&format=SafeTensor",
     f"{LORAS_DIR}/lora_sex_thrust.safetensors",     "LoRA: Sex Thrust"),

    ("https://civitai.red/api/download/models/2422587?type=Model&format=SafeTensor",
     f"{LORAS_DIR}/lora_blowjob.safetensors",        "LoRA: Blowjob"),

    ("https://civitai.red/api/download/models/2460386?type=Model&format=SafeTensor",
     f"{LORAS_DIR}/lora_cum_facial.safetensors",     "LoRA: Cum Facial"),

    ("https://civitai.red/api/download/models/2430424?type=Model&format=SafeTensor",
     f"{LORAS_DIR}/lora_cumshot_i2v.safetensors",    "LoRA: Cumshot I2V"),
]

# ── Wan2.1 ComfyUI-native checkpoints from HuggingFace ────────────────────
# These are the single-file versions that ComfyUI-WanVideoWrapper loads directly.
# Much simpler than the diffusers multi-file format.
WAN_MODELS = [
    (
        "https://huggingface.co/Wan-AI/Wan2.1-T2V-14B/resolve/main/Wan2.1-T2V-14B.safetensors",
        f"{CKPT_DIR}/Wan2.1-T2V-14B.safetensors",
        "Wan2.1 T2V 14B (ComfyUI checkpoint)",
    ),
    (
        "https://huggingface.co/Wan-AI/Wan2.1-I2V-14B-480P/resolve/main/Wan2.1-I2V-14B-480P.safetensors",
        f"{CKPT_DIR}/Wan2.1-I2V-14B-480P.safetensors",
        "Wan2.1 I2V 14B 480P (ComfyUI checkpoint)",
    ),
]

# ── Download helper ────────────────────────────────────────────────────────
def download(url, path, label, retries=3):
    if os.path.exists(path):
        size_gb = os.path.getsize(path) / (1024**3)
        print(f"  ✓ {label} already exists ({size_gb:.1f}GB), skipping")
        return True
    print(f"\nDownloading {label}...")
    for attempt in range(retries):
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            if "civitai" in url and CIVITAI_TOKEN:
                headers["Authorization"] = f"Bearer {CIVITAI_TOKEN}"
            if "huggingface.co" in url and HF_TOKEN:
                headers["Authorization"] = f"Bearer {HF_TOKEN}"
            r = requests.get(url, headers=headers, stream=True, timeout=600)
            r.raise_for_status()
            os.makedirs(os.path.dirname(path), exist_ok=True)
            total = int(r.headers.get("content-length", 0))
            downloaded = 0
            with open(path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8 * 1024 * 1024):
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded / total * 100
                        print(f"\r  {pct:.1f}% ({downloaded/(1024**3):.2f}/{total/(1024**3):.2f}GB)", end="", flush=True)
            print(f"\n  ✓ {label} done")
            return True
        except Exception as e:
            print(f"\n  Attempt {attempt+1} failed: {e}")
            if os.path.exists(path):
                os.remove(path)
            if attempt < retries - 1:
                import time; time.sleep(15)
    print(f"  ✗ WARNING: Could not download {label}")
    return False

# ── Check disk space first ─────────────────────────────────────────────────
def check_space():
    stat = os.statvfs(WORKSPACE)
    free_gb = stat.f_bavail * stat.f_frsize / (1024**3)
    print(f"Free space on {WORKSPACE}: {free_gb:.1f}GB")
    if free_gb < 40:
        print(f"WARNING: Less than 40GB free. Wan2.1 models are ~25GB each.")
        print(f"Consider resizing your network volume before continuing.")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != "y":
            sys.exit(1)

# ── Run ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("Nudely Video Model Download Script (ComfyUI format)")
    print("=" * 60)

    check_space()

    print("\n=== Checking/Downloading LoRAs ===")
    for url, path, label in LORAS:
        download(url, path, label)

    print("\n=== Downloading Wan2.1 ComfyUI Checkpoints ===")
    print("Note: These are large files (~25GB each). This will take time.")
    print("Your existing HuggingFace diffusers cache will NOT be used by ComfyUI.")
    print("These single-file checkpoints are what ComfyUI-WanVideoWrapper expects.\n")
    for url, path, label in WAN_MODELS:
        download(url, path, label)

    print("\n" + "=" * 60)
    print("✅ Download complete!")
    print(f"\nFiles saved to:")
    print(f"  LoRAs:       {LORAS_DIR}/")
    print(f"  Checkpoints: {CKPT_DIR}/")
    print("\nNext steps:")
    print("  1. Update handler_video.py model names to match checkpoint filenames")
    print("  2. Build and push the Docker image")
    print("  3. Deploy to RunPod serverless with volume attached at /workspace")
    print("=" * 60)
