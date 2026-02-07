import torch
import runpod
from diffusers import StableDiffusionXLPipeline, StableDiffusionXLImg2ImgPipeline
import io, base64, os, requests
from PIL import Image

# 1. SETUP
MODEL_PATH = "/tmp/model.safetensors"
CIVITAI_LINK = "https://civitai.com/api/download/models/1081768?type=Model&format=SafeTensor&size=full&fp=fp16" 

def download_model():
    if not os.path.exists(MODEL_PATH):
        print("--- DOWNLOADING MODEL ---")
        r = requests.get(CIVITAI_LINK, stream=True)
        r.raise_for_status()
        with open(MODEL_PATH, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)

# Initialize global variables for the models
base = None
refiner = None

try:
    download_model()
    base = StableDiffusionXLPipeline.from_single_file(
        MODEL_PATH, torch_dtype=torch.float16, use_safetensors=True
    ).to("cuda")
    refiner = StableDiffusionXLImg2ImgPipeline.from_pipe(base).to("cuda")
    base.enable_vae_tiling()
    refiner.enable_vae_tiling()
except Exception as e:
    print(f"BOOT ERROR: {str(e)}")

def handler(job):
    if base is None:
        return {"error": "Model failed to load on worker boot."}

    try:
        user_prompt = job['input'].get('prompt', '')
        
        # UPDATE UI: Base Pass
        runpod.serverless.progress_update(job, "PAINTING_BASE")
        
        latent = base(
            prompt=f"photo, 8k, {user_prompt}",
            negative_prompt="blurry, low quality, cartoon",
            height=832, width=832, num_inference_steps=30, output_type="latent"
        ).images[0]

        # UPDATE UI: Refiner Pass
        runpod.serverless.progress_update(job, "GOD_LEVEL_REFINING")
        
        final_image = refiner(
            prompt=f"ultra-realistic, 8k, {user_prompt}",
            image=latent,
            num_inference_steps=20,
            denoising_strength=0.45,
            target_size=(1440, 1440)
        ).images[0]

        buffered = io.BytesIO()
        final_image.save(buffered, format="JPEG", quality=95)
        return {"image": f"data:image/jpeg;base64,{base64.b64encode(buffered.getvalue()).decode()}"}

    except Exception as e:
        return {"error": str(e)}

runpod.serverless.start({"handler": handler})
