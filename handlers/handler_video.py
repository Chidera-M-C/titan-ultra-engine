"""
handler_video.py — ComfyUI-based Wan2.1 video generation for RunPod serverless.
Models live on the network volume at /workspace/wan_checkpoints — never re-downloaded.
ComfyUI is started as a subprocess and we POST workflows to its API.
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

# ── Paths ─────────────────────────────────────────────────────────────────
COMFYUI_DIR  = "/comfyui"
COMFYUI_URL  = "http://127.0.0.1:8188"

COMFYUI_MODELS_DIR = f"{COMFYUI_DIR}/models"
LORA_VOLUME_DIR    = "/runpod-volume/loras"
CHECKPOINT_DIR     = "/workspace/wan_checkpoints"

# ── Actual filenames downloaded to /workspace/wan_checkpoints ─────────────
T2V_MODEL_FILE    = "wan2.1_t2v_14B_fp8.safetensors"
I2V_MODEL_FILE    = "wan2.1_i2v_480p_14B_fp8.safetensors"
TEXT_ENCODER_FILE = "umt5-xxl-enc-bf16.safetensors"
VAE_FILE          = "wan_2.1_vae.safetensors"
CLIP_VISION_FILE  = "clip_vision_h.safetensors"

# ── LoRA files ────────────────────────────────────────────────────────────
LORA_FILES = {
    'allinone_nsfw': "lora_allinone_nsfw.safetensors",
    'posing_nude':   "lora_posing_nude.safetensors",
    'sex_thrust':    "lora_sex_thrust.safetensors",
    'blowjob':       "lora_blowjob.safetensors",
    'cum_facial':    "lora_cum_facial.safetensors",
    'cumshot_i2v':   "lora_cumshot_i2v.safetensors",
}

# ── Style configs ─────────────────────────────────────────────────────────
STYLE_CONFIGS = {
    'female_nude_portrait': {
        'loras': [('posing_nude', 0.85)],
        'guidance_scale': 5.0,
        'trigger': 'nude woman, elegant pose, natural lighting, bare skin, slow graceful movement',
    },
    'dressed_vs_naked': {
        'loras': [('posing_nude', 0.80)],
        'guidance_scale': 5.0,
        'trigger': 'woman partially undressing, sensual reveal, slow motion',
    },
    'missionary_style': {
        'loras': [('allinone_nsfw', 0.85), ('sex_thrust', 0.70)],
        'guidance_scale': 5.0,
        'trigger': 'missionary sex, man on top, face to face, rhythmic thrusting motion, explicit',
    },
    'doggy_style': {
        'loras': [('allinone_nsfw', 0.85), ('sex_thrust', 0.70)],
        'guidance_scale': 5.0,
        'trigger': 'doggy style sex, from behind, rear entry, rhythmic thrusting motion, explicit',
    },
    'cowgirl_style': {
        'loras': [('allinone_nsfw', 0.85)],
        'guidance_scale': 5.0,
        'trigger': 'cowgirl position, woman on top, riding motion, explicit',
    },
    'anal_sex': {
        'loras': [('allinone_nsfw', 0.85), ('sex_thrust', 0.70)],
        'guidance_scale': 5.0,
        'trigger': 'anal sex, anal penetration, from behind, thrusting, explicit',
    },
    'oral_sex': {
        'loras': [('blowjob', 0.85), ('cum_facial', 0.60)],
        'guidance_scale': 5.0,
        'trigger': 'oral sex, blowjob, deepthroat motion, explicit',
    },
    'threesome_sex': {
        'loras': [('allinone_nsfw', 0.80)],
        'guidance_scale': 5.5,
        'trigger': 'threesome, group sex, three people, explicit',
    },
    'cum_on_face': {
        'loras': [('cum_facial', 0.85), ('cumshot_i2v', 0.80)],
        'guidance_scale': 4.5,
        'trigger': 'cum on face, facial, explicit',
    },
    'lesbian_sex': {
        'loras': [('allinone_nsfw', 0.80)],
        'guidance_scale': 5.0,
        'trigger': 'lesbian sex, two women, girl on girl, explicit',
    },
}

comfyui_process = None

# ── Symlink models into ComfyUI's expected directories ────────────────────
def setup_model_symlinks():
    dirs = [
        f"{COMFYUI_MODELS_DIR}/checkpoints",
        f"{COMFYUI_MODELS_DIR}/loras",
        f"{COMFYUI_MODELS_DIR}/vae",
        f"{COMFYUI_MODELS_DIR}/clip",
        f"{COMFYUI_MODELS_DIR}/clip_vision",
        f"{COMFYUI_MODELS_DIR}/diffusion_models",
        f"{COMFYUI_MODELS_DIR}/text_encoders",
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    def symlink(src, dst):
        if os.path.exists(src) and not os.path.lexists(dst):
            os.symlink(src, dst)
            print(f"  Symlinked: {os.path.basename(src)}")
        elif not os.path.exists(src):
            print(f"  WARNING: Not found on volume: {src}")

    # Diffusion models
    symlink(
        f"{CHECKPOINT_DIR}/diffusion_models/{T2V_MODEL_FILE}",
        f"{COMFYUI_MODELS_DIR}/diffusion_models/{T2V_MODEL_FILE}"
    )
    symlink(
        f"{CHECKPOINT_DIR}/diffusion_models/{I2V_MODEL_FILE}",
        f"{COMFYUI_MODELS_DIR}/diffusion_models/{I2V_MODEL_FILE}"
    )
    # Text encoder
    symlink(
        f"{CHECKPOINT_DIR}/text_encoders/{TEXT_ENCODER_FILE}",
        f"{COMFYUI_MODELS_DIR}/text_encoders/{TEXT_ENCODER_FILE}"
    )
    # VAE
    symlink(
        f"{CHECKPOINT_DIR}/vae/{VAE_FILE}",
        f"{COMFYUI_MODELS_DIR}/vae/{VAE_FILE}"
    )
    # CLIP Vision
    symlink(
        f"{CHECKPOINT_DIR}/clip_vision/{CLIP_VISION_FILE}",
        f"{COMFYUI_MODELS_DIR}/clip_vision/{CLIP_VISION_FILE}"
    )
    # LoRAs
    for key, filename in LORA_FILES.items():
        symlink(
            f"{LORA_VOLUME_DIR}/{filename}",
            f"{COMFYUI_MODELS_DIR}/loras/{filename}"
        )

    print("Model symlinks complete.")

def start_comfyui():
    global comfyui_process
    print("Starting ComfyUI server...")
    comfyui_process = subprocess.Popen(
        ["python", "main.py", "--listen", "127.0.0.1", "--port", "8188",
         "--disable-auto-launch", "--gpu-only"],
        cwd=COMFYUI_DIR,
        stdout=None,
        stderr=None,
    )
    # Wait for ComfyUI to be ready using a socket check instead of requests
    import socket
    for i in range(60):
        try:
            sock = socket.create_connection(("127.0.0.1", 8188), timeout=2)
            sock.close()
            print(f"ComfyUI port open after {(i+1)*2}s — waiting for full init...")
            time.sleep(5)
            return
        except (socket.error, ConnectionRefusedError):
            pass
        time.sleep(2)
    raise RuntimeError("ComfyUI failed to start within 120 seconds")

# ── Helpers ───────────────────────────────────────────────────────────────
def get_dimensions(aspect_ratio):
    dims = {
        '1:1':  (512, 512),
        '4:5':  (480, 624),
        '5:4':  (624, 480),
        '9:16': (416, 736),
        '16:9': (736, 416),
    }
    return dims.get(aspect_ratio, (416, 736))

def duration_to_frames(duration_sec):
    frames = int(float(duration_sec) * 16)
    return max(16, (frames // 8) * 8 + 1)

def build_prompt(user_prompt, style_id, character=None):
    style_cfg = STYLE_CONFIGS.get(style_id, {})
    trigger = style_cfg.get('trigger', '')
    char_context = ''
    if character:
        name      = character.get('name', '')
        race      = character.get('race', '')
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

def upload_image_to_comfyui(base64_or_url):
    """Fetch/decode image and upload to ComfyUI input folder."""
    if base64_or_url.startswith("http"):
        r = requests.get(base64_or_url, timeout=30)
        r.raise_for_status()
        img_data = r.content
    else:
        b64 = base64_or_url.split(",")[1] if "," in base64_or_url else base64_or_url
        b64 = b64.strip()
        padding = 4 - len(b64) % 4
        if padding != 4:
            b64 += "=" * padding
        img_data = base64.b64decode(b64)

    # Convert to PNG and resize if too large
    img = Image.open(io.BytesIO(img_data)).convert("RGB")
    # Ensure dimensions are multiples of 8
    w, h = img.size
    w = (w // 8) * 8
    h = (h // 8) * 8
    img = img.resize((w, h), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    filename = f"input_{uuid.uuid4().hex[:8]}.png"

    # Upload using multipart form — ComfyUI expects this exact format
    r = requests.post(
        f"{COMFYUI_URL}/upload/image",
        files={"image": (filename, buf, "image/png")},
        data={"type": "input", "overwrite": "true"},
        timeout=30,
    )
    if not r.ok:
        print(f"  Upload failed {r.status_code}: {r.text[:500]}")
        r.raise_for_status()
    return r.json()["name"]

# ── Workflow builders ─────────────────────────────────────────────────────
def inject_loras(workflow, lora_list):
    """Chain LoRA nodes before the sampler. Returns the final model reference."""
    prev_model = ["1", 0]
    for i, (lora_key, scale) in enumerate(lora_list):
        filename = LORA_FILES.get(lora_key)
        if not filename:
            continue
        node_id = f"lora_{i}"
        workflow["prompt"][node_id] = {
            "class_type": "WanVideoLoraSelect",
            "inputs": {
                "lora": filename,
                "strength": scale,
                "prev_lora": prev_model if i > 0 else ["1", 0],
            }
        }
        prev_model = [node_id, 0]
    return prev_model

def build_t2v_workflow(prompt, negative, width, height, num_frames,
                       guidance_scale, lora_list):
    workflow = {
        "prompt": {
            "1": {
                "class_type": "WanVideoModelLoader",
                "inputs": {
                    "model": T2V_MODEL_FILE,
                    "dtype": "fp8_e4m3fn",
                    "text_encoder": TEXT_ENCODER_FILE,
                    "vae": VAE_FILE,
                }
            },
            "2": {
                "class_type": "WanVideoTextEncode",
                "inputs": {
                    "model": ["1", 0],
                    "positive_text": prompt,
                    "negative_text": negative,
                }
            },
            "3": {
                "class_type": "WanVideoEmptyLatent",
                "inputs": {
                    "width": width,
                    "height": height,
                    "num_frames": num_frames,
                    "batch_size": 1,
                }
            },
            "4": {
                "class_type": "WanVideoSampler",
                "inputs": {
                    "model": ["1", 0],
                    "conditioning": ["2", 0],
                    "latent": ["3", 0],
                    "steps": 20,
                    "cfg": guidance_scale,
                    "seed": -1,
                    "scheduler": "unipc",
                    "shift": 3.0,
                }
            },
            "5": {
                "class_type": "WanVideoDecode",
                "inputs": {
                    "model": ["1", 0],
                    "samples": ["4", 0],
                }
            },
            "6": {
                "class_type": "VHS_VideoCombine",
                "inputs": {
                    "images": ["5", 0],
                    "frame_rate": 16,
                    "loop_count": 0,
                    "filename_prefix": "nudely_video",
                    "format": "video/h264-mp4",
                    "save_output": True,
                }
            }
        }
    }
    if lora_list:
        final_model = inject_loras(workflow, lora_list)
        workflow["prompt"]["4"]["inputs"]["model"] = final_model
    return workflow

def build_i2v_workflow(prompt, negative, width, height, num_frames,
                       guidance_scale, lora_list, image_filename):
    workflow = {
        "prompt": {
            "1": {
                "class_type": "WanVideoModelLoader",
                "inputs": {
                    "model": I2V_MODEL_FILE,
                    "dtype": "fp8_e4m3fn",
                    "text_encoder": TEXT_ENCODER_FILE,
                    "vae": VAE_FILE,
                    "clip_vision": CLIP_VISION_FILE,
                }
            },
            "img": {
                "class_type": "LoadImage",
                "inputs": {
                    "image": image_filename,
                }
            },
            "2": {
                "class_type": "WanVideoTextEncode",
                "inputs": {
                    "model": ["1", 0],
                    "positive_text": prompt,
                    "negative_text": negative,
                    "image": ["img", 0],
                }
            },
            "3": {
                "class_type": "WanVideoI2VLatent",
                "inputs": {
                    "model": ["1", 0],
                    "image": ["img", 0],
                    "width": width,
                    "height": height,
                    "num_frames": num_frames,
                }
            },
            "4": {
                "class_type": "WanVideoSampler",
                "inputs": {
                    "model": ["1", 0],
                    "conditioning": ["2", 0],
                    "latent": ["3", 0],
                    "steps": 20,
                    "cfg": guidance_scale,
                    "seed": -1,
                    "scheduler": "unipc",
                    "shift": 5.0,
                }
            },
            "5": {
                "class_type": "WanVideoDecode",
                "inputs": {
                    "model": ["1", 0],
                    "samples": ["4", 0],
                }
            },
            "6": {
                "class_type": "VHS_VideoCombine",
                "inputs": {
                    "images": ["5", 0],
                    "frame_rate": 16,
                    "loop_count": 0,
                    "filename_prefix": "nudely_video",
                    "format": "video/h264-mp4",
                    "save_output": True,
                }
            }
        }
    }
    if lora_list:
        final_model = inject_loras(workflow, lora_list)
        workflow["prompt"]["4"]["inputs"]["model"] = final_model
    return workflow

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
                        for node_id, node_output in outputs.items():
                            if "gifs" in node_output:
                                for gif in node_output["gifs"]:
                                    return gif["filename"], gif.get("subfolder", "")
                        raise RuntimeError("Job completed but no video output found")
                    if status.get("status_str") == "error":
                        raise RuntimeError(f"ComfyUI job failed: {status.get('messages', [])}")
        except requests.RequestException:
            pass
        time.sleep(3)
    raise RuntimeError(f"ComfyUI job timed out after {timeout}s")

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
        inp             = job["input"]
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
            image_filename = upload_image_to_comfyui(start_image)
            workflow = build_i2v_workflow(
                positive, negative, width, height, num_frames,
                guidance_scale, lora_list, image_filename
            )
        else:
            workflow = build_t2v_workflow(
                positive, negative, width, height, num_frames,
                guidance_scale, lora_list
            )

        runpod.serverless.progress_update(job, "GENERATING_VIDEO")
        prompt_id = queue_workflow(workflow)
        filename, subfolder = wait_for_result(prompt_id)

        runpod.serverless.progress_update(job, "ENCODING_VIDEO")
        video_bytes = fetch_video(filename, subfolder)
        video_b64   = base64.b64encode(video_bytes).decode()

        return {"video": f"data:video/mp4;base64,{video_b64}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

# ── Startup ───────────────────────────────────────────────────────────────
print("Setting up model symlinks...")
setup_model_symlinks()

print("Starting ComfyUI server...")
start_comfyui()

print("Handler ready — waiting for jobs...")
runpod.serverless.start({"handler": handler})
