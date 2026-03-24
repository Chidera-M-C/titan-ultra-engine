import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

export async function onRequestPost(context) {
  const { env } = context;

  // 1. Setup Supabase Source
  const s3Supabase = new S3Client({
    region: "us-east-1",
    endpoint: "https://rtklziobobnsqxsozmoq.supabase.co/storage/v1/s3",
    credentials: {
      accessKeyId: env.SUPABASE_S3_ACCESS_KEY,
      secretAccessKey: env.SUPABASE_S3_SECRET_KEY,
    },
    forcePathStyle: true, 
  });

  // 2. Setup Cloudflare R2 Destination
  const s3R2 = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    let continuationToken = null;
    let totalMoved = 0;

    do {
      const listParams = {
        Bucket: "generated_images", // Supabase source bucket
        ContinuationToken: continuationToken,
      };

      const { Contents, NextContinuationToken } = await s3Supabase.send(new ListObjectsV2Command(listParams));

      if (!Contents || Contents.length === 0) break;

      for (const object of Contents) {
        if (object.Key.endsWith('/')) continue; // Skip folder markers

        // Stream from Supabase
        const getObj = await s3Supabase.send(new GetObjectCommand({
          Bucket: "generated_images",
          Key: object.Key
        }));

        // Convert stream to Uint8Array for Cloudflare compatibility
        const bodyContents = await getObj.Body.transformToByteArray();

        // Upload to R2 (Target bucket: generated-images)
        await s3R2.send(new PutObjectCommand({
          Bucket: "generated-images", 
          Key: object.Key,
          Body: bodyContents,
          ContentType: getObj.ContentType || 'image/jpeg',
        }));

        totalMoved++;
      }

      continuationToken = NextContinuationToken;
    } while (continuationToken);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully migrated ${totalMoved} images and subfolders.` 
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
