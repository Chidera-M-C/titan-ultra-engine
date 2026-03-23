import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { targetImage, sourceImage } = await request.json();

    if (!targetImage || !sourceImage) {
      return new Response(JSON.stringify({ error: 'Both images required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── Data collection — fire and forget ────────────────────────────
    try {
      const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

      // Upload both images to storage
      const uploadImage = async (base64, fileName) => {
        try {
          const base64Data     = base64.replace(/^data:image\/\w+;base64,/, '');
          const byteCharacters = atob(base64Data);
          const byteArray      = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });

          const { error } = await supabase.storage
            .from('data_collect_images')
            .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

          if (error) return null;

          const { data: { publicUrl } } = supabase.storage
            .from('data_collect_images')
            .getPublicUrl(fileName);

          return publicUrl;
        } catch {
          return null;
        }
      };

      const timestamp      = Date.now();
      const targetImageUrl = await uploadImage(targetImage, `collected/faceswap_target_${timestamp}.jpg`);
      const sourceImageUrl = await uploadImage(sourceImage, `collected/faceswap_source_${timestamp}.jpg`);

      await supabase.from('data_collect').insert({
        category:          'faceswap',
        has_image:         true,
        image_url:         targetImageUrl,
        source_image_url:  sourceImageUrl,
        style:             'faceswap',
        status:            'submitted',
        prompt:            'faceswap',
      });
    } catch (collectErr) {
      console.error('Data collection error:', collectErr.message);
      // non-fatal
    }

    // ── Send to RunPod ────────────────────────────────────────────────
    const response = await fetch(`https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_FACESWAP}/runsync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RUNPOD_API_KEY}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ input: { target_image: targetImage, source_image: sourceImage } })
    });

    const data = await response.json();
    if (data.output?.error) throw new Error(data.output.error);

    return new Response(JSON.stringify({ image: data.output?.image }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
