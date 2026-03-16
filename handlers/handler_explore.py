import torch
import runpod
from diffusers import (
    StableDiffusionXLPipeline,
    StableDiffusionXLImg2ImgPipeline,
    DPMSolverMultistepScheduler,
    AutoencoderKL
)
import io, base64, os, requests
from PIL import Image, ImageFilter, ImageEnhance

# --- CONFIG ---
BIGLUST_PATH     = "/tmp/biglust.safetensors"
VAE_PATH         = "/tmp/sdxl_vae.safetensors"
DETAIL_LORA_PATH = "/tmp/add-detail-xl.safetensors"

BIGLUST_LINK     = "https://civitai.com/api/download/models/1081768?type=Model&format=SafeTensor&size=full&fp=fp16"
VAE_LINK         = "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors"
DETAIL_LORA_LINK = "https://huggingface.co/LyliaEngine/add-detail-xl/resolve/main/add-detail-xl.safetensors"

base_pipeline    = None
refiner_pipeline = None

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
    global base_pipeline, refiner_pipeline

    if base_pipeline is None:
        download_file(BIGLUST_LINK,     BIGLUST_PATH,     "BigLust")
        download_file(VAE_LINK,         VAE_PATH,          "SDXL VAE")
        download_file(DETAIL_LORA_LINK, DETAIL_LORA_PATH,  "Detail Tweaker XL LoRA")

        vae = AutoencoderKL.from_single_file(
            VAE_PATH, torch_dtype=torch.float16
        ).to("cuda")

        base_pipeline = StableDiffusionXLPipeline.from_single_file(
            BIGLUST_PATH, vae=vae,
            torch_dtype=torch.float16, use_safetensors=True, variant="fp16"
        ).to("cuda")

        base_pipeline.load_lora_weights(DETAIL_LORA_PATH)
        base_pipeline.fuse_lora(lora_scale=0.8)

        base_pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
            base_pipeline.scheduler.config,
            use_karras_sigmas=True,
            algorithm_type="dpmsolver++"
        )
        base_pipeline.enable_vae_slicing()
        base_pipeline.enable_vae_tiling()
        base_pipeline.enable_attention_slicing(slice_size="auto")

        refiner_pipeline = StableDiffusionXLImg2ImgPipeline(
            vae=base_pipeline.vae,
            text_encoder=base_pipeline.text_encoder,
            text_encoder_2=base_pipeline.text_encoder_2,
            tokenizer=base_pipeline.tokenizer,
            tokenizer_2=base_pipeline.tokenizer_2,
            unet=base_pipeline.unet,
            scheduler=base_pipeline.scheduler,
        ).to("cuda")
        refiner_pipeline.enable_vae_slicing()
        refiner_pipeline.enable_vae_tiling()
        refiner_pipeline.enable_attention_slicing(slice_size="auto")

        print("Models loaded successfully")

def get_dimensions(aspect_ratio):
    dimensions = {
        '1:1':  (1024, 1024),
        '4:5':  (1024, 1280),
        '5:4':  (1280, 1024),
        '9:16': (1024, 1536),
        '16:9': (1536, 1024),
    }
    width, height = dimensions.get(aspect_ratio, (1024, 1536))
    upscale_w = int(width  * 1.5 // 8 * 8)
    upscale_h = int(height * 1.5 // 8 * 8)
    return width, height, upscale_w, upscale_h

def build_prompts(user_prompt, user_negative=''):
    positive = (
        f"{user_prompt}, photorealistic, masterpiece, best quality, ultra detailed, raw photo, "
        f"sharp focus, intricate texture, realistic skin with visible pores and subtle imperfections, "
        f"matte skin, natural face, no heavy makeup, candid portrait, "
        f"perfect anatomy, correct limb placement, perfect hands, five fingers per hand, detailed fingers, "
        f"highly detailed realistic background, coherent professional composition, depth of field, natural lighting"
    )

    negative = (
        "split screen, multiple images, divided image, storyboard, tiling, duplicate frames, "
        "watermark, text, logo, signature, username, letters, words, branding, overlay text, caption, subtitle, "
        "oil painting, illustration, drawing, cartoon, anime, sketch, blurry, low quality, "
        "bad anatomy, deformed, disfigured, mutated hands, malformed hands, fused fingers, "
        "extra fingers, missing fingers, too many fingers, mutated limbs, deformed limbs, "
        "extra limbs, missing limbs, long neck, bad proportions, twisted body, "
        "heavy makeup, glossy skin, plastic skin, airbrushed face, doll like, barbie, "
        "eyeliner, red lipstick, jpeg artifacts, worst quality, ugly, overexposed"
    )

    if user_negative:
        negative = f"{user_negative}, {negative}"

    return positive, negative

def post_process(image):
    image = image.filter(ImageFilter.UnsharpMask(radius=2.0, percent=150, threshold=2))
    image = ImageEnhance.Contrast(image).enhance(1.15)
    image = ImageEnhance.Sharpness(image).enhance(1.3)
    return image

def handler(job):
    try:
        input_data    = job['input']
        user_prompt   = input_data.get('prompt', 'a beautiful woman')
        aspect_ratio  = input_data.get('aspect_ratio', '9:16')
        user_negative = input_data.get('negative_prompt', '')

        positive, negative = build_prompts(user_prompt, user_negative)
        width, height, upscale_w, upscale_h = get_dimensions(aspect_ratio)

        # ── Base generation ───────────────────────────────────────────────
        runpod.serverless.progress_update(job, "GENERATING_BASE")
        base_image = base_pipeline(
            prompt=positive, negative_prompt=negative,
            num_inference_steps=35, guidance_scale=7.0,
            height=height, width=width,
        ).images[0]

        # ── Highres fix ───────────────────────────────────────────────────
        runpod.serverless.progress_update(job, "APPLYING_HIGHRES_FIX")
        upscaled = base_image.resize((upscale_w, upscale_h), Image.Resampling.LANCZOS)
        final_image = refiner_pipeline(
            prompt=positive, negative_prompt=negative,
            image=upscaled,
            num_inference_steps=40, guidance_scale=7.0,
            denoising_strength=0.6,
        ).images[0]

        # ── Post-processing ───────────────────────────────────────────────
        final_image = post_process(final_image)

        buffered = io.BytesIO()
        final_image.save(buffered, format="JPEG", quality=85, optimize=True, progressive=True)

        return {"image": f"data:image/jpeg;base64,{base64.b64encode(buffered.getvalue()).decode()}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

# Models load once at startup
load_models()
runpod.serverless.start({"handler": handler})
