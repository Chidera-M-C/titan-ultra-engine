    # Dual Lightning LoRAs (HIGH for high model, LOW for low model)
    p["lora_lightning_high"] = {
        "class_type": "WanVideoLoraSelect",
        "inputs": {
            "lora": "lora_lightning_high.safetensors",
            "strength": 1.0,
        }
    }
    p["lora_lightning_low"] = {
        "class_type": "WanVideoLoraSelect",
        "inputs": {
            "lora": "lora_lightning_low.safetensors",
            "strength": 1.0,
        }
    }

    # Style LoRA stacked on top of Lightning
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
