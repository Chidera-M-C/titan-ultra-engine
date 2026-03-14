import requests, os, sys

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

download("https://civitai.com/api/download/models/2514955?type=Model&format=SafeTensor&size=pruned&fp=fp16", "/tmp/crystalclear.safetensors", "CrystalClear XL")
download("https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors", "/tmp/sdxl_vae.safetensors", "SDXL VAE")
download("https://civitai.com/api/download/models/1506035?type=Model&format=SafeTensor", "/tmp/lora_nude_portrait.safetensors", "LoRA: Female Nude Portrait")
download("https://civitai.com/api/download/models/1138533?type=Model&format=SafeTensor", "/tmp/lora_dressed_vs_naked.safetensors", "LoRA: Dressed vs Naked")

print("All CrystalClear models downloaded successfully")
