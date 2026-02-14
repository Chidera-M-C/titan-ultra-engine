// src/lib/imageService.js
import { storage, db, ID } from './appwrite.js'; 

export const saveAiImage = async (userId, base64String, prompt) => {
  try {
    // 1. Clean the Base64 string
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    
    // 2. Convert Base64 to a File Object (Browser compatible)
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    const file = new File([blob], `gen-${Date.now()}.png`, { type: 'image/png' });

    // 3. UPLOAD to Storage Bucket (Crucial missing step!)
    const uploadedFile = await storage.createFile(
      'generated_images', // Bucket ID
      ID.unique(),
      file
    );

    // 4. GENERATE the View URL
    const fileUrl = storage.getFileView('generated_images', uploadedFile.$id);

    // 5. SAVE Metadata to Database
    await db.createDocument(
      'main_db',    // Database ID
      'images',     // Collection ID
      ID.unique(),
      {
        userId: userId,
        imageUrl: fileUrl.toString(), // Now fileUrl is defined!
        prompt: prompt,
        category: 'Explore'
      }
    );

    return true;
  } catch (error) {
    console.error("Appwrite save failed:", error);
    throw error;
  }
};
