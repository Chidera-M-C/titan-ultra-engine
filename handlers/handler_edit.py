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
JUGGERNAUT_PATH  = "/tmp/juggernaut_xl.safetensors"
VAE_PATH         = "/tmp/sdxl_vae.safetensors"
DETAIL_LORA_PATH = "/tmp/add-detail-xl.safetensors"
OPENPOSE_PATH    = "/tmp/controlnet_openpose_xl"
CANNY_PATH       = "/tmp/controlnet_canny_xl"

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
    global pipeline, openpose, canny_detector

    if pipeline is None:
        download_file(JUGGERNAUT_LINK,  JUGGERNAUT_PATH,  "Juggernaut XL")
        download_file(VAE_LINK,         VAE_PATH,          "SDXL VAE")
        download_file(DETAIL_LORA_LINK, DETAIL_LORA_PATH,  "Detail Tweaker LoRA")

        vae = AutoencoderKL.from_single_file(
            VAE_PATH, torch_dtype=torch.float16
        ).to("cuda")

        # Load both ControlNets
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

        # Load preprocessors
        print("Loading OpenPose detector...")
        openpose = OpenposeDetector.from_pretrained("lllyasviel/ControlNet")

        print("Loading Canny detector...")
        canny_detector = CannyDetector()

        print("All edit models loaded successfully")

def get_dimensions(image):
    """Preserve original image dimensions, rounded to nearest 8"""
    w, h = image.size
    w = int(w // 8 * 8)
    h = int(h // 8 * 8)
    # Cap at SDXL max
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
        input_data    = job['input']
        user_prompt   = input_data.get('prompt', 'standing pose, confident expression')
        user_negative = input_data.get('negative_prompt', '')
        image_base64  = input_data.get('image')
        pose_strength = float(input_data.get('pose_strength', 0.6))
        canny_strength = float(input_data.get('canny_strength', 0.4))

        if not image_base64:
            return {"error": "No image provided"}

        # Decode input image
        image_data   = base64.b64decode(image_base64.split(",")[1] if "," in image_base64 else image_base64)
        input_image  = Image.open(io.BytesIO(image_data)).convert("RGB")
        w, h         = get_dimensions(input_image)
        input_image  = input_image.resize((w, h), Image.Resampling.LANCZOS)

        positive, negative = build_prompts(user_prompt, user_negative)

        # ── Extract control maps ──────────────────────────────────────────
        runpod.serverless.progress_update(job, "EXTRACTING_POSE")
        pose_map  = openpose(input_image, include_body=True, include_hand=True)
        pose_map  = pose_map.resize((w, h))

        runpod.serverless.progress_update(job, "EXTRACTING_EDGES")
        canny_map = canny_detector(input_image, low_threshold=100, high_threshold=200)
        canny_map = canny_map.resize((w, h))

        # ── Generate with dual ControlNet ─────────────────────────────────
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

        # ── Post-processing ───────────────────────────────────────────────
        result = post_process(result)

        buffered = io.BytesIO()
        result.save(buffered, format="JPEG", quality=85, optimize=True, progressive=True)

        return {"image": f"data:image/jpeg;base64,{base64.b64encode(buffered.getvalue()).decode()}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

# Models load once at startup
load_models()
runpod.serverless.start({"handler": handler})
