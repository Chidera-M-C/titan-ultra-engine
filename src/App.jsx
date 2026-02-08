import React, { useState } from 'react';
import './App.css';
import { 
  Sparkles, Zap, Image as ImageIcon, AlertCircle, Loader2, 
  History, Compass, CreditCard, Settings, Maximize2 
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

  return (
    <div className="app-shell">
      {/* --- FIXED SIDEBAR --- */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <Zap className="brand-icon" size={20} fill="#6366f1" color="#6366f1" />
            <span>Nudely</span>
          </div>
          
          <nav className="side-nav">
            <button className={activeTab === 'generate' ? 'active' : ''} onClick={() => setActiveTab('generate')}>
              <Sparkles size={18} /> <span>Generate</span>
            </button>
            <button className={activeTab === 'gallery' ? 'active' : ''} onClick={() => setActiveTab('gallery')}>
              <History size={18} /> <span>Gallery</span>
            </button>
            <button className={activeTab === 'inspiration' ? 'active' : ''} onClick={() => setActiveTab('inspiration')}>
              <Compass size={18} /> <span>Styles</span>
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
        {activeTab === 'generate' && (
          <div className="generate-layout">
            {/* OUTPUT BOX ABOVE */}
            <div className="output-container">
              {image ? (
                <div className="image-wrapper">
                  <img src={image} alt="Generated" className="final-output" />
                  <button className="expand-btn"><Maximize2 size={16} /></button>
                </div>
              ) : (
                <div className="empty-canvas">
                  {loading ? (
                    <div className="loader-box">
                      <Loader2 className="spin" size={32} />
                      <p>Rendering Details...</p>
                    </div>
                  ) : (
                    <div className="idle-box">
                      <ImageIcon size={48} strokeWidth={1} />
                      <p>Visual output will appear here</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* COMMAND BAR BELOW */}
            <div className="command-center">
              <div className="command-bar">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your vision..."
                  rows="2"
                />
                
                <div className="bar-footer">
                  <div className="selector-wrapper">
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                      <option value="1:1">1:1 Square</option>
                      <option value="16:9">16:9 Cinema</option>
                      <option value="9:16">9:16 Mobile</option>
                    </select>
                  </div>
                  
                  <button 
                    className="execute-btn"
                    onClick={generateImage}
                    disabled={loading || !prompt}
                  >
                    {loading ? <Loader2 className="spin" size={16} /> : <Zap size={16} fill="currentColor" />}
                    <span>Generate</span>
                  </button>
                </div>
              </div>
              {error && <p className="error-text"><AlertCircle size={12} /> {error}</p>}
            </div>
          </div>
        )}

        {activeTab !== 'generate' && (
          <div className="placeholder-view">Feature arriving soon.</div>
        )}
      </main>
    </div>
  );
}
