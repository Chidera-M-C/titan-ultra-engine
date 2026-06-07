import torch
import runpod
import io, base64, os, requests
from PIL import Image
import numpy as np

# ── Lazy imports for LTX-Video ────────────────────────────────────────────
# LTX-Video uses the ltx_video library or diffusers >= 0.30
from diffusers import LTXPipeline, LTXImageToVideoPipeline
from diffusers.utils import export_to_video

# ── Paths ─────────────────────────────────────────────────────────────────
CHECKPOINT_PATH = "/tmp/ltx2_10eros.safetensors"
CHECKPOINT_LINK = "https://civitai.com/api/download/models/2752410?type=Model&format=SafeTensor&size=full&fp=fp8"

LORA_PATHS = {
    'allinone_nsfw': "/tmp/lora_allinone_nsfw.safetensors",
    'posing_nude':   "/tmp/lora_posing_nude.safetensors",
    'sex_thrust':    "/tmp/lora_sex_thrust.safetensors",
    'blowjob':       "/tmp/lora_blowjob.safetensors",
    'cum_facial':    "/tmp/lora_cum_facial.safetensors",
    'cumshot_i2v':   "/tmp/lora_cumshot_i2v.safetensors",
}

LORA_LINKS = {
    'allinone_nsfw': "https://civitai.com/api/download/models/2747549?type=Model&format=SafeTensor",
    'posing_nude':   "https://civitai.com/api/download/models/2391828?type=Model&format=SafeTensor",
    'sex_thrust':    "https://civitai.com/api/download/models/2674954?type=Model&format=SafeTensor",
    'blowjob':       "https://civitai.com/api/download/models/2422587?type=Model&format=SafeTensor",
    'cum_facial':    "https://civitai.com/api/download/models/2460386?type=Model&format=SafeTensor",
    'cumshot_i2v':   "https://civitai.com/api/download/models/2430424?type=Model&format=SafeTensor",
}

# ── Per-style config ──────────────────────────────────────────────────────
# loras: list of (lora_key, scale) tuples applied in order
# guidance_scale, num_frames: controls quality/length
STYLE_CONFIGS = {
    'female_nude_portrait': {
        'loras': [('posing_nude', 0.85)],
        'guidance_scale': 7.5,
        'trigger': 'nude woman, elegant pose, natural lighting, bare skin',
    },
    'dressed_vs_naked': {
        'loras': [('posing_nude', 0.80)],
        'guidance_scale': 7.5,
        'trigger': 'woman partially undressing, contrast between clothed and nude, sensual reveal',
    },
    'missionary_style': {
        'loras': [('allinone_nsfw', 0.85), ('sex_thrust', 0.70)],
        'guidance_scale': 7.5,
        'trigger': 'missionary sex, man on top, face to face, thrusting motion, explicit',
    },
    'doggy_style': {
        'loras': [('allinone_nsfw', 0.85), ('sex_thrust', 0.70)],
        'guidance_scale': 7.5,
        'trigger': 'doggy style sex, from behind, rear entry, thrusting motion, explicit',
    },
    'cowgirl_style': {
        'loras': [('allinone_nsfw', 0.85)],
        'guidance_scale': 7.5,
        'trigger': 'cowgirl position, woman on top, riding motion, explicit',
    },
    'anal_sex': {
        'loras': [('allinone_nsfw', 0.85), ('sex_thrust', 0.70)],
        'guidance_scale': 7.5,
        'trigger': 'anal sex, anal penetration, from behind, thrusting, explicit',
    },
    'oral_sex': {
        'loras': [('blowjob', 0.85), ('cum_facial', 0.60)],
        'guidance_scale': 7.5,
        'trigger': 'oral sex, blowjob, deepthroat motion, explicit',
    },
    'threesome_sex': {
        'loras': [],  # no LoRA available yet
        'guidance_scale': 8.0,
        'trigger': 'threesome, group sex, three people, explicit',
    },
    'cum_on_face': {
        'loras': [('cum_facial', 0.85), ('cumshot_i2v', 0.80)],
        'guidance_scale': 7.0,
        'trigger': 'cum on face, facial, explicit',
    },
    'lesbian_sex': {
        'loras': [],  # no LoRA available yet
        'guidance_scale': 7.5,
        'trigger': 'lesbian sex, two women, girl on girl, explicit',
    },
}

# ── Pipeline globals ──────────────────────────────────────────────────────
txt2vid_pipeline = None
img2vid_pipeline = None
active_loras     = []

def download_file(url, path, label):
    if os.path.exists(path):
        return
    print(f"Downloading {label}...")
    headers = {'User-Agent': 'Mozilla/5.0'}
    civitai_token = os.environ.get('CIVITAI_TOKEN', '')
    if 'civitai.com' in url and civitai_token:
        headers['Authorization'] = f'Bearer {civitai_token}'
    r = requests.get(url, headers=headers, stream=True)
    r.raise_for_status()
    total = int(r.headers.get('content-length', 0))
    with open(path, 'wb') as f:
        done = 0
        for chunk in r.iter_content(chunk_size=1024*1024):
            f.write(chunk)
            done += len(chunk)
            if total:
                print(f"  {(done/total)*100:.1f}%", end='\r')
    print(f"  {label} done")

def load_models():
    global txt2vid_pipeline, img2vid_pipeline

    if txt2vid_pipeline is not None:
        return

    # Download checkpoint
    download_file(CHECKPOINT_LINK, CHECKPOINT_PATH, "LTX2.3 10Eros")

    # Download all LoRAs
    for key, link in LORA_LINKS.items():
        download_file(link, LORA_PATHS[key], f"LoRA: {key}")

    print("Loading LTX-Video text-to-video pipeline...")
    txt2vid_pipeline = LTXPipeline.from_pretrained(
        "Lightricks/LTX-Video",
        torch_dtype=torch.bfloat16,
    ).to("cuda")
    txt2vid_pipeline.enable_attention_slicing()

    print("Loading LTX-Video image-to-video pipeline...")
    img2vid_pipeline = LTXImageToVideoPipeline(
        transformer=txt2vid_pipeline.transformer,
        scheduler=txt2vid_pipeline.scheduler,
        vae=txt2vid_pipeline.vae,
        text_encoder=txt2vid_pipeline.text_encoder,
        tokenizer=txt2vid_pipeline.tokenizer,
    ).to("cuda")
    img2vid_pipeline.enable_attention_slicing()

    print("Video models loaded successfully")

def apply_loras(pipeline, lora_list):
    """Apply a list of (lora_key, scale) LoRAs to the pipeline"""
    global active_loras

    # Check if same loras already applied
    if active_loras == lora_list:
        return

    # Unload previous LoRAs
    if active_loras:
        try:
            pipeline.unload_lora_weights()
        except Exception:
            pass

    active_loras = lora_list

    if not lora_list:
        return

    # Load each LoRA with its scale
    adapters, scales = [], []
    for i, (lora_key, scale) in enumerate(lora_list):
        path = LORA_PATHS.get(lora_key)
        if path and os.path.exists(path):
            adapter_name = f"lora_{i}"
            pipeline.load_lora_weights(path, adapter_name=adapter_name)
            adapters.append(adapter_name)
            scales.append(scale)

    if adapters:
        pipeline.set_adapters(adapters, adapter_weights=scales)

def build_positive_prompt(user_prompt, style_id, character=None):
    style_cfg = STYLE_CONFIGS.get(style_id, {})
    trigger   = style_cfg.get('trigger', '')

    char_context = ''
    if character:
        name      = character.get('name', '')
        race      = character.get('race', '')
        body_type = character.get('body_type', '').replace('_', ' ')
        char_context = f"{name}, {race} woman, {body_type}, "

    return (
        f"{char_context}{user_prompt}, {trigger}, "
        f"photorealistic, masterpiece, best quality, ultra detailed, "
        f"natural lighting, cinematic, smooth motion, fluid movement"
    )

def build_negative_prompt(user_negative=''):
    base_neg = (
        "static, frozen, no motion, still image, watermark, text, logo, "
        "blurry, low quality, bad anatomy, deformed, ugly, artifacts, "
        "jumpcut, flicker, jitter, distorted"
    )
    return f"{user_negative}, {base_neg}" if user_negative else base_neg

def get_dimensions(aspect_ratio):
    dims = {
        '1:1':  (512, 512),
        '4:5':  (512, 640),
        '5:4':  (640, 512),
        '9:16': (512, 896),
        '16:9': (896, 512),
    }
    return dims.get(aspect_ratio, (512, 896))

def duration_to_frames(duration_sec):
    """LTX-Video runs at ~24fps. Duration is 4-8 seconds."""
    fps = 24
    frames = int(duration_sec * fps)
    # Must be divisible by 8 for LTX
    return max(24, (frames // 8) * 8)

def decode_image(base64_str):
    data = base64.b64decode(base64_str.split(",")[1] if "," in base64_str else base64_str)
    return Image.open(io.BytesIO(data)).convert("RGB")

def handler(job):
    try:
        inp            = job['input']
        generation_type = inp.get('type', 'text_to_video')
        style_id       = inp.get('style', 'female_nude_portrait')
        user_prompt    = inp.get('prompt', '')
        negative_prompt = inp.get('negative_prompt', '')
        aspect_ratio   = inp.get('aspect_ratio', '9:16')
        duration_sec   = float(inp.get('duration', 4))
        motion_strength = float(inp.get('motion_strength', 0.7))
        start_image_b64 = inp.get('start_image', None)
        end_image_b64   = inp.get('end_image', None)
        character       = inp.get('character', None)

        style_cfg  = STYLE_CONFIGS.get(style_id, STYLE_CONFIGS['female_nude_portrait'])
        width, height = get_dimensions(aspect_ratio)
        num_frames = duration_to_frames(duration_sec)
        guidance_scale = style_cfg['guidance_scale']

        positive = build_positive_prompt(user_prompt, style_id, character)
        negative = build_negative_prompt(negative_prompt)

        # ── Image-to-video ─────────────────────────────────────────────
        if generation_type == 'image_to_video' and start_image_b64:
            runpod.serverless.progress_update(job, "PREPARING_IMAGE")
            apply_loras(img2vid_pipeline, style_cfg['loras'])

            start_image = decode_image(start_image_b64).resize((width, height), Image.LANCZOS)

            runpod.serverless.progress_update(job, "GENERATING_VIDEO")
            result = img2vid_pipeline(
                image=start_image,
                prompt=positive,
                negative_prompt=negative,
                num_frames=num_frames,
                num_inference_steps=40,
                guidance_scale=guidance_scale,
                image_guidance_scale=motion_strength,
                width=width,
                height=height,
            )

        # ── Text-to-video ──────────────────────────────────────────────
        else:
            runpod.serverless.progress_update(job, "GENERATING_VIDEO")
            apply_loras(txt2vid_pipeline, style_cfg['loras'])

            result = txt2vid_pipeline(
                prompt=positive,
                negative_prompt=negative,
                num_frames=num_frames,
                num_inference_steps=40,
                guidance_scale=guidance_scale,
                width=width,
                height=height,
            )

        # ── Export to mp4 base64 ───────────────────────────────────────
        runpod.serverless.progress_update(job, "ENCODING_VIDEO")
        video_path = "/tmp/output_video.mp4"
        export_to_video(result.frames[0], video_path, fps=24)

        with open(video_path, "rb") as f:
            video_b64 = base64.b64encode(f.read()).decode()

        os.remove(video_path)

        return {"video": f"data:video/mp4;base64,{video_b64}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


# Load models once at startup
load_models()
runpod.serverless.start({"handler": handler})
