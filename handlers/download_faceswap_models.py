import requests, os

def download(url, path, label):
    if os.path.exists(path):
        print(f"  {label} already exists, skipping")
        return
    print(f"Downloading {label}...")
    headers = {"User-Agent": "Mozilla/5.0"}
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

# Download InSwapper model
download(
    "https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx",
    "/tmp/inswapper_128.onnx",
    "InSwapper 128"
)

# Pre-download InsightFace buffalo_l
print("Pre-downloading InsightFace buffalo_l...")
from insightface.app import FaceAnalysis
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))
print("InsightFace buffalo_l downloaded successfully")

print("All face swap models downloaded successfully")
