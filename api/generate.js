import { saveAiImage } from '../src/lib/imageService.js'; // We'll create this next
import { useAuth } from '../context/AuthContext';

const handleGenerate = async () => {
  setLoading(true);
  try {
    // 1. Call your RunPod handler (the code you just showed me)
    const res = await fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();

    // RunPod usually returns { output: "data:image/png;base64,..." }
    const base64Image = data.output; 

    // 2. Save it to Appwrite
    if (user && base64Image) {
      await saveAiImage(user.$id, base64Image, prompt);
      alert("Image generated and saved forever!");
    }
  } catch (err) {
    console.error("Generation failed", err);
  } finally {
    setLoading(false);
  }
};
