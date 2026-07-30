import os
import requests

# Create model directories
os.makedirs("/app/ComfyUI/models/unet", exist_ok=True)
os.makedirs("/app/ComfyUI/models/loras/krea", exist_ok=True)
os.makedirs("/app/ComfyUI/models/vae", exist_ok=True)
os.makedirs("/app/ComfyUI/models/text_encoders", exist_ok=True)

headers = {"Authorization": f"Bearer {os.getenv('HF_TOKEN')}"}

def download_file(url, target_path, label):
    if os.path.exists(target_path):
        print(f"✓ {label} already exists")
        return
    print(f"Downloading {label}...")
    r = requests.get(url, headers=headers, stream=True)
    r.raise_for_status()
    with open(target_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024*1024):
            f.write(chunk)
    print(f"✅ {label} done")

# 1. Download Krea2 VAE
download_file(
    "https://huggingface.co/Krea-AI/Krea2-Raw/resolve/main/vae.safetensors",
    "/app/ComfyUI/models/vae/krea2_raw_vae.safetensors",
    "Krea2 VAE"
)

# 2. Download Krea2 Raw Main Model (saved as raw.safetensors for node 117)
download_file(
    "https://huggingface.co/Krea-AI/Krea2-Raw/resolve/main/raw.safetensors",
    "/app/ComfyUI/models/unet/raw.safetensors",
    "Krea2 Raw UNET"
)

# 3. Download Identity Edit LoRA (saved in krea/ subdirectory for node 105)
download_file(
    "https://huggingface.co/conradlocke/krea2-identity-edit/resolve/main/krea2_identity_edit_v1_2.safetensors",
    "/app/ComfyUI/models/loras/krea/krea2_identity_edit_v1_2.safetensors",
    "Krea2 Identity Edit LoRA"
)

# 4. Download CLIP / text encoder
download_file(
    "https://huggingface.co/Krea-AI/Krea2-Raw/resolve/main/qwen3vl_4b_fp8_scaled.safetensors",
    "/app/ComfyUI/models/text_encoders/qwen3vl_4b_fp8_scaled.safetensors",
    "Krea2 CLIP Encoder"
)

print("All models downloaded successfully")
