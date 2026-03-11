// src/app/api/enhance-prompt/route.js
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,   // Make sure this is in your .env
});

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return Response.json({ error: "No prompt provided" }, { status: 400 });
    }

    const systemMessage = `You are an expert SDXL / Flux prompt engineer specialized in erotic and nude photography.

Your job is to take a casual, natural language user request and convert it into a highly detailed, perfectly structured SDXL prompt.

Rules:
- Prioritize 100% of the user's requested details (height, body type, breast size, hair, pose, nudity, expression, etc.)
- "Nelson position" or similar = interpret as a specific sexual/wrestling hold pose and describe it clearly and explicitly
- Add helpful artistic details: lighting, camera angle, skin texture, depth of field, quality boosters
- Use natural weighting like (small breasts:1.25), (detailed skin:1.2)
- End with quality boosters: masterpiece, best quality, ultra-detailed, 8k
- Never add things the user didn't ask for (no extra people, no clothes if they said naked, etc.)
- Keep the prompt natural and flowing, not robotic

User's raw prompt: "${prompt}"

Return ONLY the final enhanced prompt. No explanations.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",   // Best balance of speed + quality
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.75,
      max_tokens: 900,
    });

    let enhancedPrompt = completion.choices[0]?.message?.content?.trim();

    // Fallback if Groq fails
    if (!enhancedPrompt || enhancedPrompt.length < 20) {
      enhancedPrompt = prompt;
    }

    return Response.json({
      enhancedPrompt,
      originalPrompt: prompt
    });

  } catch (error) {
    console.error("Enhance prompt error:", error);
    return Response.json({ 
      enhancedPrompt: prompt, 
      originalPrompt: prompt,
      error: "Enhancement failed, using original"
    });
  }
}
