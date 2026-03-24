export async function onRequestPost(context) {
  const { env } = context;

  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY; 
  const R2_ACCOUNT_ID = env.R2_ACCOUNT_ID;
  const R2_SECRET = env.R2_SECRET_ACCESS_KEY;

  try {
    // 1. Fetch ALL images from the DB
    const listResponse = await fetch(`${SUPABASE_URL}/rest/v1/images?select=image_url`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const images = await listResponse.json();
    let movedCount = 0;
    const LIMIT = 45; // Cloudflare subrequest limit is 50

    for (const row of images) {
      if (movedCount >= LIMIT) break; // STOP before we hit the limit

      const oldUrl = row.image_url;
      if (!oldUrl || !oldUrl.includes('supabase.co')) continue;

      const path = oldUrl.split('generated_images/')[1];
      if (!path) continue;

      // Check if it already exists in R2 to avoid double-work
      // (This counts as a subrequest, so we stay under 50)
      const imageResp = await fetch(oldUrl);
      if (!imageResp.ok) continue;

      const imageData = await imageResp.arrayBuffer();

      await fetch(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/generated-images/${path}`, {
        method: 'PUT',
        headers: {
          'Content-Type': imageResp.headers.get('Content-Type') || 'image/jpeg',
          'Authorization': `Bearer ${R2_SECRET}` 
        },
        body: imageData
      });

      movedCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      migrated: movedCount, 
      message: movedCount > 0 ? "Batch complete. Click Send again to move the next 45." : "All images migrated!" 
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
