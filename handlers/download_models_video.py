import requests, os

CIVITAI_TOKEN = os.environ.get("CIVITAI_TOKEN", "")
HF_TOKEN      = os.environ.get("HF_TOKEN", "")

def download(url, path, label, retries=3):
    if os.path.exists(path):
        print(f"  {label} already exists, skipping")
        return
    for attempt in range(retries):
        try:
            print(f"Downloading {label} (attempt {attempt+1})...")
            headers = {"User-Agent": "Mozilla/5.0"}
            if "civitai" in url and CIVITAI_TOKEN:
                headers["Authorization"] = f"Bearer {CIVITAI_TOKEN}"
            r = requests.get(url, headers=headers, stream=True, timeout=300)
            r.raise_for_status()
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024 * 1024):
                    f.write(chunk)
            print(f"  {label} done")
            return
        except Exception as e:
            print(f"  Attempt {attempt+1} failed: {e}")
            if os.path.exists(path):
                os.remove(path)
            if attempt < retries - 1:
                import time; time.sleep(10)
    print(f"  WARNING: Could not download {label}, skipping")

download("https://civitai.com/api/download/models/2747549?type=Model&format=SafeTensor", "/tmp/lora_allinone_nsfw.safetensors", "LoRA: All-In-One NSFW")
download("https://civitai.red/api/download/models/2391828?type=Model&format=SafeTensor", "/tmp/lora_posing_nude.safetensors", "LoRA: Posing Nude")
download("https://civitai.com/api/download/models/2674954?type=Model&format=SafeTensor", "/tmp/lora_sex_thrust.safetensors", "LoRA: Sex Thrust")
download("https://civitai.red/api/download/models/2195559?fileId=2088649", "/tmp/lora_blowjob.safetensors", "LoRA: Blowjob")
download("https://civitai.red/api/download/models/2460386?type=Model&format=SafeTensor", "/tmp/lora_cum_facial.safetensors", "LoRA: Cum Facial")
download("https://civitai.red/api/download/models/2430424?type=Model&format=SafeTensor", "/tmp/lora_cumshot_i2v.safetensors", "LoRA: Cumshot I2V")

print("All LoRAs downloaded successfully")
