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
        user_prompt = data.get("prompt", "improve quality, keep identity")

        if not image_base64:
            return {"error": "Main image is required"}

        main_image_name = upload_image(image_base64, "main_input.jpg")

        with open("/app/ComfyUI/workflows/lustify_krea_edit_api.json", "r") as f:
            workflow = json.load(f)

        # Always set main image + prompt
        workflow["72"]["inputs"]["image"] = main_image_name
        workflow["247"]["inputs"]["prompt"] = user_prompt

        # Dual image vs Single image handling
        if second_image_b64:
            second_image_name = upload_image(second_image_b64, "second_input.jpg")
            
            if "300" in workflow:
                workflow["300"]["inputs"]["image"] = second_image_name

            # Connect second image slots dynamically
            if "247" in workflow and "inputs" in workflow["247"]:
                workflow["247"]["inputs"]["image_b"] = ["300", 0]
            if "309" in workflow and "inputs" in workflow["309"]:
                workflow["309"]["inputs"]["source_image_b"] = ["300", 0]
        else:
            # Single-image mode: point Node 300 to main_image so missing file error is eliminated
            if "300" in workflow:
                workflow["300"]["inputs"]["image"] = main_image_name

            # Safely disconnect image_b reference links without breaking node schemas
            if "247" in workflow and "inputs" in workflow["247"]:
                workflow["247"]["inputs"].pop("image_b", None)
            if "309" in workflow and "inputs" in workflow["309"]:
                workflow["309"]["inputs"].pop("source_image_b", None)

        # Retained original settings as requested
        workflow["266"]["inputs"]["cfg"] = float(data.get("cfg", 3.5))
        workflow["266"]["inputs"]["denoise"] = float(data.get("denoise", 0.85))
        workflow["266"]["inputs"]["steps"] = int(data.get("steps", 22))

        # Queue workflow
        resp = requests.post(f"{COMFY_URL}/prompt", json={"prompt": workflow})
        prompt_id = resp.json().get("prompt_id")

        # Wait for result
        for _ in range(100):
            history_resp = requests.get(f"{COMFY_URL}/history/{prompt_id}").json()
            if prompt_id in history_resp:
                # 1. Check standard API history outputs first
                outputs = history_resp[prompt_id].get("outputs", {})
                for node_id, node_output in outputs.items():
                    if "images" in node_output and len(node_output["images"]) > 0:
                        image_data = node_output["images"][0]
                        subfolder = image_data.get("subfolder", "")
                        folder_type = image_data.get("type", "output")  # 'output' or 'temp'
                        filename = image_data["filename"]

                        image_path = os.path.join("/app/ComfyUI", folder_type, subfolder, filename)
                        if os.path.exists(image_path):
                            with open(image_path, "rb") as f:
                                result_b64 = base64.b64encode(f.read()).decode()
                            return {"image": f"data:image/jpeg;base64,{result_b64}"}

                # 2. Fallback: Scan BOTH /output and /temp directories recursively
                candidate_files = []
                for search_dir in ["/app/ComfyUI/output", "/app/ComfyUI/temp"]:
                    if os.path.exists(search_dir):
                        for root, _, files in os.walk(search_dir):
                            for f in files:
                                if f.lower().endswith(('.jpg', '.png', '.jpeg', '.webp')):
                                    candidate_files.append(os.path.join(root, f))
                
                if candidate_files:
                    latest_file = max(candidate_files, key=os.path.getmtime)
                    with open(latest_file, "rb") as f:
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
