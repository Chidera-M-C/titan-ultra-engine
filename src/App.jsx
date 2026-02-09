import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { 
  Zap, Sparkles, History, Compass, CreditCard, Settings, 
  Maximize2, X, ChevronDown, Send, Image as ImageIcon,
  MoreHorizontal
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('inspiration');
  const [activeCategory, setActiveCategory] = useState('Explore'); 
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('2:3'); 
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState('gallery'); 

  const textareaRef = useRef(null);
  const categories = ['Explore', 'Top', 'People', 'Nature', 'Poster', '3D Render'];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt]);

  const dummyImages = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    url: `https://picsum.photos/seed/${activeCategory}${i * 88}/400/600`, 
    prompt: "Portrait of a cyborg in neon rain..."
  }));

  const generateImage = async () => {
    if (!prompt) return;
    setViewState('result');
    setLoading(true);
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
        
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand">
              <div className="brand-logo">N</div>
              <span className="nav-label">Nudely</span>
            </div>
            
            <nav className="side-nav">
              <button className={activeTab === 'inspiration' ? 'active' : ''} onClick={() => {setActiveTab('inspiration'); setViewState('gallery');}}>
                <Compass size={20} /> <span className="nav-label">Explore</span>
              </button>
              <button className={activeTab === 'gallery' ? 'active' : ''} onClick={() => setActiveTab('gallery')}>
                <History size={20} /> <span className="nav-label">My Images</span>
              </button>
              <button>
                <Settings size={20} /> <span className="nav-label">Settings</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-bottom">
            <div className="credits-card">
               <div className="credits-header">
                 <span className="nav-label">Pro Plan</span>
                 <span className="badge">PRO</span>
               </div>
               <div className="progress-bar"><div className="fill" style={{width: '60%'}}></div></div>
               <p className="nav-label">120 fast left</p>
               <button className="upgrade-btn"><Zap size={14} fill="white"/> <span className="nav-label">Upgrade</span></button>
            </div>
            
            <div className="user-profile">
              <div className="avatar">J</div>
              <div className="user-details nav-label">
                 <span className="name">John Doe</span>
                 <span className="handle">@johndoe</span>
              </div>
              <MoreHorizontal size={16} className="more-icon"/>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <header className="top-header">
            <h1 className="main-title">What will you create?</h1>
            
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
                   <div className="tool-pill">
                      <span className="pill-label">Aspect Ratio</span>
                      <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                        <option value="2:3">2:3 Portrait</option>
                        <option value="1:1">1:1 Square</option>
                        <option value="16:9">16:9 Landscape</option>
                      </select>
                      <ChevronDown size={14} className="pill-icon"/>
                   </div>
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
                     {loading ? <div className="spinner"></div> : <Send size={18} fill="black" color="black" />}
                   </button>
                </div>
              </div>
            </div>
          </header>

          <div className="scrollable-area">
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
