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

# Directories
os.makedirs("/app/ComfyUI/models/unet", exist_ok=True)
os.makedirs("/app/ComfyUI/models/vae", exist_ok=True)
os.makedirs("/app/ComfyUI/models/clip", exist_ok=True)
os.makedirs("/app/ComfyUI/models/pulid", exist_ok=True)
os.makedirs("/app/ComfyUI/models/insightface/models/antelopev2", exist_ok=True)

# 1. NSFW Flux UNET
download_civitai(
    "https://civitai.red/api/download/models/2835136?fileId=2721540",
    "/app/ComfyUI/models/unet/flux_nsfw.safetensors",
    "NSFW Flux UNET"
)

# 2. VAE
download_hf(
    "black-forest-labs/FLUX.1-schnell",
    "ae.safetensors",
    "/app/ComfyUI/models/vae/ae.safetensors",
    "FLUX VAE"
)

# 3. Text Encoders
download_hf(
    "comfyanonymous/flux_text_encoders",
    "clip_l.safetensors",
    "/app/ComfyUI/models/clip/clip_l.safetensors",
    "FLUX CLIP L"
)

download_hf(
    "comfyanonymous/flux_text_encoders",
    "t5xxl_fp16.safetensors",
    "/app/ComfyUI/models/clip/t5xxl_fp16.safetensors",
    "FLUX T5XXL"
)

# 4. PuLID Flux model
download_hf(
    "guozinan/PuLID",
    "pulid_flux_v0.9.0.safetensors",
    "/app/ComfyUI/models/pulid/pulid_flux_v0.9.0.safetensors",
    "PuLID Flux"
)

# 5. PuLID EVA CLIP model (Fixed repository ID to QuanSun/EVA-CLIP)
download_hf(
    "QuanSun/EVA-CLIP",
    "EVA02_CLIP_L_336_psz14_s6B.pt",
    "/app/ComfyUI/models/pulid/EVA02_CLIP_L_336_psz14_s6B.pt",
    "PuLID EVA CLIP"
)

# 6. InsightFace (antelopev2)
print("Downloading InsightFace antelopev2...")
snapshot_download(
    repo_id="DIAMONIK7777/antelopev2",
    local_dir="/app/ComfyUI/models/insightface/models/antelopev2",
    token=HF_TOKEN or None
)

print("✅ All models downloaded successfully")
