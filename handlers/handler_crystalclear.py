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
CRYSTALCLEAR_PATH = "/tmp/crystalclear.safetensors"
VAE_PATH          = "/tmp/sdxl_vae.safetensors"
LORA_NUDE_PATH    = "/tmp/lora_nude_portrait.safetensors"
LORA_DVN_PATH     = "/tmp/lora_dressed_vs_naked.safetensors"

CRYSTALCLEAR_LINK = "https://civitai.com/api/download/models/2514955?type=Model&format=SafeTensor&size=pruned&fp=fp16"
VAE_LINK          = "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors"
LORA_NUDE_LINK    = "https://civitai.com/api/download/models/1506035?type=Model&format=SafeTensor"
LORA_DVN_LINK     = "https://civitai.com/api/download/models/1138533?type=Model&format=SafeTensor"

# Style configs
STYLE_CONFIGS = {
    'female_nude_portrait': {
        'lora_path':          LORA_NUDE_PATH,
        'lora_scale':         0.75,
        'guidance_scale':     7.0,
        'steps':              35,
        'denoising_strength': 0.60,
        'supports_img2img':   True,
    },
    'dressed_vs_naked': {
        'lora_path':          LORA_DVN_PATH,
        'lora_scale':         0.80,
        'guidance_scale':     7.0,
        'steps':              35,
        'denoising_strength': 0.75,  # higher — needs to transition clothing to nude
        'supports_img2img':   True,
    },
}

base_pipeline    = None
refiner_pipeline = None
current_lora     = None  # track which LoRA is currently fused

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
        download_file(CRYSTALCLEAR_LINK, CRYSTALCLEAR_PATH, "CrystalClear XL")
        download_file(VAE_LINK,          VAE_PATH,           "SDXL VAE")
        download_file(LORA_NUDE_LINK,    LORA_NUDE_PATH,     "LoRA: Female Nude Portrait")
        download_file(LORA_DVN_LINK,     LORA_DVN_PATH,      "LoRA: Dressed vs Naked")

        vae = AutoencoderKL.from_single_file(
            VAE_PATH, torch_dtype=torch.float16
        ).to("cuda")

        base_pipeline = StableDiffusionXLPipeline.from_single_file(
            CRYSTALCLEAR_PATH, vae=vae,
            torch_dtype=torch.float16, use_safetensors=True, variant="fp16"
        ).to("cuda")

        base_pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
            base_pipeline.scheduler.config,
            use_karras_sigmas=True,
            algorithm_type="dpmsolver++"
        )
        base_pipeline.enable_vae_slicing()
        base_pipeline.enable_vae_tiling()
        base_pipeline.enable_attention_slicing(slice_size="auto")

        # Refiner shares base weights
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

        print("CrystalClear models loaded successfully")

def switch_lora(lora_path, lora_scale):
    """Unfuse current LoRA and fuse the requested one"""
    global current_lora
    if current_lora == lora_path:
        return  # already loaded, skip
    if current_lora is not None:
        base_pipeline.unfuse_lora()
        base_pipeline.unload_lora_weights()
    base_pipeline.load_lora_weights(lora_path)
    base_pipeline.fuse_lora(lora_scale=lora_scale)
    current_lora = lora_path

def build_prompts(user_prompt, style_id):
    if style_id == 'female_nude_portrait':
        positive = (
            f"{user_prompt}, nude, fully naked, photorealistic, masterpiece, best quality, "
            f"ultra detailed, raw photo, sharp focus, realistic skin with visible pores, "
            f"matte skin, natural face, no makeup, perfect anatomy, perfect hands, "
            f"five fingers per hand, depth of field, natural lighting, "
            f"highly detailed realistic background, professional composition"
        )
        negative = (
            "clothed, dressed, covered, underwear, bra, panties, "
            "oil painting, illustration, cartoon, anime, sketch, blurry, low quality, "
            "bad anatomy, deformed, mutated hands, fused fingers, extra fingers, "
            "missing fingers, long neck, bad proportions, heavy makeup, glossy skin, "
            "plastic skin, airbrushed, doll like, jpeg artifacts, worst quality, ugly"
        )
    elif style_id == 'dressed_vs_naked':
        positive = (
            f"{user_prompt}, split composition, left side fully clothed, right side completely nude, "
            f"same person, same face, photorealistic, masterpiece, best quality, ultra detailed, "
            f"raw photo, sharp focus, realistic skin, natural face, perfect anatomy, "
            f"perfect hands, five fingers per hand, natural lighting, professional photography"
        )
        negative = (
            "oil painting, illustration, cartoon, anime, sketch, blurry, low quality, "
            "bad anatomy, deformed, mutated hands, fused fingers, extra fingers, "
            "missing fingers, long neck, bad proportions, heavy makeup, glossy skin, "
            "plastic skin, jpeg artifacts, worst quality, ugly, different people, "
            "different faces, inconsistent person"
        )
    else:
        positive = f"{user_prompt}, photorealistic, masterpiece, best quality, ultra detailed"
        negative = "low quality, blurry, bad anatomy, worst quality"

    return positive, negative

def get_dimensions(aspect_ratio):
    dimensions = {
        '1:1':  (1024, 1024),
        '4:5':  (1024, 1280),
        '5:4':  (1280, 1024),
        '9:16': (1024, 1536),
        '16:9': (1536, 1024),
    }
    width, height = dimensions.get(aspect_ratio, (1024, 1536))
    upscale_w = int(width  * 2 // 8 * 8)
    upscale_h = int(height * 2 // 8 * 8)
    return width, height, upscale_w, upscale_h

def post_process(image):
    image = image.filter(ImageFilter.UnsharpMask(radius=2.0, percent=150, threshold=2))
    image = ImageEnhance.Contrast(image).enhance(1.15)
    image = ImageEnhance.Sharpness(image).enhance(1.3)
    return image

def handler(job):
    try:
        input_data    = job['input']
        user_prompt   = input_data.get('prompt', 'a beautiful woman')
        style_id      = input_data.get('style', 'female_nude_portrait')
        aspect_ratio  = input_data.get('aspect_ratio', '9:16')
        image_base64  = input_data.get('image', None)

        config = STYLE_CONFIGS.get(style_id, STYLE_CONFIGS['female_nude_portrait'])

        # Block img2img for styles that don't support it
        if image_base64 and not config['supports_img2img']:
            image_base64 = None

        switch_lora(config['lora_path'], config['lora_scale'])

        positive, negative = build_prompts(user_prompt, style_id)
        width, height, upscale_w, upscale_h = get_dimensions(aspect_ratio)

        if image_base64:
            # ── img2img path ──────────────────────────────────────────────
            runpod.serverless.progress_update(job, "PROCESSING_IMAGE")
            image_data  = base64.b64decode(image_base64.split(",")[1] if "," in image_base64 else image_base64)
            input_image = Image.open(io.BytesIO(image_data)).convert("RGB")
            input_image = input_image.resize((upscale_w, upscale_h), Image.Resampling.LANCZOS)

            final_image = refiner_pipeline(
                prompt=positive, negative_prompt=negative,
                image=input_image,
                num_inference_steps=config['steps'],
                guidance_scale=config['guidance_scale'],
                denoising_strength=config['denoising_strength'],
            ).images[0]

        else:
            # ── txt2img path ──────────────────────────────────────────────
            runpod.serverless.progress_update(job, "GENERATING_BASE")
            base_image = base_pipeline(
                prompt=positive, negative_prompt=negative,
                num_inference_steps=config['steps'],
                guidance_scale=config['guidance_scale'],
                height=height, width=width,
            ).images[0]

            runpod.serverless.progress_update(job, "APPLYING_HIGHRES_FIX")
            upscaled = base_image.resize((upscale_w, upscale_h), Image.Resampling.LANCZOS)
            final_image = refiner_pipeline(
                prompt=positive, negative_prompt=negative,
                image=upscaled,
                num_inference_steps=40,
                guidance_scale=config['guidance_scale'],
                denoising_strength=config['denoising_strength'],
            ).images[0]

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
