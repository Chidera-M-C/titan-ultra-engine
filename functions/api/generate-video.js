// functions/api/generate-video.js
// Handles both text-to-video and image-to-video generation via RunPod

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const {
      type,             // 'text_to_video' | 'image_to_video'
      prompt,
      negative_prompt,
      aspect_ratio,
      style,            // video style id
      duration,         // 4–8 seconds
      motion_strength,  // 0.3–1.0
      start_image,      // base64 or URL (image_to_video only)
      end_image,        // base64 or URL, optional (image_to_video only)
      character,        // character data, optional
      face_embedding,   // optional
    } = body;

    if (!prompt || !style || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: prompt, style, type' }), { status: 400 });
    }

    // Build the RunPod payload based on type
    const payload = {
      input: {
        type,
        prompt,
        negative_prompt: negative_prompt || '',
        aspect_ratio:    aspect_ratio || '9:16',
        style,
        duration:        duration || 4,
        motion_strength: motion_strength || 0.7,
      }
    };

    if (type === 'image_to_video') {
      if (!start_image) {
        return new Response(JSON.stringify({ error: 'start_image is required for image_to_video' }), { status: 400 });
      }
      payload.input.start_image = start_image;
      if (end_image) payload.input.end_image = end_image;
    }

    if (character)      payload.input.character      = character;
    if (face_embedding) payload.input.face_embedding = face_embedding;

    // Route to appropriate RunPod endpoint
    // You'll configure VIDEO_ENDPOINT_ID in Cloudflare Pages env vars
    const endpointId = env.RUNPOD_VIDEO_ENDPOINT_ID;
    if (!endpointId) {
      return new Response(JSON.stringify({ error: 'Video generation endpoint not configured' }), { status: 500 });
    }

    const runpodRes = await fetch(`https://api.runpod.io/v2/${endpointId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RUNPOD_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!runpodRes.ok) {
      const text = await runpodRes.text();
      throw new Error(`RunPod error: ${runpodRes.status} - ${text}`);
    }

    const data = await runpodRes.json();
    return new Response(JSON.stringify({ jobId: data.id, endpointId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Video generation error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
