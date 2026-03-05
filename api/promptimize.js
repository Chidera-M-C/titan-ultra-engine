import Groq from "groq-sdk";

const styleCategories = {
  "missionary_style": ["missionary position", "legs spread wide", "deep vaginal penetration", "legs over shoulders", "mating press", "eye contact fucking", "breeding press", "intimate face-to-face", "pillow under hips", "slow deep thrusts"],
  "doggy_style": ["doggy style", "ass up face down", "backshots", "deep penetration from behind", "hair pulling", "arched back", "waist gripped", "spanked ass", "pounding doggy", "face down ass up"],
  "female_nude_portrait": ["artistic female nude", "seductive nude portrait", "elegant nude pose", "bare breasts focus", "detailed shaved pussy", "standing graceful nude", "lying on back nude", "soft studio lighting nude", "contrapposto nude", "boudoir nude"],
  "male_nude_portrait": ["artistic male nude", "seductive male portrait", "muscular bare body", "detailed penis", "standing male nude", "lying nude male", "masculine erotic pose", "soft studio male nude", "confident male form"],
  "ass_fucking": ["prone bone", "ass up face down", "deep anal penetration", "stretched asshole", "gaping anus", "balls deep anal", "rough backshots", "anal creampie dripping", "lubed glistening asshole", "raw anal pounding"],
  "dick_sucking": ["deepthroat", "throat bulge", "sloppy blowjob", "gagging on cock", "tears from deepthroat", "eye contact blowjob", "tongue out ahegao sucking", "throat fucking", "cum in mouth", "balls deep oral"],
  "threesome_2male": ["double penetration", "spitroast", "one in mouth one in pussy", "dp", "two men one girl", "airtight", "sandwiched", "double vaginal", "mmf threesome"],
  "threesome_2females": ["ffm threesome", "two girls one guy", "double blowjob", "one cock two mouths", "girl riding while kissing", "lesbian action with cock", "double female oral"],
  "pussy_eating": ["face sitting", "cunnilingus", "tongue deep in pussy", "clit sucking", "pussy eating from behind", "legs shaking orgasm", "squirting on face", "wet pussy licked"],
  "boobs_sucking": ["nipple sucking", "breast worship", "tongue on nipples", "boob sucking", "puffy nipples sucked", "milk leaking", "tit sucking hard"],
  "lesbian_sex": ["scissoring", "tribbing", "69 lesbian", "lesbian cunnilingus", "strap-on lesbian", "pussy grinding", "breast sucking lesbian"],
  "homosexual_sex": ["gay anal", "male on male", "cock in ass gay", "deep gay anal", "gay missionary", "rimming", "gay blowjob"],
  "trans_sex": ["trans woman with cock", "futanari sex", "ladyboy anal", "girl with dick fucking", "trans blowjob", "shemale penetration"],
  "rape": ["non-consensual", "pinned down", "forced penetration", "crying during sex", "struggling", "fearful expression", "held down", "rough forced"]
};

const camera_angle = {
  "high_angle": ["high angle shot", "overhead view", "bird's eye view", "top down angle", "looking down", "aerial perspective", "high angle full body", "dramatic high angle", "god's eye view", "tilted high angle"],
  "low_angle": ["low angle shot", "worm's eye view", "looking up", "heroic low angle", "dramatic upward angle", "feet level view", "powerful low angle", "ground level shot", "upward perspective", "extreme low angle"],
  "eye_level": ["eye level shot", "straight on view", "neutral angle", "direct eye contact angle", "level camera", "realistic eye level", "frontal eye level", "natural perspective", "standard angle", "conversational eye level"],
  "dutch_angle": ["dutch angle", "tilted camera", "canted angle", "diagonal composition", "slanted perspective", "dramatic tilt", "unstable angle", "cinematic dutch tilt", "off-kilter shot", "dynamic tilt"],
  "over_shoulder": ["over the shoulder shot", "OTS view", "behind shoulder perspective", "partial back view", "shoulder framing", "intimate over shoulder", "conversation OTS", "viewer behind character"]
};

const camera_perspective = {
  "character_perspective": ["POV", "first person view", "through the eyes of the character", "subjective camera", "immersive POV", "point of view shot", "viewer is the participant", "self insert POV", "intimate POV", "handheld POV"],
  "cameraman_perspective": ["third person view", "over the shoulder shot", "behind the character shot", "following shot", "external perspective", "objective camera", "wide scene view", "cinematic third person", "tracking shot", "side profile perspective"]
};

const camera_lens_length = {
  "close_shot": ["close-up shot", "extreme close-up", "tight close-up on face", "macro shot", "detailed close-up", "intimate close-up", "face focus close-up", "extreme close on eyes", "close-up on body part", "tight framing"],
  "medium_shot": ["medium shot", "waist-up shot", "medium close-up", "upper body focus", "torso shot", "half-body shot", "medium framing", "chest up view", "balanced medium shot", "conversational medium"],
  "full_shot": ["full body shot", "long shot", "full figure", "head to toe shot", "wide full body", "complete body view", "full length shot", "standing full shot", "environmental full body", "distant full shot"]
};

const genderCategories = {
  "Straight": ["1girl", "1man", "1girl, 1man", "1girl, 2men", "2girls, 1man", "2men", "2girls", "1boy", "1woman"],
  "Trans": ["futanari", "1transwoman", "1transman", "shemale", "ladyboy", "newhalf", "futa", "trans female with penis", "trans male", "hermaphrodite", "dickgirl", "transgirl"]
};

const raceCategories = {
  "american_female": ["caucasian", "fair skin", "blue eyes", "blonde hair", "slender build", "european features", "high cheekbones", "straight nose", "light brown hair", "green eyes", "freckles", "athletic american", "curvy american woman", "pale skin", "redhead", "sharp jawline", "long wavy hair", "american beauty", "youthful caucasian", "detailed american face"],
  "american_male": ["caucasian male", "fair skin", "blue eyes", "short hair", "strong jawline", "muscular build", "light stubble", "straight nose", "athletic american man", "confident american male", "brown hair", "tall slender", "sharp features", "clean shaven", "light skin tone", "american hunk", "detailed american male face", "broad shoulders"],
  "asian_female": ["asian", "east asian features", "almond shaped eyes", "black hair", "pale smooth skin", "petite face", "straight black hair", "delicate features", "porcelain skin", "slender asian build", "dark brown eyes", "high cheekbones", "small nose", "silky hair", "youthful asian beauty", "smooth skin", "elegant asian woman", "detailed asian face"],
  "asian_male": ["asian male", "east asian features", "black hair", "sharp eyes", "slim build", "clean cut", "high cheekbones", "straight black hair", "smooth skin", "athletic asian man", "detailed asian male face", "confident asian male"],
  "arabic_female": ["arabic woman", "middle eastern beauty", "dark expressive eyes", "olive skin", "long dark hair", "exotic features", "thick eyebrows", "warm skin tone", "full lips", "curvy figure", "high cheekbones", "elegant arabic beauty", "detailed arabic face", "silky black hair"],
  "arabic_male": ["arabic man", "middle eastern features", "olive skin", "dark hair", "strong nose", "beard possible", "expressive eyes", "warm skin tone", "muscular build", "confident arabic male"],
  "egyptian_female": ["egyptian woman", "north african features", "warm olive skin", "dark almond eyes", "long dark hair", "exotic egyptian beauty", "high cheekbones", "full lips", "smooth skin", "elegant egyptian woman"],
  "egyptian_male": ["egyptian man", "north african male", "olive skin", "dark features", "strong jaw", "dark hair", "expressive eyes"],
  "hispanic_female": ["latina", "hispanic woman", "tanned skin", "curvy body", "dark wavy hair", "full lips", "expressive eyes", "latina beauty", "golden brown skin", "voluptuous figure", "long dark hair", "warm tan skin", "high cheekbones", "detailed latina face"],
  "latina_female": ["latina beauty", "hispanic features", "curvy figure", "long dark hair", "warm tan skin", "full lips", "expressive brown eyes", "voluptuous latina", "golden skin", "detailed latina face"],
  "african_female": ["black woman", "dark skin", "african features", "full lips", "coily or braided hair", "beautiful dark skin", "deep brown eyes", "voluptuous", "high cheekbones", "afro hair", "smooth dark skin", "elegant african beauty", "curvy african woman", "detailed african face"],
  "african_male": ["black man", "dark skin", "african male", "muscular build", "short black hair", "strong features", "deep brown eyes", "confident african man"],
  "native_american_female": ["native american woman", "indigenous features", "warm brown skin", "long straight dark hair", "high cheekbones", "earthy beauty", "dark eyes", "smooth skin", "elegant native beauty"],
  "native_american_male": ["native american man", "indigenous male", "strong features", "long hair", "warm brown skin", "high cheekbones"],
  "indian_female": ["indian woman", "south asian beauty", "brown skin", "dark expressive eyes", "long black hair", "traditional beauty", "deep brown eyes", "smooth brown skin", "high cheekbones", "full lips", "elegant indian woman", "silky hair", "detailed indian face"],
  "indian_male": ["indian man", "south asian male", "brown skin", "dark hair", "expressive eyes", "sharp features", "smooth skin"]
};

const settings = {
  "kitchen": ["modern kitchen", "kitchen counter sex", "bent over island", "stainless steel appliances", "marble countertops", "warm kitchen lighting", "wooden cabinets", "bright daylight kitchen", "luxury kitchen", "tiles floor", "standing in kitchen"],
  "livingroom": ["living room", "leather couch sex", "on the sofa", "fireplace background", "modern living room", "carpeted floor", "soft couch", "TV in background", "cozy living room", "bent over sofa", "floor sex livingroom"],
  "bathroom": ["luxury bathroom", "shower sex", "bathtub scene", "steamy bathroom", "mirror reflection", "wet tiles", "bathroom counter", "jacuzzi tub", "marble bathroom", "foggy mirror"],
  "outdoor": ["forest clearing", "public outdoor sex", "beach at night", "city rooftop", "park bench", "mountain view", "woodland path", "sunset outdoor", "rainy outdoor", "wilderness setting"],
  "bedroom": ["luxury bedroom", "silk sheets", "soft bed", "pillows scattered", "bedroom window light", "messy bedsheets", "headboard grip", "nightstand lamp", "cozy bedroom", "king size bed"],
  "diningroom": ["dining room table", "bent over dining table", "luxury dining room", "candlelight dinner", "wooden dining table", "chairs pushed aside", "elegant dining room", "dining chair sex"],
  "toilet": ["bathroom stall", "public toilet sex", "dirty restroom", "standing in toilet", "sink counter sex", "stall door locked", "public restroom"],
  "hospital": ["hospital room", "medical bed", "doctor patient fantasy", "clinical white room", "hospital gown", "monitor beeps background", "sterile hospital lighting", "bedridden scene"]
};

export default async function handler(req, res) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userPrompt } = req.body;
  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing input' });
  }

  const database = JSON.stringify({
    styleCategories,
    camera_angle,
    camera_perspective,
    camera_lens_length,
    genderCategories,
    raceCategories,
    settings
  });

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert SDXL/Flux prompt engineer with a trained Composition Database.

DATABASE (use ONLY this data):
${database}

MANDATORY internal reasoning (never output this):

1. STYLE IS KING — First identify the SINGLE core theme the user wants (non-negotiable). Example: "cute girl getting ass fucked" → core = anal penetration (dick in ass). Match to the best category in styleCategories. Then creatively select exactly 3-5 strongest terms from that category only.

  2. Camera angle: Choose the SINGLE best category from camera_angle that fits the mental image. Pick 1 most relevant term from it.

3. Camera perspective: Choose the SINGLE best category from camera_perspective. Pick exactly 1 term from it.

4. Camera lens length: Choose the SINGLE best category from camera_lens_length that controls closeness. Pick exactly 1 relevant term from it.

5. Gender: Choose the SINGLE best category from genderCategories that matches the subjects. Pick exactly 1 best tag from it.

6. Race: Choose the SINGLE best category from raceCategories that matches the described people. Pick 3-5 most relevant features from it only.

7. Settings: Choose the SINGLE best category from settings that best matches (or intuitively fits) the scene. Pick 5-7 relevant terms from it.

8. Quality: Pick exactly 3-5 terms from: masterpiece, best quality, ultra detailed, photorealistic, 8k raw photo, sharp focus, cinematic lighting, depth of field, intricate details, hyperrealistic.

Build order for the final prompt (comma-separated tags only):
- Camera angle terms first
- Then camera perspective terms
- Then camera lens length terms
- Then gender tag
- Then race features
- Then the 3-5 style terms (central & dominant)
- Then the 5-7 setting terms
- Finally the 3-5 quality terms

Output Rules:
- The overall output should be a comma-separated list of tags, with relevant tags having weights in parentheses.
- Single line only. No explanation, no category name, no quotes, no extra text.
- Stay 100% faithful to core theme.
- Hard cap ~500-520 characters.
- Never add anything not in the user's input or database.`
        },
        { role: "user", content: userPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.65,
      max_tokens: 420,
    });

    const result = completion.choices[0]?.message?.content || "";
    return res.status(200).json({ 
      optimized: result.replace(/^["']|["']$/g, '').trim() 
    });
  } catch (error) {
    console.error("Groq Error:", error);
    return res.status(500).json({ error: "Failed to optimize prompt" });
  }
}
