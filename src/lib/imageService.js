import { tables, storage, ID } from './appwrite';

// Use the IDs from your Appwrite Console
const DATABASE_ID = 'main_db'; 
const TABLE_ID = 'images'; 
const BUCKET_ID = 'generated_images';

export const saveAiImage = async (userId, blob, prompt) => {
  try {
    // 1. Convert Blob to a File object for Appwrite
    const fileName = `ai_${Date.now()}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    // 2. Upload to Storage
    const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), file);

    // 3. Get the View URL (getFileView is safer for free tier than getFilePreview)
    const imageUrl = storage.getFileView(BUCKET_ID, uploadedFile.$id);

    // 4. Save metadata to your Table (the Row)
    const result = await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: ID.unique(),
      data: {
        userId: userId,
        imageUrl: imageUrl.href, // Store the permanent link
        prompt: prompt,
        category: 'Explore'
      }
    });

    return result;
  } catch (error) {
    console.error("Critical failure saving to Appwrite:", error);
    throw error;
  }
};
