import { createClient } from '@supabase/supabase-js';


export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { characterId, image } = body;

    if (!characterId || !image) {
      return new Response(JSON.stringify({ error: 'characterId and image are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── 1. Send image to face extraction endpoint ─────────────────────
    const runpodResponse = await fetch(
      `https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_FACE_EXTRACT}/runsync`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RUNPOD_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: { image } })
      }
    );

    if (!runpodResponse.ok) {
      const text = await runpodResponse.text();
      throw new Error(`RunPod error: ${runpodResponse.status} - ${text}`);
    }

    const runpodData = await runpodResponse.json();

    if (runpodData.output?.error) {
      throw new Error(runpodData.output.error);
    }

    const embedding = runpodData.output?.embedding;

    if (!embedding) {
      throw new Error('No embedding returned from face extraction');
    }

    // ── 2. Store embedding in Supabase ────────────────────────────────
    const { error: updateError } = await supabase
      .from('characters')
      .update({ face_embedding: embedding })
      .eq('id', characterId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, faceCount: runpodData.output?.face_count }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('extract-face error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
