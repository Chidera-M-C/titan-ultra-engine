// api/generate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body; 

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // FIX: Changed endpoint from /runsync to /run
    // This returns a jobId immediately so Vercel doesn't timeout.
    const response = await fetch(`https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: { prompt } })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RunPod error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Data will now contain { id: "job-id", status: "IN_QUEUE" }
    // We send this ID back to the frontend immediately.
    res.status(200).json({ jobId: data.id, status: data.status });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
}
