import sys
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__

import os
os.environ['PYTHONUNBUFFERED'] = '1'

import torch
import runpod
import cv2
import numpy as np
import io, base64
from PIL import Image, ImageFilter, ImageEnhance

from diffusers import (
    StableDiffusionXLControlNetPipeline,
    StableDiffusionXLControlNetImg2ImgPipeline,
    ControlNetModel,
    DPMSolverMultistepScheduler,
    AutoencoderKL
)
from ip_adapter.ip_adapter_faceid import IPAdapterFaceIDPlusXL
from insightface.app import FaceAnalysis
from insightface.utils import face_align
from controlnet_aux import OpenposeDetector, CannyDetector

# --- CONFIG ---
JUGGERNAUT_PATH      = "/workspace/juggernaut_xl.safetensors"
VAE_PATH             = "/workspace/sdxl_vae.safetensors"
DETAIL_LORA_PATH     = "/workspace/detail_tweaker.safetensors"
REALISM_LORA_PATH    = "/workspace/realism.safetensors"
OPENPOSE_PATH        = "/workspace/controlnet_openpose_xl"
CANNY_PATH           = "/workspace/controlnet_canny_xl"
IPADAPTER_PATH       = "/workspace/ip-adapter-faceid-plusv2_sdxl.bin"
IMAGE_ENCODER_PATH   = "/workspace/image_encoder"

base_pipeline  = None
ip_model       = None
app            = None
openpose       = None
canny_detector = None

# ---------- Explicit Prompt Presets (first match wins) ----------
EXPLICIT_PRESETS = [
    {
        "name": "doggy",
        "keywords": [
            "doggy", "doggystyle", "doggy style", "from behind", "prone bone",
            "bent over", "ass up", "on all fours", "being fucked", "getting fucked"
        ],
        "before": "on all fours, ass up back arched looking over shoulder, 1man thick hard cock slamming deep into her pussy from behind, 1girl, ",
        "after": ", rear view masterpiece, photorealistic RAW photo, best quality, 8k resolution, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic professional photography, soft dramatic lighting with warm highlights and deep shadows, flawless smooth skin with perfect realistic texture"
    },
    {
        "name": "missionary",
        "keywords": [
            "missionary", "missionary sex", "man on top", "on her back", "sex",
            "legs spread", "having sex", "sexing"
        ],
        "before": "lying on back, legs spread wide knees up, 1man thick hard cock pounding deep into her pussy from above, 1girl, ",
        "after": ", high angle masterpiece, photorealistic RAW photo, best quality, 8k resolution, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic professional photography, soft dramatic lighting with warm highlights and deep shadows, flawless smooth skin with perfect realistic texture"
    },
    {
        "name": "spooning",
        "keywords": [
            "spooning", "side fuck", "side sex", "spooning sex"
        ],
        "before": "lying on her side one leg raised body curved, 1man thick hard cock thrusting deep into her pussy from behind, 1girl, 1man, ",
        "after": ", rear view masterpiece, photorealistic RAW photo, best quality, 8k resolution, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic professional photography, soft dramatic lighting with warm highlights and deep shadows, flawless smooth skin with perfect realistic texture"
    },
    {
        "name": "oral",
        "keywords": [
            "sucking", "blowjob", "blow job", "deepthroat", "deep throat",
            "facefuck", "face fuck", "oral", "cocksucking", "throat fuck", "irrumatio"
        ],
        "before": "kneeling forward mouth wide open eyes watering, 1man thick hard cock buried balls deep inside her mouth, 1girl, ",
        "after": ", high-angle masterpiece, photorealistic RAW photo, best quality, 8k resolution, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic professional photography, soft dramatic lighting with warm highlights and deep shadows, flawless smooth skin with perfect realistic texture"
    },
    {
        "name": "cumshot",
        "keywords": [
            "cumshot", "cum on face", "facial", "semen", "covered in cum", "cum on tits"
        ],
        "before": "thick cum blasting across her face and big tits, sticky white loads dripping down her cheeks lips and cleavage, 1girl, ",
        "after": ", high angle masterpiece, photorealistic RAW photo, best quality, 8k resolution, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic professional photography, soft studio lighting with warm highlights and deep shadows, flawless smooth skin with perfect realistic texture"
    },
    {
        "name": "cowgirl",
        "keywords": [
            "cowgirl", "reverse cowgirl", "riding", "riding cock", "on top"
        ],
        "before": "straddling on top hips rolling downward, 1man thick hard cock buried deep in her pussy from below, 1girl, ",
        "after": ", rear view masterpiece, photorealistic RAW photo, best quality, 8k resolution, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic professional photography, soft studio lighting with warm highlights and deep shadows, flawless smooth skin with perfect realistic texture"
    },
    {
        "name": "creampie",
        "keywords": [
            "creampie", "cum inside", "breeding", "bred", "internal cumshot", "cum in pussy"
        ],
        "before": "lying back legs spread pussy gaping, 1man thick hard cock pumping cum deep inside her pussy, 1girl, ",
        "after": ", high-angle masterpiece, photorealistic RAW photo, best quality, 8k resolution, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic professional photography, soft studio lighting with warm highlights and deep shadows, flawless smooth skin with perfect realistic texture"
    },
    {
        "name": "standing_doggy",
        "keywords": [
            "standing sex", "leg raised", "standing doggy", "against the wall", "one leg up"
        ],
        "before": "standing one leg hooked high body pinned to wall, 1man thick hard cock thrusting deep into her pussy from behind, 1girl, 1man, ",
        "after": ", rear view masterpiece, photorealistic RAW photo, best quality, 8k resolution, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic professional photography, soft studio lighting with warm highlights and deep shadows, flawless smooth skin with perfect realistic texture"
    },
    {
        "name": "masturbation",
        "keywords": [
            "masturbation", "masturbating", "fingering", "touching herself",
            "rubbing clit", "solo play", "self pleasure", "fingers in pussy"
        ],
        "before": "lying on back legs spread, one hand fingers buried deep in her wet pussy, other hand squeezing and stimulating her breast, 1girl, ",
        "after": ", high angle masterpiece, photorealistic RAW photo, best quality, 8k resolution, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic professional photography, soft studio lighting with warm highlights and deep shadows, flawless smooth skin with perfect realistic texture"
    },
    {
        "name": "anal",
        "keywords": [
            "anal", "anal sex", "ass fuck", "fucked in the ass",
            "cock in ass", "anal penetration", "asshole", "in the anus"
        ],
        "before": "on all fours ass up back arched looking over shoulder, 1man thick hard cock slamming deep into her tight asshole, 1girl, ",
        "after": ", rear view masterpiece, photorealistic RAW photo, best quality, 8k resolution, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic professional photography, soft studio lighting with warm highlights and deep shadows, flawless smooth skin with perfect realistic texture"
    },
]

def load_models():
    global base_pipeline, ip_model, app, openpose, canny_detector

    if base_pipeline is None:
        print("Initializing InsightFace engine...")
        app = FaceAnalysis(name='buffalo_l', providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
        app.prepare(ctx_id=0, det_size=(640, 640))

        print("Loading VAE...")
        vae = AutoencoderKL.from_single_file(VAE_PATH, torch_dtype=torch.float16).to("cuda")

        print("Loading ControlNets...")
        controlnet_pose = ControlNetModel.from_pretrained(OPENPOSE_PATH, torch_dtype=torch.float16).to("cuda")
        controlnet_canny = ControlNetModel.from_pretrained(CANNY_PATH, torch_dtype=torch.float16).to("cuda")

        print("Loading Juggernaut XL pipeline...")
        txt2img_pipe = StableDiffusionXLControlNetPipeline.from_single_file(
            JUGGERNAUT_PATH,
            controlnet=[controlnet_pose, controlnet_canny],
            vae=vae,
            torch_dtype=torch.float16,
            use_safetensors=True,
            variant="fp16"
        ).to("cuda")

        print("Loading LoRAs (Detail + Realism only)...")
        txt2img_pipe.load_lora_weights(DETAIL_LORA_PATH, adapter_name="detail")
        txt2img_pipe.load_lora_weights(REALISM_LORA_PATH, adapter_name="realism")
        txt2img_pipe.set_adapters(["detail", "realism"], adapter_weights=[0.55, 0.65])

        base_pipeline = StableDiffusionXLControlNetImg2ImgPipeline(
            vae=txt2img_pipe.vae,
            text_encoder=txt2img_pipe.text_encoder,
            text_encoder_2=txt2img_pipe.text_encoder_2,
            tokenizer=txt2img_pipe.tokenizer,
            tokenizer_2=txt2img_pipe.tokenizer_2,
            unet=txt2img_pipe.unet,
            controlnet=txt2img_pipe.controlnet,
            scheduler=txt2img_pipe.scheduler,
        ).to("cuda")

        base_pipeline.unet = txt2img_pipe.unet

        base_pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
            base_pipeline.scheduler.config,
            use_karras_sigmas=True,
            algorithm_type="dpmsolver++"
        )
        base_pipeline.enable_vae_slicing()
        base_pipeline.enable_vae_tiling()
        base_pipeline.enable_attention_slicing(slice_size="auto")

        print("Loading IP-Adapter FaceID Plus v2...")
        ip_model = IPAdapterFaceIDPlusXL(
            base_pipeline,
            image_encoder_path=IMAGE_ENCODER_PATH,
            ip_ckpt=IPADAPTER_PATH,
            device="cuda",
            torch_dtype=torch.float16,
        )

        print("Loading detectors...")
        openpose = OpenposeDetector.from_pretrained("lllyasviel/ControlNet")
        canny_detector = CannyDetector()

        print("✓ FaceID Edit pipeline initialized successfully")

def get_dimensions(image, max_size=1536, min_size=512, multiple=64):
    w, h = image.size
    aspect = w / float(h)

    if w > max_size or h > max_size:
        if aspect >= 1.0:
            w = max_size
            h = int(round(w / aspect))
        else:
            h = max_size
            w = int(round(h * aspect))

    if w < min_size or h < min_size:
        if aspect >= 1.0:
            w = min_size
            h = int(round(w / aspect))
        else:
            h = min_size
            w = int(round(h * aspect))

    w = max(min_size, int(round(w / multiple) * multiple))
    h = max(min_size, int(round(h / multiple) * multiple))
    w = min(w, max_size // multiple * multiple)
    h = min(h, max_size // multiple * multiple)
    return w, h

def ensure_min_file_size(image, min_bytes=600 * 1024):
    """Upscale image if its JPEG size is under 600 KB (aspect-ratio safe)."""
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=95)
    current_size = buf.tell()

    if current_size >= min_bytes:
        return image

    print(f"→ Image is {current_size/1024:.1f} KB (< 600 KB) – upscaling...")

    w, h = image.size
    target_long = 1280
    long_side = max(w, h)
    if long_side < target_long:
        scale = target_long / long_side
        new_w = int(round(w * scale / 64) * 64)
        new_h = int(round(h * scale / 64) * 64)
        image = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
        print(f"→ Upscaled to {new_w}x{new_h}")

    return image

def get_explicit_preset(user_prompt: str):
    """Return the first matching preset or None."""
    prompt_lower = user_prompt.lower()
    for preset in EXPLICIT_PRESETS:
        if any(kw in prompt_lower for kw in preset["keywords"]):
            return preset
    return None

def build_prompts(user_prompt, user_negative='', is_sexual=False, preset=None):
    negative = (
        "clothes, clothing, dress, shirt, pants, fabric, covered, dressed, "
        "different person, changed face, distorted face, deformed, bad anatomy, "
        "mutated hands, fused fingers, extra fingers, missing fingers, "
        "blurry, low quality, jpeg artifacts, worst quality, ugly, watermark, text, "
        "cartoon, anime, illustration, painting, 3d render, cgi, "
        "plastic skin, doll-like, porcelain skin, smooth skin, airbrushed, "
        "overly smooth, waxy, artificial, synthetic, glossy plastic, "
        "oversharp, oversaturated, heavy makeup, perfect skin, flawless skin"
    )

    if user_negative:
        negative = f"{user_negative}, {negative}"

    if is_sexual and preset is not None:
        # Real variable insertion using before + after
        positive = f"{preset['before']}{user_prompt}{preset['after']}"
    else:
        # Non-explicit general positive
        positive = (
            f"{user_prompt}, completely nude, fully naked, bare skin, "
            f"photorealistic, masterpiece, best quality, ultra detailed, "
            f"natural skin texture, visible pores, subtle freckles, "
            f"realistic skin, soft natural lighting, film grain, "
            f"realistic anatomy"
        )

    return positive, negative

def post_process(image):
    image = image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=75, threshold=3))
    image = ImageEnhance.Contrast(image).enhance(1.04)
    image = ImageEnhance.Sharpness(image).enhance(1.05)
    return image

def handler(job):
    try:
        input_data       = job['input']
        user_prompt      = input_data.get('prompt', 'standing pose, confident expression')
        user_negative    = input_data.get('negative_prompt', '')
        image_base64     = input_data.get('image')

        # Frontend slider mapping (mainly for normal mode)
        raw_pose = float(input_data.get('pose_strength', input_data.get('poseStrength', 0.5)))
        pose_strength = max(0.12, min(0.85, 1.0 - raw_pose))

        raw_structure = float(input_data.get('structure_strength', input_data.get('structureStrength', 0.6)))
        canny_strength = max(0.05, min(0.45, raw_structure * 0.4))

        face_scale       = float(input_data.get('face_scale', 0.82))
        s_scale          = float(input_data.get('s_scale', 1.0))
        strength         = float(input_data.get('strength', 0.78))
        guidance_scale   = 7.0
        num_steps        = 40

        # ----- Explicit detection & preset selection -----
        preset = get_explicit_preset(user_prompt)
        is_sexual = preset is not None

        # Safety net for very common ambiguous phrases → default to doggy
        if not is_sexual:
            lower = user_prompt.lower()
            if any(x in lower for x in ["being fucked", "getting fucked", "fucked hard", "pounded"]):
                preset = EXPLICIT_PRESETS[0]  # doggy
                is_sexual = True

        if is_sexual:
            print(f"→ Explicit mode activated – using preset: {preset['name']}")
            pose_strength = 0.0
            canny_strength = 0.0
            strength = 0.97
            guidance_scale = 9.0
            face_scale = max(face_scale, 0.84)
            num_steps = 38
        else:
            print("→ Normal undress mode (img2img)")

        # Always Detail + Realism
        ip_model.pipe.set_adapters(["detail", "realism"], adapter_weights=[0.55, 0.65])

        if not image_base64:
            return {"error": "No image provided"}

        image_data  = base64.b64decode(image_base64.split(",")[1] if "," in image_base64 else image_base64)
        input_image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # Upscale if under 600 KB
        input_image = ensure_min_file_size(input_image)

        orig_w, orig_h = input_image.size
        w, h = get_dimensions(input_image)
        input_image = input_image.resize((w, h), Image.Resampling.LANCZOS)

        print(f"Original: {orig_w}x{orig_h} → Resized: {w}x{h} | Pose: {pose_strength:.2f} | Canny: {canny_strength:.2f} | Strength: {strength:.2f} | CFG: {guidance_scale} | Steps: {num_steps} | Sexual: {is_sexual}")

        # Face embedding
        cv2_img = cv2.cvtColor(np.array(input_image), cv2.COLOR_RGB2BGR)
        faces   = app.get(cv2_img)

        if len(faces) == 0:
            return {"error": "No face detected in input image by InsightFace"}

        faces = sorted(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]), reverse=True)
        best_face = faces[0]

        faceid_embeds = torch.from_numpy(best_face.normed_embedding).unsqueeze(0).to(dtype=torch.float16, device="cuda")
        aligned_face_bgr = face_align.norm_crop(cv2_img, landmark=best_face.kps, image_size=224)
        face_image = Image.fromarray(cv2.cvtColor(aligned_face_bgr, cv2.COLOR_BGR2RGB))

        # ControlNet maps
        runpod.serverless.progress_update(job, "EXTRACTING_POSE")
        pose_map = openpose(input_image, include_body=True, include_hand=True)
        pose_map = pose_map.resize((w, h))

        runpod.serverless.progress_update(job, "EXTRACTING_EDGES")
        canny_map = canny_detector(input_image, low_threshold=100, high_threshold=200)
        canny_map = canny_map.resize((w, h))

        positive, negative = build_prompts(user_prompt, user_negative, is_sexual=is_sexual, preset=preset)

        # --- Generate ---
        runpod.serverless.progress_update(job, "GENERATING_EDIT")

        ip_model.pipe.scheduler.set_timesteps(num_steps, device="cuda")

        images = ip_model.generate(
            prompt=positive,
            negative_prompt=negative,
            faceid_embeds=faceid_embeds,
            face_image=face_image,
            image=input_image,
            control_image=[pose_map, canny_map],
            strength=strength,
            controlnet_conditioning_scale=[pose_strength, canny_strength],
            num_inference_steps=num_steps,
            guidance_scale=guidance_scale,
            width=w,
            height=h,
            scale=face_scale,
            s_scale=s_scale,
            num_samples=1,
        )

        result = post_process(images[0])

        buffered = io.BytesIO()
        result.save(buffered, format="JPEG", quality=93, optimize=True, progressive=True)

        return {"image": f"data:image/jpeg;base64,{base64.b64encode(buffered.getvalue()).decode()}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}


if __name__ == "__main__":
    try:
        load_models()
        print("✓ Startup complete, listening for jobs...", flush=True)
        runpod.serverless.start({"handler": handler})
    except Exception as e:
        import traceback
        print(f"FATAL STARTUP ERROR: {e}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
