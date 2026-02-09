import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { 
  Zap, Sparkles, History, Compass, CreditCard, Settings, 
  Maximize2, X, ChevronDown, ArrowUp, Image as ImageIcon,
  MoreHorizontal
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('inspiration');
  // New state for the category tabs
  const [activeCategory, setActiveCategory] = useState('Explore'); 
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('2:3'); 
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState('gallery'); 

  const textareaRef = useRef(null);
  
  // List of categories for the nav
  const categories = ['Explore', 'Top', 'People', 'Nature', 'Poster', '3D Render'];

  // Auto-resize textarea logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt]);

  // Dummy Data - Refreshes based on category to simulate "Page" change
  const dummyImages = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    // We add activeCategory to seed to simulate different content per tab
    url: `https://picsum.photos/seed/${activeCategory}${i * 99}/400/600`, 
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
        
        {/* --- LEFT SIDEBAR --- */}
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
            {/* Aesthetic Font applied here */}
            <h1 className="aesthetic-title">What will you create?</h1>
            
            {/* THE WIDE PROMPT BOX */}
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
                     {loading ? <div className="spinner"></div> : <ArrowUp size={24} strokeWidth={2.5} />}
                   </button>
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT AREA */}
          <div className="scrollable-area">
            
            {/* RESPONSIVE CATEGORY TABS */}
            {viewState === 'gallery' && (
               <div className="category-tabs">
                  {categories.map((cat) => (
                    <span 
                      key={cat} 
                      className={`tab ${activeCategory === cat ? 'active' : ''}`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat}
                    </span>
                  ))}
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
