import runpod
import base64
import io
import os
import requests
import numpy as np
from PIL import Image
import cv2

face_analyzer = None
face_swapper  = None

INSWAPPER_PATH = "/tmp/inswapper_128.onnx"
INSWAPPER_LINK = "https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx"

def download_file(url, path, label):
    if not os.path.exists(path):
        print(f"Downloading {label}...")
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(url, headers=headers, stream=True)
        r.raise_for_status()
        total_size = int(r.headers.get('content-length', 0))
        with open(path, 'wb') as f:
            downloaded = 0
            for chunk in r.iter_content(chunk_size=1024*1024):
                f.write(chunk)
                downloaded += len(chunk)
                if total_size:
                    print(f"  {(downloaded/total_size)*100:.1f}%", end='\r')
        print(f"  {label} downloaded successfully")

def load_models():
    global face_analyzer, face_swapper

    if face_analyzer is None:
        download_file(INSWAPPER_LINK, INSWAPPER_PATH, "InSwapper 128")

        print("Loading InsightFace...")
        from insightface.app import FaceAnalysis
        import insightface

        face_analyzer = FaceAnalysis(
            name='buffalo_l',
            providers=['CPUExecutionProvider']
        )
        face_analyzer.prepare(ctx_id=0, det_size=(640, 640))

        print("Loading InSwapper...")
        face_swapper = insightface.model_zoo.get_model(
            INSWAPPER_PATH,
            providers=['CPUExecutionProvider']
        )

        print("Face swap models loaded successfully")

def decode_image(image_base64):
    image_data = base64.b64decode(image_base64.split(",")[1] if "," in image_base64 else image_base64)
    pil_image  = Image.open(io.BytesIO(image_data)).convert("RGB")
    # Convert to BGR for OpenCV/InsightFace
    img_array  = np.array(pil_image)
    img_bgr    = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    return img_bgr

def enhance_face(image_bgr):
    """Basic sharpening and contrast to clean up swap edges"""
    kernel = np.array([[-1,-1,-1],[-1,9,-1],[-1,-1,-1]])
    sharpened = cv2.filter2D(image_bgr, -1, kernel * 0.3 + np.eye(3) * 0.7)
    return sharpened

def handler(job):
    try:
        input_data     = job['input']
        target_base64  = input_data.get('target_image')  # image receiving the face
        source_base64  = input_data.get('source_image')  # image donating the face

        if not target_base64 or not source_base64:
            return {"error": "Both target_image and source_image are required"}

        runpod.serverless.progress_update(job, "DECODING_IMAGES")
        target_img = decode_image(target_base64)
        source_img = decode_image(source_base64)

        # ── Detect faces ──────────────────────────────────────────────
        runpod.serverless.progress_update(job, "DETECTING_FACES")
        target_faces = face_analyzer.get(target_img)
        source_faces = face_analyzer.get(source_img)

        if not target_faces:
            return {"error": "No face detected in the target image. Please use a photo with a clearly visible face."}

        if not source_faces:
            return {"error": "No face detected in the source image. Please use a photo with a clearly visible face."}

        # Use largest face in each image
        target_face = max(target_faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        source_face = max(source_faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

        # ── Swap face ─────────────────────────────────────────────────
        runpod.serverless.progress_update(job, "SWAPPING_FACE")
        result_img = face_swapper.get(target_img, target_face, source_face, paste_back=True)

        # ── Post-process ──────────────────────────────────────────────
        result_img = enhance_face(result_img)

        # Convert back to RGB and encode
        # Convert back to RGB and encode
        result_rgb = cv2.cvtColor(result_img, cv2.COLOR_BGR2RGB)
        result_pil = Image.fromarray(result_rgb)

        buffered = io.BytesIO()
        result_pil.save(buffered, format="JPEG", quality=90, optimize=True)

        return {"image": f"data:image/jpeg;base64,{base64.b64encode(buffered.getvalue()).decode()}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

# Models load once at startup
load_models()
runpod.serverless.start({"handler": handler})
