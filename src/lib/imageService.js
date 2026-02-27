import { supabase } from './supabase';

export const saveAiImage = async (userId, base64String, prompt) => {
  try {
    // 1. Clean the Base64 (Handling JPEG from RunPod)
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    
    // 2. Convert to Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const fileName = `${userId}/${Date.now()}.jpg`;

    // 3. Upload to Supabase Storage (Bucket: 'generated_images')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated_images')
      .upload(fileName, blob, { 
        contentType: 'image/jpeg',
        upsert: true 
      });

    if (uploadError) throw uploadError;

    // 4. Get the Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated_images')
      .getPublicUrl(fileName);

    // 5. Save Metadata to Database (Table: 'images')
    const { error: dbError } = await supabase
      .from('images')
      .insert([{
        user_id: userId,
        image_url: publicUrl,
        prompt: prompt,
        category: 'Explore'
      }]);

    if (dbError) throw dbError;

    return publicUrl;
  } catch (error) {
    console.error("Supabase Save Error:", error);
    throw error;
  }
};
