import React, { useState } from 'react';
import './App.css';
import { Sparkles, Zap, Image as ImageIcon, AlertCircle, Loader2, History, Compass, CreditCard, Settings, Maximize2, Download } from 'lucide-react';

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
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-content">
          <div className="brand">
            <Sparkles size={24} />
            <span>Nudely</span>
          </div>

          <nav className="nav-menu">
            <button 
              className={activeTab === 'generate' ? 'active' : ''} 
              onClick={() => setActiveTab('generate')}
            >
              <Zap size={18} />
              <span>Generate</span>
            </button>
            <button 
              className={activeTab === 'gallery' ? 'active' : ''} 
              onClick={() => setActiveTab('gallery')}
            >
              <ImageIcon size={18} />
              <span>Gallery</span>
            </button>
            <button 
              className={activeTab === 'inspiration' ? 'active' : ''} 
              onClick={() => setActiveTab('inspiration')}
            >
              <Compass size={18} />
              <span>Styles</span>
            </button>
          </nav>

          <div className="sidebar-spacer"></div>

          <div className="sidebar-footer">
            <div className="credits-card">
              <Sparkles size={16} />
              <span>12 Credits</span>
            </div>

            <div className="user-card">
              <div className="avatar">JD</div>
              <div className="user-details">
                <div className="user-name">John Doe</div>
                <div className="user-tier">Pro Plan</div>
              </div>
              <Settings size={16} className="settings-btn" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'generate' && (
          <div className="generator-view">
            {/* Canvas Area */}
            <div className="canvas-area">
              {image ? (
                <div className="image-wrapper">
                  <img src={image} alt="Generated" className="generated-image" />
                  <button className="download-btn">
                    <Download size={16} />
                  </button>
                </div>
              ) : (
                <div className="canvas-empty">
                  {loading ? (
                    <div className="loading-state">
                      <Loader2 className="spinner" size={32} />
                      <p>Creating magic...</p>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <ImageIcon size={48} strokeWidth={1.5} />
                      <p>Your creation will appear here</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Control Panel */}
            <div className="control-panel">
              <div className="prompt-section">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to create..."
                  className="prompt-input"
                  rows="3"
                />
              </div>

              <div className="controls-row">
                <select 
                  value={aspectRatio} 
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="aspect-select"
                >
                  <option value="1:1">Square (1:1)</option>
                  <option value="16:9">Landscape (16:9)</option>
                  <option value="9:16">Portrait (9:16)</option>
                  <option value="4:3">Classic (4:3)</option>
                </select>

                <button 
                  className="generate-btn" 
                  onClick={generateImage}
                  disabled={loading || !prompt}
                >
                  {loading ? (
                    <>
                      <Loader2 className="spinner" size={18} />
                      <span>Generating</span>
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab !== 'generate' && (
          <div className="coming-soon">
            <Compass size={48} strokeWidth={1.5} />
            <h2>Coming Soon</h2>
            <p>This feature is currently in development</p>
          </div>
        )}
      </main>
    </div>
  );
}
