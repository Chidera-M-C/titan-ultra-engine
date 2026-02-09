import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { 
  Zap, Sparkles, History, Compass, CreditCard, Settings, 
  Maximize2, X, ChevronDown, ArrowUp, Image as ImageIcon,
  MoreHorizontal
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('inspiration');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('2:3'); // Default portrait
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState('gallery'); 

  const textareaRef = useRef(null);

  // Auto-resize textarea logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt]);

  // Dummy Data with PORTRAIT images
  const dummyImages = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    // Using 2:3 aspect ratio dimensions (e.g., 400x600)
    url: `https://picsum.photos/seed/${i * 99}/400/600`, 
    prompt: "Portrait of a cyborg in neon rain..."
  }));

  const generateImage = async () => {
    if (!prompt) return;
    setViewState('result');
    setLoading(true);
    // Simulation
    setTimeout(() => {
        setImage(`https://picsum.photos/seed/${Math.random()}/800/1200`);
        setLoading(false);
    }, 2000);
  };

  const closeResult = () => {
    setViewState('gallery');
    setImage(null);
  };

  return (
    <div className="master-wrapper">
      <div className="app-shell">
        
        {/* --- LEFT SIDEBAR (Dark & Minimal) --- */}
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand">
              <div className="brand-logo">N</div>
              <span>Nudely</span>
            </div>
            
            <nav className="side-nav">
              <button className={activeTab === 'inspiration' ? 'active' : ''} onClick={() => {setActiveTab('inspiration'); setViewState('gallery');}}>
                <Compass size={20} /> <span>Explore</span>
              </button>
              <button className={activeTab === 'gallery' ? 'active' : ''} onClick={() => setActiveTab('gallery')}>
                <History size={20} /> <span>My Images</span>
              </button>
              <button>
                <Settings size={20} /> <span>Settings</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-bottom">
            <div className="credits-card">
               <div className="credits-header">
                 <span>Pro Plan</span>
                 <span className="badge">PRO</span>
               </div>
               <div className="progress-bar"><div className="fill" style={{width: '60%'}}></div></div>
               <p>120 fast generations left</p>
               <button className="upgrade-btn"><Zap size={14} fill="white"/> Upgrade</button>
            </div>
            
            <div className="user-profile">
              <div className="avatar">J</div>
              <div className="user-details">
                 <span className="name">John Doe</span>
                 <span className="handle">@johndoe</span>
              </div>
              <MoreHorizontal size={16} className="more-icon"/>
            </div>
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="main-content">
          
          {/* HEADER SECTION */}
          <header className="top-header">
            <h1>What will you create?</h1>
            
            {/* THE NEW WIDE PROMPT BOX */}
            <div className="prompt-container">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to see..."
                rows={1}
                className="prompt-input"
              />
              
              <div className="prompt-tools">
                <div className="left-tools">
                   {/* Aspect Ratio Pill */}
                   <div className="tool-pill">
                      <span className="pill-label">Aspect Ratio</span>
                      <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                        <option value="2:3">2:3 Portrait</option>
                        <option value="1:1">1:1 Square</option>
                        <option value="16:9">16:9 Landscape</option>
                      </select>
                      <ChevronDown size={14} className="pill-icon"/>
                   </div>
                   
                   {/* Model Version Pill */}
                   <div className="tool-pill">
                      <span className="pill-label">Model v3.0</span>
                   </div>
                </div>

                <div className="right-tools">
                   <button 
                     className="generate-fab"
                     onClick={generateImage}
                     disabled={!prompt || loading}
                   >
                     {loading ? <div className="spinner"></div> : <ArrowUp size={20} strokeWidth={3} />}
                   </button>
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT AREA */}
          <div className="scrollable-area">
            
            {/* CATEGORY TABS */}
            {viewState === 'gallery' && (
               <div className="category-tabs">
                  <span className="tab active">Explore</span>
                  <span className="tab">Top</span>
                  <span className="tab">People</span>
                  <span className="tab">Nature</span>
                  <span className="tab">Poster</span>
                  <span className="tab">3D Render</span>
               </div>
            )}

            {/* GALLERY GRID */}
            {viewState === 'gallery' && (
              <div className="masonry-grid">
                {dummyImages.map((img) => (
                  <div key={img.id} className="pin-item" onClick={() => setPrompt(img.prompt)}>
                    <img src={img.url} alt="Inspiration" loading="lazy" />
                    <div className="pin-overlay">
                       <button className="use-btn">Remix</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* RESULT VIEW */}
            {viewState === 'result' && (
              <div className="result-modal">
                 <div className="result-content">
                    <button className="close-result" onClick={closeResult}><X size={24}/></button>
                    <div className="image-stage">
                        {image ? (
                            <img src={image} alt="Generated" className="gen-result"/>
                        ) : (
                            <div className="loading-state">
                                <div className="pulse-loader"></div>
                                <p>Generating your masterpiece...</p>
                            </div>
                        )}
                    </div>
                 </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
