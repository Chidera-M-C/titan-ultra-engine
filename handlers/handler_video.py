"""
handler_video.py — ComfyUI + WanVideoWrapper video generation for RunPod serverless.
Models live on the network volume at /runpod-volume — never downloaded at runtime.
"""

import os
import io
import json
import time
import base64
import subprocess
import uuid
import requests
import runpod
from PIL import Image

# ── ComfyUI paths ─────────────────────────────────────────────────────────
COMFYUI_DIR = "/comfyui"
COMFYUI_URL = "http://127.0.0.1:8188"

# ── Model file names (as ComfyUI sees them after symlinking) ──────────────
T2V_MODEL    = "wan2.1_t2v_14B_fp8.safetensors"
I2V_MODEL    = "wan2.1_i2v_480p_14B_fp8.safetensors"
T5_ENCODER = "umt5_xxl_fp16.safetensors"
VAE_MODEL    = "wan_2.1_vae.safetensors"
CLIP_VISION  = "clip_vision_h.safetensors"
CLIP_TEXT_ENCODER = "open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors"

# ── Volume paths ──────────────────────────────────────────────────────────
VOL = "/runpod-volume"
LORA_VOL_DIR = f"{VOL}/loras"
CKPT_VOL_DIR = f"{VOL}/wan_checkpoints"

# ── LoRA file names ───────────────────────────────────────────────────────
LORA_FILES = {
    'allinone_nsfw': "lora_allinone_nsfw.safetensors",
    'posing_nude':   "lora_posing_nude.safetensors",
    'sex_thrust':    "lora_sex_thrust.safetensors",
    'blowjob':       "lora_blowjob.safetensors",
    'cum_facial':    "lora_cum_facial.safetensors",
    'cumshot_i2v':   "lora_cumshot_i2v.safetensors",
    'doggy_pov': "lora_doggy_pov.safetensors",
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
        'loras': [('allinone_nsfw', 0.09), ('sex_thrust', 0.70)],
        'guidance_scale': 7.5,
        'trigger': 'missionary sex, man on top, face to face, thrusting motion, explicit',
    },

    'doggy_style': {
        'loras': [('doggy_pov', 0.75), ('allinone_nsfw', 0.80), ('sex_thrust', 0.50)],
        'guidance_scale': 6.8,
        'trigger': 'doggy style sex, pov, from behind, rear entry, thrusting motion, explicit',
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

comfyui_process = None

# ── Symlink models from volume into ComfyUI's model directories ───────────
def setup_symlinks():
    dirs = {
        "diffusion_models": f"{COMFYUI_DIR}/models/diffusion_models",
        "text_encoders":    f"{COMFYUI_DIR}/models/text_encoders",
        "vae":              f"{COMFYUI_DIR}/models/vae",
        "clip_vision":      f"{COMFYUI_DIR}/models/clip_vision",
        "loras":            f"{COMFYUI_DIR}/models/loras",
    }
    for name, path in dirs.items():
        os.makedirs(path, exist_ok=True)

    # Diffusion models
    for filename in [T2V_MODEL, I2V_MODEL]:
        src = f"{CKPT_VOL_DIR}/diffusion_models/{filename}"
        dst = f"{dirs['diffusion_models']}/{filename}"
        _symlink(src, dst)

    # Text encoder
    src = f"{CKPT_VOL_DIR}/text_encoders/{T5_ENCODER}"
    dst = f"{dirs['text_encoders']}/{T5_ENCODER}"
    _symlink(src, dst)

    # VAE
    src = f"{CKPT_VOL_DIR}/vae/{VAE_MODEL}"
    dst = f"{dirs['vae']}/{VAE_MODEL}"
    _symlink(src, dst)

    # CLIP vision
    src = f"{CKPT_VOL_DIR}/clip_vision/{CLIP_VISION}"
    dst = f"{dirs['clip_vision']}/{CLIP_VISION}"
    _symlink(src, dst)

    src = f"{CKPT_VOL_DIR}/clip_vision/{CLIP_TEXT_ENCODER}"
    dst = f"{dirs['clip_vision']}/{CLIP_TEXT_ENCODER}"
    _symlink(src, dst)

    # LoRAs
    for key, filename in LORA_FILES.items():
        src = f"{LORA_VOL_DIR}/{filename}"
        dst = f"{dirs['loras']}/{filename}"
        _symlink(src, dst)

    print("Symlinks ready.")

def _symlink(src, dst):
    if os.path.exists(dst):
        return
    if os.path.exists(src):
        os.symlink(src, dst)
        print(f"  Linked: {os.path.basename(src)}")
    else:
        print(f"  WARNING: Not found on volume: {src}")

# ── Start ComfyUI ─────────────────────────────────────────────────────────
def start_comfyui():
    global comfyui_process
    print("Starting ComfyUI...")
    comfyui_process = subprocess.Popen(
        ["python", "main.py", "--listen", "127.0.0.1", "--port", "8188",
         "--disable-auto-launch", "--gpu-only"],
        cwd=COMFYUI_DIR,
    )
    import socket
    for i in range(150):
        try:
            sock = socket.create_connection(("127.0.0.1", 8188), timeout=2)
            sock.close()
            print(f"ComfyUI ready ({i*2}s)")
            return
        except (socket.error, ConnectionRefusedError):
            pass
        time.sleep(2)
    raise RuntimeError("ComfyUI failed to start within 300s")

# ── Helpers ───────────────────────────────────────────────────────────────
def get_dimensions(aspect_ratio):
    return {
        '1:1':  (512, 512),
        '4:5':  (480, 624),
        '5:4':  (624, 480),
        '9:16': (416, 736),
        '16:9': (736, 416),
    }.get(aspect_ratio, (416, 736))

def duration_to_frames(duration_sec):
    frames = int(float(duration_sec) * 16)
    return max(16, (frames // 8) * 8 + 1)

def build_prompt(user_prompt, style_id, character=None):
    cfg = STYLE_CONFIGS.get(style_id, {})
    trigger = cfg.get('trigger', '')
    char = ''
    if character:
        char = f"{character.get('name','')}, {character.get('race','')} woman, {character.get('body_type','').replace('_',' ')}, "
    return f"{char}{user_prompt}, {trigger}, photorealistic, masterpiece, best quality, cinematic, smooth motion, fluid movement, natural lighting"

def build_negative():
    return "static, frozen, no motion, watermark, text, logo, blurry, low quality, bad anatomy, deformed, ugly, jumpcut, flicker, distorted"

def upload_image(base64_or_url):
    """Upload image to ComfyUI input folder, return filename."""
    if base64_or_url.startswith("http"):
        r = requests.get(base64_or_url, timeout=30)
        r.raise_for_status()
        img_bytes = r.content
    else:
        data = base64_or_url.split(",")[1] if "," in base64_or_url else base64_or_url
        data = data.strip()
        pad = 4 - len(data) % 4
        if pad != 4:
            data += "=" * pad
        img_bytes = base64.b64decode(data)

    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    filename = f"input_{uuid.uuid4().hex}.png"
    r = requests.post(
        f"{COMFYUI_URL}/upload/image",
        files={"image": (filename, buf.getvalue(), "image/png")},
        data={"overwrite": "true"},
    )
    r.raise_for_status()
    return r.json()["name"]

# ── Workflow builders ─────────────────────────────────────────────────────
def build_t2v_workflow(prompt, negative, width, height, num_frames, guidance_scale, lora_list):
    """
    T2V workflow using WanVideoWrapper nodes:
    LoadWanVideoT5TextEncoder → WanVideoTextEncode
    WanVideoModelLoader (+ optional WanVideoLoraSelect)
    WanVideoVAELoader
    WanVideoSampler → WanVideoDecode → VHS_VideoCombine
    """
    p = {
        # T5 text encoder
        "t5": {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {
                "model_name": T5_ENCODER,
                "precision": "fp16",
            }
        },
        # Text encode
        "text": {
            "class_type": "WanVideoTextEncode",
            "inputs": {
                "t5": ["t5", 0],
                "positive_prompt": prompt,
                "negative_prompt": negative,
                "force_offload": True,
            }
        },
        # VAE loader
        "vae": {
            "class_type": "WanVideoVAELoader",
            "inputs": {
                "model_name": VAE_MODEL,
                "precision": "bf16",
            }
        },
        # Main model
        "model": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": T2V_MODEL,           # or I2V_MODEL
                "base_precision": "bf16",     # use a valid value from the accepted list
                "quantization": "fp8_e4m3fn", # move fp8 here where it now belongs
                "load_device": "main_device",
            }
        },
        # Sampler
        "sampler": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["model", 0],
                "text_embeds": ["text", 0],
                "vae": ["vae", 0],
                "width": width,
                "height": height,
                "num_frames": num_frames,
                "steps": 20,
                "cfg": guidance_scale,
                "seed": 42,
                "shift": 3.0,         # ADD THIS
                "riflex_freq_index": 0,  # ADD THIS
                "scheduler": "unipc",
                "force_offload": True,
            }
        },
        # Decode
        "decode": {
            "class_type": "WanVideoDecode",
            "inputs": {
                "vae": ["vae", 0],
                "samples": ["sampler", 0],
                "enable_vae_tiling": True,
                "tile_sample_min_height": 272,
                "tile_sample_min_width": 272,
                "tile_overlap_factor_height": 0.2,
                "tile_overlap_factor_width": 0.2,
                "auto_tile_size": True,
            }
        },
        # Export video
        "export": {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images": ["decode", 0],
                "frame_rate": 16,
                "loop_count": 0,
                "filename_prefix": "nudely",
                "format": "video/h264-mp4",
                "save_output": True,
                "pingpong": False,
            }
        }
    }

    # Inject LoRAs — chain WanVideoLoraSelect nodes before model
    if lora_list:
        prev = None  # ← start empty, not from model
        for i, (lora_key, scale) in enumerate(lora_list):
            filename = LORA_FILES.get(lora_key)
            if not filename:
                continue
            nid = f"lora_{i}"
            inputs = {"lora": filename, "strength": scale}
            if prev is not None:
                inputs["prev_lora"] = prev  # only chain after first one
            p[nid] = {"class_type": "WanVideoLoraSelect", "inputs": inputs}
            prev = [nid, 0]
        p["model"]["inputs"]["lora"] = prev
    return {"prompt": p}


def build_i2v_workflow(prompt, negative, width, height, num_frames, guidance_scale, lora_list, image_filename):
    """
    I2V workflow — same as T2V but adds:
    LoadWanVideoClipTextEncoder → WanVideoClipVisionEncode (for CLIP features)
    WanVideoImageToVideoEncode (for VAE image latent)
    Both feed into WanVideoSampler via image_embeds
    """
    p = {
        "t5": {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {
                "model_name": T5_ENCODER,
                "precision": "bf16",
            }
        },
        "text": {
            "class_type": "WanVideoTextEncode",
            "inputs": {
                "t5": ["t5", 0],
                "positive_prompt": prompt,
                "negative_prompt": negative,
                "force_offload": True,
            }
        },
        "vae": {
            "class_type": "WanVideoVAELoader",
            "inputs": {
                "model_name": VAE_MODEL,
                "precision": "bf16",
            }
        },
        "clip_loader": {
            "class_type": "LoadWanVideoClipTextEncoder",
            "inputs": {
                "model_name": CLIP_TEXT_ENCODER,
                "precision": "bf16",
            }
        },
        "load_image": {
            "class_type": "LoadImage",
            "inputs": {
                "image": image_filename,
            }
        },
        # CLIP vision encode for I2V
        "clip_encode": {
            "class_type": "WanVideoClipVisionEncode",
            "inputs": {
                "clip_vision": ["clip_loader", 0],
                "image_1": ["load_image", 0],   # changed: image → image_1
                "strength_1": 1.0,
                "strength_2": 1.0,        # add this
                "force_offload": True,    # add this
                "crop": "center",         # add this
                "combine_embeds": "average",  # add this
            }
        },
        # VAE image encode for I2V conditioning
        "img_encode": {
            "class_type": "WanVideoImageToVideoEncode",
            "inputs": {
                "vae": ["vae", 0],
                "start_image": ["load_image", 0],
                "width": width,
                "height": height,
                "num_frames": num_frames,
                "force_offload": True,
                "start_latent_strength": 1.0,
                "end_latent_strength": 1.0,
                "noise_aug_strength": 0.0,
            }
        },
        "model": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": I2V_MODEL,           # or I2V_MODEL
                "base_precision": "bf16",     # use a valid value from the accepted list
                "quantization": "fp8_e4m3fn", # move fp8 here where it now belongs
                "load_device": "main_device",
            }
        },
       
        "sampler": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["model", 0],
                "text_embeds": ["text", 0],
                "image_embeds": ["img_encode", 0],
                "width": width,
                "height": height,
                "num_frames": num_frames,
                "steps": 35,              # Give DPM++ 30 steps to properly compute the physics loop
                "cfg": guidance_scale,
                "seed": -1,
                "shift": 5.0,             # Balanced value for motion tracking 
                "riflex_freq_index": 0,   # Activates RIFLEX context tracking to prevent frame melting
                "scheduler": "dpm++",     # CHANGED from unipc/euler to the complex geometry solver
                "force_offload": True,     
             }
        },
        "decode": {
            "class_type": "WanVideoDecode",
            "inputs": {
                "vae": ["vae", 0],
                "samples": ["sampler", 0],
                "enable_vae_tiling": True,
                "tile_sample_min_height": 272,
                "tile_sample_min_width": 272,
                "tile_overlap_factor_height": 0.2,
                "tile_overlap_factor_width": 0.2,
                "auto_tile_size": True,
                "tile_x": 80,
                "tile_y": 80,
                "tile_stride_x": 40,
                "tile_stride_y": 40,
            }
        },
        "export": {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images": ["decode", 0],
                "frame_rate": 20,
                "loop_count": 0,
                "filename_prefix": "nudely",
                "format": "video/h264-mp4",
                "save_output": True,
                "pingpong": False,
            }
        }
    }

    if lora_list:
        prev = None  # ← start empty, not from model
        for i, (lora_key, scale) in enumerate(lora_list):
            filename = LORA_FILES.get(lora_key)
            if not filename:
                continue
            nid = f"lora_{i}"
            inputs = {"lora": filename, "strength": scale}
            if prev is not None:
                inputs["prev_lora"] = prev  # only chain after first one
            p[nid] = {"class_type": "WanVideoLoraSelect", "inputs": inputs}
            prev = [nid, 0]
        p["model"]["inputs"]["lora"] = prev

    return {"prompt": p}

# ── ComfyUI API ───────────────────────────────────────────────────────────
def queue_workflow(workflow):
    r = requests.post(f"{COMFYUI_URL}/prompt", json=workflow, timeout=30)
    r.raise_for_status()
    return r.json()["prompt_id"]

def wait_for_result(prompt_id, timeout=600):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10)
            if r.status_code == 200:
                history = r.json()
                if prompt_id in history:
                    job = history[prompt_id]
                    status = job.get("status", {})
                    if status.get("completed"):
                        outputs = job.get("outputs", {})
                        for node_id, out in outputs.items():
                            if "gifs" in out:
                                for gif in out["gifs"]:
                                    return gif["filename"], gif.get("subfolder", "")
                        raise RuntimeError("Job completed but no video in outputs")
                    if status.get("status_str") == "error":
                        raise RuntimeError(f"ComfyUI job failed: {status.get('messages')}")
        except requests.RequestException:
            pass
        time.sleep(3)
    raise RuntimeError(f"Timed out after {timeout}s")

def fetch_video(filename, subfolder=""):
    params = {"filename": filename, "type": "output"}
    if subfolder:
        params["subfolder"] = subfolder
    r = requests.get(f"{COMFYUI_URL}/view", params=params, timeout=60)
    r.raise_for_status()
    return r.content

# ── RunPod handler ────────────────────────────────────────────────────────
def handler(job):
    try:
        inp = job["input"]
        generation_type = inp.get("type", "text_to_video")
        style_id        = inp.get("style", "female_nude_portrait")
        user_prompt     = inp.get("prompt", "")
        aspect_ratio    = inp.get("aspect_ratio", "9:16")
        duration_sec    = float(inp.get("duration", 4))
        start_image     = inp.get("start_image", None)
        character       = inp.get("character", None)

        style_cfg      = STYLE_CONFIGS.get(style_id, STYLE_CONFIGS["female_nude_portrait"])
        width, height  = get_dimensions(aspect_ratio)
        num_frames     = duration_to_frames(duration_sec)
        positive       = build_prompt(user_prompt, style_id, character)
        negative       = build_negative()
        lora_list      = style_cfg["loras"]
        guidance_scale = style_cfg["guidance_scale"]

        runpod.serverless.progress_update(job, "BUILDING_WORKFLOW")

        if generation_type == "image_to_video" and start_image:
            runpod.serverless.progress_update(job, "UPLOADING_IMAGE")
            image_filename = upload_image(start_image)
            workflow = build_i2v_workflow(
                positive, negative, width, height,
                num_frames, guidance_scale, lora_list, image_filename
            )
        else:
            workflow = build_t2v_workflow(
                positive, negative, width, height,
                num_frames, guidance_scale, lora_list
            )

        runpod.serverless.progress_update(job, "GENERATING_VIDEO")
        prompt_id = queue_workflow(workflow)
        filename, subfolder = wait_for_result(prompt_id)

        runpod.serverless.progress_update(job, "ENCODING_VIDEO")
        video_bytes = fetch_video(filename, subfolder)
        video_b64 = base64.b64encode(video_bytes).decode()

        return {"video": f"data:video/mp4;base64,{video_b64}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

# ── Startup ───────────────────────────────────────────────────────────────
print("Setting up symlinks...")
setup_symlinks()

print("Starting ComfyUI...")
start_comfyui()

import subprocess
result = subprocess.run(
    ["find", "/", "-name", "nodes_wan*", "-type", "f"],
    capture_output=True, text=True, timeout=30
)
print("WAN NODES:", result.stdout)

print("Ready for jobs.")
runpod.serverless.start({"handler": handler})
