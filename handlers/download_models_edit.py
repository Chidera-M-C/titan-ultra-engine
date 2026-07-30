import os
from huggingface_hub import snapshot_download
import requests

def download_hf(repo_id, local_dir, label):
    if os.path.exists(local_dir):
        print(f"✓ {label} already exists")
        return
    print(f"Downloading {label}...")
    snapshot_download(repo_id=repo_id, local_dir=local_dir, token=os.getenv("HF_TOKEN"))
    print(f"✅ {label} done")

# Create model directories first
os.makedirs("/app/ComfyUI/models/checkpoints", exist_ok=True)
os.makedirs("/app/ComfyUI/models/loras", exist_ok=True)
os.makedirs("/app/ComfyUI/models/vae", exist_ok=True)
os.makedirs("/app/ComfyUI/models/text_encoders", exist_ok=True)

# Download VAE
if not os.path.exists("/app/ComfyUI/models/vae/krea2_raw_vae.safetensors"):
    print("Downloading Krea2 VAE...")
    r = requests.get(
        "https://huggingface.co/Krea-AI/Krea2-Raw/resolve/main/vae.safetensors",
        headers={"Authorization": f"Bearer {os.getenv('HF_TOKEN')}"},
        stream=True
    )
    r.raise_for_status()
    with open("/app/ComfyUI/models/vae/krea2_raw_vae.safetensors", "wb") as f:
        for chunk in r.iter_content(chunk_size=1024*1024):
            f.write(chunk)
    print("✅ Krea2 VAE done")

# Krea2 Raw model
download_hf("Krea-AI/Krea2-Raw", "/app/ComfyUI/models/checkpoints/krea2_raw", "Krea2 Raw")

# Identity Edit LoRA
download_hf("conradlocke/krea2-identity-edit", "/app/ComfyUI/models/loras", "Krea2 Identity Edit LoRA")

print("All models downloaded successfully")
