// src/lib/imageService.js
import { storage, db, ID } from './appwrite.js'; // MUST ADD .js HERE

export const saveAiImage = async (userId, base64String, prompt) => {
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    // ... (rest of your existing atob/blob logic is fine for the BROWSER)
    
    // 4. Save metadata
    await db.createDocument(
      'main_db', 
      'images', 
      ID.unique(),
      {
        userId: userId,
        imageUrl: fileUrl.href,
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
