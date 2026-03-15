export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { jobId, endpointId } = await request.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Job ID is required' }), { status: 400 });
    }
    const resolvedEndpoint = endpointId || env.RUNPOD_ENDPOINT_ID;
    const response = await fetch(`https://api.runpod.ai/v2/${resolvedEndpoint}/status/${jobId}`, {
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
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Status check error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), { status: 500 });
  }
}
