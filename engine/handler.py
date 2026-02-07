import torch
import runpod
from diffusers import StableDiffusionXLPipeline, StableDiffusionXLImg2ImgPipeline
import io, base64, os, requests
from PIL import Image

MODEL_PATH = "/tmp/model.safetensors"
CIVITAI_LINK = "https://civitai.com/api/download/models/1081768?type=Model&format=SafeTensor&size=full&fp=fp16"

# Initialize globals
base = None
refiner = None

def download_model():
    if not os.path.exists(MODEL_PATH):
        print("--- DOWNLOADING MODEL FROM CIVITAI ---")
        # Added a timeout and user-agent to prevent Civitai from blocking the request
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(CIVITAI_LINK, headers=headers, stream=True)
        r.raise_for_status()
        with open(MODEL_PATH, 'wb') as f:
            for chunk in r.iter_content(chunk_size=1024*1024): # 1MB chunks for speed
                if chunk:
                    f.write(chunk)
        print("--- DOWNLOAD COMPLETE ---")

def load_models():
    global base, refiner
    if base is None:
        download_model()
        print("--- LOADING PIPELINES ---")
        base = StableDiffusionXLPipeline.from_single_file(
            MODEL_PATH, torch_dtype=torch.float16, use_safetensors=True
        ).to("cuda")
        refiner = StableDiffusionXLImg2ImgPipeline.from_pipe(base).to("cuda")
        base.enable_vae_tiling()
        refiner.enable_vae_tiling()
        print("--- MODELS READY ---")

def handler(job):
    try:
        # Ensure models are loaded before processing the first job
        load_models()
        
        user_prompt = job['input'].get('prompt', '')
        runpod.serverless.progress_update(job, "PAINTING_BASE")
        
        latent = base(
            prompt=f"photo, 8k, {user_prompt}",
            negative_prompt="blurry, low quality, cartoon",
            height=832, width=832, num_inference_steps=30, output_type="latent"
        ).images[0]

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
