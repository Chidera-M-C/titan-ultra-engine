"""
handler_video.py — ComfyUI + WanVideoWrapper I2V (Wan 2.2 + Dual Lightning)
6 styles: doggy, missionary, facial_cumshot, undress, masturbate, blowjob
Proper HIGH + LOW LoRA pairs for every style
Dynamic resolution from reference image
Default duration = 6 seconds
Multi-language keyword support (EN + ES + AR + HI + UR + BN + RU + PT)
"""

import os
import io
import time
import base64
import subprocess
import uuid
import requests
import runpod
import random
from PIL import Image

COMFYUI_DIR = "/comfyui"
COMFYUI_URL = "http://127.0.0.1:8188"

I2V_HIGH          = "wan2.2_i2v_high_noise_14B_fp8.safetensors"
I2V_LOW           = "wan2.2_i2v_low_noise_14B_fp8.safetensors"
T5_ENCODER        = "umt5_xxl_fp16.safetensors"
VAE_MODEL         = "wan_2.1_vae.safetensors"
CLIP_TEXT_ENCODER = "open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors"

# Every style now has proper HIGH + LOW pair
LORA_FILES = {
    "missionary": {
        "high": "lora_missionary_high.safetensors",
        "low":  "lora_missionary_low.safetensors",
    },
    "doggy": {
        "high": "lora_doggy_high.safetensors",
        "low":  "lora_doggy_low.safetensors",
    },
    "facial_cumshot": {
        "high": "lora_facial_cumshot_high.safetensors",
        "low":  "lora_facial_cumshot_low.safetensors",
    },
    "undress": {
        "high": "lora_undress_high.safetensors",
        "low":  "lora_undress_low.safetensors",
    },
    "masturbate": {
        "high": "lora_masturbate_high.safetensors",
        "low":  "lora_masturbate_low.safetensors",
    },
    "blowjob": {
        "high": "lora_blowjob_high.safetensors",
        "low":  "lora_blowjob_low.safetensors",
    },
}

EXPLICIT_PRESETS = [
    {
        "name": "doggy",
        "tailored_keywords": [
            # English
            "doggy", "doggystyle", "doggy style", "from behind", "doggie",
            "prone bone", "bent over", "ass up", "on all fours", "rear entry", "behind",
            # Spanish
            "perrito", "estilo perrito", "doggy", "de perrito", "por detrás", "de espaldas",
            "inclinada", "culo arriba", "a cuatro patas", "entrada trasera", "detrás",
            # Arabic
            "كلب", "دوغي", "دوغي ستايل", "من الخلف", "من الوراء", "على أربع",
            "منحنية", "الطيز لفوق", "دخول من الخلف", "خلف",
            # Hindi
            "डॉगी", "डॉगीस्टाइल", "डॉगी स्टाइल", "पीछे से", "डॉगी",
            "प्रोन बोन", "झुकी हुई", "गांड ऊपर", "चारों पर", "पीछे से प्रवेश", "पीछे",
            # Urdu
            "ڈوگی", "ڈوگی اسٹائل", "ڈوگی سٹائل", "پیچھے سے", "ڈوگی",
            "جھکی ہوئی", "گانڈ اوپر", "چاروں پر", "پیچھے سے دخول", "پیچھے",
            # Bengali
            "ডগি", "ডগিস্টাইল", "ডগি স্টাইল", "পিছন থেকে", "ডগি",
            "ঝুঁকে", "পাছা উপরে", "চার পায়ে", "পিছন থেকে প্রবেশ", "পিছনে",
            # Russian
            "догги", "доггистайл", "догги стайл", "сзади", "догги",
            "на четвереньках", "нагнутая", "попа вверх", "вход сзади", "сзади",
            # Portuguese
            "cachorrinho", "estilo cachorrinho", "doggy", "de quatro", "por trás",
            "curvada", "bunda pra cima", "de four", "entrada traseira", "atrás"
        ],
        "lora_key": "doggy",
        "strength": 0.90,
        "scheduler": "unipc",
        "steps_high": 3,
        "steps_low": 5,
        "shift": 2.0,
        "end_latent_strength": 0.30,
        "before": "The video begins with a shot of a woman. The video then jumpcuts to the same woman now having sex in doggystyle position. She is positioned kneeling in the same location the video is shot from behind as she looks back at the camera with an open mouth expression. He penetrates her vagina from behind. Her legs are close together with the man kneeling behind her over her legs. The man has a wide stance, ",
        "after": ", powerful deep thrusting, realistic body movement, soft skin jiggle, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "missionary",
        "tailored_keywords": [
            # English
            "missionary", "missionary sex", "man on top", "on her back",
            "legs spread", "facing each other",
            "being fucked", "getting fucked", "fucked hard", "pounded", "railed",
            "having sex", "making love", "sexing", "fucked", "fuck",
            "sex", "penetration", "thrusting",
            # Spanish
            "misionero", "sexo misionero", "hombre encima", "acostada de espalda",
            "piernas abiertas", "cara a cara",
            "siendo follada", "follada", "follada duro", "martillada", "cogida",
            "teniendo sexo", "haciendo el amor", "follando", "follada", "follar",
            "sexo", "penetración", "embestidas",
            # Arabic
            "التبشيرية", "جنس تبشيري", "الرجل فوق", "على ظهرها",
            "الأرجل مفتوحة", "وجها لوجه",
            "بتنتك", "بتنتك جامد", "متناكه", "متناكه جامد",
            "بيعملوا جنس", "بيعملوا حب", "جنس", "نيك", "تغلغل", "طعن",
            # Hindi
            "मिशनरी", "मिशनरी सेक्स", "मर्द ऊपर", "पीठ के बल",
            "पैर फैलाए", "आमने सामने",
            "चोदा जा रहा", "चोदा", "जोर से चोदा", "कूटा", "रेल किया",
            "सेक्स कर रहे", "प्यार कर रहे", "सेक्सिंग", "चोदा", "चोद",
            "सेक्स", "पेनिट्रेशन", "धक्का",
            # Urdu
            "مشنری", "مشنری سیکس", "مرد اوپر", "پیٹھ کے بل",
            "ٹانگیں پھیلا کر", "آمنے سامنے",
            "چودا جا رہا", "چودا", "زور سے چودا", "کوٹا", "ریل کیا",
            "سیکس کر رہے", "پیار کر رہے", "سیکسنگ", "چودا", "چود",
            "سیکس", "دخول", "دھکا",
            # Bengali
            "মিশনারি", "মিশনারি সেক্স", "পুরুষ উপরে", "পিঠের উপর",
            "পা ছড়িয়ে", "মুখোমুখি",
            "চোদা হচ্ছে", "চোদা", "জোরে চোদা", "পেটানো", "রেল করা",
            "সেক্স করছে", "ভালোবাসা করছে", "সেক্সিং", "চোদা", "চোদ",
            "সেক্স", "প্রবেশ", "ঠেলা",
            # Russian
            "миссионерская", "миссионерский секс", "мужчина сверху", "на спине",
            "ноги раздвинуты", "лицом к лицу",
            "ебут", "трахают", "жестко ебут", "долбят", "рельсят",
            "занимаются сексом", "занимаются любовью", "секс", "ебут", "ебать",
            "секс", "проникновение", "толчки",
            # Portuguese
            "missionário", "sexo missionário", "homem por cima", "de barriga pra cima",
            "pernas abertas", "cara a cara",
            "sendo fodida", "fodida", "fodida forte", "metida", "arrombada",
            "fazendo sexo", "fazendo amor", "transando", "fodida", "foder",
            "sexo", "penetração", "estocadas"
        ],
        "lora_key": "missionary",
        "strength": 0.90,
        "scheduler": "unipc",
        "steps_high": 3,
        "steps_low": 5,
        "shift": 2.0,
        "end_latent_strength": 0.3,
        "before": "The video begins with a close-up of a woman. The video then jumpcuts to the same woman now having sex in missionary position. She is lying on her back on a bed with a patterned bed spread and pillow with her legs spread with her knees to her chest. A man's large penis is visible entering her vagina from below. The man is positioned kneeling between her legs infront of her thrusting his penis into her vagina. Throughout the scene, she appears to be experiencing pleasure, often with her mouth open or eyes closed as she lies back. Her hands hold onto her thighs spreading her legs, ",
        "after": ", strong deep thrusting rhythm, realistic body bounce, soft skin movement, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, deep shadows, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "facial_cumshot",
        "tailored_keywords": [
            # English
            "cumshot", "cum on face", "facial", "semen", "covered in cum", "cum",
            "cum on tits", "facial cumshot", "cum across face", "cum on her face",
            # Spanish
            "corrida", "leche en la cara", "facial", "semen", "cubierta de leche", "leche",
            "leche en las tetas", "corrida facial", "leche en toda la cara", "leche en su cara",
            # Arabic
            "قذف", "مني على الوجه", "فشيال", "مني", "مغطاة بالمني", "مني",
            "مني على الصدر", "قذف على الوجه", "مني على وشها", "مني على وجهها",
            # Hindi
            "कमशॉट", "चेहरे पर पानी", "फेसियल", "वीर्य", "वीर्य से ढकी", "पानी",
            "स्तनों पर पानी", "फेसियल कमशॉट", "चेहरे पर वीर्य", "उसके चेहरे पर पानी",
            # Urdu
            "کم شاٹ", "چہرے پر پانی", "فیسियल", "منی", "منی سے ڈھکی", "پانی",
            "چھاتیوں پر پانی", "فیسियल کم شاٹ", "چہرے پر منی", "اس کے چہرے پر پانی",
            # Bengali
            "কামশট", "মুখে বীর্য", "ফেসিয়াল", "বীর্য", "বীর্যে ঢাকা", " Cum",
            "বুকে বীর্য", "ফেসিয়াল কামশট", "মুখে বীর্য", "তার মুখে বীর্য",
            # Russian
            "камшот", "кончил на лицо", "фейшал", "сперма", "в сперме", "кончил",
            "сперма на сиськи", "фейшал камшот", "сперма на лице", "кончил ей на лицо",
            # Portuguese
            "gozada", "porra na cara", "facial", "sêmen", "coberta de porra", "porra",
            "porra nos peitos", "gozada facial", "porra no rosto", "porra na cara dela"
        ],
        "lora_key": "facial_cumshot",
        "strength": 0.90,
        "scheduler": "unipc",
        "steps_high": 3,
        "steps_low": 5,
        "shift": 3.0,
        "end_latent_strength": 0.3,
        "before": "f4c3spl4sh, the scenes starts with the camera zooming out revealing a cinematic scene with a woman in the frame with a man entering from the right side, only his lower body is visible, side view of his hips, thighs and legs, with a gigantic erected penis with testicles. She starts recieving a cumshot on her face from the penis. The stream of semen is directed towards her mouth. The force of the ejaculation is strong, and the trajectory of the semen is aimed directly at her open mouth. The quantity of semen is substantial, covering a significant portion of her face and neck area. The woman's eyes are open, and her mouth is slightly open as she receives the semen. The camera is positioned close to the woman's face and chest, capturing the moment of male ejaculation directly onto her face and chest. The semen is seen forcefully erupting from the penis and landing on her skin, creating a visible pool of semen on her chest, ",
        "after": ", realistic cum splatter and dripping, continuous spurting motion, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, deep shadows, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "undress",
        "tailored_keywords": [
            # English
            "undress", "remove clothes", "take off clothes", "strip", "naked", "nude", "desnuda", "remove her",
            "no clothes", "completely naked", "make her naked", "remove clothing", "strip her",
            # Spanish
            "desnud", "quitar la ropa", "quitarle la ropa", "desvestir", "desnuda", "nuda", "desnuda", "quítales",
            "sin ropa", "completamente desnuda", "házla desnuda", "quitar la ropa", "desvístela",
            # Arabic
            "عرّي", "شيل الهدوم", "اخلعي الهدوم", "تعري", "عريانة", "عارية", "عرّيها",
            "من غير هدوم", "عريانة تماما", "خليها عريانة", "شيل الملابس", "عرّيها",
            # Hindi
            "कपड़े उतारो", "कपड़े हटाओ", "कपड़े निकालो", "स्ट्रिप", "नंगा", "नग्न", "नंगी", "हटाओ",
            "बिना कपड़ों के", "पूरी नंगी", "उसे नंगा करो", "कपड़े हटाओ", "स्ट्रिप करो",
            # Urdu
            "کپڑے اتارو", "کپڑے ہٹاؤ", "کپڑے نکالو", "سٹریپ", "ننگا", "ننگا", "ننگی", "ہٹاؤ",
            "بغیر کپڑوں کے", "پوری ننگی", "اسے ننگا کرو", "کپڑے ہٹاؤ", "سٹریپ کرو",
            # Bengali
            "জামাকাপড় খোলো", "কাপড় খুলে ফেলো", "কাপড় সরাও", "স্ট্রিপ", "নগ্ন", "নগ্ন", "নগ্না", "সরাও",
            "কাপড় ছাড়া", "সম্পূর্ণ নগ্ন", "তাকে নগ্ন করো", "কাপড় খোলো", "স্ট্রিপ করো",
            # Russian
            "раздень", "сними одежду", "сними вещи", "раздеть", "голая", "обнаженная", "голая", "сними с неё",
            "без одежды", "полностью голая", "сделай её голой", "сними одежду", "раздень её",
            # Portuguese
            "tira a roupa", "remove a roupa", "tira as roupas", "despir", "nua", "pelada", "nua", "tira dela",
            "sem roupa", "completamente nua", "deixa ela nua", "remove a roupa", "despir ela"
        ],
        "lora_key": "undress",
        "strength": 0.90,
        "scheduler": "euler",
        "steps_high": 3,
        "steps_low": 5,
        "shift": 3.0,
        "end_latent_strength": 0.30,
        "before": "The video begins with a woman. The video then jumpcuts to same woman standing fully nude. The camera remains static throughout the scene. She looks at the camera the entire time, ",
        "after": ", photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, smooth realistic skin texture"
    },
    {
        "name": "masturbate",
        "tailored_keywords": [
            # English
            "masturbate", "masturbation", "touch herself", "finger herself", "rub her pussy", "fingering", "finger",
            "play with herself", "self pleasure", "fingering herself",
            # Spanish
            "masturbarse", "masturbación", "tocarse", "meterse los dedos", "frotarse el coño", "dedos", "dedo",
            "jugar consigo misma", "placerse", "dedos en ella",
            # Arabic
            "تستمني", "استمناء", "تتحسس نفسها", "تحط صوابعها", "تفرك كسها", "صوابع", "صباع",
            "تلعب بنفسها", "متعة ذاتية", "صوابعها في كسها",
            # Hindi
            "हस्तमैथुन", "हस्तमैथुन", "खुद को छूना", "उंगली करना", "चूत रगड़ना", "उंगली", "उंगली",
            "खुद से खेलना", "स्वयं आनंद", "उंगली करना",
            # Urdu
            "مشت زنی", "مشت زنی", "اپنے آپ کو چھونا", "انگلی کرنا", "چوت رگڑنا", "انگلی", "انگلی",
            "اپنے ساتھ کھیلنا", "خود لذت", "انگلی کرنا",
            # Bengali
            "হস্তমৈথুন", "হস্তমৈথুন", "নিজেকে স্পর্শ", "আঙুল করা", "চোদা ঘষা", "আঙুল", "আঙুল",
            "নিজের সাথে খেলা", "স্ব-সুখ", "আঙুল করা",
            # Russian
            "мастурбирует", "мастурбация", "трогает себя", "пальчиками", "трёт киску", "пальцы", "палец",
            "играет с собой", "самоудовлетворение", "пальчики в киске",
            # Portuguese
            "se masturbar", "masturbação", "se tocar", "meter o dedo", "esfregar a buceta", "dedo", "dedos",
            "brincar consigo mesma", "auto prazer", "dedando ela"
        ],
        "lora_key": "masturbate",
        "strength": 0.90,
        "scheduler": "unipc",
        "steps_high": 3,
        "steps_low": 5,
        "shift": 3.0,
        "end_latent_strength": 0.30,
        "before": "The video begins with a woman. The video then jumpcuts to the same woman masturbating while lying down on her back. The camera is positioned at a low angle between her legs. She is nude and uses her right hand to vigorously rub her clitoris. Her mouth is open and her expression indicates pleasure. She looks directly at the camera the entire time, ",
        "after": ", realistic finger movement, soft body reactions, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, smooth realistic skin texture, natural motion blur"
    },
    {
        "name": "blowjob",
        "tailored_keywords": [
            # English
            "sucking", "blowjob", "blow job", "deepthroat", "deep throat", "suck", "chock on",
            "facefuck", "face fuck", "oral", "cocksucking", "throat fuck", "irrumatio",
            # Spanish
            "chupando", "mamada", "blowjob", "deepthroat", "garganta profunda", "chupar", "ahogarse",
            "facefuck", "follar la cara", "oral", "chupar la polla", "follar la garganta", "irrumatio",
            # Arabic
            "بتمص", "مص", "بلو جوب", "ديب ثروت", "بلع الزب", "تمص", "بتشرق",
            "نيك الوجه", "نيك الوش", "فموي", "مص الزب", "نيك الحلق",
            # Hindi
            "चूसना", "ब्लो जॉब", "ब्लो जॉब", "डीप थ्रोट", "गला तक", "चूसो", "घुट",
            "फेस फक", "चेहरा चोदो", "ओरल", "लंड चूसना", "गला चोदो",
            # Urdu
            "چوسنا", "بلو جاب", "بلو جاب", "ڈیپ تھروٹ", "گلا تک", "چوسو", "گلا گھٹنا",
            "فیس فک", "چہرہ چودو", "اورل", "لنڈ چوسنا", "گلا چودو",
            # Bengali
            "চুষছে", "ব্লোজব", "ব্লো জব", "ডিপ থ্রোট", "গলা পর্যন্ত", "চুষো", "গলায় আটকানো",
            "ফেস ফাক", "মুখ চোদা", "ওরাল", "লন্ড চোষা", "গলা চোদা",
            # Russian
            "сосёт", "минет", "блуджоб", "диптроут", "глубокий минет", "сосать", "давится",
            "фейсфак", "в лицо", "оральный", "сосет хуй", "в горло",
            # Portuguese
            "chupando", "boquete", "blowjob", "deepthroat", "garganta profunda", "chupar", "engasgar",
            "facefuck", "foder a cara", "oral", "chupar o pau", "foder a garganta"
        ],
        "lora_key": "blowjob",
        "strength": 0.90,
        "scheduler": "unipc",
        "steps_high": 3,
        "steps_low": 5,
        "shift": 2.0,
        "end_latent_strength": 0.30,
        "before": "A woman looking at the camera. The video then jumpcuts to the same woman giving a blowjob to one man standing in the same location, looking up as she performs the blowjob on the black man, she is kneeling in front of him, she is holding his penis with both hands. she looks at the camera the entire time. she shoves the penis deep in her mouth, ",
        "after": ", gentle realistic sucking motion, photorealistic video, best quality, 8k, sharp focus, intricate details, ultra realistic, flawless anatomy, cinematic lighting, warm highlights, deep shadows, smooth realistic skin texture, natural motion blur"
    },
]

comfyui_process = None

def get_explicit_preset(user_prompt: str):
    prompt_lower = user_prompt.lower()
    for preset in EXPLICIT_PRESETS:
        if any(kw in prompt_lower for kw in preset["tailored_keywords"]):
            return preset
    # fallback to missionary
    for preset in EXPLICIT_PRESETS:
        if preset["name"] == "missionary":
            return preset
    return EXPLICIT_PRESETS[0]

def start_comfyui():
    global comfyui_process
    print("Starting ComfyUI...")
    comfyui_process = subprocess.Popen(
        ["python", "main.py", "--listen", "127.0.0.1", "--port", "8188",
         "--disable-auto-launch", "--gpu-only"],
        cwd=COMFYUI_DIR,
    )
    import socket
    for i in range(150):
        try:
            sock = socket.create_connection(("127.0.0.1", 8188), timeout=2)
            sock.close()
            print(f"ComfyUI ready ({i*2}s)")
            return
        except (socket.error, ConnectionRefusedError):
            pass
        time.sleep(2)
    raise RuntimeError("ComfyUI failed to start within 300s")

def duration_to_frames(duration_sec):
    frames = int(float(duration_sec) * 12)
    return max(17, (frames // 8) * 8 + 1)

def build_prompt(user_prompt, preset, character=None):
    char = ""
    if character:
        char = f"{character.get('name','')}, {character.get('race','')} woman, {character.get('body_type','').replace('_',' ')}, "
    return f"{char}{preset['before']}{user_prompt}{preset['after']}"

def build_negative():
    return "static, frozen, no motion, watermark, text, logo, blurry, low quality, bad anatomy, deformed, ugly, flicker, distorted, pixelated, yellow tint, oversaturated, melting, gummy, fused, fused genitals, cock melting into pussy, twisted neck, broken neck, unnatural head turn, deformed penis, melted cock"

def get_image_dimensions(img_bytes):
    """Return width, height rounded to multiple of 16, capped for safety."""
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    w, h = img.size

    w = max(16, (w // 16) * 16)
    h = max(16, (h // 16) * 16)

    max_dim = 768
    if w > max_dim or h > max_dim:
        scale = max_dim / max(w, h)
        w = max(16, int(w * scale) // 16 * 16)
        h = max(16, int(h * scale) // 16 * 16)

    return w, h

def upload_image(base64_or_url):
    if base64_or_url.startswith("http"):
        r = requests.get(base64_or_url, timeout=30)
        r.raise_for_status()
        img_bytes = r.content
    else:
        data = base64_or_url.split(",")[1] if "," in base64_or_url else base64_or_url
        data = data.strip()
        pad = 4 - len(data) % 4
        if pad != 4:
            data += "=" * pad
        img_bytes = base64.b64decode(data)

    width, height = get_image_dimensions(img_bytes)

    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    filename = f"input_{uuid.uuid4().hex}.png"
    r = requests.post(
        f"{COMFYUI_URL}/upload/image",
        files={"image": (filename, buf.getvalue(), "image/png")},
        data={"overwrite": "true"},
    )
    r.raise_for_status()
    return r.json()["name"], width, height

def build_i2v_workflow(prompt, negative, width, height, num_frames, preset, image_filename):
    lora_key = preset["lora_key"]
    lora_strength = preset["strength"]
    scheduler = preset["scheduler"]
    steps_high = preset.get("steps_high", 4)
    steps_low = preset.get("steps_low", 6)
    shift = preset.get("shift", 5.0)
    end_latent_strength = preset.get("end_latent_strength", 0.3)

    # Randomized seed every run
    seed = random.randint(0, 2**32 - 1)

    p = {
        "t5": {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {"model_name": T5_ENCODER, "precision": "bf16"}
        },
        "text": {
            "class_type": "WanVideoTextEncode",
            "inputs": {
                "t5": ["t5", 0],
                "positive_prompt": prompt,
                "negative_prompt": negative,
                "force_offload": True,
            }
        },
        "vae": {
            "class_type": "WanVideoVAELoader",
            "inputs": {"model_name": VAE_MODEL, "precision": "bf16"}
        },
        "clip_loader": {
            "class_type": "LoadWanVideoClipTextEncoder",
            "inputs": {"model_name": CLIP_TEXT_ENCODER, "precision": "bf16"}
        },
        "load_image": {
            "class_type": "LoadImage",
            "inputs": {"image": image_filename}
        },
        "clip_encode": {
            "class_type": "WanVideoClipVisionEncode",
            "inputs": {
                "clip_vision": ["clip_loader", 0],
                "image_1": ["load_image", 0],
                "strength_1": 1.0,
                "strength_2": 1.0,
                "force_offload": True,
                "crop": "center",
                "combine_embeds": "average",
            }
        },
        "img_encode": {
            "class_type": "WanVideoImageToVideoEncode",
            "inputs": {
                "vae": ["vae", 0],
                "start_image": ["load_image", 0],
                "width": width,
                "height": height,
                "num_frames": num_frames,
                "force_offload": True,
                "start_latent_strength": 1.0,
                "end_latent_strength": end_latent_strength,
                "noise_aug_strength": 0.0,
            }
        },
        "model_high": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": I2V_HIGH,
                "base_precision": "bf16",
                "quantization": "fp8_e4m3fn",
                "load_device": "main_device",
            }
        },
        "model_low": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": I2V_LOW,
                "base_precision": "bf16",
                "quantization": "fp8_e4m3fn",
                "load_device": "main_device",
            }
        },

        # Stage 1 – High noise
        "sampler_high": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["model_high", 0],
                "text_embeds": ["text", 0],
                "image_embeds": ["img_encode", 0],
                "width": width,
                "height": height,
                "num_frames": num_frames,
                "steps": steps_high,
                "cfg": 1.0,
                "seed": seed,
                "shift": shift,
                "riflex_freq_index": 0,
                "scheduler": scheduler,
                "force_offload": True,
            }
        },

        # Stage 2 – Low noise
        "sampler_low": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["model_low", 0],
                "text_embeds": ["text", 0],
                "image_embeds": ["img_encode", 0],
                "width": width,
                "height": height,
                "num_frames": num_frames,
                "steps": steps_low,
                "cfg": 1.0,
                "seed": seed,
                "shift": shift,
                "riflex_freq_index": 0,
                "scheduler": scheduler,
                "force_offload": True,
            }
        },

        "decode": {
            "class_type": "WanVideoDecode",
            "inputs": {
                "vae": ["vae", 0],
                "samples": ["sampler_low", 0],
                "enable_vae_tiling": True,
                "tile_sample_min_height": 272,
                "tile_sample_min_width": 272,
                "tile_overlap_factor_height": 0.2,
                "tile_overlap_factor_width": 0.2,
                "auto_tile_size": True,
                "tile_x": 80,
                "tile_y": 80,
                "tile_stride_x": 40,
                "tile_stride_y": 40,
            }
        },
        "export": {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images": ["decode", 0],
                "frame_rate": 12,
                "loop_count": 0,
                "filename_prefix": "nudely",
                "format": "video/h264-mp4",
                "save_output": True,
                "pingpong": False,
            }
        }
    }

    # Dual Lightning
    p["lora_lightning_high"] = {
        "class_type": "WanVideoLoraSelect",
        "inputs": {"lora": "lora_lightning_high.safetensors", "strength": 1.0}
    }
    p["lora_lightning_low"] = {
        "class_type": "WanVideoLoraSelect",
        "inputs": {"lora": "lora_lightning_low.safetensors", "strength": 0.75}
    }

    # Proper HIGH / LOW style LoRA application
    style = LORA_FILES.get(lora_key)
    if style:
        p["lora_style_high"] = {
            "class_type": "WanVideoLoraSelect",
            "inputs": {
                "lora": style["high"],
                "strength": lora_strength,
                "prev_lora": ["lora_lightning_high", 0],
            }
        }
        p["lora_style_low"] = {
            "class_type": "WanVideoLoraSelect",
            "inputs": {
                "lora": style["low"],
                "strength": lora_strength,
                "prev_lora": ["lora_lightning_low", 0],
            }
        }
        p["model_high"]["inputs"]["lora"] = ["lora_style_high", 0]
        p["model_low"]["inputs"]["lora"] = ["lora_style_low", 0]
    else:
        p["model_high"]["inputs"]["lora"] = ["lora_lightning_high", 0]
        p["model_low"]["inputs"]["lora"] = ["lora_lightning_low", 0]

    return {"prompt": p}

def queue_workflow(workflow):
    r = requests.post(f"{COMFYUI_URL}/prompt", json=workflow, timeout=30)
    r.raise_for_status()
    return r.json()["prompt_id"]

def wait_for_result(prompt_id, timeout=900):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10)
            if r.status_code == 200:
                history = r.json()
                if prompt_id in history:
                    job = history[prompt_id]
                    status = job.get("status", {})
                    if status.get("completed"):
                        outputs = job.get("outputs", {})
                        for node_id, out in outputs.items():
                            if "gifs" in out:
                                for gif in out["gifs"]:
                                    return gif["filename"], gif.get("subfolder", "")
                        raise RuntimeError("Job completed but no video in outputs")
                    if status.get("status_str") == "error":
                        raise RuntimeError(f"ComfyUI job failed: {status.get('messages')}")
        except requests.RequestException:
            pass
        time.sleep(2)
    raise RuntimeError(f"Timed out after {timeout}s")

def fetch_video(filename, subfolder=""):
    params = {"filename": filename, "type": "output"}
    if subfolder:
        params["subfolder"] = subfolder
    r = requests.get(f"{COMFYUI_URL}/view", params=params, timeout=60)
    r.raise_for_status()
    return r.content

def handler(job):
    try:
        inp = job["input"]
        user_prompt   = inp.get("prompt", "")
        duration_sec  = float(inp.get("duration", 6))
        start_image   = inp.get("start_image", None)
        character     = inp.get("character", None)

        if not start_image:
            return {"error": "start_image is required for image-to-video"}

        preset = get_explicit_preset(user_prompt)
        print(f"→ Style selected: {preset['name']} (LoRA: {preset['lora_key']}, scheduler: {preset['scheduler']})")

        runpod.serverless.progress_update(job, "UPLOADING_IMAGE")
        image_filename, width, height = upload_image(start_image)
        print(f"→ Using reference dimensions: {width}x{height}")

        num_frames = duration_to_frames(duration_sec)
        positive   = build_prompt(user_prompt, preset, character)
        negative   = build_negative()

        runpod.serverless.progress_update(job, "BUILDING_WORKFLOW")
        workflow = build_i2v_workflow(
            positive, negative, width, height,
            num_frames, preset, image_filename
        )

        runpod.serverless.progress_update(job, "GENERATING_VIDEO")
        prompt_id = queue_workflow(workflow)
        filename, subfolder = wait_for_result(prompt_id)

        print(f"Video ready: {filename} (subfolder: {subfolder})")

        runpod.serverless.progress_update(job, "ENCODING_VIDEO")
        video_bytes = fetch_video(filename, subfolder)
        video_b64 = base64.b64encode(video_bytes).decode()

        return {"video": f"data:video/mp4;base64,{video_b64}"}

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

print("Starting ComfyUI (Wan 2.2 + Dual Lightning – 6 styles + HIGH/LOW pairs + Multi-language)...")
start_comfyui()
print("Ready for jobs.")
runpod.serverless.start({"handler": handler})
