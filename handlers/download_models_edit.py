import os
from huggingface_hub import snapshot_download

def download_hf(repo_id, local_dir, label):
    if os.path.exists(local_dir):
        print(f"✓ {label} already exists")
        return
    print(f"Downloading {label}...")
    snapshot_download(repo_id=repo_id, local_dir=local_dir, token=os.getenv("HF_TOKEN"))
    print(f"✅ {label} done")

# Create model directories
# Create model directories
os.makedirs("/app/ComfyUI/models/checkpoints", exist_ok=True)
os.makedirs("/app/ComfyUI/models/loras", exist_ok=True)
os.makedirs("/app/ComfyUI/models/vae", exist_ok=True)
os.makedirs("/app/ComfyUI/models/text_encoders", exist_ok=True)

# Krea 2 Model (Raw recommended for editing, or Turbo for speed)
download_hf("Krea-AI/Krea2-Raw", "/app/ComfyUI/models/checkpoints/krea2_raw", "Krea 2 Raw")

# Identity Edit LoRA
download_hf("conradlocke/krea2-identity-edit", "/app/ComfyUI/models/loras", "Krea2 Identity Edit LoRA")

# VAE and Text Encoder (if not included above)
print("All models downloaded successfully")
