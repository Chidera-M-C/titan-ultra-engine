export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { targetImage, sourceImage } = await request.json();
    if (!targetImage || !sourceImage) {
      return new Response(JSON.stringify({ error: 'Both images required' }), { status: 400 });
    }
    const response = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_FACESWAP}/runsync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { target_image: targetImage, source_image: sourceImage } })
    });
    const data = await response.json();
    if (data.output?.error) throw new Error(data.output.error);
    return new Response(JSON.stringify({ image: data.output?.image }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
