export async function onRequestPost(context) {
  const { env } = context;

  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY; 

  try {
    // 1. Fetch 20 images that still HAVE NOT been updated to the R2 URL
    const listResponse = await fetch(`${SUPABASE_URL}/rest/v1/images?select=image_url&image_url=not.ilike.*r2.dev*&limit=20`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    });

    const images = await listResponse.json();
    
    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ success: true, migrated: 0, message: "🎉 All images are now in Cloudflare!" }));
    }

    let movedCount = 0;

    for (const row of images) {
      const oldUrl = row.image_url;
      const path = oldUrl.split('generated_images/')[1];
      if (!path) continue;

      // Fetch from Supabase
      const imageResp = await fetch(oldUrl);
      if (!imageResp.ok) continue;

      const imageData = await imageResp.arrayBuffer();

      // 2. Upload to R2 Binding
      await env.MY_BUCKET.put(`public/${path}`, imageData, {
        httpMetadata: { contentType: imageResp.headers.get('Content-Type') || 'image/jpeg' }
      });

      // 3. IMPORTANT: Update this specific row in the DB to the new R2 URL immediately
      const newUrl = `https://pub-b591e1b05eb8435da2f642972e097ad6.r2.dev/public/${path}`;
      await fetch(`${SUPABASE_URL}/rest/v1/images?image_url=eq.${encodeURIComponent(oldUrl)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ image_url: newUrl })
      });

      movedCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      migrated: movedCount,
      message: `Moved ${movedCount} and updated database links.`
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
