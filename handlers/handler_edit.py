import sys
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__

import subprocess
def install_ip_adapter():
    try:
        import ip_adapter
        print("✓ ip_adapter already installed")
    except ImportError:
        print("🔧 Installing ip_adapter...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "git+https://github.com/tencent-ailab/IP-Adapter.git"])
        print("✅ ip_adapter installed")

install_ip_adapter()

import torch
import runpod
from diffusers import StableDiffusionXLControlNetPipeline, ControlNetModel, DPMSolverMultistepScheduler, AutoencoderKL
from ip_adapter.ip_adapter_faceid import IPAdapterFaceIDPlusXL
from controlnet_aux import OpenposeDetector, CannyDetector
from transformers import BlipProcessor, BlipForConditionalGeneration
import io, base64, os, requests
from PIL import Image, ImageFilter, ImageEnhance

# --- CONFIG ---
JUGGERNAUT_PATH     = "/workspace/juggernaut_xl.safetensors"
VAE_PATH            = "/workspace/sdxl_vae.safetensors"
DETAIL_LORA_PATH    = "/workspace/add-detail-xl.safetensors"
IPADAPTER_PATH      = "/workspace/ip_adapter_faceid_plus_sdxl.bin"
IMAGE_ENCODER_PATH  = "/workspace/image_encoder"

pipeline      = None
ip_model      = None
openpose      = None
canny_detector= None
blip_processor= None
blip_model    = None

def download_file(url, path, label):
    if not os.path.exists(path):
        print(f"Downloading {label}...")
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(url, headers=headers, stream=True)
        r.raise_for_status()
        with open(path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=1024*1024):
                f.write(chunk)
        print(f"  {label} downloaded")

def load_models():
    global pipeline, ip_model, openpose, canny_detector, blip_processor, blip_model

    vae = AutoencoderKL.from_single_file(VAE_PATH, torch_dtype=torch.float16).to("cuda")

    controlnet_pose = ControlNetModel.from_pretrained("thibaud/controlnet-openpose-sdxl-1.0", torch_dtype=torch.float16).to("cuda")
    controlnet_canny = ControlNetModel.from_pretrained("diffusers/controlnet-canny-sdxl-1.0", torch_dtype=torch.float16).to("cuda")

    pipeline = StableDiffusionXLControlNetPipeline.from_single_file(
        JUGGERNAUT_PATH,
        controlnet=[controlnet_pose, controlnet_canny],
        vae=vae,
        torch_dtype=torch.float16,
        use_safetensors=True,
        variant="fp16"
    ).to("cuda")

    pipeline.load_lora_weights(DETAIL_LORA_PATH)
    pipeline.fuse_lora(lora_scale=0.55)

    pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
        pipeline.scheduler.config, use_karras_sigmas=True, algorithm_type="dpmsolver++"
    )

    # Load IP-Adapter FaceID
    ip_model = IPAdapterFaceIDPlusXL(
        pipeline,
        image_encoder_path=IMAGE_ENCODER_PATH,
        ip_ckpt=IPADAPTER_PATH,
        device="cuda",
        torch_dtype=torch.float16,
    )

    openpose = OpenposeDetector.from_pretrained("lllyasviel/ControlNet")
    canny_detector = CannyDetector()

    print("✅ Edit handler loaded with IP-Adapter + ControlNet")

def load_blip():
    global blip_processor, blip_model
    if blip_processor is None:
        print("Loading BLIP for auto body description...")
        blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
        blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large").to("cuda")

def get_auto_body_description(input_image):
    load_blip()
    inputs = blip_processor(images=input_image, return_tensors="pt").to("cuda")
    outputs = blip_model.generate(**inputs, max_new_tokens=60)
    caption = blip_processor.decode(outputs[0], skip_special_tokens=True)
    # Clean caption into useful body description
    body_desc = caption.replace("a woman", "").replace("a photo of", "").replace("girl", "").strip()
    return f"{body_desc}, realistic body proportions, natural curves"

def build_prompts(user_prompt, body_description, user_negative=''):
    positive = (
        f"{user_prompt}, {body_description}, exact same woman, identical body type, same curves, "
        f"same breast size, same hip width, same waist, photorealistic, raw photo, ultra detailed skin, "
        f"realistic skin texture, consistent identity, same face"
    )
    negative = (
        "different person, different body, changed body type, different race, white skin, pale skin, "
        "bad anatomy, deformed, plastic skin, doll face, blurry, low quality"
    )
    if user_negative:
        negative = f"{user_negative}, {negative}"
    return positive, negative

def get_dimensions(image):
    w, h = image.size
    w = int(w // 8 * 8)
    h = int(h // 8 * 8)
    if w > 1536: w = 1536
    if h > 1536: h = 1536
    return w, h

def post_process(image):
    image = image.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=2))
    image = ImageEnhance.Contrast(image).enhance(1.1)
    image = ImageEnhance.Sharpness(image).enhance(1.2)
    return image

def handler(job):
    try:
        data = job['input']
        user_prompt     = data.get('prompt', 'beautiful woman, natural lighting')
        user_negative   = data.get('negative_prompt', '')
        image_base64    = data.get('image')
        face_embedding  = data.get('face_embedding')
        face_scale      = float(data.get('face_scale', 0.75))
        pose_strength   = float(data.get('pose_strength', 0.72))
        canny_strength  = float(data.get('canny_strength', 0.45))

        if not image_base64 or not face_embedding:
            return {"error": "Missing image or face_embedding"}

        # Load input image
        image_data = base64.b64decode(image_base64.split(",")[1] if "," in image_base64 else image_base64)
        input_image = Image.open(io.BytesIO(image_data)).convert("RGB")
        w, h = get_dimensions(input_image)
        input_image = input_image.resize((w, h), Image.Resampling.LANCZOS)

        # Auto generate body description
        body_description = get_auto_body_description(input_image)

        positive, negative = build_prompts(user_prompt, body_description, user_negative)

        # Control maps
        pose_map = openpose(input_image, include_body=True, include_hand=True).resize((w, h))
        canny_map = canny_detector(input_image, low_threshold=100, high_threshold=200).resize((w, h))

        # Generate
        images = ip_model.generate(
            prompt=positive,
            negative_prompt=negative,
            faceid_embeds=torch.tensor([face_embedding], dtype=torch.float16).to("cuda"),
            image=input_image,
            control_image=[pose_map, canny_map],
            controlnet_conditioning_scale=[pose_strength, canny_strength],
            num_inference_steps=32,
            guidance_scale=6.2,
            width=w,
            height=h,
            scale=face_scale,
            num_samples=1,
        )

        result = post_process(images[0])

        buffered = io.BytesIO()
        result.save(buffered, format="JPEG", quality=88, optimize=True)
        return {"image": f"data:image/jpeg;base64,{base64.b64encode(buffered.getvalue()).decode()}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

# Startup
load_models()
runpod.serverless.start({"handler": handler})
