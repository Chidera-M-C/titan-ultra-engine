import React, { useState } from 'react';
import { Sparkles, Zap, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateImage = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    setImage(null);

    try {
      // This calls the /api/generate.js script we set up for Vercel
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();

      if (data.status === 'COMPLETED' && data.output?.image) {
        setImage(data.output.image);
      } else {
        throw new Error(data.error || "GPU Timeout or Error. Check RunPod.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <Zap color="#2563eb" fill="#2563eb" />
        <h1>Titan <span>Ultra</span> NSFW</h1>
      </header>

      <div className="grid">
        <div className="canvas">
          {image ? (
            <img src={image} alt="Generated NSFW Content" />
          ) : (
            <div className="placeholder">
              {loading ? <Loader2 className="spin" size={48} /> : <ImageIcon size={48} />}
              <p>{loading ? "GPU IS COOKING..." : "SYSTEM IDLE"}</p>
            </div>
          )}
        </div>

        <aside>
          <div className="input-box">
            <label>Prompt Directive</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter high-end NSFW visual details..."
            />
            
            {error && (
              <div className="error">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button onClick={generateImage} disabled={loading || !prompt}>
              {loading ? "PROCESSING..." : "EXECUTE GENERATION"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
