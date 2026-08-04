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
JUGGERNAUT_PATH    = "/workspace/juggernaut_xl.safetensors"
VAE_PATH           = "/workspace/sdxl_vae.safetensors"
DETAIL_LORA_PATH   = "/workspace/add-detail-xl.safetensors"
OPENPOSE_PATH      = "/workspace/controlnet_openpose_xl"
CANNY_PATH         = "/workspace/controlnet_canny_xl"
IPADAPTER_PATH     = "/workspace/ip-adapter-faceid-plusv2_sdxl.bin"
IMAGE_ENCODER_PATH = "/workspace/image_encoder"

base_pipeline  = None
ip_model       = None
app            = None
openpose       = None
canny_detector = None

def load_models():
    global base_pipeline, ip_model, app, openpose, canny_detector

    if base_pipeline is None:
        print("Initializing InsightFace engine...")
        app = FaceAnalysis(name='buffalo_l', providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
        app.prepare(ctx_id=0, det_size=(640, 640))

        print("Loading VAE...")
        vae = AutoencoderKL.from_single_file(
            VAE_PATH, torch_dtype=torch.float16
        ).to("cuda")

        print("Loading ControlNets...")
        controlnet_pose = ControlNetModel.from_pretrained(
            OPENPOSE_PATH, torch_dtype=torch.float16
        ).to("cuda")

        controlnet_canny = ControlNetModel.from_pretrained(
            CANNY_PATH, torch_dtype=torch.float16
        ).to("cuda")

        print("Loading Juggernaut XL pipeline...")
        base_pipeline = StableDiffusionXLControlNetImg2ImgPipeline.from_single_file(
            JUGGERNAUT_PATH,
            controlnet=[controlnet_pose, controlnet_canny],
            vae=vae,
            torch_dtype=torch.float16,
            use_safetensors=True,
            variant="fp16"
        ).to("cuda")

        print("Fusing Detail LoRA...")
        base_pipeline.load_lora_weights(DETAIL_LORA_PATH)
        base_pipeline.fuse_lora(lora_scale=0.6)

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

def get_dimensions(image):
    w, h = image.size
    w = int(w // 64 * 64)
    h = int(h // 64 * 64)
    if w > 1536: w = 1536
    if h > 1536: h = 1536
    w = max(512, w)
    h = max(512, h)
    return w, h

def build_prompts(user_prompt, user_negative=''):
    positive = (
        f"{user_prompt}, photorealistic, masterpiece, best quality, ultra detailed, "
        f"sharp focus, realistic skin texture, natural lighting, consistent identity, "
        f"same person, same face, preserve facial features"
    )
    negative = (
        "different person, changed face, distorted face, deformed, bad anatomy, "
        "mutated hands, fused fingers, extra fingers, missing fingers, "
        "blurry, low quality, jpeg artifacts, worst quality, ugly, watermark, text"
    )
    if user_negative:
        negative = f"{user_negative}, {negative}"
    return positive, negative

def post_process(image):
    image = image.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=2))
    image = ImageEnhance.Contrast(image).enhance(1.1)
    image = ImageEnhance.Sharpness(image).enhance(1.2)
    return image

def handler(job):
    try:
        input_data       = job['input']
        user_prompt      = input_data.get('prompt', 'standing pose, confident expression')
        user_negative    = input_data.get('negative_prompt', '')
        image_base64     = input_data.get('image')
        pose_strength    = float(input_data.get('pose_strength', 0.60))
        canny_strength   = float(input_data.get('canny_strength', 0.30))
        face_scale       = float(input_data.get('face_scale', 0.85))
        # s_scale controls how strongly the CLIP face-structure signal (the
        # "Plus" half of FaceID-Plus) influences results, separate from the
        # ArcFace identity lock itself. 1.0 = default/full strength.
        s_scale          = float(input_data.get('s_scale', 1.0))
        # Img2img denoise strength: lower = more of the real source pixels
        # (background, lighting, skin tone) survive, less freedom to move
        # into a very different pose. Higher = more freedom, closer to pure
        # txt2img behavior. 0.45-0.6 is a good starting point for a real
        # pose/outfit change; go lower (0.3-0.4) for subtle edits.
        strength         = float(input_data.get('strength', 0.5))

        if not image_base64:
            return {"error": "No image provided"}

        image_data  = base64.b64decode(image_base64.split(",")[1] if "," in image_base64 else image_base64)
        input_image = Image.open(io.BytesIO(image_data)).convert("RGB")
        w, h        = get_dimensions(input_image)
        input_image = input_image.resize((w, h), Image.Resampling.LANCZOS)

        # --- STEP 1: Extract 512-dim Face Vector + aligned face crop ---
        cv2_img = cv2.cvtColor(np.array(input_image), cv2.COLOR_RGB2BGR)
        faces   = app.get(cv2_img)

        if len(faces) == 0:
            return {"error": "No face detected in input image by InsightFace"}

        # Sort faces by bounding box size to select the dominant face
        faces = sorted(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]), reverse=True)
        best_face = faces[0]

        faceid_embeds = torch.from_numpy(best_face.normed_embedding).unsqueeze(0).to(
            dtype=torch.float16, device="cuda"
        )

        # The "Plus" half of FaceID-Plus needs a tightly aligned face crop
        # (not the whole photo) fed through the CLIP image encoder for facial
        # structure detail -- this is exactly what the official reference
        # implementation does with insightface's own alignment utility, using
        # the landmarks we already have from the detection call above.
        aligned_face_bgr = face_align.norm_crop(cv2_img, landmark=best_face.kps, image_size=224)
        face_image = Image.fromarray(cv2.cvtColor(aligned_face_bgr, cv2.COLOR_BGR2RGB))

        # --- STEP 2: Extract ControlNet Condition Maps ---
        runpod.serverless.progress_update(job, "EXTRACTING_POSE")
        pose_map = openpose(input_image, include_body=True, include_hand=True)
        pose_map = pose_map.resize((w, h))

        runpod.serverless.progress_update(job, "EXTRACTING_EDGES")
        canny_map = canny_detector(input_image, low_threshold=100, high_threshold=200)
        canny_map = canny_map.resize((w, h))

        positive, negative = build_prompts(user_prompt, user_negative)

        # --- STEP 3: Generate Output Image ---
        runpod.serverless.progress_update(job, "GENERATING_EDIT")
        images = ip_model.generate(
            prompt=positive,
            negative_prompt=negative,
            faceid_embeds=faceid_embeds,
            face_image=face_image,
            # StableDiffusionXLControlNetImg2ImgPipeline splits these two
            # roles into separate kwargs:
            #   image         -> the real init latent (source photo pixels)
            #   control_image -> the ControlNet condition maps (pose/edges)
            #   strength      -> how much of the init image survives
            image=input_image,
            control_image=[pose_map, canny_map],
            strength=strength,
            controlnet_conditioning_scale=[pose_strength, canny_strength],
            # effective denoise steps ≈ num_inference_steps * strength
            num_inference_steps=70,
            guidance_scale=7.0,
            width=w,
            height=h,
            scale=face_scale,
            s_scale=s_scale,
            num_samples=1,
        )

        result = post_process(images[0])

        buffered = io.BytesIO()
        result.save(buffered, format="JPEG", quality=90, optimize=True, progressive=True)

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
