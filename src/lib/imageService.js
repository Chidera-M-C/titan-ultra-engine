import { supabase } from './supabase';

export const saveAiImage = async (userId, base64String, prompt, style = null) => {
  console.log('📸 saveAiImage called. userId:', userId, 'prompt:', prompt?.slice(0, 30));

  try {
    // Step 1: Verify we have an active session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`Session error: ${sessionError.message}`);
    if (!session) throw new Error('No active session — user not authenticated');
    console.log('✅ Step 1: Session valid. User:', session.user.id);

    // Step 2: Clean base64
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    console.log('✅ Step 2: Base64 cleaned. Length:', base64Data.length);

    // Step 3: Convert to Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    console.log('✅ Step 3: Blob created. Size:', blob.size, 'bytes');

    // Step 4: Upload to Supabase Storage
    const fileName = `${userId}/${Date.now()}.jpg`;
    console.log('⏳ Step 4: Uploading to storage bucket "generated_images"...', fileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated_images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
    console.log('✅ Step 4: Upload successful.', uploadData);

    // Step 5: Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated_images')
      .getPublicUrl(fileName);
    console.log('✅ Step 5: Public URL:', publicUrl);

    // Step 6: Insert into images table
    console.log('⏳ Step 6: Inserting into images table...');
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
    console.log('✅ Step 6: DB insert successful.');

    return publicUrl;
  } catch (error) {
    console.error('❌ saveAiImage failed at:', error.message);
    throw error;
  }
};
