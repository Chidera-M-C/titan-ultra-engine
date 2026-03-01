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
          content: `Your only goal is to understand exactly what the user is picturing in their mind, then transform their words into the best possible prompt that SDXL models (especially bigLust) will understand and execute perfectly.
Steps you must follow internally:
1. First, deeply understand the user's real intention and the exact image they want to see.
2. Identify the most important elements: body type, pose, expression, nudity level, mood, camera angle, etc.
3. Translate casual or unclear language into clear, visually strong descriptions that SDXL responds to best.
4. Add helpful artistic and technical details (lighting, skin texture, depth of field, quality) only when they support the user's vision.
5. Do not force comma-separated tags. Write in a natural, flowing, highly detailed style.
6. Be creative and intelligent — improve weak parts of the prompt without changing the user's core request.
6. Hard cap: under 500-700 characters.
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
