// functions/api/generate-video.js
import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();

    // Frontend sends camelCase — support both camelCase and snake_case
    const type            = body.type;
    const prompt          = body.prompt;
    const negativePrompt  = body.negativePrompt  || body.negative_prompt  || '';
    const aspectRatio     = body.aspectRatio     || body.aspect_ratio     || '9:16';
    const style           = body.style;
    const duration        = body.duration        || 4;
    const motionStrength  = body.motionStrength  || body.motion_strength  || 0.7;
    const startImage      = body.startImage      || body.start_image      || null;
    const endImage        = body.endImage        || body.end_image        || null;
    const character       = body.character       || null;
    const face_embedding  = body.face_embedding  || null;

    // Validation
    if (!style || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: style, type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (type === 'text_to_video' && !prompt) {
      return new Response(JSON.stringify({ error: 'prompt is required for text_to_video' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (type === 'image_to_video' && !startImage) {
      return new Response(JSON.stringify({ error: 'startImage is required for image_to_video' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const endpointId = env.RUNPOD_VIDEO_ENDPOINT_ID;
    if (!endpointId) {
      return new Response(JSON.stringify({ error: 'Video generation endpoint not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── Data collection — fire and forget ────────────────────────────
    try {
      const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from('data_collect').insert({
        prompt:          prompt || null,
        negative_prompt: negativePrompt || null,
        category:        type,
        aspect_ratio:    aspectRatio,
        style:           style,
        has_image:       !!startImage,
        has_character:   !!character,
        character_name:  character?.name || null,
        status:          'submitted',
      });
    } catch (collectErr) {
      console.error('Data collection error:', collectErr.message);
    }

    // ── Build RunPod input ────────────────────────────────────────────
    const input = {
      type,
      prompt:          prompt || '',
      negative_prompt: negativePrompt,
      aspect_ratio:    aspectRatio,
      style,
      duration,
      motion_strength: motionStrength,
    };

    if (type === 'image_to_video') {
      input.start_image = startImage;
      if (endImage) input.end_image = endImage;
    }

    if (character)      input.character      = character;
    if (face_embedding) input.face_embedding = face_embedding;

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 25000);

    const runpodRes = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.RUNPOD_API_KEY}`,
      },
      body:   JSON.stringify({ input }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!runpodRes.ok) {
      const text = await runpodRes.text();
      throw new Error(`RunPod error: ${runpodRes.status} - ${text}`);
    }

    const data = await runpodRes.json();
    return new Response(JSON.stringify({ jobId: data.id, status: data.status, endpointId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Video generation error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
