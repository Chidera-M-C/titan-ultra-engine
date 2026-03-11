export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { prompt, aspect_ratio, image } = body;

    // Preserve your validation logic
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    const input = { prompt };
    if (aspect_ratio) input.aspect_ratio = aspect_ratio;
    if (image) input.image = image;

    // Call RunPod API
    const response = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input })
    });

    // Preserve your RunPod error handling
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `RunPod error: ${response.status} - ${errorText}` }), { status: response.status });
    }

    const data = await response.json();
    
    // Return standard JSON response
    return new Response(JSON.stringify({ jobId: data.id, status: data.status }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Preserve your detailed logging
    console.error('Generation error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), { status: 500 });
  }
}
