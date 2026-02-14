import { storage, db, ID } from './appwrite';

export const saveAiImage = async (userId, base64String, prompt) => {
  try {
    // 1. Convert Base64 string to a Blob
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    // 2. Upload to Appwrite Storage Bucket
    const file = new File([blob], `gen_${Date.now()}.png`, { type: 'image/png' });
    const uploadedFile = await storage.createFile('generated_images', ID.unique(), file);

    // 3. Get the direct file URL
    const fileUrl = storage.getFileView('generated_images', uploadedFile.$id);

    // 4. Save metadata to your Table (using universal 'createDocument')
    await db.createDocument(
      'main_db',     // Your Database ID
      'images',      // Your Table ID
      ID.unique(),   // Unique Document/Row ID
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
