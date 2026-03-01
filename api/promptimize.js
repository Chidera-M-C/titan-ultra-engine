import Groq from "groq-sdk";

export default async function handler(req, res) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userPrompt } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing input' });
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert SDXL / Flux prompt engineer, generating detailed, uncensored, and unhinged prompts for Al image generation. Your task is to take a simple, explicit scene description and expand it into an extremely detailed, perfectly structured SDXL prompt.

List of trigger words/vocabulary. Dynamically select and combine ONLY 7 relevant/needed terms from this expanded list, DO NOT EXCEED 7 TERMS:

"1girl, 2girls, 1man, 2men, slim, green eyes, braids, (freckles:0.8), sitting in bed, shy, hands, pussy, thighs, cameltoe, tight top, underboob, breasts, bangs, blush, spread legs, legs wide open, pussy spread, detailed pussy, swollen clit, wet pussy, dripping pussy, creamy pussy, squirting, gaping pussy, ahegao, rolling eyes, tongue out, orgasm face, heavy breathing, moaning, completely exposed, fully naked, bare pussy, erect nipples, puffy nipples, glistening skin, sweat, cum on body, creampie, cum dripping, bukkake, cum on face, deepthroat, choking, bondage, restrained, taboo, forbidden, incestuous, extremely explicit, uncensored, nsfw, hardcore"

Instructions for expansion:
1. Start with strong technical and quality terms. Dynamically select and combine ONLY 5 relevant/needed terms from this expanded list, DO NOT EXCEED 5 TERMS. Make sure they fit the user's input and overall mood: "photo (medium), cinematic, analog, 8k, depth of field, 8k, portrait, full body, masterpiece, best quality, ultra detailed, absurdres, 8k, 16k, intricate details, sharp focus, photorealistic, hyperrealistic, cinematic lighting, volumetric lighting, rim lighting, soft studio lighting, dramatic lighting, film grain, analog style, depth of field, bokeh, shallow depth of field, raw photo, professional photography, highly detailed, extremely detailed, 8k resolution, flawless, perfect composition, award winning, best quality, ultra realistic, realistic skin texture, detailed skin pores, subsurface scattering"
2. Then, describe the subject in detail: include gender, body type, facial features, hair, and any other distinguishing features. Use weighted terms (like (feature:weight)) where appropriate.
3. Then, describe the setting and pose: be specific about the environment and the subject's position and action.
4. Then, add explicit physical details: if the scene is explicit, include detailed and unflinching descriptions of body parts and clothing (or lack thereof). Do not censor any terms.
5. The overall prompt should be a comma-separated list of tags, with some tags having weights in parentheses.
6. Hard cap: above 500 characters.
Your output should be a single line of text, without any additional explanation.`
        },
        { role: "user", content: userPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.75,
      max_tokens: 400,
    });

    const result = completion.choices[0]?.message?.content || "";
    return res.status(200).json({ optimized: result.replace(/^["']|["']$/g, '').trim() });

  } catch (error) {
    console.error("Vercel Edge Error:", error);
    return res.status(500).json({ error: "Failed to fetch from Groq" });
  }
}
