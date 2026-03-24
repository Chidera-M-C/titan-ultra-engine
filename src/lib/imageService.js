import { supabase } from './supabase';

export const saveAiImage = async (userId, base64String, prompt, style = null) => {
  console.log('📸 saveAiImage called. userId:', userId, 'prompt:', prompt?.slice(0, 30));

  try {
    // Step 1: Verify session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`Session error: ${sessionError.message}`);
    if (!session) throw new Error('No active session — user not authenticated');
    console.log('✅ Step 1: Session valid.');

    // Step 2: Upload to R2 via API route
    const fileName = `${Date.now()}.jpg`;
    console.log('⏳ Step 2: Uploading to R2...', fileName);

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
    console.log('✅ Step 2: R2 upload successful. URL:', publicUrl);

    // Step 3: Insert into Supabase images table (unchanged)
    console.log('⏳ Step 3: Inserting into images table...');
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
    console.log('✅ Step 3: DB insert successful.');

    return publicUrl;
  } catch (error) {
    console.error('❌ saveAiImage failed:', error.message);
    throw error;
  }
};
