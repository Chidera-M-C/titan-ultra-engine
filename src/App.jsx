import React, { useState } from 'react';
import './App.css';
import { 
  Sparkles, Zap, Image as ImageIcon, AlertCircle, Loader2, 
  History, Compass, CreditCard, User, Settings, LogOut, 
  ChevronDown, Maximize2 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('generate');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateImage = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio }) // Backend ready for aspect ratio
      });
      const data = await response.json();
      if (data.status === 'COMPLETED' && data.output?.image) {
        setImage(data.output.image);
      } else {
        throw new Error(data.error || "GPU Timeout. Try again.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {/* --- VERTICAL SIDEBAR --- */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <Zap className="brand-icon" size={22} fill="#6366f1" color="#6366f1" />
            <span>Nudely</span>
          </div>
          
          <nav className="side-nav">
            <button className={activeTab === 'generate' ? 'active' : ''} onClick={() => setActiveTab('generate')}>
              <Sparkles size={20} /> Generate
            </button>
            <button className={activeTab === 'gallery' ? 'active' : ''} onClick={() => setActiveTab('gallery')}>
              <History size={20} /> Gallery
            </button>
            <button className={activeTab === 'inspiration' ? 'active' : ''} onClick={() => setActiveTab('inspiration')}>
              <Compass size={20} /> Styles
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="credits-display">
            <CreditCard size={16} />
            <span>12 Credits</span>
          </div>
          <div className="user-profile">
            <div className="avatar-small">JD</div>
            <span>John Doe</span>
            <Settings size={16} className="settings-icon" />
          </div>
        </div>
      </aside>

      {/* --- MAIN STAGE --- */}
      <main className="main-stage">
        {activeTab === 'generate' && (
          <div className="generate-container">
            {/* OUTPUT BOX ABOVE */}
            <section className="output-area">
              {image ? (
                <div className="image-wrapper">
                  <img src={image} alt="Generated" className="final-output" />
                  <div className="image-overlay">
                    <button className="overlay-btn"><Maximize2 size={18} /></button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  {loading ? (
                    <div className="loading-state">
                      <Loader2 className="spin" size={40} />
                      <p>Resolving Anatomy...</p>
                    </div>
                  ) : (
                    <div className="idle-state">
                      <ImageIcon size={40} strokeWidth={1} />
                      <p>Awaiting Instructions</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* COMMAND BAR BELOW (BAKED-IN UI) */}
            <section className="input-area">
              <div className="command-bar">
                <div className="bar-main">
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the visual..."
                    rows="1"
                  />
                </div>
                
                <div className="bar-actions">
                  <div className="aspect-ratio-selector">
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                      <option value="1:1">1:1 Square</option>
                      <option value="16:9">16:9 Cinematic</option>
                      <option value="9:16">9:16 Portrait</option>
                    </select>
                  </div>
                  
                  <button 
                    className="execute-btn"
                    onClick={generateImage}
                    disabled={loading || !prompt}
                  >
                    {loading ? <Loader2 className="spin" size={18} /> : <Zap size={18} fill="currentColor" />}
                    <span>Generate</span>
                  </button>
                </div>
              </div>
              {error && <p className="status-error">{error}</p>}
            </section>
          </div>
        )}

        {activeTab === 'gallery' && <div className="placeholder-view">Gallery coming soon...</div>}
        {activeTab === 'inspiration' && <div className="placeholder-view">Styles coming soon...</div>}
      </main>
    </div>
  );

  
}
