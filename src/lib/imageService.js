import { supabase } from './supabase';

export const saveAiImage = async (userId, base64String, prompt, style = null) => {
  console.log('📸 saveAiImage called. userId:', userId, 'prompt:', prompt?.slice(0, 30));

  if (!userId) {
    throw new Error('No userId provided — user not authenticated');
  }

  try {
    // Step 1: Upload to R2 via API route
    const fileName = `${Date.now()}.jpg`;
    console.log('⏳ Step 1: Uploading to R2...', fileName);

    const uploadRes = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64: base64String,
        userId,
        fileName,
      }),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error(`R2 upload failed: ${err.error}`);
    }

    const { publicUrl } = await uploadRes.json();
    console.log('✅ Step 1: R2 upload successful. URL:', publicUrl);

    // Step 2: Insert into Supabase images table
    console.log('⏳ Step 2: Inserting into images table...');
    const { error: dbError } = await supabase
      .from('images')
      .insert([{
        user_id: userId,
        image_url: publicUrl,
        prompt: prompt,
        category: 'Explore',
        style: style,
      }]);

    if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);
    console.log('✅ Step 2: DB insert successful.');

    return publicUrl;
  } catch (error) {
    console.error('❌ saveAiImage failed:', error.message);
    throw error;
  }
};
