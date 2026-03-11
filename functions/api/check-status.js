// api/check-status.js
export default async function handler(req, res) {
  // Only allow POST to keep jobIds private in the body
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Call RunPod status endpoint
    const response = await fetch(`https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/status/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RunPod status error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    /* Possible data.status values: 
       - IN_QUEUE: Waiting for a GPU
       - IN_PROGRESS: GPU is rendering (warming up or generating)
       - COMPLETED: Finished! Output is ready.
       - FAILED: Something went wrong on the pod.
    */

    res.status(200).json(data);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
}
