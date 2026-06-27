# ── IMPORTANT: Set HF_HOME before any other imports so all model loads
#    come from the persistent network volume instead of ephemeral disk ──────
import os

# Check where the huggingface cache actually lives
if os.path.exists("/runpod-volume/huggingface"):
    os.environ["HF_HOME"] = "/runpod-volume/huggingface"
else:
    os.environ["HF_HOME"] = "/workspace/huggingface"

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
from safetensors.torch import load_file

# ── Model IDs ─────────────────────────────────────────────────────────────
T2V_MODEL_ID = "Wan-AI/Wan2.1-T2V-14B-Diffusers"
I2V_MODEL_ID = "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers"

# ── Base file definitions ─────────────────────────────────────────────────
LORA_FILENAMES = {
    'allinone_nsfw': "lora_allinone_nsfw.safetensors",
    'posing_nude':   "lora_posing_nude.safetensors",
    'sex_thrust':    "lora_sex_thrust.safetensors",
    'blowjob':       "lora_blowjob.safetensors",
    'cum_facial':    "lora_cum_facial.safetensors",
    'cumshot_i2v':   "lora_cumshot_i2v.safetensors",
}

# Resolved paths dictionary used dynamically at runtime
LORA_PATHS = {}

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

def resolve_lora_paths():
    """Locates where the LoRAs live on disk, checking both common mount spots."""
    global LORA_PATHS
    possible_dirs = ["/runpod-volume/loras", "/workspace/loras", "/models/loras"]
    
    for key, filename in LORA_FILENAMES.items():
        found_path = None
        for d in possible_dirs:
            p = os.path.join(d, filename)
            if os.path.exists(p):
                found_path = p
                break
        
        if not found_path:
            if os.path.exists("/runpod-volume"):
                found_path = os.path.join("/runpod-volume/loras", filename)
            else:
                found_path = os.path.join("/workspace/loras", filename)
                
        LORA_PATHS[key] = found_path

def load_models():
    global txt2vid_pipeline, img2vid_pipeline

    if txt2vid_pipeline is not None:
        return

    resolve_lora_paths()

    print("Loading Wan2.1 text-to-video pipeline...")
    vae = AutoencoderKLWan.from_pretrained(
        T2V_MODEL_ID, subfolder="vae", torch_dtype=torch.float32
    )
    txt2vid_pipeline = WanPipeline.from_pretrained(
        T2V_MODEL_ID, vae=vae, torch_dtype=torch.bfloat16
    ).to("cuda")
    txt2vid_pipeline.scheduler = UniPCMultistepScheduler.from_config(
        txt2vid_pipeline.scheduler.config, flow_shift=5.0
    )

    print("Loading Wan2.1 image-to-video pipeline...")
    vae_i2v = AutoencoderKLWan.from_pretrained(
        I2V_MODEL_ID, subfolder="vae", torch_dtype=torch.float32
    )
    img2vid_pipeline = WanImageToVideoPipeline.from_pretrained(
        I2V_MODEL_ID, vae=vae_i2v, torch_dtype=torch.bfloat16
    )
    img2vid_pipeline.scheduler = UniPCMultistepScheduler.from_config(
        img2vid_pipeline.scheduler.config, flow_shift=3.0
    )
    img2vid_pipeline.enable_model_cpu_offload()

def translate_wan_keys(state_dict):
    """
    Manually translates native ComfyUI/Wan layer names to Diffusers internal names.
    This intercepts the 'blocks.0.self_attn.q' failure.
    """
    new_dict = {}
    for key, tensor in state_dict.items():
        new_key = key
        # Map the transformer blocks
        if new_key.startswith("blocks."):
            new_key = "transformer." + new_key
            
        # Map the attention layers to diffusers schema
        new_key = new_key.replace(".self_attn.q.", ".attn1.to_q.")
        new_key = new_key.replace(".self_attn.k.", ".attn1.to_k.")
        new_key = new_key.replace(".self_attn.v.", ".attn1.to_v.")
        new_key = new_key.replace(".self_attn.o.", ".attn1.to_out.0.")
        
        new_dict[new_key] = tensor
    return new_dict

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

    for lora_key, scale in lora_list:
        path = LORA_PATHS.get(lora_key)
        if not path or not os.path.exists(path):
            print(f"  WARNING: LoRA file missing on disk for {lora_key}")
            continue
        try:
            # 1. Load the raw safetensors file directly into memory
            raw_state_dict = load_file(path)
            
            # 2. Translate the keys so diffusers doesn't reject them
            fixed_state_dict = translate_wan_keys(raw_state_dict)
            
            # 3. Inject the fixed dictionary directly
            pipeline.load_lora_weights(
                fixed_state_dict, 
                adapter_name=lora_key
            )
            print(f"  Successfully mapped and loaded adapter: {lora_key}")
        except Exception as e:
            print(f"  Failed loading custom mapped adapter {lora_key}: {e}")

    try:
        adapters = [k for k, _ in lora_list]
        scales = [s for k, s in lora_list]
        if adapters:
            pipeline.set_adapters(adapters, adapter_weights=scales)
            print(f"  Active adapters configured successfully: {adapters} with weights {scales}")
    except Exception as e:
        print(f"  Fallback safety triggered during configuration setup: {e}")

def get_dimensions(aspect_ratio):
    dims = {'1:1': (512, 512), '4:5': (480, 624), '5:4': (624, 480), '9:16': (416, 736), '16:9': (736, 416)}
    return dims.get(aspect_ratio, (416, 736))

def duration_to_frames(duration_sec):
    frames = int(float(duration_sec) * 16)
    return max(16, (frames // 8) * 8 + 1)

def decode_image(base64_or_url):
    if base64_or_url.startswith("http"):
        r = requests.get(base64_or_url, timeout=30)
        r.raise_for_status()
        return Image.open(io.BytesIO(r.content)).convert("RGB")
    if "," in base64_or_url:
        base64_or_url = base64_or_url.split(",")[1]
    data = base64.b64decode(base64_or_url.strip())
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
    return f"{char_context}{user_prompt}, {trigger}, photorealistic, masterpiece, smooth motion"

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
                image=start_image, prompt=positive, negative_prompt=negative, num_frames=num_frames,
                num_inference_steps=20, guidance_scale=style_cfg['guidance_scale'],
                width=width, height=height,
            )
        else:
            runpod.serverless.progress_update(job, "GENERATING_VIDEO")
            apply_loras(txt2vid_pipeline, style_cfg['loras'], 't2v')
            result = txt2vid_pipeline(
                prompt=positive, negative_prompt=negative, num_frames=num_frames,
                num_inference_steps=20, guidance_scale=style_cfg['guidance_scale'],
                width=width, height=height,
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
