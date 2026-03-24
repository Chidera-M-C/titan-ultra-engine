export async function onRequestPost(context) {
  const { env } = context;

  // 1. Setup Configuration from your Environment Variables
  const SUPABASE_PROJECT_ID = "rtklziobobnsqxsozmoq";
  const R2_PUBLIC_URL = "https://pub-b591e1b05eb8435da2f642972e097ad6.r2.dev";
  
  // We'll use the Supabase REST API to get the list of images to move
  const SUPABASE_REST_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/images?select=image_url`;

  try {
    console.log("🚀 Fetching image list from Supabase Database...");

    // 2. Get the list of all images currently in your DB
    const listResponse = await fetch(SUPABASE_REST_URL, {
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
      }
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to fetch image list: ${listResponse.statusText}`);
    }

    const images = await listResponse.json();
    let movedCount = 0;
    let errorCount = 0;

    console.log(`Found ${images.length} images to process.`);

    // 3. Loop through and move each one
    for (const row of images) {
      const oldUrl = row.image_url;

      // Only process images that are still pointing to Supabase
      if (!oldUrl || !oldUrl.includes('supabase.co')) continue;

      try {
        // Extract the path (e.g., "userId/image.jpg")
        // This assumes your URL structure is .../public/generated_images/path
        const path = oldUrl.split('generated_images/')[1];
        if (!path) continue;

        // Fetch the actual image data from Supabase Storage
        const imageResp = await fetch(oldUrl);
        if (!imageResp.ok) {
          console.error(`Could not fetch image file: ${oldUrl}`);
          errorCount++;
          continue;
        }

        const imageData = await imageResp.arrayBuffer();

        // 4. Upload directly to R2 using the S3-compatible API via Fetch
        // We use the R2 worker binding if available, or a direct PUT request
        // Since we are in a Worker, we can use the R2 bucket binding if you linked it
        // If not, we use the Public R2 API
        const r2Upload = await fetch(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/generated-images/${path}`, {
          method: 'PUT',
          headers: {
            'Content-Type': imageResp.headers.get('Content-Type') || 'image/jpeg',
            'Authorization': `Bearer ${env.R2_SECRET_ACCESS_KEY}` 
          },
          body: imageData
        });

        if (r2Upload.ok) {
          movedCount++;
        } else {
          errorCount++;
        }
      } catch (innerError) {
        console.error(`Error moving ${oldUrl}:`, innerError);
        errorCount++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      migrated: movedCount, 
      failed: errorCount,
      message: "Migration cycle complete." 
    }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
