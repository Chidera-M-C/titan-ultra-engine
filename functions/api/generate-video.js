// functions/api/generate-video.js
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    console.log('Received video generate body:', JSON.stringify(body, null, 2));
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
    } = body;

    // prompt is optional for image_to_video, required for text_to_video
    if (!style || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: style, type' }), { status: 400 });
    }
    if (type === 'text_to_video' && !prompt) {
      return new Response(JSON.stringify({ error: 'prompt is required for text_to_video' }), { status: 400 });
    }
    if (type === 'image_to_video' && !start_image) {
      return new Response(JSON.stringify({ error: 'start_image is required for image_to_video' }), { status: 400 });
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

    // ← Fixed: runpod.ai not runpod.io (matches image generate.js)
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
