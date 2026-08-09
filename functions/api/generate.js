import { createClient } from '@supabase/supabase-js';

// Helper: Safely convert URLs or Data URIs to pure Base64 for RunPod
async function getPureBase64(str) {
  if (!str) return null;
  // If it's a web URL, fetch it and convert to base64
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const res = await fetch(str);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192; // Chunking prevents call stack overflow on large images
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    } catch (e) {
      console.error('URL to Base64 conversion error:', e);
      return null;
    }
  }
  // If it's already a base64 string, just strip the data URI prefix if present
  return str.replace(/^data:image\/\w+;base64,/, '');
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { prompt, aspect_ratio, image, style, negative_prompt, face_embedding, character, photo, face_image } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    // Convert potential URLs to pure Base64 for RunPod
    const pureImage = await getPureBase64(image);
    const pureFaceImage = await getPureBase64(face_image);
    const purePhoto = await getPureBase64(photo);

    // ── Data collection — fire and forget ────────────────────────────
    try {
      const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      
      let imageUrl = null;
      
      // Handle image storage
      if (image) {
        if (image.startsWith('http')) {
          // It's already a hosted URL, just use it
          imageUrl = image;
        } else if (pureImage) {
          // It's a fresh base64 upload, save it to storage
          try {
            const byteCharacters = atob(pureImage);
            const byteArray = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            const fileName = `collected/${Date.now()}.jpg`;
      
            const { error: uploadError } = await supabase.storage
              .from('data_collect_images')
              .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
      
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('data_collect_images')
                .getPublicUrl(fileName);
              imageUrl = publicUrl;
            }
          } catch (imgErr) {
            console.error('Image upload error:', imgErr.message);
          }
        }
      }
      
      await supabase.from('data_collect').insert({
        prompt:          prompt,
        negative_prompt: negative_prompt || null,
        category:        style || 'explore',
        aspect_ratio:    aspect_ratio || '9:16',
        style:           style || null,
        has_image:       !!image,
        image_url:       imageUrl,
        has_character:   !!character,
        character_name:  character?.name || null,
        promptimized:    false,
        status:          'submitted',
      });
    } catch (collectErr) {
      console.error('Data collection error:', collectErr.message);
    }

    // ── Build input payload ───────────────────────────────────────────
    const input = { prompt };
    if (aspect_ratio)    input.aspect_ratio    = aspect_ratio;
    if (pureImage)       input.image           = pureImage; // Now guaranteed to be Base64
    if (style)           input.style           = style;
    if (negative_prompt) input.negative_prompt = negative_prompt;
    if (face_embedding)  input.face_embedding  = face_embedding;
    if (character)       input.character       = character;
    if (purePhoto)       input.photo           = purePhoto;
    if (pureFaceImage)   input.face_image      = pureFaceImage;

    // ── Route to correct endpoint ─────────────────────────────────────
    const CRYSTALCLEAR_STYLES = new Set(['female_nude_portrait', 'dressed_vs_naked']);
    const BIGLUST_STYLES      = new Set(['missionary_style', 'doggy_style', 'cowgirl_style', 'anal_sex', 'oral_sex', 'threesome_sex', 'cum_on_face', 'lesbian_sex']);
    const EDIT_STYLES         = new Set(['edit']);

    let endpointId = env.RUNPOD_ENDPOINT_ID;
    if (style && CRYSTALCLEAR_STYLES.has(style)) endpointId = env.RUNPOD_ENDPOINT_CRYSTALCLEAR;
    if (style && BIGLUST_STYLES.has(style))      endpointId = env.RUNPOD_ENDPOINT_BIGLUST;
    if (style && EDIT_STYLES.has(style))         endpointId = env.RUNPOD_ENDPOINT_EDIT;
    if (style && style === 'character')          endpointId = env.RUNPOD_ENDPOINT_CHARACTER;
    if (face_embedding || photo)                 endpointId = env.RUNPOD_ENDPOINT_CHARACTER;

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RUNPOD_API_KEY}`,
        'Content-Type':  'application/json'
      },
      body:   JSON.stringify({ input }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `RunPod error: ${response.status} - ${errorText}` }), { status: response.status });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ jobId: data.id, status: data.status, endpointId }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Generation error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), { status: 500 });
  }
}
