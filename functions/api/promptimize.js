// --- MODEL FALLBACK LOGIC ---
function isRateLimit(error) {
  return error?.status === 429 || error?.code === 'rate_limit_exceeded';
}

async function tryModels(env, messages, stream = false) {
  const models = ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'];
  for (let i = 0; i < models.length; i++) {
    try {
      console.log(`Trying model: ${models[i]}`);
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: models[i],
          messages,
          temperature: 0.75,
          max_tokens: 1000,
          stream
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        if (isRateLimit(errData.error) && i < models.length - 1) continue;
        throw new Error(errData.error?.message || 'API Error');
      }

      return response;
    } catch (err) {
      if (i < models.length - 1) continue;
      throw err;
    }
  }
}

// --- PROMPTS ---

const THINKING_PROMPT = `You are a creative director and visual scene architect. A user gives you a basic scene idea. Your job is to think through it deeply across 4 stages and produce a rich, refined draft. Be creative, be bold, be realistic.

**Stage 1 — Context Expansion**
Take the user's input and expand it into a vivid, sensory-rich paragraph in plain English. Add realistic details that make the scene feel real and alive. Think about: lighting, environment, mood, physical details of the subjects, emotional state, textures, sounds. Do not hold back. Write 100-200 words.

**Stage 2 — Compositional Realism**
Now think purely about the physical composition of the subjects. Ask yourself: given the action or pose described, what would naturally happen to the body? What details emerge? For example if a woman is arching her back, her shoulder blades would press together, her chin might lift. Think about: body positioning, natural physical reactions, facial expressions consistent with the action, secondary details that emerge from the primary action. Think through these like a photographer setting up a shot — what is TRUE about this scene physically? Write this as flowing thought, not a list. 100-150 words.

**Stage 3 — Meta Decisions**
Decide: how many subjects are in the scene (1 person, 2 people, etc.)? What is the shot style — professional photography studio, candid mobile shot, analog film, cinematic, selfie? Why does this shot style fit this scene? Keep this brief, 2-3 sentences.

**Stage 4 — Refined Draft**
Synthesize everything from stages 1-3 into one clean, complete scene description in plain English. This is your final draft before prompt conversion. 150-200 words. Write it as a vivid visual description, not a list.`;

const OUTPUT_PROMPT = `You are an SDXL/Flux prompt engineer. You receive a detailed scene draft and convert it into a final positive prompt.

Rules — STRICT:
- Output a single line of comma-separated tags ONLY
- No explanation, no intro, no labels, no quotes, no numbering
- Focus on the most visually impactful elements from the draft
- Let composition imply camera angle naturally — do NOT force camera angle tags
- Include: subject count tag (1girl, 1man, etc), physical descriptors, action/pose tags, setting tags, mood/lighting tags, quality tags
- Wrap the most critical action or pose tags in parentheses for emphasis
- Quality tags to end with: masterpiece, best quality, photorealistic, ultra detailed, sharp focus
- Hard cap: 60-70 words
- Your entire response must be the prompt and nothing else`;

const NEGATIVE_PROMPT = `You are an SDXL/Flux negative prompt engineer. You receive a final positive prompt and generate a negative prompt that prevents unwanted artifacts and inconsistencies specific to this scene.

Rules — STRICT:
- Output a single line of comma-separated tags ONLY
- No explanation, no intro, no labels, no quotes
- Think about what could go wrong in this specific scene and add tags to prevent it
- Always include base quality negatives: worst quality, low quality, blurry, deformed, ugly, bad anatomy, extra limbs, watermark, text
- Add scene-specific negatives based on what the positive prompt contains
- Hard cap: 200 characters
- Your entire response must be the negative prompt and nothing else`;

// --- MAIN HANDLER ---
export async function onRequestPost(context) {
  const { request, env } = context;
  const { userPrompt } = await request.json();

  if (!userPrompt) return new Response(JSON.stringify({ error: 'Missing input' }), { status: 400 });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      // ── CALL 1: Thinking (streamed) ──────────────────────────────────
      const thinkingMessages = [
        { role: 'system', content: THINKING_PROMPT },
        { role: 'user', content: userPrompt }
      ];

      const thinkingResponse = await tryModels(env, thinkingMessages, true);
      const reader = thinkingResponse.body.getReader();
      const decoder = new TextDecoder();
      let thinkingText = '';
      let buffer = '';  // 👈 add this
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });  // 👈 append to buffer
        const lines = buffer.split('\n');
        buffer = lines.pop();  // 👈 hold incomplete last line
      
        for (const line of lines) {
          if (line.trim() === '' || line.includes('[DONE]')) continue;
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            const delta = data.choices[0]?.delta?.content || '';
            if (delta) {
              thinkingText += delta;
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'thinking', chunk: delta })}\n\n`));
            }
          } catch (e) {}
        }
      }

      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'thinking_done' })}\n\n`));

      // ── CALL 2: Positive prompt (non-streamed) ───────────────────────
      const outputMessages = [
        { role: 'system', content: OUTPUT_PROMPT },
        {
          role: 'user',
          content: `Here is the refined scene draft:\n\n${thinkingText}\n\nConvert this into the final SDXL positive prompt now. Single line, tags only, nothing else.`
        }
      ];

      const outputResponse = await tryModels(env, outputMessages, false);
      const outputData = await outputResponse.json();
      const optimized = outputData.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || '';

      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'result', optimized })}\n\n`));

      // ── CALL 3: Negative prompt (non-streamed) ───────────────────────
      const negativeMessages = [
        { role: 'system', content: NEGATIVE_PROMPT },
        {
          role: 'user',
          content: `Here is the positive prompt:\n\n${optimized}\n\nGenerate the negative prompt now. Single line, tags only, nothing else.`
        }
      ];

      const negativeResponse = await tryModels(env, negativeMessages, false);
      const negativeData = await negativeResponse.json();
      const negative = negativeData.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || '';

      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'negative', negative })}\n\n`));

    } catch (err) {
      console.error('Fatal Error:', err);
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
