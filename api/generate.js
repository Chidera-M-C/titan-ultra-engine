// api/generate.js
// DELETE THIS LINE: import { saveAiImage } from '../src/lib/imageService.js'; 

export default async function handler(req, res) {
  const { prompt } = JSON.parse(req.body);

  try {
    const response = await fetch(`https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/runsync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: { prompt } })
    });

    const data = await response.json();
    // Just return the output to the frontend. 
    // The frontend will handle the saving.
    res.status(200).json({ output: data.output });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
