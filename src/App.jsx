import React, { useState } from 'react';
import { 
  Sparkles, Zap, Image as ImageIcon, AlertCircle, Loader2, 
  History, Compass, CreditCard, User, Settings, LogOut, ChevronDown 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('generate'); // generate, gallery, inspiration
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Dummy Data for Preview
  const [credits] = useState(12);
  const [history] = useState([
    { id: 1, url: 'https://via.placeholder.com/300x400', prompt: 'Cinematic portrait...' },
    { id: 2, url: 'https://via.placeholder.com/300x400', prompt: 'Studio lighting...' },
  ]);

  const generateImage = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
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
      {/* --- TOP NAVIGATION --- */}
      <nav className="top-nav">
        <div className="brand">
          <Zap className="logo-icon" size={24} fill="#ec4899" color="#ec4899" />
          <span className="logo-text">Nudely <span className="logo-accent">Uncensored</span></span>
        </div>

        <div className="nav-links">
          <button className={activeTab === 'generate' ? 'active' : ''} onClick={() => setActiveTab('generate')}>
            <Sparkles size={18} /> Generate
          </button>
          <button className={activeTab === 'gallery' ? 'active' : ''} onClick={() => setActiveTab('gallery')}>
            <History size={18} /> My Gallery
          </button>
          <button className={activeTab === 'inspiration' ? 'active' : ''} onClick={() => setActiveTab('inspiration')}>
            <Compass size={18} /> Inspiration
          </button>
        </div>

        <div className="nav-actions">
          <div className="credit-badge" onClick={() => alert("Buy more credits coming soon!")}>
            <CreditCard size={14} />
            <span>{credits} Credits</span>
          </div>
          
          <div className="profile-dropdown">
            <button className="profile-trigger" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <div className="avatar">U</div>
              <ChevronDown size={14} />
            </button>
            
            {showProfileMenu && (
              <div className="dropdown-menu">
                <div className="menu-item"><User size={14} /> Profile</div>
                <div className="menu-item"><Settings size={14} /> Settings</div>
                <hr />
                <div className="menu-item logout"><LogOut size={14} /> Log Out</div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="content">
        
        {/* TAB 1: GENERATOR */}
        {activeTab === 'generate' && (
          <div className="generator-view">
            <div className="canvas-section">
              {image ? (
                <div className="result-wrapper">
                   <img src={image} alt="Generated Content" className="main-image" />
                   <button className="download-btn">Download HD</button>
                </div>
              ) : (
                <div className="placeholder-box">
                  {loading ? (
                    <div className="loader-state">
                      <Loader2 className="spin" size={48} />
                      <p>Applying High-Res Fix...</p>
                    </div>
                  ) : (
                    <div className="idle-state">
                      <ImageIcon size={48} opacity={0.2} />
                      <p>Your creation will appear here</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="controls">
              <div className="control-group">
                <label>Visual Description</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Hyper-realistic, studio lighting, 8k, sharp focus..."
                />
                <p className="hint">Be specific about lighting and textures for better results.</p>
              </div>

              {error && <div className="error-msg"><AlertCircle size={14} /> {error}</div>}

              <button 
                className="generate-btn" 
                onClick={generateImage} 
                disabled={loading || !prompt}
              >
                {loading ? "COOKING..." : "GENERATE IMAGE"}
              </button>
            </aside>
          </div>
        )}

        {/* TAB 2: GALLERY */}
        {activeTab === 'gallery' && (
          <div className="grid-view">
            <h2>Your Generation History</h2>
            <div className="image-grid">
              {history.map(item => (
                <div key={item.id} className="grid-item">
                  <img src={item.url} alt="Past work" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: INSPIRATION */}
        {activeTab === 'inspiration' && (
          <div className="grid-view">
            <h2>Community Inspiration</h2>
            <div className="image-grid">
              {/* Dummy inspiration items */}
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="grid-item inspiration-item">
                  <img src={`https://picsum.photos/seed/${i+20}/300/400`} alt="Inspiration" />
                  <div className="hover-prompt">Click to use prompt</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
