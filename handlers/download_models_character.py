import requests, os

CIVITAI_TOKEN = os.environ.get("CIVITAI_TOKEN", "")

def download(url, path, label):
    if os.path.exists(path):
        print(f"  {label} already exists, skipping")
        return
    print(f"Downloading {label}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    if "civitai.com" in url and CIVITAI_TOKEN:
        headers["Authorization"] = f"Bearer {CIVITAI_TOKEN}"
    r = requests.get(url, headers=headers, stream=True)
    r.raise_for_status()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    total_size = int(r.headers.get("content-length", 0))
    with open(path, "wb") as f:
        downloaded = 0
        for chunk in r.iter_content(chunk_size=1024 * 1024):
            f.write(chunk)
            downloaded += len(chunk)
            if total_size:
                print(f"  {(downloaded/total_size)*100:.1f}%", end="\r")
    print(f"  {label} done")

def download_hf_model(repo_id, local_path, label):
    if os.path.exists(local_path):
        print(f"  {label} already exists, skipping")
        return
    print(f"Downloading {label} from HuggingFace...")
    from huggingface_hub import snapshot_download
    snapshot_download(repo_id=repo_id, local_dir=local_path)
    print(f"  {label} done")

# Models
download("https://civitai.com/api/download/models/1759168?type=Model&format=SafeTensor&size=full&fp=fp16", "/tmp/juggernaut_xl.safetensors", "Juggernaut XL")
download("https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors", "/tmp/sdxl_vae.safetensors", "SDXL VAE")
download("https://huggingface.co/LyliaEngine/add-detail-xl/resolve/main/add-detail-xl.safetensors", "/tmp/add-detail-xl.safetensors", "Detail Tweaker LoRA")
download("https://huggingface.co/h94/IP-Adapter-FaceID/resolve/main/ip-adapter-faceid-plusv2_sdxl.bin", "/tmp/ip_adapter_faceid_plus_sdxl.bin", "IP-Adapter FaceID Plus v2 SDXL")

# CLIP Image Encoder
download_hf_model("laion/CLIP-ViT-H-14-laion2B-s32B-b79K", "/tmp/image_encoder", "CLIP Image Encoder")

print("All character models downloaded successfully")
