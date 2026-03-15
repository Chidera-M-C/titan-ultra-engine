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

LORA_PATHS = {
    'missionary_style': "/tmp/lora_missionary.safetensors",
    'doggy_style':      "/tmp/lora_doggy.safetensors",
    'cowgirl_style':    "/tmp/lora_cowgirl.safetensors",
    'anal_sex':         "/tmp/lora_anal.safetensors",
    'oral_sex':         "/tmp/lora_oral.safetensors",
    'threesome_sex':    "/tmp/lora_threesome.safetensors",
    'cum_on_face':      "/tmp/lora_cum_on_face.safetensors",
    'lesbian_sex':      "/tmp/lora_lesbian.safetensors",
}

BIGLUST_LINK     = "https://civitai.com/api/download/models/1081768?type=Model&format=SafeTensor&size=full&fp=fp16"
VAE_LINK         = "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors"
DETAIL_LORA_LINK = "https://huggingface.co/LyliaEngine/add-detail-xl/resolve/main/add-detail-xl.safetensors"

LORA_LINKS = {
    'missionary_style': "https://civitai.com/api/download/models/2536215?type=Model&format=SafeTensor",
    'doggy_style':      "https://civitai.com/api/download/models/2530338?type=Model&format=SafeTensor",
    'cowgirl_style':    "https://civitai.com/api/download/models/2530288?type=Model&format=SafeTensor",
    'anal_sex':         "https://civitai.com/api/download/models/2530355?type=Model&format=SafeTensor",
    'oral_sex':         "https://civitai.com/api/download/models/2530259?type=Model&format=SafeTensor",
    'threesome_sex':    "https://civitai.com/api/download/models/714650?type=Model&format=SafeTensor",
    'cum_on_face':      "https://civitai.com/api/download/models/2530375?type=Model&format=SafeTensor",
    'lesbian_sex':      "https://civitai.com/api/download/models/714650?type=Model&format=SafeTensor",
}

# Per-style generation settings
STYLE_CONFIGS = {
    'missionary_style': {'lora_scale': 0.85, 'guidance_scale': 7.5, 'steps': 35, 'denoising_strength': 0.60},
    'doggy_style':      {'lora_scale': 0.70, 'guidance_scale': 7.5, 'steps': 35, 'denoising_strength': 0.60},
    'cowgirl_style':    {'lora_scale': 0.85, 'guidance_scale': 7.5, 'steps': 35, 'denoising_strength': 0.60},
    'anal_sex':         {'lora_scale': 0.85, 'guidance_scale': 7.5, 'steps': 38, 'denoising_strength': 0.62},
    'oral_sex':         {'lora_scale': 0.85, 'guidance_scale': 7.5, 'steps': 38, 'denoising_strength': 0.62},
    'threesome_sex':    {'lora_scale': 0.80, 'guidance_scale': 8.0, 'steps': 40, 'denoising_strength': 0.65},
    'cum_on_face':      {'lora_scale': 0.85, 'guidance_scale': 7.0, 'steps': 35, 'denoising_strength': 0.58},
    'lesbian_sex':      {'lora_scale': 0.80, 'guidance_scale': 7.5, 'steps': 40, 'denoising_strength': 0.62},
}

# txt2img only — no img2img for position styles
IMG2IMG_STYLES = {'cum_on_face'}

base_pipeline    = None
refiner_pipeline = None
current_lora     = None

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
        # Download base model and VAE
        download_file(BIGLUST_LINK,     BIGLUST_PATH,     "BigLust")
        download_file(VAE_LINK,         VAE_PATH,          "SDXL VAE")
        download_file(DETAIL_LORA_LINK, DETAIL_LORA_PATH,  "Detail Tweaker XL LoRA")

        # Download all style LoRAs
        for style_id, link in LORA_LINKS.items():
            download_file(link, LORA_PATHS[style_id], f"LoRA: {style_id}")

        vae = AutoencoderKL.from_single_file(
            VAE_PATH, torch_dtype=torch.float16
        ).to("cuda")

        base_pipeline = StableDiffusionXLPipeline.from_single_file(
            BIGLUST_PATH, vae=vae,
            torch_dtype=torch.float16, use_safetensors=True, variant="fp16"
        ).to("cuda")

        # Fuse Detail Tweaker as permanent base LoRA
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

        print("BigLust models and all LoRAs loaded successfully")

def switch_lora(style_id):
    """Switch style LoRA on top of the already-fused Detail Tweaker"""
    global current_lora
    lora_path = LORA_PATHS.get(style_id)
    if not lora_path:
        return
    if current_lora == lora_path:
        return  # already active
    if current_lora is not None:
        base_pipeline.unfuse_lora()
        base_pipeline.unload_lora_weights()
    base_pipeline.load_lora_weights(lora_path)
    config = STYLE_CONFIGS.get(style_id, {})
    base_pipeline.fuse_lora(lora_scale=config.get('lora_scale', 0.85))
    current_lora = lora_path

def build_prompts(user_prompt, style_id):
    style_triggers = {
        'missionary_style': "missionary position, man on top, face to face sex, lying down, explicit, penetration",
        'doggy_style':      "doggy style, from behind, rear entry, explicit, penetration",
        'cowgirl_style':    "cowgirl position, woman on top, riding, explicit, penetration",
        'anal_sex':         "anal sex, anal penetration, from behind, explicit",
        'oral_sex':         "oral sex, fellatio, deepthroat, explicit",
        'threesome_sex':    "threesome, three people, group sex, explicit",
        'cum_on_face':      "cum on face, facial, explicit",
        'lesbian_sex':      "lesbian sex, two women, girl on girl, explicit",
    }

    trigger = style_triggers.get(style_id, "")

    positive = (
        f"{user_prompt}, {trigger}, "
        f"photorealistic, masterpiece, best quality, ultra detailed, raw photo, "
        f"sharp focus, intricate texture, realistic skin with visible pores and subtle imperfections, "
        f"matte skin, natural face, perfect anatomy, correct limb placement, "
        f"perfect hands, five fingers per hand, detailed fingers, "
        f"highly detailed realistic background, coherent professional composition, "
        f"depth of field, natural lighting"
    )

    negative = (
        "split screen, multiple images, divided image, storyboard, tiling, duplicate frames, "
        "watermark, text, logo, signature, username, letters, words, branding, "
        "oil painting, illustration, drawing, cartoon, anime, sketch, blurry, low quality, "
        "bad anatomy, deformed, disfigured, mutated hands, malformed hands, fused fingers, "
        "extra fingers, missing fingers, too many fingers, mutated limbs, deformed limbs, "
        "extra limbs, missing limbs, long neck, bad proportions, twisted body, "
        "heavy makeup, glossy skin, plastic skin, airbrushed face, doll like, "
        "jpeg artifacts, worst quality, ugly, overexposed"
    )

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
        style_id      = input_data.get('style', 'missionary_style')
        aspect_ratio  = input_data.get('aspect_ratio', '9:16')
        image_base64  = input_data.get('image', None)
        user_negative = input_data.get('negative_prompt', '')

        config = STYLE_CONFIGS.get(style_id, STYLE_CONFIGS['missionary_style'])

        switch_lora(style_id)

        positive, negative = build_prompts(user_prompt, style_id)
        if user_negative:
            negative = f"{user_negative}, {negative}"

        width, height, upscale_w, upscale_h = get_dimensions(aspect_ratio)

        if image_base64 and style_id in IMG2IMG_STYLES:
            # ── img2img path ──────────────────────────────────────────
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
            # ── txt2img path ──────────────────────────────────────────
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

# Models and all LoRAs load once at startup
load_models()
runpod.serverless.start({"handler": handler})
