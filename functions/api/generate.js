export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { prompt, aspect_ratio, image, style, negative_prompt } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    // Build input payload
    const input = { prompt };
    if (aspect_ratio)    input.aspect_ratio    = aspect_ratio;
    if (image)           input.image           = image;
    if (style)           input.style           = style;
    if (negative_prompt) input.negative_prompt = negative_prompt;

    // Route to correct endpoint based on style
    const CRYSTALCLEAR_STYLES = new Set(['female_nude_portrait', 'dressed_vs_naked']);
    const BIGLUST_STYLES = new Set(['missionary_style', 'doggy_style', 'cowgirl_style', 'anal_sex', 'oral_sex', 'threesome_sex', 'cum_on_face', 'lesbian_sex']);

    let endpointId = env.RUNPOD_ENDPOINT_ID;
    if (style && CRYSTALCLEAR_STYLES.has(style)) endpointId = env.RUNPOD_ENDPOINT_CRYSTALCLEAR;
    if (style && BIGLUST_STYLES.has(style))      endpointId = env.RUNPOD_ENDPOINT_BIGLUST;

    const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
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
