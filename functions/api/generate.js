export async function onRequestPost(context) {
  // 1. Correctly destructure 'env' from 'context'
  const { request, env } = context;

  try {
    const body = await request.json();
    const { prompt, aspect_ratio, image } = body;

    // 2. Access secrets/vars via 'env.'
    // Ensure RUNPOD_ENDPOINT_ID and RUNPOD_API_KEY are in 
    // Cloudflare Dashboard > Settings > Environment variables
    const response = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: { prompt, aspect_ratio, image } })
    });

    const data = await response.json();
    return new Response(JSON.stringify({ jobId: data.id, status: data.status }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
