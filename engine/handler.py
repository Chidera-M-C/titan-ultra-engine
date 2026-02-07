import runpod
import torch
from diffusers import FluxPipeline # Or whatever model class you need

pipe = None
current_model_id = None

def handler(job):
    global pipe, current_model_id
    
    # 1. Get instructions from your Vite UI
    job_input = job['input']
    model_id = job_input.get('model_id') # e.g., "black-forest-labs/FLUX.1-dev"
    prompt = job_input.get('prompt')
    
    # 2. Dynamic Model Swapping
    # If the UI sends a different model ID than what is loaded, swap it!
    if model_id != current_model_id:
        pipe = FluxPipeline.from_pretrained(model_id, torch_dtype=torch.bfloat16)
        pipe.to("cuda")
        current_model_id = model_id

    # 3. Quality Settings from UI
    image = pipe(
        prompt=prompt,
        guidance_scale=job_input.get('guidance', 3.5),
        num_inference_steps=job_input.get('steps', 28),
        width=job_input.get('width', 1024),
        height=job_input.get('height', 1024)
    ).images[0]

    return {"image": image_to_base64(image)}

runpod.serverless.start({"handler": handler})
