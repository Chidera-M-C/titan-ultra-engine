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

download("https://civitai.com/api/download/models/1081768?type=Model&format=SafeTensor&size=full&fp=fp16", "/tmp/biglust.safetensors", "BigLust")
download("https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors", "/tmp/sdxl_vae.safetensors", "SDXL VAE")
download("https://huggingface.co/LyliaEngine/add-detail-xl/resolve/main/add-detail-xl.safetensors", "/tmp/add-detail-xl.safetensors", "Detail Tweaker LoRA")
download("https://civitai.com/api/download/models/2536215?type=Model&format=SafeTensor", "/tmp/lora_missionary.safetensors", "LoRA: Missionary")
download("https://civitai.com/api/download/models/2530338?type=Model&format=SafeTensor", "/tmp/lora_doggy.safetensors", "LoRA: Doggy")
download("https://civitai.com/api/download/models/2530288?type=Model&format=SafeTensor", "/tmp/lora_cowgirl.safetensors", "LoRA: Cowgirl")
download("https://civitai.com/api/download/models/2530355?type=Model&format=SafeTensor", "/tmp/lora_anal.safetensors", "LoRA: Anal")
download("https://civitai.com/api/download/models/2530259?type=Model&format=SafeTensor", "/tmp/lora_oral.safetensors", "LoRA: Oral")
download("https://civitai.com/api/download/models/714650?type=Model&format=SafeTensor", "/tmp/lora_threesome.safetensors", "LoRA: Threesome")
download("https://civitai.com/api/download/models/2530375?type=Model&format=SafeTensor", "/tmp/lora_cum_on_face.safetensors", "LoRA: Cum on Face")
download("https://civitai.com/api/download/models/714650?type=Model&format=SafeTensor", "/tmp/lora_lesbian.safetensors", "LoRA: Lesbian")

print("All BigLust models downloaded successfully")
