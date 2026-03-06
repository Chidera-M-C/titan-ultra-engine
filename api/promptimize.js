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
  "rape": ["non-consensual", "pinned down", "forced penetration", "crying during sex", "struggling", "fearful expression", "held down", "rough forced"],
  "standing_doggy_style": ["standing doggy", "bent over standing", "wall pressed doggy", "standing backshots", "upright doggy", "standing anal doggy", "kitchen counter doggy", "standing hair pull", "deep standing penetration", "legs spread standing", "standing creampie", "rough standing doggy", "ass up standing", "wall fuck standing", "standing arched back", "standing waist grip", "public standing doggy", "standing pussy pounding", "standing orgasm", "bent over table doggy"],
  "cowgirl_style": ["cowgirl position", "riding cock", "straddling reverse", "girl on top", "cowgirl bouncing", "deep cowgirl ride", "hands on chest cowgirl", "cowgirl grinding", "slow cowgirl ride", "fast cowgirl bounce", "cowgirl creampie", "reverse cowgirl transition", "cowgirl eye contact", "riding orgasm", "cowgirl tit bounce", "deep cowgirl penetration", "cowgirl ass slap", "riding ahegao", "cowgirl cum drip", "straddling cowgirl"],
  "reverse_cowgirl": ["reverse cowgirl", "ass towards viewer", "back riding", "reverse bouncing", "reverse cowgirl view", "ass clapping reverse", "deep reverse penetration", "reverse cowgirl creampie", "hands on thighs reverse", "reverse grinding", "reverse cowgirl orgasm", "ass focus reverse", "reverse ahegao", "slow reverse ride", "fast reverse bounce", "reverse hair flip", "reverse pussy grip", "reverse anal ride", "back view creampie", "reverse cowgirl squat"],
  "male_masturbation": ["male masturbation", "stroking cock", "handjob solo male", "jerking off", "detailed penis stroke", "cumshot male", "edging male", "slow stroking", "fast jerking", "veiny cock masturbation", "male orgasm face", "cum on abs", "fleshlight male", "ball fondling", "pre-cum dripping", "male ahegao stroke", "prostate milking solo", "thick cum rope", "male self pleasure", "detailed hand on cock"],
  "female_masturbation": ["female masturbation", "fingering pussy", "clit rubbing", "dildo insertion", "solo female orgasm", "squirt masturbation", "legs spread fingering", "vibrator on clit", "detailed wet pussy fingers", "female ahegao solo", "breast squeezing while fingering", "slow pussy rub", "fast clit circles", "dildo deep", "female squirting", "toy in ass and pussy", "mirror masturbation", "female cum drip", "pussy spread masturbation", "orgasm shaking solo"],
  "triple_blowjob": ["triple blowjob", "three girls one cock", "triple oral", "three mouths on cock", "triple deepthroat", "cum on three faces", "triple tongue worship", "three girls sucking balls", "triple handjob blowjob", "triple slobber", "three ahegao mouths", "triple cum swap", "triple throat bulge", "three girls kissing cock", "triple facial", "overloaded oral", "triple cock worship", "three tongues licking", "triple cum dump", "three girls fighting for cock"],
  "cowgirl_anal": ["cowgirl anal", "reverse cowgirl anal", "anal riding", "ass riding cowgirl", "deep anal cowgirl", "anal bounce", "anal creampie cowgirl", "stretched asshole riding", "anal ahegao cowgirl", "slow anal grind", "fast anal bounce", "anal cowgirl view", "ass to pussy cowgirl", "anal orgasm riding", "lubed anal ride", "gaping anal cowgirl", "anal prolapse tease", "cowgirl anal cum drip", "hands on ass anal ride", "deep rectal cowgirl"],
  "titfuck": ["titfuck", "paizuri", "boob job", "breast fucking", "cleavage fuck", "titfuck cumshot", "oiled tits fuck", "big tits paizuri", "nipple tease titfuck", "cum on tits", "deep cleavage stroke", "titfuck ahegao", "slow tit job", "fast tit pounding", "titfuck eye contact", "glistening oiled boobs", "titfuck facial", "breast squeeze fuck", "veiny cock between tits", "cum covered cleavage"],
  "self_nipple_sucking": ["self nipple sucking", "autofellatio breasts", "girl sucking own nipples", "self boob worship", "milk leaking self suck", "flexible nipple suck", "self tit play", "tongue on own nipple", "double nipple suck", "self lactation play", "contorted self suck", "nipple biting solo", "breast worship self", "milky self suck", "detailed tongue on nipple", "self induced lactation", "flexible girl self suck", "nipple orgasm", "heavy breasts self suck", "self nipple tease"],
  "handjob_and_blowjob": ["handjob and blowjob", "hj + bj combo", "stroke and suck", "handjob blowjob combo", "sloppy hand blow", "dual stimulation oral", "handjob with deepthroat", "cum on hand and mouth", "ball massage blowjob", "slow handjob suck", "fast stroking oral", "eye contact hj bj", "messy handjob blow", "veiny cock handjob", "pre-cum handjob", "handjob facial", "blowjob hand twist", "dual hand blowjob", "cum covered hands", "oral handjob finish"],
  "footjob": ["footjob", "feet on cock", "toes stroking", "sole rub cock", "footjob cumshot", "oiled footjob", "high heel footjob", "bare foot stroke", "toe sucking while footjob", "dual footjob", "footjob ahegao", "slow foot rub", "fast footjob", "cum on feet", "detailed toes on cock", "arched footjob", "nylon footjob", "footjob facial", "ball foot massage", "footjob orgasm"],
  "cum_on_face": ["cum on face", "facial cumshot", "bukakke face", "thick cum ropes face", "cum dripping face", "ahegao cum face", "open mouth facial", "eyes closed cum", "messy facial", "cum covered face", "multiple facial", "cum in eyes", "tongue out facial", "glazed face", "cum on cheeks", "post cum face", "heavy facial load", "cum swap facial", "tears with cum", "detailed cum texture"],
  "split_fucking": ["split fucking", "leg split penetration", "full split sex", "standing split fuck", "mating press split", "deep split penetration", "flexible split fucking", "legs behind head fuck", "contortionist sex", "split creampie", "split orgasm", "rough split pound", "slow deep split", "split ahegao", "yoga split sex", "acrobatic split fuck", "pussy split open", "split breeding", "extreme flexibility sex", "split pussy grip"],
  "dick_shot": ["detailed dick close-up", "erect penis portrait", "veiny cock focus", "throbbing dick shot", "hard cock macro", "glistening penis closeup", "detailed shaft and head", "pulsing erection", "cock from below", "side view dick shot", "upward penis angle", "pre-cum dripping cock", "thick veiny dick", "circumcised penis closeup", "uncut foreskin shot", "hard throbbing member", "detailed balls and cock", "moist glans focus", "erect penis macro shot", "cock worship close-up"],
  "cum_on_face_shot": ["cum on face close-up", "facial cumshot macro", "thick ropes on face", "dripping cum facial", "ahegao cum face", "open mouth facial shot", "eyes closed cum covered", "messy glazed face", "cum dripping from chin", "heavy facial load", "tongue out cum facial", "post orgasm cum face", "detailed cum texture face", "bukakke close-up", "cum in eyes shot", "glistening cum on cheeks", "tears mixed with cum", "cum covered lips", "fresh facial macro", "sticky cum on face closeup"]
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

// Strip all object keys — model never sees category names with underscores
function buildAnonymousDatabase(obj) {
  return Object.values(obj).map(v => Array.isArray(v) ? v : Object.values(v));
}

function formatDatabaseForPrompt() {
  return `STYLE OPTIONS (pick one group, 3-5 terms):
${buildAnonymousDatabase(styleCategories).map((g, i) => `[${i + 1}] ${g.join(', ')}`).join('\n')}

CAMERA ANGLE OPTIONS (pick one group, 1 term):
${buildAnonymousDatabase(camera_angle).map((g, i) => `[${i + 1}] ${g.join(', ')}`).join('\n')}

CAMERA PERSPECTIVE OPTIONS (pick one group, 1 term):
${buildAnonymousDatabase(camera_perspective).map((g, i) => `[${i + 1}] ${g.join(', ')}`).join('\n')}

CAMERA LENS OPTIONS (pick one group, 1 term):
${buildAnonymousDatabase(camera_lens_length).map((g, i) => `[${i + 1}] ${g.join(', ')}`).join('\n')}

GENDER OPTIONS (pick one group, 1 term):
${buildAnonymousDatabase(genderCategories).map((g, i) => `[${i + 1}] ${g.join(', ')}`).join('\n')}

RACE OPTIONS (pick one group, 3-5 terms):
${buildAnonymousDatabase(raceCategories).map((g, i) => `[${i + 1}] ${g.join(', ')}`).join('\n')}

SETTING OPTIONS (pick one group, 5-7 terms):
${buildAnonymousDatabase(settings).map((g, i) => `[${i + 1}] ${g.join(', ')}`).join('\n')}`;
}

// ─── CALL 1 SYSTEM PROMPT: pure reasoning only ───────────────────────────────
const REASONING_PROMPT = () => `You are an expert SDXL/Flux prompt engineer analyzing a scene request.

You have access to this composition database (numbered groups — never output group numbers in any result):
${formatDatabaseForPrompt()}

Your job is to THINK THROUGH the scene and decide which terms to use. Work through each step:

1. STYLE IS KING — First identify the SINGLE core theme the user wants (non-negotiable). Example: "cute girl getting ass fucked" → core = anal penetration (dick in ass). Choose the SINGLE best category from styleCategories that fits the input core composition. Pick 3-5 strongest terms from that category ONLY.
2. Camera angle: Choose the SINGLE best category from camera_angle that fits the mental image. Pick 1 most relevant term from it.
3. Camera perspective: Choose the SINGLE best category from camera_perspective. Pick exactly 1 term from it.
4. Camera lens length: Choose the SINGLE best category from camera_lens_length that controls closeness. Pick exactly 1 relevant term from it.
5. Gender: Choose the SINGLE best category from genderCategories that matches the subjects. Pick exactly 1 best tag from it.
6. Race: Choose the SINGLE best category from raceCategories that matches the described people. Pick 3-5 most relevant features from it only.
7. Settings: Choose the SINGLE best category from settings that best matches (or intuitively fits) the scene. Pick 5-7 relevant terms from it.
8. Quality: Pick exactly 3-5 terms from: masterpiece, best quality, ultra detailed, photorealistic, 8k raw photo, sharp focus, cinematic lighting, depth of field, intricate details, hyperrealistic.

Output your reasoning as natural flowing thought. Be thorough. Do NOT output the final prompt here — reasoning only.`;

// ─── CALL 2 SYSTEM PROMPT: final prompt only ─────────────────────────────────
const OUTPUT_PROMPT = `You are an SDXL/Flux prompt builder. You will receive a reasoning analysis and must convert it into a final prompt.

Rules — STRICT:
- Output a single line of comma-separated tags ONLY. DO NOT FUCKING OUTPUT THE REASONING ANALYSIS, ONLY THE FINAL PROMPT
- No explanation, no intro, no labels, no quotes, no numbering, no category names.
- Build order: camera angle term, camera perspective term, camera lens term, gender term, race terms, style terms, setting terms, quality terms.
- Wrap key style tags in parentheses for emphasis e.g. (deep anal penetration).
- Hard cap: 480-500 characters total.
- Use ONLY the terms mentioned in the reasoning — do not invent new ones.
- Your entire response must be the prompt and nothing else.`;

function isRateLimit(error) {
  if (error?.status === 429) return true;
  if (error?.code === 'rate_limit_exceeded') return true;
  if (error?.error?.error?.code === 'rate_limit_exceeded') return true;
  if (typeof error?.message === 'string' && error.message.includes('429')) return true;
  if (typeof error?.message === 'string' && error.message.includes('rate_limit_exceeded')) return true;
  return false;
}

async function tryModels(groq, messages, stream = false) {
  const models = ['llama-3.3-70b-versatile', 'qwen/qwen3-32b'];
  for (let i = 0; i < models.length; i++) {
    try {
      console.log(`Trying model: ${models[i]}`);
      return await groq.chat.completions.create({ messages, model: models[i], temperature: 0.65, max_tokens: 800, stream });
    } catch (err) {
      if (isRateLimit(err) && i < models.length - 1) {
        console.warn(`Rate limited on ${models[i]}, falling back to ${models[i + 1]}`);
        continue;
      }
      throw err;
    }
  }
}

export default async function handler(req, res) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userPrompt } = req.body;
  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing input' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // ── CALL 1: Stream the reasoning (thinking box) ──────────────────────────
    const reasoningMessages = [
      { role: 'system', content: REASONING_PROMPT() },
      { role: 'user', content: userPrompt }
    ];

    const reasoningStream = await tryModels(groq, reasoningMessages, true);
    let reasoningText = '';

    for await (const chunk of reasoningStream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (!delta) continue;
      reasoningText += delta;
      // Send chunks tagged as 'thinking' so client knows which box to fill
      res.write(`data: ${JSON.stringify({ type: 'thinking', chunk: delta })}\n\n`);
    }

    // Signal thinking is done
    res.write(`data: ${JSON.stringify({ type: 'thinking_done' })}\n\n`);

    // ── CALL 2: Generate final prompt from reasoning (no stream — clean output) ──
    const outputMessages = [
      { role: 'system', content: OUTPUT_PROMPT },
      {
        role: 'user',
        content: `Here is the reasoning analysis for the scene "${userPrompt}":\n\n${reasoningText}\n\nNow output the final comma-separated prompt. Single line only, nothing else.`
      }
    ];

    const outputResponse = await tryModels(groq, outputMessages, false);
    const optimized = outputResponse.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || '';

    // Send final result
    res.write(`data: ${JSON.stringify({ type: 'result', optimized })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Promptimize fatal error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to optimize prompt. Please try again.' })}\n\n`);
    res.end();
  }
}
