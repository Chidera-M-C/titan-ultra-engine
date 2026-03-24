import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { supabase } from '../supabase'; // Adjust path to your supabase config

// 1. Setup Supabase Source (The "Old" Warehouse)
const s3Supabase = new S3Client({
  region: "us-east-1",
  endpoint: "https://rtklziobobnsqxsozmoq.supabase.co/storage/v1/s3",
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY,
  },
  forcePathStyle: true, // CRITICAL: This fixes the Supabase error
});

// 2. Setup Cloudflare R2 (The "New" Warehouse)
const s3R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  // Only allow you to run this (optional security check)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    console.log("🚀 Starting Full Migration...");
    let continuationToken = null;
    let totalMoved = 0;

    do {
      const listParams = {
        Bucket: "generated_images", // Your Supabase Bucket Name
        ContinuationToken: continuationToken,
      };

      const { Contents, NextContinuationToken } = await s3Supabase.send(new ListObjectsV2Command(listParams));

      if (!Contents) break;

      for (const object of Contents) {
        // Skip folders themselves (S3 keys ending in /)
        if (object.Key.endsWith('/')) continue;

        // Fetch from Supabase
        const getObj = await s3Supabase.send(new GetObjectCommand({
          Bucket: "generated_images",
          Key: object.Key
        }));

        // Convert stream to Buffer/Uint8Array
        const streamToBuffer = async (stream) => {
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        };
        const buffer = await streamToBuffer(getObj.Body);

        // Upload to R2 (Preserves full path like userId/folder/img.jpg)
        await s3R2.send(new PutObjectCommand({
          Bucket: "generated-images", // Your Cloudflare Bucket Name
          Key: object.Key,
          Body: buffer,
          ContentType: getObj.ContentType || 'image/jpeg',
        }));

        totalMoved++;
        console.log(`✅ Moved: ${object.Key}`);
      }

      continuationToken = NextContinuationToken;
    } while (continuationToken);

    return res.status(200).json({ success: true, message: `Moved ${totalMoved} images including all subfolders.` });

  } catch (error) {
    console.error("❌ Migration Failed:", error);
    return res.status(500).json({ error: error.message });
  }
}
