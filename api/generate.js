export default async function handler(req, res) {
  const { prompt } = req.body;

  try {
    const response = await fetch(`https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/runsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`
      },
      body: JSON.stringify({ input: { prompt } })
    });

    const data = await response.json();
    
    if (response.status !== 200) {
      console.error("RunPod Error:", data);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Fetch Error:", error);
    return res.status(500).json({ error: "GPU Handshake Failed", details: error.message });
  }
}
