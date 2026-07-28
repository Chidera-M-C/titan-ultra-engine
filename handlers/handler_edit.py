import sys
import os
import time
import base64
import json
import requests
import runpod

COMFY_URL = "http://127.0.0.1:8188"

def start_comfyui():
    import subprocess, threading
    def run():
        subprocess.Popen([sys.executable, "main.py", "--listen", "0.0.0.0", "--port", "8188"], cwd="/app/ComfyUI")
    threading.Thread(target=run, daemon=True).start()
    
    for _ in range(45):
        try:
            if requests.get(f"{COMFY_URL}/history", timeout=5).status_code == 200:
                print("✅ ComfyUI ready")
                return True
        except:
            pass
        time.sleep(3)
    raise Exception("ComfyUI startup timeout")

def upload_image(image_base64, filename="input.jpg"):
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    files = {'image': (filename, base64.b64decode(image_base64), 'image/jpeg')}
    r = requests.post(f"{COMFY_URL}/upload/image", files=files)
    return r.json()['name']

def handler(job):
    try:
        data = job["input"]
        main_image_b64 = data.get("image")
        second_image_b64 = data.get("second_image")        # ← Optional
        user_prompt = data.get("prompt", "improve the image, high quality")
        user_negative = data.get("negative_prompt", "")

        if not main_image_b64:
            return {"error": "Main image is required"}

        # Upload images
        main_image_name = upload_image(main_image_b64, "main_input.jpg")
        
        second_image_name = None
        if second_image_b64:
            second_image_name = upload_image(second_image_b64, "second_input.jpg")

        # Load workflow
        with open("/app/ComfyUI/workflows/lustify_krea_edit.json", "r") as f:
            workflow = json.load(f)

        # Update Main Image (Node 72)
        workflow["nodes"]["72"]["widgets_values"][0] = main_image_name

        # Update Second Reference Image (Node 300) if provided
        if second_image_name:
            workflow["nodes"]["300"]["widgets_values"][0] = second_image_name
            # Optionally enable the second reference group if needed
        else:
            # You can bypass the second reference if not provided (depending on workflow)
            pass

        # Update Edit Instruction (Node 248 in the subgraph)
        workflow["nodes"]["248"]["widgets_values"][0] = user_prompt

        # Queue the prompt
        resp = requests.post(f"{COMFY_URL}/prompt", json={"prompt": workflow})
        prompt_id = resp.json()["prompt_id"]

        # Wait for completion
        for _ in range(90):   # increased timeout for safety
            history = requests.get(f"{COMFY_URL}/history/{prompt_id}").json()
            if prompt_id in history and history[prompt_id].get("outputs"):
                # Get output from PreviewImage node (ID 90)
                try:
                    output_info = history[prompt_id]["outputs"]["90"]["images"][0]
                    image_path = f"/app/ComfyUI/output/{output_info['filename']}"
                    with open(image_path, "rb") as f:
                        result_b64 = base64.b64encode(f.read()).decode()
                    return {"image": f"data:image/jpeg;base64,{result_b64}"}
                except:
                    pass
            time.sleep(2)

        return {"error": "Generation timeout"}

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    start_comfyui()
    runpod.serverless.start({"handler": handler})
