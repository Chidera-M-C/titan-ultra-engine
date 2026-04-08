// functions/api/generate-video.js
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // === 1. Log exactly what the frontend sent ===
    const contentType = request.headers.get('content-type') || 'none';
    console.log('📥 VIDEO → Content-Type:', contentType);
    console.log('📥 VIDEO → Content-Length:', request.headers.get('content-length'));

    let body;
    try {
      body = await request.json();
    } catch (e) {
      body = null;
    }
    console.log('📥 VIDEO → RAW BODY:', JSON.stringify(body, null, 2));

    if (!body) {
      return new Response(
        JSON.stringify({ error: 'No JSON body received from frontend' }),
        { status: 400 }
      );
    }

    // === 2. Normalize camelCase / snake_case (fixes most frontend bugs) ===
    const normalized = {
      ...body,
      start_image: body.start_image || body.startImage || null,
      end_image:   body.end_image   || body.endImage   || null,
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

    // === 3. Validation ===
    if (!style || !type) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: style, type',
          received_keys: Object.keys(body),
          received: body
        }),
        { status: 400 }
      );
    }
    if (type === 'text_to_video' && !prompt) {
      return new Response(
        JSON.stringify({ error: 'prompt is required for text_to_video', received: body }),
        { status: 400 }
      );
    }
    if (type === 'image_to_video' && !start_image) {
      return new Response(
        JSON.stringify({ error: 'start_image is required for image_to_video', received: body }),
        { status: 400 }
      );
    }

    // === 4. Check environment variables ===
    const endpointId = env.RUNPOD_VIDEO_ENDPOINT_ID;
    const apiKey     = env.RUNPOD_API_KEY;

    if (!endpointId) {
      return new Response(
        JSON.stringify({ error: 'RUNPOD_VIDEO_ENDPOINT_ID is not configured in Cloudflare' }),
        { status: 500 }
      );
    }
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'RUNPOD_API_KEY is not configured in Cloudflare' }),
        { status: 500 }
      );
    }

    // === 5. Build RunPod payload ===
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

    console.log('📤 SENDING TO RUNPOD → input:', JSON.stringify(input, null, 2));

    // === 6. Call RunPod ===
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const runpodRes = await fetch(`https://api.runpod.io/v2/${endpointId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!runpodRes.ok) {
      const errorText = await runpodRes.text();
      throw new Error(`RunPod returned ${runpodRes.status}: ${errorText}`);
    }

    const data = await runpodRes.json();

    return new Response(
      JSON.stringify({ jobId: data.id, status: data.status, endpointId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Video generation error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
