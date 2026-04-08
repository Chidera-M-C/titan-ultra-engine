import requests, os, sys

CIVITAI_TOKEN = os.environ.get("CIVITAI_TOKEN", "")
HF_TOKEN      = os.environ.get("HF_TOKEN", "")

def download(url, path, label):
    if os.path.exists(path):
        print(f"  {label} already exists, skipping")
        return
    print(f"Downloading {label}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    if "civitai.com" in url and CIVITAI_TOKEN:
        headers["Authorization"] = f"Bearer {CIVITAI_TOKEN}"
    if "huggingface.co" in url and HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
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

# ── Checkpoint (shared across all styles) ────────────────────────────────
download(
    "https://civitai.com/api/download/models/2752410?type=Model&format=SafeTensor&size=full&fp=fp8",
    "/tmp/ltx2_10eros.safetensors",
    "LTX2.3 10Eros checkpoint"
)

# ── LoRAs ─────────────────────────────────────────────────────────────────
# All-In-One NSFW (used on: missionary, doggy, cowgirl, anal)
download(
    "https://civitai.com/api/download/models/2747549?type=Model&format=SafeTensor",
    "/tmp/lora_allinone_nsfw.safetensors",
    "LoRA: DR34ML4Y All-In-One NSFW"
)

# Posing Nude (used on: female_nude_portrait, dressed_vs_naked)
download(
    "https://civitai.com/api/download/models/2391828?type=Model&format=SafeTensor",
    "/tmp/lora_posing_nude.safetensors",
    "LoRA: Wan NSFW Posing Nude"
)

# Sex Thrust (used on: missionary, doggy, anal)
download(
    "https://civitai.com/api/download/models/2674954?type=Model&format=SafeTensor",
    "/tmp/lora_sex_thrust.safetensors",
    "LoRA: LTX2 Sex Thrust"
)

# Blowjob Multiple Angles (used on: oral_sex)
download(
    "https://civitai.com/api/download/models/2422587?type=Model&format=SafeTensor",
    "/tmp/lora_blowjob.safetensors",
    "LoRA: Blowjob Multiple Angles"
)

# Cum/Facial (used on: oral_sex, cum_on_face)
download(
    "https://civitai.com/api/download/models/2460386?type=Model&format=SafeTensor",
    "/tmp/lora_cum_facial.safetensors",
    "LoRA: Cum/Facial Wan2.2"
)

# Mouthful Cumshot I2V (used on: cum_on_face)
download(
    "https://civitai.com/api/download/models/2430424?type=Model&format=SafeTensor",
    "/tmp/lora_cumshot_i2v.safetensors",
    "LoRA: Mouthful Cumshot I2V"
)

print("All video models downloaded successfully")
