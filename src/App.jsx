import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { 
  Zap, Sparkles, History, Compass, CreditCard, Settings, 
  Maximize2, X, ChevronDown, Send, User, Image as ImageIcon,
  MoreHorizontal
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('explore');
  const [activeCategory, setActiveCategory] = useState('Explore'); 
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('2:3'); 
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState('gallery'); 

  const textareaRef = useRef(null);
  
  const categories = ['Explore', 'Top', 'People', 'Nature', 'Poster', '3D Render'];

  // Fix: Better auto-resize textarea logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [prompt]);

  const getDummyImages = () => {
    const categorySeeds = {
      'Explore': 100,
      'Top': 200,
      'People': 300,
      'Nature': 400,
      'Poster': 500,
      '3D Render': 600
    };
    
    const baseSeed = categorySeeds[activeCategory] || 100;
    
    return Array.from({ length: 50 }, (_, i) => ({
      id: `${activeCategory}-${i}`,
      url: `https://picsum.photos/seed/${baseSeed + i}/400/600`,
      prompt: `Amazing ${activeCategory.toLowerCase()} style artwork #${i + 1}`
    }));
  };

  const generateImage = async () => {
    if (!prompt || loading) return;
    setViewState('result');
    setLoading(true);
    setImage(null);
    
    setTimeout(() => {
      const dimensions = aspectRatio === '16:9' ? '1200/675' : 
                        aspectRatio === '1:1' ? '800/800' : '800/1200';
      setImage(`https://picsum.photos/seed/${Date.now()}/${dimensions}`);
      setLoading(false);
    }, 2000);
  };

  const closeResult = () => {
    setViewState('gallery');
    setImage(null);
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    if (tab === 'explore') {
      setViewState('gallery');
    } else {
      setViewState('empty');
    }
  };

  const handleImageClick = (imagePrompt) => {
    setPrompt(imagePrompt);
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
              <button 
                className={activeTab === 'explore' ? 'active' : ''} 
                onClick={() => handleNavigation('explore')}
              >
                <Compass size={20} /> <span>Explore</span>
              </button>
              <button 
                className={activeTab === 'character' ? 'active' : ''} 
                onClick={() => handleNavigation('character')}
              >
                <User size={20} /> <span>Character</span>
              </button>
              <button 
                className={activeTab === 'gallery' ? 'active' : ''} 
                onClick={() => handleNavigation('gallery')}
              >
                <History size={20} /> <span>My Images</span>
              </button>
              <button 
                className={activeTab === 'style' ? 'active' : ''} 
                onClick={() => handleNavigation('style')}
              >
                <Sparkles size={20} /> <span>Style</span>
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
          <header className="top-header">
            <h1 className="aesthetic-title">What will you create?</h1>
            
            <div className="prompt-container">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to see..."
                rows={1}
                className="prompt-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    generateImage();
                  }
                }}
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
                     aria-label="Send prompt"
                   >
                     {loading ? <div className="spinner"></div> : <Send size={18} strokeWidth={2.5} />}
                   </button>
                </div>
              </div>
            </div>
          </header>

          <div className="scrollable-area">
            {viewState === 'gallery' && activeTab === 'explore' && (
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

            {viewState === 'gallery' && activeTab === 'explore' && (
              <div className="masonry-grid">
                {getDummyImages().map((img) => (
                  <div key={img.id} className="pin-item" onClick={() => handleImageClick(img.prompt)}>
                    <img src={img.url} alt="Inspiration" loading="lazy" />
                    <div className="pin-overlay">
                       <button className="use-btn">Remix</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewState === 'empty' && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  {activeTab === 'gallery' && <History size={32} />}
                  {activeTab === 'style' && <Sparkles size={32} />}
                  {activeTab === 'character' && <User size={32} />}
                </div>
                <h2>
                  {activeTab === 'gallery' && 'No Images Yet'}
                  {activeTab === 'style' && 'Styles Coming Soon'}
                  {activeTab === 'character' && 'Characters Coming Soon'}
                </h2>
                <p>
                  {activeTab === 'gallery' && 'Your generated images will appear here. Start creating to see your gallery!'}
                  {(activeTab === 'style' || activeTab === 'character') && "We're working on bringing you powerful customization options. Stay tuned!"}
                </p>
              </div>
            )}

            {viewState === 'result' && (
              <div className="result-modal">
                 <div className="result-content">
                    <button className="close-result" onClick={closeResult}>
                      <X size={24}/>
                    </button>
                    <div className="image-stage">
                        {loading ? (
                            <div className="loading-state">
                                <div className="pulse-loader"></div>
                                <p>Generating your masterpiece...</p>
                            </div>
                        ) : image ? (
                            <img src={image} alt="Generated" className="gen-result"/>
                        ) : null}
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
