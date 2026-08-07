import os
import subprocess
from huggingface_hub import hf_hub_download, snapshot_download

HF_TOKEN = os.getenv("HF_TOKEN", "")
CIVITAI_TOKEN = os.getenv("CIVITAI_TOKEN", "")

def download_civitai(url, dest_path, label):
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

# 1. Base Checkpoint & VAE
download_civitai(
    "https://civitai.red/api/download/models/2551619?fileId=2440003",
    "/workspace/juggernaut_xl.safetensors",
    "Juggernaut XL"
)

hf_hub_download(
    repo_id="madebyollin/sdxl-vae-fp16-fix",
    filename="sdxl_vae.safetensors",
    local_dir="/workspace",
    token=HF_TOKEN or None
)

# 2. New Detail Tweaker LoRA (replaces old one)
download_civitai(
    "https://civitai.red/api/download/models/135867?fileId=99264",
    "/workspace/detail_tweaker.safetensors",
    "Detail Tweaker LoRA"
)

# 3. Realism LoRA
download_civitai(
    "https://civitai.red/api/download/models/1236430?fileId=1141672",
    "/workspace/realism.safetensors",
    "Realism LoRA"
)

# 4. NSFW All-In-One LoRA
download_civitai(
    "https://civitai.red/api/download/models/160240?fileId=120561",
    "/workspace/nsfw_allinone.safetensors",
    "NSFW All-In-One LoRA"
)

# 5. ControlNets
snapshot_download(
    repo_id="xinsir/controlnet-openpose-sdxl-1.0",
    local_dir="/workspace/controlnet_openpose_xl",
    allow_patterns=["*.json", "diffusion_pytorch_model.safetensors"],
    token=HF_TOKEN or None
)

snapshot_download(
    repo_id="diffusers/controlnet-canny-sdxl-1.0",
    local_dir="/workspace/controlnet_canny_xl",
    allow_patterns=["*.json", "*.safetensors"],
    token=HF_TOKEN or None
)

# 6. IP-Adapter FaceID Plus v2
hf_hub_download(
    repo_id="h94/IP-Adapter-FaceID",
    filename="ip-adapter-faceid-plusv2_sdxl.bin",
    local_dir="/workspace",
    token=HF_TOKEN or None
)

hf_hub_download(
    repo_id="h94/IP-Adapter-FaceID",
    filename="ip-adapter-faceid-plusv2_sdxl_lora.safetensors",
    local_dir="/workspace",
    token=HF_TOKEN or None
)

# 7. CLIP Image Encoder
snapshot_download(
    repo_id="laion/CLIP-ViT-H-14-laion2B-s32B-b79K",
    local_dir="/workspace/image_encoder",
    token=HF_TOKEN or None
)

# 8. OpenPose Pre-cache
from controlnet_aux import OpenposeDetector
OpenposeDetector.from_pretrained("lllyasviel/ControlNet")

print("✅ All edit models downloaded successfully")
