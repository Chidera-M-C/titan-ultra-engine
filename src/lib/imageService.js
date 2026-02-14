// src/lib/imageService.js
import { storage, db, ID } from './appwrite.js';
import { Permission, Role } from 'appwrite'; // Import Permission & Role directly from the SDK

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

    // 3. UPLOAD to Storage Bucket with owner read permission
    const uploadedFile = await storage.createFile(
      'generated_images', // Bucket ID
      ID.unique(),
      file,
      [
        Permission.read(Role.owner()),   // Owner can read
        Permission.delete(Role.owner())  // Optional: owner can delete
      ]
    );

    // 4. GENERATE the View URL
    const fileUrl = storage.getFileView('generated_images', uploadedFile.$id);

    // 5. SAVE Metadata to Database with owner permissions
    await db.createDocument(
      'main_db', // Database ID
      'images', // Collection ID
      ID.unique(),
      {
        userId: userId,
        imageUrl: fileUrl.toString(),
        prompt: prompt,
        category: 'Explore'
      },
      [
        Permission.read(Role.owner()),
        Permission.update(Role.owner()),
        Permission.delete(Role.owner())
      ]
    );

    // Return the proper view URL so the UI can use it immediately
    return fileUrl.toString();
  } catch (error) {
    console.error("Appwrite save failed:", error);
    throw error;
  }
};
