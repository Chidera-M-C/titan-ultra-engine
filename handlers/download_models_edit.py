import os
import requests
from huggingface_hub import hf_hub_download

HF_TOKEN = os.getenv("HF_TOKEN", "")

def download_hf(repo_id, filename, dest_path, label):
    if os.path.exists(dest_path):
        size_mb = os.path.getsize(dest_path) / (1024 * 1024)
        if label.startswith("Krea2 VAE") and size_mb < 300:
            print(f"⚠️ Existing {label} is under 300MB ({size_mb:.1f}MB). Removing bad cache...")
            os.remove(dest_path)
        else:
            print(f"✓ {label} already exists ({size_mb:.1f}MB)")
            return

    print(f"Downloading {label}...")
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    downloaded_path = hf_hub_download(
        repo_id=repo_id,
        filename=filename,
        local_dir=os.path.dirname(dest_path),
        local_dir_use_symlinks=False,
        token=HF_TOKEN or None
    )
    
    if downloaded_path != dest_path and os.path.exists(downloaded_path):
        if os.path.exists(dest_path):
            os.remove(dest_path)
        os.rename(downloaded_path, dest_path)
        
    print(f"✅ {label} done")

def download_url(url, dest_path, label):
    if os.path.exists(dest_path):
        size_mb = os.path.getsize(dest_path) / (1024 * 1024)
        print(f"✓ {label} already exists ({size_mb:.1f}MB)")
        return
        
    print(f"Downloading {label} from URL...")
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    with open(dest_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            
    print(f"✅ {label} done")

# Create directories
os.makedirs("/app/ComfyUI/models/vae", exist_ok=True)
os.makedirs("/app/ComfyUI/models/text_encoders", exist_ok=True)
os.makedirs("/app/ComfyUI/models/unet", exist_ok=True)
os.makedirs("/app/ComfyUI/models/loras/krea", exist_ok=True)
os.makedirs("/app/ComfyUI/models/diffusion_models", exist_ok=True)

# 1. Official Qwen/Krea2 VAE
download_hf(
    "Comfy-Org/Krea-2",
    "vae/qwen_image_vae.safetensors",
    "/app/ComfyUI/models/vae/krea2_raw_vae.safetensors",
    "Krea2 VAE (qwen_image_vae)"
)

# 2. Text Encoder
download_hf(
    "Comfy-Org/Krea-2",
    "text_encoders/qwen3vl_4b_fp8_scaled.safetensors",
    "/app/ComfyUI/models/text_encoders/qwen3vl_4b_fp8_scaled.safetensors",
    "Krea2 CLIP encoder"
)

# 3. Dark Beast 3.0 Aggressive UNet (Civitai)
download_url(
    "https://civitai.red/api/download/models/3173268?fileId=3054219",
    "/app/ComfyUI/models/diffusion_models/dark_beast_3_krea2.safetensors",
    "Dark Beast 3.0 Krea2 UNet"
)

# 4. Identity Edit LoRA
download_hf(
    "conradlocke/krea2-identity-edit",
    "krea2_identity_edit_v1_2.safetensors",
    "/app/ComfyUI/models/loras/krea/krea2_identity_edit_v1_2.safetensors",
    "Krea2 Identity Edit LoRA"
)

print("✅ All models verified and downloaded successfully.")
