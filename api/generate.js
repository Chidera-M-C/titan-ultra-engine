export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;  // Fix: No JSON.parse needed – Next.js parses JSON bodies automatically

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await fetch(`https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/runsync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: { prompt } })
    });

    if (!response.ok) {
      throw new Error(`RunPod error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'COMPLETED' || !data.output?.image) {
      throw new Error(data.error || 'RunPod generation failed');
    }

    res.status(200).json({ status: data.status, output: data.output });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
}
