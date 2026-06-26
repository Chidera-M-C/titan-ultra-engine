import torch
import runpod
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler, AutoencoderKL
from ip_adapter.ip_adapter_faceid import IPAdapterFaceIDPlusXL
import io, base64, os, requests
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

# --- CONFIG ---
JUGGERNAUT_PATH  = "/workspace/juggernaut_xl.safetensors"
VAE_PATH         = "/workspace/sdxl_vae.safetensors"
DETAIL_LORA_PATH = "/workspace/add-detail-xl.safetensors"
IPADAPTER_PATH   = "/workspace/ip_adapter_faceid_plus_sdxl.bin"
IMAGE_ENCODER_PATH = "/workspace/image_encoder"

JUGGERNAUT_LINK  = "https://civitai.com/api/download/models/1759168?type=Model&format=SafeTensor&size=full&fp=fp16"
VAE_LINK         = "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl_vae.safetensors"
DETAIL_LORA_LINK = "https://huggingface.co/LyliaEngine/add-detail-xl/resolve/main/add-detail-xl.safetensors"
IPADAPTER_LINK   = "https://huggingface.co/h94/IP-Adapter-FaceID/resolve/main/ip-adapter-faceid-plusv2_sdxl.bin"
IMAGE_ENCODER_HF = "laion/CLIP-ViT-H-14-laion2B-s32B-b79K"

base_pipeline = None
ip_model      = None

def download_file(url, path, label):
    if not os.path.exists(path):
        print(f"Downloading {label}...")
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(url, headers=headers, stream=True)
        r.raise_for_status()
        total_size = int(r.headers.get('content-length', 0))
        with open(path, 'wb') as f:
            downloaded = 0
            for chunk in r.iter_content(chunk_size=1024*1024):
                f.write(chunk)
                downloaded += len(chunk)
                if total_size:
                    print(f"  {(downloaded/total_size)*100:.1f}%", end='\r')
        print(f"  {label} downloaded successfully")

def download_hf_model(repo_id, local_path, label):
    if not os.path.exists(local_path):
        print(f"Downloading {label} from HuggingFace...")
        from huggingface_hub import snapshot_download
        snapshot_download(repo_id=repo_id, local_dir=local_path)
        print(f"  {label} done")

def load_models():
    global base_pipeline, ip_model

    if base_pipeline is None:
        download_file(JUGGERNAUT_LINK,  JUGGERNAUT_PATH,  "Juggernaut XL")
        download_file(VAE_LINK,         VAE_PATH,          "SDXL VAE")
        download_file(DETAIL_LORA_LINK, DETAIL_LORA_PATH,  "Detail Tweaker LoRA")
        download_file(IPADAPTER_LINK,   IPADAPTER_PATH,    "IP-Adapter FaceID Plus v2 SDXL")
        download_hf_model(IMAGE_ENCODER_HF, IMAGE_ENCODER_PATH, "CLIP Image Encoder")

        vae = AutoencoderKL.from_single_file(
            VAE_PATH, torch_dtype=torch.float16
        ).to("cuda")

        base_pipeline = StableDiffusionXLPipeline.from_single_file(
            JUGGERNAUT_PATH, vae=vae,
            torch_dtype=torch.float16, use_safetensors=True, variant="fp16"
        ).to("cuda")

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

        print("Loading IP-Adapter FaceID Plus...")
        ip_model = IPAdapterFaceIDPlusXL(
            base_pipeline,
            image_encoder_path=IMAGE_ENCODER_PATH,
            ip_ckpt=IPADAPTER_PATH,
            device="cuda",
            torch_dtype=torch.float16,
        )

        print("Character models loaded successfully")

def get_dimensions(aspect_ratio):
    dimensions = {
        '1:1':  (1024, 1024),
        '4:5':  (1024, 1280),
        '5:4':  (1280, 1024),
        '9:16': (1024, 1536),
        '16:9': (1536, 1024),
    }
    width, height = dimensions.get(aspect_ratio, (1024, 1536))
    return width, height

def build_prompts(user_prompt, character_meta, user_negative=''):
    name      = character_meta.get('name', '')
    race      = character_meta.get('race', '')
    body_type = character_meta.get('body_type', '').replace('_', ' ')

    positive = (
        f"{name}, {race} woman, {body_type}, {user_prompt}, "
        f"photorealistic, masterpiece, best quality, ultra detailed, raw photo, "
        f"sharp focus, realistic skin with visible pores, matte skin, "
        f"natural face, consistent identity, same person, "
        f"perfect anatomy, correct limb placement, perfect hands, "
        f"five fingers per hand, depth of field, natural lighting"
    )

    negative = (
        "different person, changed face, identity change, "
        "bad anatomy, deformed, mutated hands, fused fingers, "
        "extra fingers, missing fingers, blurry, low quality, "
        "jpeg artifacts, worst quality, ugly, watermark, text"
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
        input_data     = job['input']
        user_prompt    = input_data.get('prompt', 'standing pose, natural lighting')
        user_negative  = input_data.get('negative_prompt', '')
        aspect_ratio   = input_data.get('aspect_ratio', '9:16')
        face_embedding = input_data.get('face_embedding')
        character_meta = input_data.get('character', {})
        face_scale     = float(input_data.get('face_scale', 0.8))
        face_image_b64 = input_data.get('face_image', None)  # ← add this

        if not face_embedding:
            return {"error": "No face embedding provided"}

        # Decode face image if provided
        face_image = None
        if face_image_b64:
            try:
                img_data = base64.b64decode(face_image_b64.split(",")[1] if "," in face_image_b64 else face_image_b64)
                face_image = Image.open(io.BytesIO(img_data)).convert("RGB")
            except Exception as e:
                print(f"  WARNING: Could not decode face_image: {e}")

        positive, negative = build_prompts(user_prompt, character_meta, user_negative)
        width, height      = get_dimensions(aspect_ratio)

        faceid_embeds = torch.tensor([face_embedding], dtype=torch.float16).to("cuda")

        runpod.serverless.progress_update(job, "GENERATING_WITH_CHARACTER")

        images = ip_model.generate(
            prompt=positive,
            negative_prompt=negative,
            faceid_embeds=faceid_embeds,
            face_image=face_image,      # ← add this
            num_inference_steps=35,
            guidance_scale=7.0,
            width=width,
            height=height,
            scale=face_scale,
            num_samples=1,
        )

        final_image = post_process(images[0])

        buffered = io.BytesIO()
        final_image.save(buffered, format="JPEG", quality=85, optimize=True, progressive=True)

        return {"image": f"data:image/jpeg;base64,{base64.b64encode(buffered.getvalue()).decode()}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

# Models load once at startup
load_models()
runpod.serverless.start({"handler": handler})
