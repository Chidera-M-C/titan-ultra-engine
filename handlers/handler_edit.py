import sys
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__

import os
os.environ['PYTHONUNBUFFERED'] = '1'

import torch
import runpod
from diffusers import (
    StableDiffusionXLControlNetPipeline,
    StableDiffusionXLControlNetImg2ImgPipeline,
    ControlNetModel,
    DPMSolverMultistepScheduler,
    AutoencoderKL
)
from controlnet_aux import OpenposeDetector, CannyDetector
import io, base64
from PIL import Image, ImageFilter, ImageEnhance

# --- CONFIG ---
JUGGERNAUT_PATH  = "/workspace/juggernaut_xl.safetensors"
VAE_PATH         = "/workspace/sdxl_vae.safetensors"
DETAIL_LORA_PATH = "/workspace/add-detail-xl.safetensors"
OPENPOSE_PATH    = "/workspace/controlnet_openpose_xl"
CANNY_PATH       = "/workspace/controlnet_canny_xl"

pipeline         = None
openpose         = None
canny_detector   = None

def load_models():
    global pipeline, openpose, canny_detector

    if pipeline is None:
        print("Loading VAE...")
        vae = AutoencoderKL.from_single_file(
            VAE_PATH, torch_dtype=torch.float16
        ).to("cuda")

        print("Loading ControlNet OpenPose...")
        controlnet_pose = ControlNetModel.from_pretrained(
            OPENPOSE_PATH, torch_dtype=torch.float16
        ).to("cuda")

        print("Loading ControlNet Canny...")
        controlnet_canny = ControlNetModel.from_pretrained(
            CANNY_PATH, torch_dtype=torch.float16
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

        print("Fusing Detail LoRA...")
        pipeline.load_lora_weights(DETAIL_LORA_PATH)
        pipeline.fuse_lora(lora_scale=0.55)

        pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
            pipeline.scheduler.config,
            use_karras_sigmas=True,
            algorithm_type="dpmsolver++"
        )
        pipeline.enable_vae_slicing()
        pipeline.enable_vae_tiling()
        pipeline.enable_attention_slicing(slice_size="auto")

        print("Loading IP-Adapter Face...")
        pipeline.load_ip_adapter(
            "/workspace/ip_adapter/sdxl_models",
            subfolder="",
            weight_name="ip-adapter-plus-face_sdxl_vit-h.safetensors",
            image_encoder_folder="/workspace/ip_adapter/models/image_encoder"
        )
        pipeline.set_ip_adapter_scale(0.80)

        # Convert to img2img pipeline
        pipeline = StableDiffusionXLControlNetImg2ImgPipeline.from_pipe(pipeline)

        print("Loading OpenPose detector...")
        openpose = OpenposeDetector.from_pretrained("lllyasviel/ControlNet")

        print("Loading Canny detector...")
        canny_detector = CannyDetector()

        print("✓ All edit models loaded successfully")

def get_dimensions(image):
    w, h = image.size
    w = int(w // 64 * 64)
    h = int(h // 64 * 64)
    if w > 1536: w = 1536
    if h > 1536: h = 1536
    w = max(512, w)
    h = max(512, h)
    return w, h

def build_prompts(user_prompt, user_negative=''):
    positive = (
        f"{user_prompt}, completely nude, fully naked, no clothes, no fabric, bare skin, "
        f"photorealistic, masterpiece, best quality, ultra detailed, sharp focus, "
        f"realistic skin texture, natural lighting, consistent identity, "
        f"same person, same face, same body, preserve facial features, high detail face"
    )
    negative = (
        "clothes, clothing, dress, shirt, pants, fabric, covered, dressed, "
        "different person, changed face, distorted face, deformed, bad anatomy, "
        "mutated hands, fused fingers, extra fingers, missing fingers, "
        "blurry, low quality, jpeg artifacts, worst quality, ugly, "
        "watermark, text, signature"
    )
    if user_negative:
        negative = f"{user_negative}, {negative}"
    return positive, negative

def post_process(image):
    image = image.filter(ImageFilter.UnsharpMask(radius=1.4, percent=115, threshold=2))
    image = ImageEnhance.Contrast(image).enhance(1.08)
    image = ImageEnhance.Sharpness(image).enhance(1.15)
    return image

def handler(job):
    try:
        input_data       = job['input']
        user_prompt      = input_data.get('prompt', 'standing pose, confident expression')
        user_negative    = input_data.get('negative_prompt', '')
        image_base64     = input_data.get('image')

        # Best balanced defaults
        pose_strength    = float(input_data.get('pose_strength', 0.58))
        canny_strength   = float(input_data.get('canny_strength', 0.22))
        ip_adapter_scale = float(input_data.get('ip_adapter_scale', 0.82))
        strength         = float(input_data.get('strength', 0.68))

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

        pipeline.set_ip_adapter_scale(ip_adapter_scale)

        runpod.serverless.progress_update(job, "GENERATING_EDIT")
        result = pipeline(
            prompt=positive,
            negative_prompt=negative,
            image=input_image,
            control_image=[pose_map, canny_map],
            strength=strength,
            ip_adapter_image=[input_image],
            controlnet_conditioning_scale=[pose_strength, canny_strength],
            num_inference_steps=55,
            guidance_scale=6.8,
            width=w,
            height=h,
        ).images[0]

        result = post_process(result)

        buffered = io.BytesIO()
        result.save(buffered, format="JPEG", quality=92, optimize=True, progressive=True)

        return {"image": f"data:image/jpeg;base64,{base64.b64encode(buffered.getvalue()).decode()}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


if __name__ == "__main__":
    try:
        load_models()
        print("✓ Startup complete, listening for jobs...", flush=True)
        runpod.serverless.start({"handler": handler})
    except Exception as e:
        import traceback
        print(f"FATAL STARTUP ERROR: {e}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
