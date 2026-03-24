export async function onRequestPost(context) {
  const { env } = context;

  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY; 

  try {
    // 1. Fetch 20 images from Supabase
    const listResponse = await fetch(`${SUPABASE_URL}/rest/v1/images?select=image_url&image_url=ilike.*supabase.co*&limit=20`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    });

    const images = await listResponse.json();
    
    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ success: true, migrated: 0, message: "No images found!" }));
    }

    let movedCount = 0;

    for (const row of images) {
      const oldUrl = row.image_url;
      // Extract path after 'generated_images/'
      const path = oldUrl.split('generated_images/')[1];
      if (!path) continue;

      // Fetch from Supabase
      const imageResp = await fetch(oldUrl);
      if (!imageResp.ok) continue;

      const imageData = await imageResp.arrayBuffer();

      // 2. Upload to R2 using the internal Binding (Zero-Config)
      // We use 'public/' + path to match your folder structure
      await env.MY_BUCKET.put(`public/${path}`, imageData, {
        httpMetadata: { contentType: imageResp.headers.get('Content-Type') || 'image/jpeg' }
      });

      movedCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      migrated: movedCount 
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
