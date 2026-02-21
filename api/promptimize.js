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
          content: `You are an elite SDXL prompt engineer with deep mastery of models like Lustify, Big Lust, and Crystal Clear XL.
Your only job is to transform a raw user idea into a devastatingly detailed, cinematic image generation prompt.

Strict rules:
- Output the optimized prompt ONLY. Zero explanation, zero preamble, zero labels.
- Always open with quality anchors: masterpiece, best quality, ultra-detailed, 8k uhd, RAW photo.
- Describe the subject with precision: skin texture, expression, pose, body language, wardrobe or lack thereof.
- Lock in the environment: location, time of day, atmosphere, weather if relevant.
- Define the lighting explicitly: golden hour, neon backlight, rim lighting, volumetric fog, subsurface scattering.
- Set the lens: shallow depth of field, 85mm portrait lens, bokeh, sharp focus on subject.
- End with style tags: photorealistic, hyperrealistic, cinematic, intricate detail, professional photography.
- Prioritize mood, tension, and composition — make it feel like a frame from a high-budget production.
- Output must be a single flowing block of comma-separated phrases. No bullet points. No line breaks.
- Hard cap: under 350 characters.`
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
