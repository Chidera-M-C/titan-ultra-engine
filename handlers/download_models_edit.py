import os
from huggingface_hub import hf_hub_download

HF_TOKEN = os.getenv("HF_TOKEN", "")

def download_hf(repo_id, filename, dest_path, label):
    if os.path.exists(dest_path):
        print(f"✓ {label} already exists")
        return
    print(f"Downloading {label}...")
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    # Download directly into destination folder
    downloaded_path = hf_hub_download(
        repo_id=repo_id,
        filename=filename,
        local_dir=os.path.dirname(dest_path),
        token=HF_TOKEN or None
    )
    
    # If filename in repo doesn't match local target name, rename it
    if os.path.basename(downloaded_path) != os.path.basename(dest_path):
        os.rename(downloaded_path, dest_path)
        
    print(f"✅ {label} done")

# Create model directories
os.makedirs("/app/ComfyUI/models/vae", exist_ok=True)
os.makedirs("/app/ComfyUI/models/text_encoders", exist_ok=True)
os.makedirs("/app/ComfyUI/models/unet", exist_ok=True)
os.makedirs("/app/ComfyUI/models/loras/krea", exist_ok=True)

# 1. VAE from Comfy-Org
download_hf(
    "Comfy-Org/Krea-2",
    "vae/qwen_image_vae.safetensors",
    "/app/ComfyUI/models/vae/krea2_raw_vae.safetensors",
    "Krea2 VAE (qwen_image_vae)"
)

# 2. CLIP Text Encoder from Comfy-Org
download_hf(
    "Comfy-Org/Krea-2",
    "text_encoders/qwen3vl_4b_fp8_scaled.safetensors",
    "/app/ComfyUI/models/text_encoders/qwen3vl_4b_fp8_scaled.safetensors",
    "Krea2 CLIP encoder"
)

# 3. Main Diffusion UNet (26GB Gated Model)
download_hf(
    "krea/Krea-2-Raw",
    "raw.safetensors",
    "/app/ComfyUI/models/unet/raw.safetensors",
    "Krea2 Raw UNet"
)

# 4. Identity Edit LoRA
download_hf(
    "conradlocke/krea2-identity-edit",
    "krea2_identity_edit_v1_2.safetensors",
    "/app/ComfyUI/models/loras/krea/krea2_identity_edit_v1_2.safetensors",
    "Krea2 Identity Edit LoRA"
)

print("✅ All models downloaded successfully")
