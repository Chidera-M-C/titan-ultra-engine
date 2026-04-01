// src/lib/videoService.js
import { supabase } from './supabase';

export const saveVideo = async (userId, base64String, metadata) => {
  const {
    prompt, negativePrompt, aspectRatio, style,
    duration, motionStrength, startImageUrl,
    endImageUrl, characterId, generationType,
    thumbnail,
  } = metadata;

  try {
    // Step 1: Upload video to R2
    const fileName = `${Date.now()}.mp4`;
    const uploadRes = await fetch('/api/upload-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: base64String, userId, fileName }),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error(`R2 video upload failed: ${err.error}`);
    }

    const { publicUrl } = await uploadRes.json();

    // Step 2: Upload thumbnail if provided
    let thumbnailUrl = null;
    if (thumbnail) {
      const thumbFileName = `${Date.now()}_thumb.jpg`;
      const thumbRes = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: thumbnail, userId, fileName: thumbFileName }),
      });
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        thumbnailUrl = thumbData.publicUrl;
      }
    }

    // Step 3: Insert into Supabase videos table
    const { error: dbError } = await supabase.from('videos').insert([{
      user_id:          userId,
      video_url:        publicUrl,
      thumbnail_url:    thumbnailUrl,
      prompt,
      negative_prompt:  negativePrompt || null,
      aspect_ratio:     aspectRatio || '9:16',
      style:            style || null,
      duration:         duration || 4,
      motion_strength:  motionStrength || 0.7,
      start_image_url:  startImageUrl || null,
      end_image_url:    endImageUrl || null,
      character_id:     characterId || null,
      generation_type:  generationType || 'text_to_video',
      category:         generationType === 'image_to_video' ? 'image_to_video' : 'text_to_video',
    }]);

    if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);
    return publicUrl;

  } catch (error) {
    console.error('saveVideo failed:', error.message);
    throw error;
  }
};
