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
        image_base64 = data.get("image")
        second_image_b64 = data.get("second_image")
        user_prompt = data.get("prompt", "improve quality, high detail")

        if not image_base64:
            return {"error": "Main image is required"}

        main_image_name = upload_image(image_base64, "main_input.jpg")
        second_image_name = None
        if second_image_b64:
            second_image_name = upload_image(second_image_b64, "second_input.jpg")

        with open("/app/ComfyUI/workflows/lustify_krea_edit.json", "r") as f:
            workflow = json.load(f)

        # Direct API Node Injections
        workflow["72"]["inputs"]["image"] = main_image_name      # main image
        if second_image_name:
            workflow["300"]["inputs"]["image"] = second_image_name  # second/reference image
        workflow["247"]["inputs"]["prompt"] = user_prompt         # edit prompt

        resp = requests.post(f"{COMFY_URL}/prompt", json={"prompt": workflow})
        prompt_id = resp.json().get("prompt_id")

        for _ in range(90):
            history_resp = requests.get(f"{COMFY_URL}/history/{prompt_id}")
            history = history_resp.json()
            if prompt_id in history:
                outputs = history[prompt_id].get("outputs", {})
                for node_id, node_output in outputs.items():
                    if "images" in node_output:
                        image_data = node_output["images"][0]
                        image_path = f"/app/ComfyUI/output/{image_data['filename']}"
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
