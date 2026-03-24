export async function onRequestPost(context) {
  const { env } = context;
  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY; 

  try {
    // 1. Fetch 15 images that are still pointing to Supabase
    const listResponse = await fetch(`${SUPABASE_URL}/rest/v1/images?select=image_url&image_url=ilike.*supabase.co*&limit=15`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    });

    const images = await listResponse.json();
    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Done! No more Supabase URLs found." }));
    }

    let movedCount = 0;

    for (const row of images) {
      const oldUrl = row.image_url;
      
      // Extract the path correctly (Everything after 'generated_images/')
      // If your URL is .../generated_images/USER_ID/FILE.jpg, this gets 'USER_ID/FILE.jpg'
      const path = oldUrl.split('generated_images/')[1];
      if (!path) continue;

      // Fetch file from Supabase
      const imageResp = await fetch(oldUrl);
      if (!imageResp.ok) continue;
      const imageData = await imageResp.arrayBuffer();

      // Upload to R2 (No 'public/' prefix, just the path)
      await env.MY_BUCKET.put(path, imageData, {
        httpMetadata: { contentType: imageResp.headers.get('Content-Type') || 'image/jpeg' }
      });

      // Update the Database immediately to the new R2 URL
      const newUrl = `https://pub-b591e1b05eb8435da2f642972e097ad6.r2.dev/${path}`;
      await fetch(`${SUPABASE_URL}/rest/v1/images?image_url=eq.${encodeURIComponent(oldUrl)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image_url: newUrl })
      });

      movedCount++;
    }

    return new Response(JSON.stringify({ migrated: movedCount }));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
