# ── IMPORTANT: Set HF_HOME before any other imports so all model loads
#    come from the persistent network volume instead of ephemeral disk ──────
import os
os.environ["HF_HOME"] = "/runpod-volume/huggingface"

import torch
import runpod
import io, base64, requests
from PIL import Image

from diffusers import (
    WanPipeline,
    WanImageToVideoPipeline,
    AutoencoderKLWan,
)
from diffusers.schedulers.scheduling_unipc_multistep import UniPCMultistepScheduler
from diffusers.utils import export_to_video

# ── Model IDs ─────────────────────────────────────────────────────────────
T2V_MODEL_ID = "Wan-AI/Wan2.1-T2V-14B-Diffusers"
I2V_MODEL_ID = "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers"

# ── LoRA paths (persistent network volume — never re-downloaded) ───────────
# ── LoRA paths (persistent network volume — never re-downloaded) ───────────
LORA_PATHS = {
    'allinone_nsfw': "/runpod-volume/loras/lora_allinone_nsfw.safetensors",
    'posing_nude':   "/runpod-volume/loras/lora_posing_nude.safetensors",
    'sex_thrust':    "/runpod-volume/loras/lora_sex_thrust.safetensors",
    'blowjob':       "/runpod-volume/loras/lora_blowjob.safetensors",
    'cum_facial':    "/runpod-volume/loras/lora_cum_facial.safetensors",
    'cumshot_i2v':   "/runpod-volume/loras/lora_cumshot_i2v.safetensors",
}

LORA_LINKS = {
    'allinone_nsfw': "https://civitai.com/api/download/models/2747549?type=Model&format=SafeTensor",
    'posing_nude':   "https://civitai.red/api/download/models/2391828?type=Model&format=SafeTensor",
    'sex_thrust':    "https://civitai.com/api/download/models/2674954?type=Model&format=SafeTensor",
    'blowjob':       "https://civitai.red/api/download/models/2195559?fileId=2088649",
    'cum_facial':    "https://civitai.red/api/download/models/2460386?type=Model&format=SafeTensor",
    'cumshot_i2v':   "https://civitai.red/api/download/models/2430424?type=Model&format=SafeTensor",
}

# ── Style configs ─────────────────────────────────────────────────────────
STYLE_CONFIGS = {
    'female_nude_portrait': {
        'loras': [('posing_nude', 0.85)],
        'guidance_scale': 7.5,
        'trigger': 'nude woman, elegant pose, natural lighting, bare skin',
    },
    'dressed_vs_naked': {
        'loras': [('posing_nude', 0.80)],
        'guidance_scale': 7.5,
        'trigger': 'woman partially undressing, sensual reveal, contrast clothed and nude',
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
        'loras': [('allinone_nsfw', 0.80)],
        'guidance_scale': 8.0,
        'trigger': 'threesome, group sex, three people, explicit',
    },
    'cum_on_face': {
        'loras': [('cum_facial', 0.85), ('cumshot_i2v', 0.80)],
        'guidance_scale': 7.0,
        'trigger': 'cum on face, facial, explicit',
    },
    'lesbian_sex': {
        'loras': [('allinone_nsfw', 0.80)],
        'guidance_scale': 7.5,
        'trigger': 'lesbian sex, two women, girl on girl, explicit',
    },
}

# ── Pipeline globals ──────────────────────────────────────────────────────
txt2vid_pipeline = None
img2vid_pipeline = None
active_loras_t2v = []
active_loras_i2v = []

def download_file(url, path, label, retries=3):
    """Download a LoRA only if it doesn't already exist on the volume."""
    if os.path.exists(path):
        print(f"  {label} already on volume, skipping download")
        return
    civitai_token = os.environ.get('CIVITAI_TOKEN', '')
    hf_token = os.environ.get('HF_TOKEN', '')
    for attempt in range(retries):
        try:
            print(f"Downloading {label} (attempt {attempt+1})...")
            headers = {'User-Agent': 'Mozilla/5.0'}
            if 'civitai' in url and civitai_token:
                headers['Authorization'] = f'Bearer {civitai_token}'
            if 'huggingface.co' in url and hf_token:
                headers['Authorization'] = f'Bearer {hf_token}'
            r = requests.get(url, headers=headers, stream=True, timeout=300)
            r.raise_for_status()
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=1024*1024):
                    f.write(chunk)
            print(f"  {label} done")
            return
        except Exception as e:
            print(f"  Attempt {attempt+1} failed: {e}")
            if os.path.exists(path):
                os.remove(path)
            if attempt < retries - 1:
                import time; time.sleep(10)
    print(f"  WARNING: Could not download {label}, skipping")

def load_models():
    global txt2vid_pipeline, img2vid_pipeline

    if txt2vid_pipeline is not None:
        return

    # Download any missing LoRAs to volume
    for key, link in LORA_LINKS.items():
        download_file(link, LORA_PATHS[key], f"LoRA: {key}")

    print("Loading Wan2.1 text-to-video pipeline from volume cache...")
    vae = AutoencoderKLWan.from_pretrained(
        T2V_MODEL_ID, subfolder="vae", torch_dtype=torch.float32
    )
    txt2vid_pipeline = WanPipeline.from_pretrained(
        T2V_MODEL_ID, vae=vae, torch_dtype=torch.bfloat16
    ).to("cuda")
    txt2vid_pipeline.scheduler = UniPCMultistepScheduler.from_config(
        txt2vid_pipeline.scheduler.config, flow_shift=5.0
    )
    txt2vid_pipeline.enable_model_cpu_offload()

    print("Loading Wan2.1 image-to-video pipeline from volume cache...")
    vae_i2v = AutoencoderKLWan.from_pretrained(
        I2V_MODEL_ID, subfolder="vae", torch_dtype=torch.float32
    )
    img2vid_pipeline = WanImageToVideoPipeline.from_pretrained(
        I2V_MODEL_ID, vae=vae_i2v, torch_dtype=torch.bfloat16
    ).to("cuda")
    img2vid_pipeline.scheduler = UniPCMultistepScheduler.from_config(
        img2vid_pipeline.scheduler.config, flow_shift=3.0
    )
    img2vid_pipeline.enable_model_cpu_offload()

    print("Wan2.1 video models loaded successfully")

def apply_loras(pipeline, lora_list, active_tracker_key):
    global active_loras_t2v, active_loras_i2v
    active = active_loras_t2v if active_tracker_key == 't2v' else active_loras_i2v

    if active == lora_list:
        return

    if active:
        try:
            pipeline.unload_lora_weights()
        except Exception:
            pass

    if active_tracker_key == 't2v':
        active_loras_t2v = lora_list
    else:
        active_loras_i2v = lora_list

    if not lora_list:
        return

    adapters, scales = [], []
    for i, (lora_key, scale) in enumerate(lora_list):
        path = LORA_PATHS.get(lora_key)
        if not path or not os.path.exists(path):
            print(f"  WARNING: LoRA {lora_key} not found, skipping")
            continue
        try:
            adapter_name = f"lora_{i}"
            pipeline.load_lora_weights(path, adapter_name=adapter_name)
            # Verify it actually loaded
            loaded = getattr(pipeline, 'peft_config', {})
            if adapter_name in loaded:
                adapters.append(adapter_name)
                scales.append(scale)
            else:
                print(f"  WARNING: LoRA {lora_key} loaded but adapter not registered, skipping")
        except Exception as e:
            print(f"  WARNING: Failed to load LoRA {lora_key}: {e}")

    if adapters:
        pipeline.set_adapters(adapters, adapter_weights=scales)
    else:
        print("  No LoRAs loaded, proceeding without LoRA")

def get_dimensions(aspect_ratio):
    dims = {
        '1:1':  (512, 512),
        '4:5':  (480, 624),
        '5:4':  (624, 480),
        '9:16': (480, 832),
        '16:9': (832, 480),
    }
    return dims.get(aspect_ratio, (480, 832))

def duration_to_frames(duration_sec):
    frames = int(float(duration_sec) * 16)
    return max(16, (frames // 8) * 8 + 1)

def decode_image(base64_str):
    data = base64.b64decode(base64_str.split(",")[1] if "," in base64_str else base64_str)
    return Image.open(io.BytesIO(data)).convert("RGB")

def build_prompt(user_prompt, style_id, character=None):
    style_cfg = STYLE_CONFIGS.get(style_id, {})
    trigger = style_cfg.get('trigger', '')
    char_context = ''
    if character:
        name = character.get('name', '')
        race = character.get('race', '')
        body_type = character.get('body_type', '').replace('_', ' ')
        char_context = f"{name}, {race} woman, {body_type}, "
    return (
        f"{char_context}{user_prompt}, {trigger}, "
        f"photorealistic, masterpiece, best quality, cinematic, "
        f"smooth motion, fluid movement, natural lighting"
    )

def build_negative():
    return (
        "static, frozen, no motion, watermark, text, logo, "
        "blurry, low quality, bad anatomy, deformed, ugly, "
        "jumpcut, flicker, distorted"
    )

def handler(job):
    try:
        inp = job['input']
        generation_type = inp.get('type', 'text_to_video')
        style_id        = inp.get('style', 'female_nude_portrait')
        user_prompt     = inp.get('prompt', '')
        aspect_ratio    = inp.get('aspect_ratio', '9:16')
        duration_sec    = float(inp.get('duration', 4))
        start_image_b64 = inp.get('start_image', None)
        character       = inp.get('character', None)

        style_cfg = STYLE_CONFIGS.get(style_id, STYLE_CONFIGS['female_nude_portrait'])
        width, height = get_dimensions(aspect_ratio)
        num_frames = duration_to_frames(duration_sec)
        positive = build_prompt(user_prompt, style_id, character)
        negative = build_negative()

        if generation_type == 'image_to_video' and start_image_b64:
            runpod.serverless.progress_update(job, "PREPARING_IMAGE")
            apply_loras(img2vid_pipeline, style_cfg['loras'], 'i2v')
            start_image = decode_image(start_image_b64).resize((width, height), Image.LANCZOS)

            runpod.serverless.progress_update(job, "GENERATING_VIDEO")
            result = img2vid_pipeline(
                image=start_image,
                prompt=positive,
                negative_prompt=negative,
                num_frames=num_frames,
                num_inference_steps=30,
                guidance_scale=style_cfg['guidance_scale'],
                width=width,
                height=height,
            )
        else:
            runpod.serverless.progress_update(job, "GENERATING_VIDEO")
            apply_loras(txt2vid_pipeline, style_cfg['loras'], 't2v')
            result = txt2vid_pipeline(
                prompt=positive,
                negative_prompt=negative,
                num_frames=num_frames,
                num_inference_steps=30,
                guidance_scale=style_cfg['guidance_scale'],
                width=width,
                height=height,
            )

        runpod.serverless.progress_update(job, "ENCODING_VIDEO")
        video_path = "/tmp/output_video.mp4"
        export_to_video(result.frames[0], video_path, fps=16)

        with open(video_path, "rb") as f:
            video_b64 = base64.b64encode(f.read()).decode()
        os.remove(video_path)

        return {"video": f"data:video/mp4;base64,{video_b64}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

load_models()
runpod.serverless.start({"handler": handler})
