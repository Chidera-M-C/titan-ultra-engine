// api/promptimize.js
import Groq from "groq-sdk";

export default async function handler(req, res) {
  // 1. Setup Groq with the Env Var you'll add to Vercel
  const groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY 
  });

  // 2. Only allow POST requests
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
          content: `You are a professional SDXL Prompt Engineer. 
          Rewrite the user's input into a high-detail cinematic prompt.
          Focus on:
          - Models: SDXL, Big Lust, Crystal Clear.
          - Keywords: 8k, masterpiece, photorealistic, intricate textures, subsurface scattering.
          - Lighting: Cinematic, rim lighting, volumetric fog.
          - Strictly output the prompt ONLY. No chatting.
          - Priotize certain actions or composition in the output.
          - Output under 300 characters.`
        },
        { role: "user", content: userPrompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.5,
    });

    const result = completion.choices[0]?.message?.content || "";
    return res.status(200).json({ optimized: result.replace(/^["']|["']$/g, '').trim() });

  } catch (error) {
    console.error("Vercel Edge Error:", error);
    return res.status(500).json({ error: "Failed to fetch from Groq" });
  }
}
