export const generateImageRequest = async (prompt) => {
  const response = await fetch('http://localhost:3001/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  const data = await response.json();
  if (data.status === 'COMPLETED') return data.output.image;
  throw new Error("GPU is busy or failed.");
};
