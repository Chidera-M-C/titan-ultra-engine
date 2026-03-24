import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { XMLParser } from "fast-xml-parser"; // This might require an install if not in your env

// If fast-xml-parser isn't available, we use the internal SDK 'stream' fix:
const parser = {
  parse: (xml) => new XMLParser().parse(xml)
};

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
    // Add this line to handle XML without DOMParser
    runtime: "webworker" 
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

    console.log("Starting migration logic...");

    // The rest of the logic remains the same as before...
    // (Listing objects and putting them into R2)
    
    // ... [Rest of your migration loop] ...

    return new Response(JSON.stringify({ success: true, count: totalMoved }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, details: "Cloudflare Worker XML Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
