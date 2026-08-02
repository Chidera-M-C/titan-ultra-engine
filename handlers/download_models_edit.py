import os
import subprocess
from huggingface_hub import hf_hub_download, snapshot_download

HF_TOKEN = os.getenv("HF_TOKEN", "")
CIVITAI_TOKEN = os.getenv("CIVITAI_TOKEN", "")

def download_hf(repo_id, filename, dest_path, label):
    if os.path.exists(dest_path):
        print(f"✓ {label} already exists")
        return
    print(f"Downloading {label}...")
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    path = hf_hub_download(
        repo_id=repo_id,
        filename=filename,
        local_dir=os.path.dirname(dest_path),
        local_dir_use_symlinks=False,
        token=HF_TOKEN or None
    )
    
    if path != dest_path and os.path.exists(path):
        if os.path.exists(dest_path):
            os.remove(dest_path)
        os.rename(path, dest_path)
        
    print(f"✅ {label} done")

def download_civitai(url, dest_path, label):
    if os.path.exists(dest_path):
        print(f"✓ {label} already exists")
        return
    print(f"Downloading {label}...")
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    download_url = url
    if CIVITAI_TOKEN:
        separator = "&" if "?" in url else "?"
        download_url += f"{separator}token={CIVITAI_TOKEN}"
        
    cmd = [
        "aria2c", 
        "-x", "8", 
        "-s", "8", 
        "-c", 
        "--dir", os.path.dirname(dest_path), 
        "--out", os.path.basename(dest_path), 
        download_url
    ]
    subprocess.run(cmd, check=True)
    print(f"✅ {label} done")

# Required Model Directories
os.makedirs("/app/ComfyUI/models/unet", exist_ok=True)
os.makedirs("/app/ComfyUI/models/vae", exist_ok=True)
os.makedirs("/app/ComfyUI/models/clip", exist_ok=True)
os.makedirs("/app/ComfyUI/models/controlnet", exist_ok=True)
os.makedirs("/app/ComfyUI/models/instantid", exist_ok=True)
os.makedirs("/app/ComfyUI/models/insightface/models/antelopev2", exist_ok=True)

# 1. UNET Model (Moved to models/unet for UNETLoader)
download_civitai(
    "https://civitai.red/api/download/models/691639?fileId=639902",
    "/app/ComfyUI/models/unet/fluxed_up.safetensors",
    "Fluxed Up NSFW UNET"
)

# 2. VAE Model
download_hf(
    "black-forest-labs/FLUX.1-schnell",
    "vae/diffusion_pytorch_model.safetensors",
    "/app/ComfyUI/models/vae/ae.safetensors",
    "FLUX VAE (ae.safetensors)"
)

# 3. CLIP Model
download_hf(
    "comfyanonymous/flux_text_encoders",
    "clip_l.safetensors",
    "/app/ComfyUI/models/clip/clip_l.safetensors",
    "FLUX CLIP L"
)

# 4. InstantID models
download_hf(
    "InstantX/InstantID", 
    "ip-adapter.bin", 
    "/app/ComfyUI/models/instantid/ip-adapter.bin", 
    "InstantID IP-Adapter"
)
download_hf(
    "InstantX/InstantID", 
    "ControlNetModel/diffusion_pytorch_model.safetensors", 
    "/app/ComfyUI/models/controlnet/instantid_controlnet.safetensors", 
    "InstantID ControlNet"
)

# 5. InsightFace (antelopev2)
print("Downloading InsightFace antelopev2...")
snapshot_download(
    repo_id="DIAMONIK7777/antelopev2",
    local_dir="/app/ComfyUI/models/insightface/models/antelopev2",
    token=HF_TOKEN or None
)

print("✅ All models downloaded successfully")
