import sys
import os
import time
import base64
import json
import requests
import runpod
from io import BytesIO
from PIL import Image

COMFY_URL = "http://127.0.0.1:8188"
MAX_SIZE = 1024

def start_comfyui():
    import subprocess, threading
    def run():
        subprocess.Popen(
            [sys.executable, "main.py", "--listen", "0.0.0.0", "--port", "8188"],
            cwd="/app/ComfyUI"
        )
    threading.Thread(target=run, daemon=True).start()

    for _ in range(50):
        try:
            if requests.get(f"{COMFY_URL}/history", timeout=5).status_code == 200:
                print("✅ ComfyUI ready")
                return True
        except:
            pass
        time.sleep(3)
    raise Exception("ComfyUI startup timeout")

def resize_image(image_base64, max_size=MAX_SIZE):
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    
    img = Image.open(BytesIO(base64.b64decode(image_base64))).convert("RGB")
    w, h = img.size
    
    if max(w, h) > max_size:
        if w > h:
            new_w = max_size
            new_h = int(h * max_size / w)
        else:
            new_h = max_size
            new_w = int(w * max_size / h)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    buffered = BytesIO()
    img.save(buffered, format="JPEG", quality=93)
    return base64.b64encode(buffered.getvalue()).decode()

def upload_image(image_base64, filename="input.jpg"):
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    files = {"image": (filename, base64.b64decode(image_base64), "image/jpeg")}
    r = requests.post(f"{COMFY_URL}/upload/image", files=files)
    return r.json()["name"]

def handler(job):
    try:
        data = job["input"]
        image_base64 = data.get("image")
        second_image_b64 = data.get("second_image")
        user_prompt = data.get("prompt")
        if not user_prompt:
            return {"error": "Prompt is required"}

        if not image_base64:
            return {"error": "Main image is required"}

        # Resize image
        image_base64 = resize_image(image_base64)
        main_image_name = upload_image(image_base64, "main_input.jpg")

        with open("/app/ComfyUI/workflows/krea2_identity_edit.json", "r") as f:
            workflow = json.load(f)

        # Set main image and prompt
        workflow["72"]["inputs"]["image"] = main_image_name
        workflow["247"]["inputs"]["prompt"] = user_prompt

        # Dual image support
        if second_image_b64:
            second_image_b64 = resize_image(second_image_b64)
            second_image_name = upload_image(second_image_b64, "second_input.jpg")

            if "300" not in workflow:
                workflow["300"] = {
                    "class_type": "LoadImage",
                    "inputs": {
                        "image": second_image_name,
                        "upload": "image"
                    }
                }
            else:
                workflow["300"]["inputs"]["image"] = second_image_name

            workflow["247"]["inputs"]["image_b"] = ["300", 0]
            if "309" in workflow and "inputs" in workflow["309"]:
                workflow["309"]["inputs"]["source_image_b"] = ["300", 0]
        else:
            # Remove second image completely
            if "300" in workflow:
                del workflow["300"]
            if "image_b" in workflow.get("247", {}).get("inputs", {}):
                del workflow["247"]["inputs"]["image_b"]
            if "source_image_b" in workflow.get("309", {}).get("inputs", {}):
                del workflow["309"]["inputs"]["source_image_b"]

        # Safer generation settings
        workflow["117"]["inputs"]["unet_name"] = "krea2_turbo_fp8_scaled.safetensors"
        workflow["266"]["inputs"]["cfg"] = float(data.get("cfg", 2.5))
        workflow["266"]["inputs"]["denoise"] = float(data.get("denoise", 0.80))
        workflow["266"]["inputs"]["steps"] = int(data.get("steps", 12))
        workflow["266"]["inputs"]["sampler_name"] = data.get("sampler", "euler_ancestral")
        workflow["266"]["inputs"]["scheduler"] = data.get("scheduler", "normal")

        # Queue the prompt
        resp = requests.post(f"{COMFY_URL}/prompt", json={"prompt": workflow})
        if "prompt_id" not in resp.json():
            return {"error": "Failed to queue prompt", "details": resp.json()}

        prompt_id = resp.json()["prompt_id"]

        # Wait for result
        for _ in range(150):
            history = requests.get(f"{COMFY_URL}/history/{prompt_id}").json()
            if prompt_id in history:
                outputs = history[prompt_id].get("outputs", {})
                for node_id, node_output in outputs.items():
                    if "images" in node_output and len(node_output["images"]) > 0:
                        img = node_output["images"][0]
                        filename = img["filename"]
                        subfolder = img.get("subfolder", "")
                        folder_type = img.get("type", "output")
                        image_path = os.path.join("/app/ComfyUI", folder_type, subfolder, filename)

                        if os.path.exists(image_path):
                            with open(image_path, "rb") as f:
                                result_b64 = base64.b64encode(f.read()).decode()
                            return {"image": f"data:image/jpeg;base64,{result_b64}"}
            time.sleep(2)

        return {"error": "Timeout waiting for image"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

if __name__ == "__main__":
    start_comfyui()
    runpod.serverless.start({"handler": handler})
