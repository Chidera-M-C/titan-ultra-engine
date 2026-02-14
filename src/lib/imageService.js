// src/lib/imageService.js
import { storage, db, ID } from './appwrite.js';
// Removed Permission/Role import - we use raw strings for max compatibility

export const saveAiImage = async (userId, base64String, prompt) => {
  try {
    // 1. Clean the Base64 string
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
   
    // 2. Convert Base64 to a File Object
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    const file = new File([blob], `gen-${Date.now()}.png`, { type: 'image/png' });

    // 3. UPLOAD to Storage Bucket - public read, no owner-specific perms (storage doesn't support "owner")
    const uploadedFile = await storage.createFile(
      'generated_images',
      ID.unique(),
      file,
      ['read("any")']  // Makes the image publicly viewable (simplest & most reliable)
      // You can add delete perms later if needed, e.g. via a server function
    );

    // 4. GENERATE the View URL
    const fileUrl = storage.getFileView('generated_images', uploadedFile.$id);

    // 5. SAVE Metadata to Database - owner-only permissions (databases DO support "owner")
    await db.createDocument(
      'main_db',
      'images',
      ID.unique(),
      {
        userId: userId,
        imageUrl: fileUrl.toString(),
        prompt: prompt,
        category: 'Explore'
      },
      [
        'read("owner")',
        'update("owner")',
        'delete("owner")'
      ]
    );

    // Return the proper view URL
    return fileUrl.toString();
  } catch (error) {
    console.error("Appwrite save failed:", error);
    throw error;
  }
};
