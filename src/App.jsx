import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { 
  Sparkles, Zap, Image as ImageIcon, AlertCircle, Loader2, 
  History, Compass, CreditCard, Settings, Maximize2, X
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('inspiration'); // Default to inspiration logic
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewState, setViewState] = useState('gallery'); // 'gallery' or 'result'

  // Dummy Inspiration Data (50 items)
  const dummyImages = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    url: `https://picsum.photos/seed/${i * 123}/300/${i % 2 === 0 ? 400 : 300}`, // Varied aspect ratios
    prompt: "Cyberpunk aesthetic, neon lights, 8k resolution..."
  }));

  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt]);

  const generateImage = async () => {
    if (!prompt) return;
    
    // Switch to result view immediately to show loader
    setViewState('result');
    setLoading(true);
    setError(null);
    setImage(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio })
      });
      const data = await response.json();
      if (data.status === 'COMPLETED' && data.output?.image) {
        setImage(data.output.image);
      } else {
        throw new Error(data.error || "Generation failed.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeResult = () => {
    setViewState('gallery');
    setImage(null);
    setPrompt('');
  };

  return (
    <div className="master-wrapper">
      <div className="app-shell">
        
        {/* --- FIXED SIDEBAR --- */}
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand">
              <Zap className="brand-icon" size={20} fill="#6366f1" color="#6366f1" />
              <span>Nudely</span>
            </div>
            
            <nav className="side-nav">
              <button className={activeTab === 'inspiration' ? 'active' : ''} onClick={() => {setActiveTab('inspiration'); setViewState('gallery');}}>
                <Compass size={18} /> <span>Explore</span>
              </button>
              <button className={activeTab === 'gallery' ? 'active' : ''} onClick={() => setActiveTab('gallery')}>
                <History size={18} /> <span>History</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-bottom">
            <div className="credits-display">
              <CreditCard size={14} />
              <span>12 Credits</span>
            </div>
            <div className="user-profile">
              <div className="avatar-small">JD</div>
              <div className="user-info">
                <span className="user-name">John Doe</span>
                <span className="user-plan">Pro Plan</span>
              </div>
              <Settings size={16} className="settings-icon" />
            </div>
          </div>
        </aside>

        {/* --- MAIN STAGE --- */}
        <main className="main-stage">
          
          {/* TOP: PROMPT BAR (Always Visible) */}
          <header className="prompt-header">
            <div className="prompt-wrapper">
              <div className="input-group">
                <Sparkles size={18} className="input-icon" />
                <textarea 
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your imagination..."
                  rows={1}
                />
              </div>
              
              <div className="controls-group">
                 <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="ratio-select">
                    <option value="1:1">1:1</option>
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                 </select>
                 
                 <button 
                    className="generate-btn" 
                    onClick={generateImage}
                    disabled={loading || !prompt}
                 >
                   {loading ? <Loader2 className="spin" size={16} /> : "Generate"}
                 </button>
              </div>
            </div>
          </header>

          {/* MIDDLE: DYNAMIC CONTENT */}
          <div className="content-scroll-area">
            
            {/* VIEW 1: INSPIRATION GRID (Default) */}
            {viewState === 'gallery' && (
              <div className="masonry-grid">
                {dummyImages.map((img) => (
                  <div key={img.id} className="grid-item" onClick={() => setPrompt(img.prompt)}>
                    <img src={img.url} alt="Inspiration" loading="lazy" />
                    <div className="item-overlay">
                      <p>Try this style</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW 2: OUTPUT RESULT (Active) */}
            {viewState === 'result' && (
              <div className="result-container">
                 <div className="result-card">
                    <div className="result-header">
                       <h3>Generation Result</h3>
                       <button onClick={closeResult} className="close-btn"><X size={18}/></button>
                    </div>

                    <div className="image-stage">
                       {image ? (
                         <img src={image} alt="Generated" className="generated-img" />
                       ) : (
                         <div className="loading-placeholder">
                           <Loader2 className="spin" size={48} color="#6366f1" />
                           <p>{loading ? "Dreaming up your image..." : "Preparing..."}</p>
                         </div>
                       )}
                    </div>

                    {error && <div className="error-banner"><AlertCircle size={16}/> {error}</div>}
                    
                    {image && (
                      <div className="result-actions">
                        <button className="action-btn primary">Download HD</button>
                        <button className="action-btn secondary">Upscale 4x</button>
                      </div>
                    )}
                 </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
