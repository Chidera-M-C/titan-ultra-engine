import Groq from "groq-sdk";

const styleCategories = {
  "missionary_style": ["missionary position", "legs spread wide", "deep vaginal penetration", "legs over shoulders", "mating press", "eye contact fucking", "breeding press", "intimate face-to-face", "pillow under hips", "slow deep thrusts", "legs wrapped around", "full body contact"],
  "doggy_style": ["doggy style", "ass up face down", "backshots", "deep penetration from behind", "hair pulling", "arched back", "waist gripped", "spanked ass", "pounding doggy", "face down ass up", "hard backshots", "breeding from behind"],
  "female_nude_portrait": ["artistic female nude", "seductive nude portrait", "elegant nude pose", "bare breasts focus", "detailed shaved pussy", "standing graceful nude", "lying on back nude", "soft studio lighting nude", "contrapposto nude", "boudoir nude"],
  "male_nude_portrait": ["artistic male nude", "seductive male portrait", "muscular bare body", "detailed penis", "standing male nude", "lying nude male", "masculine erotic pose", "soft studio male nude", "confident male form"],
  "ass_fucking": ["prone bone", "ass up face down", "deep anal penetration", "stretched asshole", "gaping anus", "balls deep anal", "rough backshots", "anal creampie dripping", "lubed glistening asshole", "raw anal pounding", "ass clapping", "rectal stretching", "anal orgasm face", "butt fucked hard", "pounding her ass"],
  "dick_sucking": ["deepthroat", "throat bulge", "sloppy blowjob", "gagging on cock", "tears from deepthroat", "eye contact blowjob", "tongue out ahegao sucking", "throat fucking", "cum in mouth", "balls deep oral", "slobbering blowjob"],
  "threesome_2male": ["double penetration", "spitroast", "one in mouth one in pussy", "dp", "two men one girl", "airtight", "sandwiched", "double vaginal", "mmf threesome", "gangbang start"],
  "threesome_2females": ["ffm threesome", "two girls one guy", "double blowjob", "one cock two mouths", "girl riding while kissing", "lesbian action with cock", "double female oral", "threesome ffm", "sandwiched by girls"],
  "pussy_eating": ["face sitting", "cunnilingus", "tongue deep in pussy", "clit sucking", "pussy eating from behind", "legs shaking orgasm", "squirting on face", "wet pussy licked", "oral creampie"],
  "boobs_sucking": ["nipple sucking", "breast worship", "tongue on nipples", "boob sucking", "puffy nipples sucked", "milk leaking", "tit sucking hard", "nursing on breasts", "heavy breasts sucked"],
  "lesbian_sex": ["scissoring", "tribbing", "69 lesbian", "lesbian cunnilingus", "strap-on lesbian", "pussy grinding", "breast sucking lesbian", "passionate lesbian kissing", "fingering each other"],
  "homosexual_sex": ["gay anal", "male on male", "cock in ass gay", "deep gay anal", "gay missionary", "rimming", "gay blowjob", "prostate stimulation", "two men fucking"],
  "trans_sex": ["trans woman with cock", "futanari sex", "ladyboy anal", "girl with dick fucking", "trans blowjob", "shemale penetration", "newhalf sex", "trans pussy", "futa on female"],
  "rape": ["non-consensual", "pinned down", "forced penetration", "crying during sex", "struggling", "fearful expression", "held down", "rough forced", "against her will", "tears streaming"]
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

  const categoriesJson = JSON.stringify(styleCategories);

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert SDXL/Flux prompt engineer. You have been trained with specific style categories and their dedicated vocabulary lists.

Here is your Composition Database:
${categoriesJson}

MANDATORY reasoning process (do this internally only):

1. Prioritize composition: Identify the SINGLE core theme the user wants to see. Example: "Cute girl laying flat on her stomach getting ass fucked" → core theme = "girl getting ass fucked" (dick in ass, anal penetration — NOT vagina). This is non-negotiable.

2. Match the core theme to the best category from the database above.

3. Under the matched category, creatively select exactly 3-5 most relevant vocabulary terms that best portray the user's mental image and composition.

Then build the prompt:
- Start with 5-6 quality terms chosen from: masterpiece, best quality, ultra detailed, photorealistic, 8k raw photo, sharp focus, cinematic lighting, depth of field, intricate details
- Describe the subject (gender, body type, hair, face, expression based on input)
- Describe pose and action extremely faithfully to the user
- Weave in the 3-5 selected vocabulary terms
- Add minimal atmosphere (sweat, blush, etc.) only if it fits

Output rules:
- Single line of comma-separated tags only. No explanation, no category name, no quotes.
- Hard cap ~480-520 characters.
- Never add extra people or acts not mentioned.
- Stay 100% faithful to the core theme.`
        },
        { role: "user", content: userPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.65,
      max_tokens: 380,
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
