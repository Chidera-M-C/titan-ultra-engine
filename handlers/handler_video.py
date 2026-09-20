"""
handler_video.py — ComfyUI + WanVideoWrapper I2V (Wan 2.2 + Dual Lightning)
6 styles: doggy, missionary, facial_cumshot, undress, masturbate, blowjob
Dynamic resolution from reference image
Per-style scheduler + steps + shift + end_latent_strength
Default duration = 6 seconds
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

COMFYUI_DIR = "/comfyui"
COMFYUI_URL = "http://127.0.0.1:8188"

I2V_HIGH          = "wan2.2_i2v_high_noise_14B_fp8.safetensors"
I2V_LOW           = "wan2.2_i2v_low_noise_14B_fp8.safetensors"
T5_ENCODER        = "umt5_xxl_fp16.safetensors"
VAE_MODEL         = "wan_2.1_vae.safetensors"
CLIP_TEXT_ENCODER = "open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors"

LORA_FILES = {
    "missionary":       "lora_missionary.safetensors",
    "doggy":            "lora_doggy.safetensors",
    "facial_cumshot":   "lora_facial_cumshot.safetensors",
    "undress":          "lora_undress.safetensors",
    "masturbate":       "lora_masturbate.safetensors",
    "blowjob":          "lora_blowjob.safetensors",
}

EXPLICIT_PRESETS = [
    {
        "name": "doggy",
        "tailored_keywords": [
            "doggy", "doggystyle", "doggy style", "from behind", "doggie",
            "prone bone", "bent over", "ass up", "on all fours", "rear entry", "behind"
        ],
        "lora_key": "doggy",
        "strength": 0.85,
        "scheduler": "unipc",
        "steps_high": 4,
        "steps_low": 4,
        "shift": 5.0,
        "end_latent_strength": 0.30,
        "before": "The video a begins with a woman. The video then jumpcuts to a man having sex with the same woman in pronebone position where a man is seen penetrating her from behind. The man's hands are placed firmly on crest of the womans back. The man's penis is seen entering the woman from behind. The woman's hands lay on the bed at her side. The woman looks directly at the camera the entire time. Her head is in the bottom left of frame, ",
        "after": ", powerful deep thrusting, realistic body movement, soft skin jiggle, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "missionary",
        "tailored_keywords": [
            "missionary", "missionary sex", "man on top", "on her back",
            "legs spread", "facing each other",
            "being fucked", "getting fucked", "fucked hard", "pounded", "railed",
            "having sex", "making love", "sexing", "fucked", "fuck",
            "sex", "penetration", "thrusting"
        ],
        "lora_key": "missionary",
        "strength": 0.80,
        "scheduler": "unipc",
        "steps_high": 4,
        "steps_low": 6,
        "shift": 5.0,
        "end_latent_strength": 0.3,
        "before": "Immediately cut to a new scene where the exact same person is now completely naked and lying on their back, and she moves her head forward slightly. The scene is a top-down view showing the same woman completely nude, with their legs in an open position, with her vagina visible. At the bottom of the frame a man can be partially seen, as the man takes his penis with his hand and inserts his penis into the woman's vagina, pushing his body towards her. He then moves back and forward, as he pushes his penis into the woman's vagina repeatedly. The angle is from the point of view of the man at the bottom of the frame, ",
        "after": ", strong deep thrusting rhythm, realistic body bounce, soft skin movement, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, deep shadows, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "facial_cumshot",
        "tailored_keywords": [
            "cumshot", "cum on face", "facial", "semen", "covered in cum", "cum",
            "cum on tits", "facial cumshot", "cum across face", "cum on her face"
        ],
        "lora_key": "facial_cumshot",
        "strength": 0.80,
        "scheduler": "unipc",
        "steps_high": 4,
        "steps_low": 6,
        "shift": 5.0,
        "end_latent_strength": 0.3,
        "before": "The woman is kneeling and looking up. A man stands in front of her stroking his hard cock. Thick white cum erupts from his cock and shoots across her face, forehead, eyes, cheeks and open mouth in multiple ropes. Cum drips down her face onto her body. She keeps looking toward the camera with an open mouth expression while receiving the facial. ",
        "after": ", realistic cum splatter and dripping, continuous spurting motion, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, deep shadows, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "undress",
        "tailored_keywords": [
            "undress", "remove clothes", "take off clothes", "strip", "naked", "nude", "desnuda", "remove her",
            "no clothes", "completely naked", "make her naked", "remove clothing", "strip her"
        ],
        "lora_key": "undress",
        "strength": 0.90,
        "scheduler": "euler",
        "steps_high": 5,
        "steps_low": 7,
        "shift": 5.0,
        "end_latent_strength": 0.30,
        "before": "The video begins with a woman. The video then jumpcuts to same woman standing fully nude. The camera remains static throughout the scene. She looks at the camera the entire time, ",
        "after": ", photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, smooth realistic skin texture"
    },
    {
        "name": "masturbate",
        "tailored_keywords": [
            "masturbate", "masturbation", "touch herself", "finger herself", "rub her pussy", "fingering", "finger",
            "play with herself", "self pleasure", "fingering herself"
        ],
        "lora_key": "masturbate",
        "strength": 0.90,
        "scheduler": "unipc",
        "steps_high": 5,
        "steps_low": 7,
        "shift": 5.0,
        "end_latent_strength": 0.30,
        "before": "The video begins with a woman. The video then jumpcuts to the same woman masturbating while lying down on her back. The camera is positioned at a low angle between her legs. She is nude and uses her right hand to vigorously rub her clitoris. Her mouth is open and her expression indicates pleasure. She looks directly at the camera the entire time, ",
        "after": ", realistic finger movement, soft body reactions, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "blowjob",
        "tailored_keywords": [
            "sucking", "blowjob", "blow job", "deepthroat", "deep throat", "suck", "chock on",
            "facefuck", "face fuck", "oral", "cocksucking", "throat fuck", "irrumatio"
        ],
        "lora_key": "blowjob",
        "strength": 0.90,
        "scheduler": "unipc",
        "steps_high": 5,
        "steps_low": 7,
        "shift": 5.0,
        "end_latent_strength": 0.30,
        "before": "A woman looking at the camera. The video then jumpcuts to the same woman giving a blowjob to a black man standing in the same location, looking up as she performs the blowjob on the black man, she is kneeling in front of him, she is holding his penis with both hands. she looks at the camera the entire time. she shoves the penis deep in her mouth, ",
        "after": ", gentle realistic sucking motion, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, deep shadows, smooth realistic skin texture, natural motion blur"
    },
]

comfyui_process = None

def get_explicit_preset(user_prompt: str):
    prompt_lower = user_prompt.lower()
    for preset in EXPLICIT_PRESETS:
        if any(kw in prompt_lower for kw in preset["tailored_keywords"]):
            return preset
    # fallback to missionary
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

def duration_to_frames(duration_sec):
    frames = int(float(duration_sec) * 12)
    return max(17, (frames // 8) * 8 + 1)

def build_prompt(user_prompt, preset, character=None):
    char = ""
    if character:
        char = f"{character.get('name','')}, {character.get('race','')} woman, {character.get('body_type','').replace('_',' ')}, "
    return f"{char}{preset['before']}{user_prompt}{preset['after']}"

def build_negative():
    return "static, frozen, no motion, watermark, text, logo, blurry, low quality, bad anatomy, deformed, ugly, flicker, distorted, pixelated, yellow tint, oversaturated, melting, gummy, fused, fused genitals, cock melting into pussy, twisted neck, broken neck, unnatural head turn, deformed penis, melted cock"

def get_image_dimensions(img_bytes):
    """Return width, height rounded to multiple of 16, capped for safety."""
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    w, h = img.size

    w = max(16, (w // 16) * 16)
    h = max(16, (h // 16) * 16)

    max_dim = 768
    if w > max_dim or h > max_dim:
        scale = max_dim / max(w, h)
        w = max(16, int(w * scale) // 16 * 16)
        h = max(16, int(h * scale) // 16 * 16)

    return w, h

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

    width, height = get_image_dimensions(img_bytes)

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
    return r.json()["name"], width, height

def build_i2v_workflow(prompt, negative, width, height, num_frames, preset, image_filename):
    lora_key = preset["lora_key"]
    lora_strength = preset["strength"]
    scheduler = preset["scheduler"]
    steps_high = preset.get("steps_high", 4)
    steps_low = preset.get("steps_low", 6)
    shift = preset.get("shift", 5.0)
    end_latent_strength = preset.get("end_latent_strength", 0.3)

    p = {
        "t5": {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {"model_name": T5_ENCODER, "precision": "bf16"}
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
            "inputs": {"model_name": VAE_MODEL, "precision": "bf16"}
        },
        "clip_loader": {
            "class_type": "LoadWanVideoClipTextEncoder",
            "inputs": {"model_name": CLIP_TEXT_ENCODER, "precision": "bf16"}
        },
        "load_image": {
            "class_type": "LoadImage",
            "inputs": {"image": image_filename}
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
                "end_latent_strength": end_latent_strength,
                "noise_aug_strength": 0.0,
            }
        },
        "model_high": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": I2V_HIGH,
                "base_precision": "bf16",
                "quantization": "fp8_e4m3fn",
                "load_device": "main_device",
            }
        },
        "model_low": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": I2V_LOW,
                "base_precision": "bf16",
                "quantization": "fp8_e4m3fn",
                "load_device": "main_device",
            }
        },

        # Stage 1 – High noise
        "sampler_high": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["model_high", 0],
                "text_embeds": ["text", 0],
                "image_embeds": ["img_encode", 0],
                "width": width,
                "height": height,
                "num_frames": num_frames,
                "steps": steps_high,
                "cfg": 1.0,
                "seed": 42424242,
                "shift": shift,
                "riflex_freq_index": 0,
                "scheduler": scheduler,
                "force_offload": True,
            }
        },

        # Stage 2 – Low noise
        "sampler_low": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["model_low", 0],
                "text_embeds": ["text", 0],
                "image_embeds": ["img_encode", 0],          # ← fixed (both use img_encode)
                "width": width,
                "height": height,
                "num_frames": num_frames,
                "steps": steps_low,
                "cfg": 1.0,
                "seed": 42424242,
                "shift": shift,
                "riflex_freq_index": 0,
                "scheduler": scheduler,
                "force_offload": True,
            }
        },

        "decode": {
            "class_type": "WanVideoDecode",
            "inputs": {
                "vae": ["vae", 0],
                "samples": ["sampler_low", 0],
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
                "frame_rate": 12,
                "loop_count": 0,
                "filename_prefix": "nudely",
                "format": "video/h264-mp4",
                "save_output": True,
                "pingpong": False,
            }
        }
    }

    # Dual Lightning
    p["lora_lightning_high"] = {
        "class_type": "WanVideoLoraSelect",
        "inputs": {"lora": "lora_lightning_high.safetensors", "strength": 0.70}
    }
    p["lora_lightning_low"] = {
        "class_type": "WanVideoLoraSelect",
        "inputs": {"lora": "lora_lightning_low.safetensors", "strength": 0.70}
    }

    style_filename = LORA_FILES.get(lora_key)
    if style_filename:
        p["lora_style_high"] = {
            "class_type": "WanVideoLoraSelect",
            "inputs": {
                "lora": style_filename,
                "strength": lora_strength,
                "prev_lora": ["lora_lightning_high", 0],
            }
        }
        p["lora_style_low"] = {
            "class_type": "WanVideoLoraSelect",
            "inputs": {
                "lora": style_filename,
                "strength": lora_strength,
                "prev_lora": ["lora_lightning_low", 0],
            }
        }
        p["model_high"]["inputs"]["lora"] = ["lora_style_high", 0]
        p["model_low"]["inputs"]["lora"] = ["lora_style_low", 0]
    else:
        p["model_high"]["inputs"]["lora"] = ["lora_lightning_high", 0]
        p["model_low"]["inputs"]["lora"] = ["lora_lightning_low", 0]

    return {"prompt": p}

def queue_workflow(workflow):
    r = requests.post(f"{COMFYUI_URL}/prompt", json=workflow, timeout=30)
    r.raise_for_status()
    return r.json()["prompt_id"]

def wait_for_result(prompt_id, timeout=900):
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
        time.sleep(2)
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
        duration_sec  = float(inp.get("duration", 6))
        start_image   = inp.get("start_image", None)
        character     = inp.get("character", None)

        if not start_image:
            return {"error": "start_image is required for image-to-video"}

        preset = get_explicit_preset(user_prompt)
        print(f"→ Style selected: {preset['name']} (LoRA: {preset['lora_key']}, scheduler: {preset['scheduler']})")

        runpod.serverless.progress_update(job, "UPLOADING_IMAGE")
        image_filename, width, height = upload_image(start_image)
        print(f"→ Using reference dimensions: {width}x{height}")

        num_frames = duration_to_frames(duration_sec)
        positive   = build_prompt(user_prompt, preset, character)
        negative   = build_negative()

        runpod.serverless.progress_update(job, "BUILDING_WORKFLOW")
        workflow = build_i2v_workflow(
            positive, negative, width, height,
            num_frames, preset, image_filename
        )

        runpod.serverless.progress_update(job, "GENERATING_VIDEO")
        prompt_id = queue_workflow(workflow)
        filename, subfolder = wait_for_result(prompt_id)

        print(f"Video ready: {filename} (subfolder: {subfolder})")

        runpod.serverless.progress_update(job, "ENCODING_VIDEO")
        video_bytes = fetch_video(filename, subfolder)
        video_b64 = base64.b64encode(video_bytes).decode()

        return {"video": f"data:video/mp4;base64,{video_b64}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

print("Starting ComfyUI (Wan 2.2 + Dual Lightning – 6 styles)...")
start_comfyui()
print("Ready for jobs.")
runpod.serverless.start({"handler": handler})
