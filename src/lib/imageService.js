import { storage, tables, ID } from './appwrite';

export const saveAiImage = async (userId, base64String, prompt) => {
  try {
    // 1. Clean the base64 string and convert to a Blob
    // Remove the "data:image/png;base64," prefix if it exists
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    // 2. Upload to Appwrite Storage
    const file = new File([blob], `gen_${Date.now()}.png`, { type: 'image/png' });
    const uploadedFile = await storage.createFile('generated_images', ID.unique(), file);

    // 3. Get the permanent URL
    const fileUrl = storage.getFileView('generated_images', uploadedFile.$id);

    // 4. Save to your Table (The 2026 TablesDB way)
    await tables.createRow({
      databaseId: 'main_db',
      tableId: 'images',
      rowId: ID.unique(),
      data: {
        userId: userId,
        imageUrl: fileUrl.href,
        prompt: prompt,
        category: 'Explore'
      }
    });

    return true;
  } catch (error) {
    console.error("Appwrite save failed:", error);
    throw error;
  }
};
