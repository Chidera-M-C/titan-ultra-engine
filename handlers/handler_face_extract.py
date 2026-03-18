import runpod
import base64
import io
import os
import requests
import numpy as np
from PIL import Image

# InsightFace will be loaded once at startup
face_analyzer = None

def load_models():
    global face_analyzer
    if face_analyzer is None:
        print("Loading InsightFace...")
        from insightface.app import FaceAnalysis
        face_analyzer = FaceAnalysis(
            name='buffalo_l',
            providers=['CPUExecutionProvider']
        )
        face_analyzer.prepare(ctx_id=0, det_size=(640, 640))
        print("InsightFace loaded successfully")

def handler(job):
    try:
        input_data   = job['input']
        image_base64 = input_data.get('image')

        if not image_base64:
            return {"error": "No image provided"}

        # Decode image
        image_data  = base64.b64decode(image_base64.split(",")[1] if "," in image_base64 else image_base64)
        pil_image   = Image.open(io.BytesIO(image_data)).convert("RGB")

        # Convert to numpy for InsightFace
        img_array = np.array(pil_image)

        # Detect faces
        faces = face_analyzer.get(img_array)

        if not faces:
            return {"error": "No face detected in the image. Please upload a photo with a clearly visible face."}

        # Use the largest/most prominent face
        largest_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

        # Extract 512-dim embedding
        embedding = largest_face.normed_embedding.tolist()

        return {
            "embedding": embedding,
            "face_count": len(faces),
        }

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

# Load models at startup
load_models()
runpod.serverless.start({"handler": handler})
