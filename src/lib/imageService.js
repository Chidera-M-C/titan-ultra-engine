import { supabase } from './supabase';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_PUBLIC_URL = "https://pub-b591e1b05eb8435da2f642972e097ad6.r2.dev";

export const saveAiImage = async (userId, base64String, prompt, style = null) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    // Convert base64 to Uint8Array for R2 upload
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const binaryData = new Uint8Array(byteNumbers);

    const fileName = `${userId}/${Date.now()}.jpg`;

    // Upload to Cloudflare R2
    await r2Client.send(new PutObjectCommand({
      Bucket: "generated-images",
      Key: fileName,
      Body: binaryData,
      ContentType: 'image/jpeg',
    }));

    const publicUrl = `${R2_PUBLIC_URL}/${fileName}`;

    // Save the Cloudflare URL to your existing Supabase table
    const { error: dbError } = await supabase
      .from('images')
      .insert([{
        user_id: userId,
        image_url: publicUrl,
        prompt: prompt,
        category: 'Explore',
        style: style
      }]);

    if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

    return publicUrl;
  } catch (error) {
    console.error('❌ saveAiImage failed:', error.message);
    throw error;
  }
};
