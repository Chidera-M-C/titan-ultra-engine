import os
import subprocess
from huggingface_hub import hf_hub_download, snapshot_download
from insightface.app import FaceAnalysis

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

# 1. Juggernaut XL
download_civitai(
    "https://civitai.com/api/download/models/1759168?type=Model&format=SafeTensor&size=full&fp=fp16",
    "/workspace/juggernaut_xl.safetensors",
    "Juggernaut XL"
)

# 2. VAE
print("Downloading VAE...")
hf_hub_download(
    repo_id="madebyollin/sdxl-vae-fp16-fix",
    filename="sdxl_vae.safetensors",
    local_dir="/workspace",
    token=HF_TOKEN or None
)

# 3. Detail LoRA
print("Downloading Detail LoRA...")
hf_hub_download(
    repo_id="LyliaEngine/add-detail-xl",
    filename="add-detail-xl.safetensors",
    local_dir="/workspace",
    token=HF_TOKEN or None
)

# 4. ControlNets
print("Downloading OpenPose ControlNet...")
snapshot_download(
    repo_id="xinsir/controlnet-openpose-sdxl-1.0",
    local_dir="/workspace/controlnet_openpose_xl",
    allow_patterns=["*.json", "diffusion_pytorch_model.safetensors"],
    token=HF_TOKEN or None
)

print("Downloading Canny ControlNet...")
snapshot_download(
    repo_id="diffusers/controlnet-canny-sdxl-1.0",
    local_dir="/workspace/controlnet_canny_xl",
    allow_patterns=["*.json", "*.safetensors"],
    token=HF_TOKEN or None
)

# 5. IP-Adapter FaceID Plus v2 SDXL
print("Downloading IP-Adapter FaceID Plus v2 SDXL...")
hf_hub_download(
    repo_id="h94/IP-Adapter-FaceID",
    filename="ip-adapter-faceid-plusv2_sdxl.bin",
    local_dir="/workspace",
    token=HF_TOKEN or None
)

# 6. CLIP Image Encoder
print("Downloading CLIP Image Encoder...")
snapshot_download(
    repo_id="laion/CLIP-ViT-H-14-laion2B-s32B-b79K",
    local_dir="/workspace/image_encoder",
    token=HF_TOKEN or None
)

# 7. Pre-cache InsightFace Models
print("Pre-caching InsightFace buffalo_l models...")
app = FaceAnalysis(name='buffalo_l', providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

# 8. Pre-cache ControlNet Detectors
print("Caching OpenPose Detector Weights...")
from controlnet_aux import OpenposeDetector
OpenposeDetector.from_pretrained("lllyasviel/ControlNet")

print("✅ All edit models cached successfully")
