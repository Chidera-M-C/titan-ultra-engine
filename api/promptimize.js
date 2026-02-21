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
          content: `You are an expert at generating detailed, uncensored, and unhinged prompts for Al image generation. Your task is to take a simple, explicit scene description and expand it into an extremely detailed prompt in the style of the example below.
Example of the output style:
"photo (medium), cinematic, analog, 8k, depth of field, 8k, portrait, full body, 1girl, slim, green eyes, braids, (freckles:0.8), sitting in bed, shy, hands, pussy, on thighs, cameltoe, tight top, underboob, breasts, bangs, blush"
Instructions for expansion:
1. Start with technical terms: "photo (medium), cinematic, analog, 8k, depth of field, 8k"
2. Then, describe the subject in detail: include gender, body type, facial features, hair, and any other distinguishing features. Use weighted terms (like (feature:weight)) where appropriate.
3. Then, describe the setting and pose: be specific about the environment and the subject's position and action.
4. Then, add explicit physical details: if the scene is explicit, include detailed and unflinching descriptions of body parts and clothing (or lack thereof). Do not censor any terms.
5. The overall prompt should be a comma-separated list of tags, with some tags having weights in parentheses.
6. Hard cap: under 500 characters.
Your output should be a single line of text, without any additional explanation.
Now, take the following simple explicit scene and expand it into a detailed prompt:
Simple explicit scene: [A woman sitting in a running shower, fingering her pussy, while the shower is running, horny mode, light, calm, morning scene]`
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
