import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

export async function onRequestPost(context) {
  const { env } = context;

  const s3Supabase = new S3Client({
    region: "us-east-1",
    endpoint: "https://rtklziobobnsqxsozmoq.supabase.co/storage/v1/s3",
    credentials: {
      accessKeyId: env.SUPABASE_S3_ACCESS_KEY,
      secretAccessKey: env.SUPABASE_S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });

  try {
    // 1. List files directly from Storage (skipping the DB check)
    const listParams = {
      Bucket: "generated_images",
      Prefix: "public/", 
    };

    const { Contents } = await s3Supabase.send(new ListObjectsV2Command(listParams));

    if (!Contents || Contents.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No files found in Supabase Storage." }));
    }

    let movedCount = 0;
    // Process a batch of 20 to stay under Cloudflare limits
    const batch = Contents.slice(0, 20); 

    for (const object of batch) {
      if (object.Key.endsWith('/')) continue;

      // 2. Download from Supabase
      const getObj = await s3Supabase.send(new GetObjectCommand({
        Bucket: "generated_images",
        Key: object.Key
      }));

      const bodyContents = await getObj.Body.transformToByteArray();

      // 3. Upload to R2 using the Binding
      await env.MY_BUCKET.put(object.Key, bodyContents, {
        httpMetadata: { contentType: getObj.ContentType || 'image/jpeg' }
      });

      movedCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      migrated_this_batch: movedCount,
      total_found_in_storage: Contents.length 
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    // If the DOMParser error returns, it's because of the AWS SDK version.
    // In that case, we must use the Dashboard "Sippy" tool.
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500 });
  }
}
