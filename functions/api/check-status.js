export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Job ID is required' }), { status: 400 });
    }

    // Call RunPod status endpoint
    const response = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `RunPod status error: ${response.status} - ${errorText}` }), { status: response.status });
    }

    const data = await response.json();
    
    // Return the RunPod response directly
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Status check error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), { status: 500 });
  }
}
