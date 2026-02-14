// src/lib/imageService.js
import { storage, db, ID } from './appwrite.js';
import { Permission, Role } from 'appwrite';

export const saveAiImage = async (userId, base64String, prompt) => {
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    const file = new File([blob], `gen-${Date.now()}.png`, { type: 'image/png' });

    const uploadedFile = await storage.createFile(
      'generated_images',
      ID.unique(),
      file,
      [
        Permission.read(Role.any()),     // Public view (simplest & most reliable)
        Permission.delete(Role.owner())  // Only owner can delete
      ]
    );

    const fileUrl = storage.getFileView('generated_images', uploadedFile.$id);

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
        Permission.read(Role.owner()),
        Permission.update(Role.owner()),
        Permission.delete(Role.owner())
      ]
    );

    return fileUrl.toString();
  } catch (error) {
    console.error("Appwrite save failed:", error);
    throw error;
  }
};
