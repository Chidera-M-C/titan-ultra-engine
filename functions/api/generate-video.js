// functions/api/generate-video.js
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // === DIAGNOSTIC LOGS (visible in Cloudflare Pages → Functions → Logs) ===
    const contentType = request.headers.get('content-type') || 'none';
    console.log('📥 VIDEO HEADERS → Content-Type:', contentType);
    console.log('📥 VIDEO HEADERS → Content-Length:', request.headers.get('content-length'));

    const body = await request.json().catch(() => null);
    console.log('📥 VIDEO RAW BODY RECEIVED:', JSON.stringify(body, null, 2));

    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Empty or invalid JSON body', received: null }),
        { status: 400 }
      );
    }

    // === NORMALIZE camelCase → snake_case (fixes common frontend mismatch) ===
    const normalized = {
      ...body,
      start_image: body.start_image || body.startImage,
      end_image:   body.end_image   || body.endImage,
    };

    const {
      type,
      prompt,
      negative_prompt,
      aspect_ratio,
      style,
      duration,
      motion_strength,
      start_image,
      end_image,
      character,
      face_embedding,
    } = normalized;

    // === VALIDATION (this is what was returning 400) ===
    if (!style || !type) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: style, type',
          received: body,           // ← shows you exactly what frontend sent
          missing: 'style or type'
        }),
        { status: 400 }
      );
    }
    if (type === 'text_to_video' && !prompt) {
      return new Response(
        JSON.stringify({
          error: 'prompt is required for text_to_video',
          received: body,
          missing: 'prompt'
        }),
        { status: 400 }
      );
    }
    if (type === 'image_to_video' && !start_image) {
      return new Response(
        JSON.stringify({
          error: 'start_image is required for image_to_video',
          received: body,
          missing: 'start_image (or startImage)'
        }),
        { status: 400 }
      );
    }

    const endpointId = env.RUNPOD_VIDEO_ENDPOINT_ID;
    if (!endpointId) {
      return new Response(JSON.stringify({ error: 'Video generation endpoint not configured' }), { status: 500 });
    }

    const input = {
      type,
      prompt:          prompt || '',
      negative_prompt: negative_prompt || '',
      aspect_ratio:    aspect_ratio || '9:16',
      style,
      duration:        duration || 4,
      motion_strength: motion_strength || 0.7,
    };

    if (type === 'image_to_video') {
      input.start_image = start_image;
      if (end_image) input.end_image = end_image;
    }

    if (character)      input.character      = character;
    if (face_embedding) input.face_embedding = face_embedding;

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 25000);

    const runpodRes = await fetch(`https://api.runpod.io/v2/${endpointId}/run`, {
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
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
