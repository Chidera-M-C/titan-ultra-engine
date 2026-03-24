import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

export async function onRequestPost(context) {
  const { env } = context;

  // 1. Setup Supabase Source (The "Old" Warehouse)
  const s3Supabase = new S3Client({
    region: "us-east-1",
    endpoint: "https://rtklziobobnsqxsozmoq.supabase.co/storage/v1/s3",
    credentials: {
      accessKeyId: env.SUPABASE_S3_ACCESS_KEY,
      secretAccessKey: env.SUPABASE_S3_SECRET_KEY,
    },
    forcePathStyle: true, // Fixes the Supabase S3 error
  });

  // 2. Setup Cloudflare R2 Destination (The "New" Warehouse)
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

    console.log("🚀 Starting Full Migration from Supabase to R2...");

    do {
      const listParams = {
        Bucket: "generated_images", // Supabase source bucket (underscore)
        Prefix: "public/",          // CRITICAL: Supabase stores public files here
        ContinuationToken: continuationToken,
      };

      const { Contents, NextContinuationToken } = await s3Supabase.send(new ListObjectsV2Command(listParams));

      if (!Contents || Contents.length === 0) {
        console.log("No files found in this batch.");
        break;
      }

      for (const object of Contents) {
        // Skip folder placeholders
        if (object.Key.endsWith('/')) continue;

        // 1. Download from Supabase
        const getObj = await s3Supabase.send(new GetObjectCommand({
          Bucket: "generated_images",
          Key: object.Key
        }));

        // 2. Convert stream to Uint8Array for Cloudflare Worker environment
        const bodyContents = await getObj.Body.transformToByteArray();

        // 3. Upload to R2 (Target bucket: generated-images with hyphen)
        // Note: object.Key includes the "public/" prefix, keeping structure intact
        await s3R2.send(new PutObjectCommand({
          Bucket: "generated-images", 
          Key: object.Key,
          Body: bodyContents,
          ContentType: getObj.ContentType || 'image/jpeg',
        }));

        totalMoved++;
        console.log(`✅ Migrated: ${object.Key}`);
      }

      continuationToken = NextContinuationToken;
    } while (continuationToken);

    return new Response(JSON.stringify({ 
      success: true, 
      count: totalMoved,
      message: `Successfully migrated ${totalMoved} files (including folders).` 
    }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error("Migration Error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
