import sys
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__

# Force unbuffered output so RunPod captures all logs
import os
os.environ['PYTHONUNBUFFERED'] = '1'

import torch
import runpod
from diffusers import (
    StableDiffusionXLControlNetPipeline,
    ControlNetModel,
    DPMSolverMultistepScheduler,
    AutoencoderKL
)
from controlnet_aux import OpenposeDetector, CannyDetector
import io, base64, os, requests
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

# --- CONFIG ---
CIVITAI_TOKEN    = os.environ.get("CIVITAI_API_TOKEN", "")  # ← reads from RunPod env vars

JUGGERNAUT_PATH  = "/workspace/juggernaut_xl.safetensors"
VAE_PATH         = "/workspace/sdxl_vae.safetensors"
DETAIL_LORA_PATH = "/workspace/add-detail-xl.safetensors"
OPENPOSE_PATH    = "/workspace/controlnet_openpose_xl"
CANNY_PATH       = "/workspace/controlnet_canny_xl"

JUGGERNAUT_LINK  = "https://civitai.com/api/download/models/1759168?type=Model&format=SafeTensor&size=full&fp=fp16"
VAE_LINK         = "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors"
DETAIL_LORA_LINK = "https://huggingface.co/LyliaEngine/add-detail-xl/resolve/main/add-detail-xl.safetensors"
OPENPOSE_HF      = "thibaud/controlnet-openpose-sdxl-1.0"
CANNY_HF         = "diffusers/controlnet-canny-sdxl-1.0"

pipeline         = None
openpose         = None
canny_detector   = None

def download_file(url, path, label):
    if not os.path.exists(path):
        print(f"Downloading {label}...")

        headers = {'User-Agent': 'Mozilla/5.0'}
        if "civitai.com" in url:
            if not CIVITAI_TOKEN:
                raise RuntimeError(f"CIVITAI_API_TOKEN not set — cannot download {label}!")
            headers['Authorization'] = f'Bearer {CIVITAI_TOKEN}'

        r = requests.get(url, headers=headers, stream=True, allow_redirects=True)
        r.raise_for_status()

        # Catch HTML error pages disguised as downloads
        content_type = r.headers.get('content-type', '')
        if 'text/html' in content_type:
            raise RuntimeError(f"{label} download returned an HTML page — Civitai token may be invalid!")

        total_size = int(r.headers.get('content-length', 0))
        with open(path, 'wb') as f:
            downloaded = 0
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)
                downloaded += len(chunk)
                if total_size:
                    print(f"  {(downloaded / total_size) * 100:.1f}%", end='\r')

        # Sanity check — model files should be at least 10MB
        size_mb = os.path.getsize(path) / (1024 * 1024)
        if size_mb < 10:
            os.remove(path)
            raise RuntimeError(f"{label} is only {size_mb:.1f}MB — download likely failed. Check token and URL.")

        print(f"  {label} downloaded successfully ({size_mb:.0f}MB)")
    else:
        size_mb = os.path.getsize(path) / (1024 * 1024)
        print(f"  {label} already exists ({size_mb:.0f}MB), skipping download")

def load_models():
    global pipeline, openpose, canny_detector

    if pipeline is None:
        # Token check upfront
        if not CIVITAI_TOKEN:
            print("⚠️  WARNING: CIVITAI_API_TOKEN not set — Civitai downloads will fail!")
        else:
            print(f"✓ Civitai token loaded ({CIVITAI_TOKEN[:6]}...)")

        download_file(JUGGERNAUT_LINK,  JUGGERNAUT_PATH,  "Juggernaut XL")
        download_file(VAE_LINK,         VAE_PATH,          "SDXL VAE")
        download_file(DETAIL_LORA_LINK, DETAIL_LORA_PATH,  "Detail Tweaker LoRA")

        vae = AutoencoderKL.from_single_file(
            VAE_PATH, torch_dtype=torch.float16
        ).to("cuda")

        print("Loading ControlNet OpenPose...")
        controlnet_pose = ControlNetModel.from_pretrained(
            OPENPOSE_HF, torch_dtype=torch.float16
        ).to("cuda")

        print("Loading ControlNet Canny...")
        controlnet_canny = ControlNetModel.from_pretrained(
            CANNY_HF, torch_dtype=torch.float16
        ).to("cuda")

        print("Loading Juggernaut XL pipeline...")
        pipeline = StableDiffusionXLControlNetPipeline.from_single_file(
            JUGGERNAUT_PATH,
            controlnet=[controlnet_pose, controlnet_canny],
            vae=vae,
            torch_dtype=torch.float16,
            use_safetensors=True,
            variant="fp16"
        ).to("cuda")

        pipeline.load_lora_weights(DETAIL_LORA_PATH)
        pipeline.fuse_lora(lora_scale=0.6)

        pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
            pipeline.scheduler.config,
            use_karras_sigmas=True,
            algorithm_type="dpmsolver++"
        )
        pipeline.enable_vae_slicing()
        pipeline.enable_vae_tiling()
        pipeline.enable_attention_slicing(slice_size="auto")

        print("Loading OpenPose detector...")
        openpose = OpenposeDetector.from_pretrained("lllyasviel/ControlNet")

        print("Loading Canny detector...")
        canny_detector = CannyDetector()

        print("✓ All edit models loaded successfully")

def get_dimensions(image):
    w, h = image.size
    w = int(w // 8 * 8)
    h = int(h // 8 * 8)
    if w > 1536: w = 1536
    if h > 1536: h = 1536
    return w, h

def build_prompts(user_prompt, user_negative=''):
    positive = (
        f"{user_prompt}, photorealistic, masterpiece, best quality, ultra detailed, "
        f"sharp focus, realistic skin, natural lighting, consistent identity, "
        f"same person same face, preserve facial features, preserve background"
    )
    negative = (
        "different person, changed face, distorted face, deformed, bad anatomy, "
        "mutated hands, fused fingers, extra fingers, missing fingers, "
        "blurry, low quality, jpeg artifacts, worst quality, ugly, "
        "watermark, text, signature"
    )
    if user_negative:
        negative = f"{user_negative}, {negative}"
    return positive, negative

def post_process(image):
    image = image.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=2))
    image = ImageEnhance.Contrast(image).enhance(1.1)
    image = ImageEnhance.Sharpness(image).enhance(1.2)
    return image

def handler(job):
    try:
        input_data     = job['input']
        user_prompt    = input_data.get('prompt', 'standing pose, confident expression')
        user_negative  = input_data.get('negative_prompt', '')
        image_base64   = input_data.get('image')
        pose_strength  = float(input_data.get('pose_strength', 0.6))
        canny_strength = float(input_data.get('canny_strength', 0.4))

        if not image_base64:
            return {"error": "No image provided"}

        image_data  = base64.b64decode(image_base64.split(",")[1] if "," in image_base64 else image_base64)
        input_image = Image.open(io.BytesIO(image_data)).convert("RGB")
        w, h        = get_dimensions(input_image)
        input_image = input_image.resize((w, h), Image.Resampling.LANCZOS)

        positive, negative = build_prompts(user_prompt, user_negative)

        runpod.serverless.progress_update(job, "EXTRACTING_POSE")
        pose_map = openpose(input_image, include_body=True, include_hand=True)
        pose_map = pose_map.resize((w, h))

        runpod.serverless.progress_update(job, "EXTRACTING_EDGES")
        canny_map = canny_detector(input_image, low_threshold=100, high_threshold=200)
        canny_map = canny_map.resize((w, h))

        runpod.serverless.progress_update(job, "GENERATING_EDIT")
        result = pipeline(
            prompt=positive,
            negative_prompt=negative,
            image=[pose_map, canny_map],
            controlnet_conditioning_scale=[pose_strength, canny_strength],
            num_inference_steps=35,
            guidance_scale=7.0,
            width=w,
            height=h,
        ).images[0]

        result = post_process(result)

        buffered = io.BytesIO()
        result.save(buffered, format="JPEG", quality=85, optimize=True, progressive=True)

        return {"image": f"data:image/jpeg;base64,{base64.b64encode(buffered.getvalue()).decode()}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


if __name__ == "__main__":
    try:
        load_models()
        print("✓ Startup complete, listening for jobs...")
        runpod.serverless.start({"handler": handler})
    except Exception as e:
        import traceback
        print(f"FATAL STARTUP ERROR: {e}")
        traceback.print_exc()
        raise

if __name__ == "__main__":
    try:
        load_models()
        print("✓ Startup complete", flush=True)
        runpod.serverless.start({"handler": handler})
    except Exception as e:
        import traceback
        print(f"FATAL: {e}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
