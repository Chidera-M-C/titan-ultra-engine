// src/lib/imageService.js
import { storage, db, ID } from './appwrite.js';

export const saveAiImage = async (userId, base64String, prompt) => {
  try {
    // 1. Handle JPEG base64 from RunPod
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    // 2. Save as JPEG
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    const file = new File([blob], `gen-${Date.now()}.jpg`, { type: 'image/jpeg' });

    // 3. Upload
    const uploadedFile = await storage.createFile(
      'generated_images',
      'unique()', // Use 'unique()' helper or ID.unique()
      file
    );

    // 4. Get URL
    const fileUrl = storage.getFileView('generated_images', uploadedFile.$id);

    // 5. Save Metadata
    await db.createDocument('main_db', 'images', 'unique()', {
      userId: userId,
      imageUrl: fileUrl.toString(),
      prompt: prompt,
      category: 'Explore'
    });

    return fileUrl.toString();
  } catch (error) {
    console.error("New Project Save Failed:", error);
    throw error;
  }
};
