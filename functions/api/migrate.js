export async function onRequestPost(context) {
  const { env } = context;

  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY; 
  const R2_ACCOUNT_ID = env.R2_ACCOUNT_ID;
  const R2_SECRET = env.R2_SECRET_ACCESS_KEY;

  try {
    // 1. Fetch exactly 20 images that still have 'supabase.co' in the URL
    const listResponse = await fetch(`${SUPABASE_URL}/rest/v1/images?select=image_url&image_url=ilike.*supabase.co*&limit=20`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    });

    const images = await listResponse.json();
    
    if (!images || images.length === 0) {
      return new Response(JSON.stringify({ success: true, migrated: 0, message: "No more images left to migrate!" }));
    }

    let movedCount = 0;

    for (const row of images) {
      const oldUrl = row.image_url;
      const path = oldUrl.split('generated_images/')[1];
      if (!path) continue;

      // Subrequest #1: Fetch from Supabase
      const imageResp = await fetch(oldUrl);
      if (!imageResp.ok) continue;

      const imageData = await imageResp.arrayBuffer();

      // Subrequest #2: Upload to R2
      const r2Upload = await fetch(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/generated-images/${path}`, {
        method: 'PUT',
        headers: {
          'Content-Type': imageResp.headers.get('Content-Type') || 'image/jpeg',
          'Authorization': `Bearer ${R2_SECRET}` 
        },
        body: imageData
      });

      if (r2Upload.ok) movedCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      migrated: movedCount, 
      remaining_in_batch: images.length 
    }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
