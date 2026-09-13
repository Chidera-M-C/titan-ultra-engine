"""
handler_video.py — ComfyUI + WanVideoWrapper I2V only.
Models + LoRAs are baked into the Docker image (no network volume).
"""

import os
import io
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

# ── Model file names (inside the image) ───────────────────────────────────
I2V_MODEL         = "wan2.1_i2v_480p_14B_fp8.safetensors"
T5_ENCODER        = "umt5_xxl_fp16.safetensors"
VAE_MODEL         = "wan_2.1_vae.safetensors"
CLIP_VISION       = "clip_vision_h.safetensors"
CLIP_TEXT_ENCODER = "open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors"

# ── LoRA filenames (baked into /comfyui/models/loras/) ────────────────────
LORA_FILES = {
    "missionary":       "lora_missionary.safetensors",
    "doggy":            "lora_doggy.safetensors",
    "blowjob":          "lora_blowjob.safetensors",
    "facial_cumshot":   "lora_facial_cumshot.safetensors",
}

# ── Explicit presets (same detection logic as image handler) ──────────────
EXPLICIT_PRESETS = [
    {
        "name": "undress",
        "tailored_keywords": [
            "undress", "remove clothes", "take off clothes", "strip", "naked", "nude",
            "no clothes", "completely naked", "make her naked", "remove clothing"
        ],
        "lora_key": "missionary",
        "strength": 0.82,
        "before": "lying on her back, legs spread wide, knees bent up, slowly removing the last of her clothes, 1man thick hard cock already pressing against her entrance then thrusting deep into her pussy in missionary position, continuous hip movement, 1girl, ",
        "after": ", dynamic motion, realistic thrusting rhythm, soft body bounce, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, deep shadows, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "doggy",
        "tailored_keywords": [
            "doggy", "doggystyle", "doggy style", "from behind", "prone bone",
            "bent over", "ass up", "on all fours", "rear entry"
        ],
        "lora_key": "doggy",
        "strength": 0.80,
        "before": "on all fours, ass up, back arched, looking over her shoulder, 1man thick hard cock slamming deep into her pussy from behind with strong rhythmic thrusting, hips bouncing, 1girl, ",
        "after": ", dynamic rear view motion, realistic pounding rhythm, soft body jiggle, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, deep shadows, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "blowjob",
        "tailored_keywords": [
            "sucking", "blowjob", "blow job", "deepthroat", "deep throat",
            "facefuck", "face fuck", "oral", "cocksucking", "throat fuck", "irrumatio"
        ],
        "lora_key": "blowjob",
        "strength": 0.85,
        "before": "kneeling, mouth wide open, eyes looking up, 1man thick hard cock sliding in and out of her mouth, deepthroat motion with saliva strings, head bobbing rhythmically, 1girl, ",
        "after": ", dynamic close-up oral motion, realistic sucking and thrusting into mouth, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, deep shadows, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "missionary",
        "tailored_keywords": [
            "missionary", "missionary sex", "man on top", "on her back",
            "legs spread", "facing each other"
        ],
        "lora_key": "missionary",
        "strength": 0.82,
        "before": "lying on her back, legs spread wide, knees pulled up, 1man thick hard cock pounding deep into her pussy from above with continuous powerful thrusting, bodies moving together, 1girl, ",
        "after": ", dynamic high-angle motion, realistic deep thrusting rhythm, soft body bounce, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, deep shadows, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "facial_cumshot",
        "tailored_keywords": [
            "cumshot", "cum on face", "facial", "semen", "covered in cum",
            "cum on tits", "facial cumshot", "cum across face"
        ],
        "lora_key": "facial_cumshot",
        "strength": 0.85,
        "before": "kneeling or lying back looking up, mouth open, 1man thick hard cock erupting thick white cum across her face and big tits, sticky ropes landing and dripping down her cheeks, lips and cleavage, continuous spurting motion, 1girl, ",
        "after": ", dynamic facial cumshot motion, realistic cum splatter and dripping, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, deep shadows, smooth realistic skin texture, natural motion blur"
    },
]

GLOBAL_FALLBACKS = [
    {
        "keywords": [
            "being fucked", "getting fucked", "fucked hard", "pounded", "railed",
            "fucked from behind", "having sex", "making love", "love making",
            "sexing", "fucked", "fuck", "sex", "penetration", "thrusting"
        ],
        "default": "missionary"
    },
]

comfyui_process = None

def get_explicit_preset(user_prompt: str):
    prompt_lower = user_prompt.lower()
    for preset in EXPLICIT_PRESETS:
        if any(kw in prompt_lower for kw in preset["tailored_keywords"]):
            return preset
    for group in GLOBAL_FALLBACKS:
        if any(kw in prompt_lower for kw in group["keywords"]):
            for preset in EXPLICIT_PRESETS:
                if preset["name"] == group["default"]:
                    return preset
    # Absolute default → missionary
    for preset in EXPLICIT_PRESETS:
        if preset["name"] == "missionary":
            return preset
    return EXPLICIT_PRESETS[0]

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

def build_prompt(user_prompt, preset, character=None):
    char = ""
    if character:
        char = f"{character.get('name','')}, {character.get('race','')} woman, {character.get('body_type','').replace('_',' ')}, "
    return f"{char}{preset['before']}{user_prompt}{preset['after']}"

def build_negative():
    return "static, frozen, no motion, watermark, text, logo, blurry, low quality, bad anatomy, deformed, ugly, jumpcut, flicker, distorted"

def upload_image(base64_or_url):
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

def build_i2v_workflow(prompt, negative, width, height, num_frames, guidance_scale, lora_key, lora_strength, image_filename):
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
        "clip_encode": {
            "class_type": "WanVideoClipVisionEncode",
            "inputs": {
                "clip_vision": ["clip_loader", 0],
                "image_1": ["load_image", 0],
                "strength_1": 1.0,
                "strength_2": 1.0,
                "force_offload": True,
                "crop": "center",
                "combine_embeds": "average",
            }
        },
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
                "model": I2V_MODEL,
                "base_precision": "bf16",
                "quantization": "fp8_e4m3fn",
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
                "steps": 35,
                "cfg": guidance_scale,
                "seed": 42424242,
                "shift": 5.0,
                "riflex_freq_index": 0,
                "scheduler": "dpm++",
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

    # Single LoRA
    filename = LORA_FILES.get(lora_key)
    if filename:
        p["lora_0"] = {
            "class_type": "WanVideoLoraSelect",
            "inputs": {
                "lora": filename,
                "strength": lora_strength,
            }
        }
        p["model"]["inputs"]["lora"] = ["lora_0", 0]

    return {"prompt": p}

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

def handler(job):
    try:
        inp = job["input"]
        user_prompt   = inp.get("prompt", "")
        aspect_ratio  = inp.get("aspect_ratio", "9:16")
        duration_sec  = float(inp.get("duration", 4))
        start_image   = inp.get("start_image", None)
        character     = inp.get("character", None)

        if not start_image:
            return {"error": "start_image is required for image-to-video"}

        preset = get_explicit_preset(user_prompt)
        print(f"→ Style selected: {preset['name']} (LoRA: {preset['lora_key']})")

        width, height  = get_dimensions(aspect_ratio)
        num_frames     = duration_to_frames(duration_sec)
        positive       = build_prompt(user_prompt, preset, character)
        negative       = build_negative()
        guidance_scale = 7.5

        runpod.serverless.progress_update(job, "UPLOADING_IMAGE")
        image_filename = upload_image(start_image)

        runpod.serverless.progress_update(job, "BUILDING_WORKFLOW")
        workflow = build_i2v_workflow(
            positive, negative, width, height,
            num_frames, guidance_scale,
            preset["lora_key"], preset["strength"],
            image_filename
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
print("Starting ComfyUI (models already in image)...")
start_comfyui()

print("Ready for jobs.")
runpod.serverless.start({"handler": handler})
