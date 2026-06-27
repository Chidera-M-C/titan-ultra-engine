"""
handler_video.py — ComfyUI-based Wan2.1 video generation for RunPod serverless.

Models live on the network volume at /workspace — never downloaded at runtime.
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

# ── Paths — all point to the network volume ───────────────────────────────
COMFYUI_DIR   = "/comfyui"
COMFYUI_URL   = "http://127.0.0.1:8188"
HF_CACHE_DIR  = "/workspace/huggingface/hub"

# ComfyUI expects models in its own folder structure.
# We symlink from the network volume so nothing gets re-downloaded.
COMFYUI_MODELS_DIR = f"{COMFYUI_DIR}/models"

LORA_VOLUME_DIR     = "/workspace/loras"
CHECKPOINT_VOL_DIR  = "/workspace/models"

# Wan2.1 model names as ComfyUI sees them (after symlinking)
T2V_MODEL_NAME = "Wan2.1-T2V-14B"
I2V_MODEL_NAME = "Wan2.1-I2V-14B-480P"

# ── LoRA name mapping ─────────────────────────────────────────────────────
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

comfyui_process = None

# ── Symlink models from volume into ComfyUI's expected directories ─────────
def setup_model_symlinks():
    """
    ComfyUI looks for models in /comfyui/models/.
    We symlink from /workspace so nothing is copied or re-downloaded.
    """
    os.makedirs(f"{COMFYUI_MODELS_DIR}/checkpoints", exist_ok=True)
    os.makedirs(f"{COMFYUI_MODELS_DIR}/loras", exist_ok=True)
    os.makedirs(f"{COMFYUI_MODELS_DIR}/vae", exist_ok=True)
    os.makedirs(f"{COMFYUI_MODELS_DIR}/clip", exist_ok=True)

    # Symlink LoRAs
    for key, filename in LORA_FILES.items():
        src = f"{LORA_VOLUME_DIR}/{filename}"
        dst = f"{COMFYUI_MODELS_DIR}/loras/{filename}"
        if os.path.exists(src) and not os.path.exists(dst):
            os.symlink(src, dst)
            print(f"  Symlinked LoRA: {filename}")
        elif not os.path.exists(src):
            print(f"  WARNING: LoRA not found on volume: {src}")

    # Symlink Wan2.1 HuggingFace cache for ComfyUI-WanVideoWrapper
    # The WanVideoWrapper node reads from HF cache directly using the repo ID
    os.environ["HF_HOME"] = "/workspace/huggingface"
    print("  HF_HOME set to /workspace/huggingface — Wan models will load from volume cache")

    print("Model symlinks complete.")

def start_comfyui():
    global comfyui_process
    print("Starting ComfyUI server...")
    comfyui_process = subprocess.Popen(
        ["python", "main.py", "--listen", "127.0.0.1", "--port", "8188",
         "--disable-auto-launch", "--gpu-only"],
        cwd=COMFYUI_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    # Wait for ComfyUI to be ready
    for i in range(60):
        try:
            r = requests.get(f"{COMFYUI_URL}/system_stats", timeout=3)
            if r.status_code == 200:
                print(f"ComfyUI ready after {i+1}s")
                return
        except Exception:
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

def decode_image_to_base64(base64_or_url):
    """Decode image and return as base64 PNG string for ComfyUI upload."""
    if base64_or_url.startswith("http"):
        r = requests.get(base64_or_url, timeout=30)
        r.raise_for_status()
        img_data = r.content
    else:
        if "," in base64_or_url:
            base64_or_url = base64_or_url.split(",")[1]
        base64_or_url = base64_or_url.strip()
        padding = 4 - len(base64_or_url) % 4
        if padding != 4:
            base64_or_url += "=" * padding
        img_data = base64.b64decode(base64_or_url)

    img = Image.open(io.BytesIO(img_data)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

def upload_image_to_comfyui(base64_or_url):
    """Upload an image to ComfyUI's input folder and return the filename."""
    img_b64 = decode_image_to_base64(base64_or_url)
    img_bytes = base64.b64decode(img_b64)
    filename = f"input_{uuid.uuid4().hex}.png"
    r = requests.post(
        f"{COMFYUI_URL}/upload/image",
        files={"image": (filename, img_bytes, "image/png")},
        data={"overwrite": "true"},
    )
    r.raise_for_status()
    return r.json()["name"]

# ── Workflow builders ─────────────────────────────────────────────────────
def build_t2v_workflow(prompt, negative, width, height, num_frames,
                       guidance_scale, lora_list):
    """
    Text-to-video workflow using ComfyUI-WanVideoWrapper nodes.
    Node IDs are stable strings so we can reference them easily.
    """
    workflow = {
        "prompt": {
            # Load Wan T2V model via WanVideoWrapper
            "1": {
                "class_type": "WanVideoModelLoader",
                "inputs": {
                    "model": T2V_MODEL_NAME,
                    "dtype": "bf16",
                }
            },
            # CLIP text encode positive
            "2": {
                "class_type": "WanVideoTextEncode",
                "inputs": {
                    "model": ["1", 0],
                    "positive_text": prompt,
                    "negative_text": negative,
                }
            },
            # Empty latent for T2V
            "3": {
                "class_type": "WanVideoEmptyLatent",
                "inputs": {
                    "width": width,
                    "height": height,
                    "num_frames": num_frames,
                    "batch_size": 1,
                }
            },
            # Sampler
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
                }
            },
            # Decode latent to frames
            "5": {
                "class_type": "WanVideoDecode",
                "inputs": {
                    "model": ["1", 0],
                    "samples": ["4", 0],
                }
            },
            # Export to video file
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

    # Inject LoRAs if present — chain them before the sampler
    if lora_list:
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
        # Point sampler to last LoRA node
        workflow["prompt"]["4"]["inputs"]["model"] = prev_model

    return workflow

def build_i2v_workflow(prompt, negative, width, height, num_frames,
                       guidance_scale, lora_list, image_filename):
    """Image-to-video workflow using ComfyUI-WanVideoWrapper nodes."""
    workflow = {
        "prompt": {
            "1": {
                "class_type": "WanVideoModelLoader",
                "inputs": {
                    "model": I2V_MODEL_NAME,
                    "dtype": "bf16",
                }
            },
            # Load the uploaded start image
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
                }
            },
            # I2V latent — conditioned on start image
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
        workflow["prompt"]["4"]["inputs"]["model"] = prev_model

    return workflow

# ── ComfyUI API calls ─────────────────────────────────────────────────────
def queue_workflow(workflow):
    """Submit workflow to ComfyUI and return prompt_id."""
    r = requests.post(
        f"{COMFYUI_URL}/prompt",
        json=workflow,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["prompt_id"]

def wait_for_result(prompt_id, timeout=600):
    """Poll ComfyUI history until the job completes, return output video path."""
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
                        # Find the video output
                        outputs = job.get("outputs", {})
                        for node_id, node_output in outputs.items():
                            if "gifs" in node_output:
                                for gif in node_output["gifs"]:
                                    filename = gif["filename"]
                                    subfolder = gif.get("subfolder", "")
                                    return filename, subfolder
                        raise RuntimeError("Job completed but no video output found")
                    if status.get("status_str") == "error":
                        messages = status.get("messages", [])
                        raise RuntimeError(f"ComfyUI job failed: {messages}")
        except requests.RequestException:
            pass
        time.sleep(3)
    raise RuntimeError(f"ComfyUI job timed out after {timeout}s")

def fetch_video(filename, subfolder=""):
    """Fetch the generated video bytes from ComfyUI's output."""
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
        start_image_b64 = inp.get("start_image", None)
        character       = inp.get("character", None)

        style_cfg = STYLE_CONFIGS.get(style_id, STYLE_CONFIGS["female_nude_portrait"])
        width, height  = get_dimensions(aspect_ratio)
        num_frames     = duration_to_frames(duration_sec)
        positive       = build_prompt(user_prompt, style_id, character)
        negative       = build_negative()
        lora_list      = style_cfg["loras"]
        guidance_scale = style_cfg["guidance_scale"]

        runpod.serverless.progress_update(job, "BUILDING_WORKFLOW")

        if generation_type == "image_to_video" and start_image_b64:
            runpod.serverless.progress_update(job, "UPLOADING_IMAGE")
            image_filename = upload_image_to_comfyui(start_image_b64)
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
        video_b64 = base64.b64encode(video_bytes).decode()

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
