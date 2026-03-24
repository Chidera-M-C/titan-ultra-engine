export async function onRequestPost(context) {
  const { env } = context;

  // Use the keys from your Cloudflare Environment Variables
  const SUPABASE_URL = env.SUPABASE_URL || "https://rtklziobobnsqxsozmoq.supabase.co";
  const SUPABASE_KEY = env.SUPABASE_ANON_KEY; 
  const R2_ACCOUNT_ID = env.R2_ACCOUNT_ID;
  const R2_SECRET = env.R2_SECRET_ACCESS_KEY;

  try {
    console.log("🚀 Requesting image list from Supabase...");

    // 1. Fetch the list of image URLs from your 'images' table
    const listResponse = await fetch(`${SUPABASE_URL}/rest/v1/images?select=image_url`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      throw new Error(`Supabase Auth Failed: ${listResponse.status} - ${errorText}`);
    }

    const images = await listResponse.json();
    let movedCount = 0;

    // 2. Loop and Pipe
    for (const row of images) {
      const oldUrl = row.image_url;
      if (!oldUrl || !oldUrl.includes('supabase.co')) continue;

      // Extract the path after 'generated_images/'
      const pathParts = oldUrl.split('generated_images/');
      const path = pathParts[1];
      if (!path) continue;

      // Download from Supabase
      const imageResp = await fetch(oldUrl);
      if (!imageResp.ok) continue;

      const imageData = await imageResp.arrayBuffer();

      // Upload to R2 (Bucket: generated-images)
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
      message: "Check your R2 bucket now!" 
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
