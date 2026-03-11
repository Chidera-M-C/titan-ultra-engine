export async function onRequestPost(context) {
  const { request } = context;

  // DEBUG: Let's see what the request actually looks like
  const bodyText = await request.text();
  console.log("RECEIVED BODY:", bodyText);

  try {
    const body = JSON.parse(bodyText);
    // ... rest of your code
    const { prompt, aspect_ratio, image } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    // 2. Build RunPod input
    const input = { prompt };
    if (aspect_ratio) input.aspect_ratio = aspect_ratio;
    if (image) input.image = image;

    // 3. Make the call to RunPod
    const response = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `RunPod error: ${response.status} - ${errorText}` }), { status: response.status });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ jobId: data.id, status: data.status }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Generation error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), { status: 500 });
  }
}
