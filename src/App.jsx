import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { 
  Zap, History, Compass, Settings, 
  X, ChevronDown, ArrowUp, MoreHorizontal
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [prompt]);

  const getDummyImages = () => {
    const seeds = {
      Explore: 100,
      Top: 200,
      People: 300,
      Nature: 400,
      Poster: 500,
      '3D Render': 600
    };
    const base = seeds[activeCategory] || 100;

    return Array.from({ length: 50 }, (_, i) => ({
      id: `${activeCategory}-${i}`,
      url: `https://picsum.photos/seed/${base + i}/400/600`,
      prompt: `Amazing ${activeCategory.toLowerCase()} style artwork #${i + 1}`
    }));
  };

  const generateImage = () => {
    if (!prompt || loading) return;
    setViewState('result');
    setLoading(true);
    setImage(null);

    setTimeout(() => {
      const dims =
        aspectRatio === '16:9' ? '1200/675' :
        aspectRatio === '1:1' ? '800/800' :
        '800/1200';

      setImage(`https://picsum.photos/seed/${Date.now()}/${dims}`);
      setLoading(false);
    }, 2000);
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    setViewState(tab === 'explore' ? 'gallery' : 'empty');
  };

  return (
    <div className="master-wrapper">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-logo">N</div>
            <span>Nudely</span>
          </div>

          <nav className="side-nav">
            <button className={activeTab === 'explore' ? 'active' : ''} onClick={() => handleNavigation('explore')}>
              <Compass size={20} /> Explore
            </button>
            <button className={activeTab === 'gallery' ? 'active' : ''} onClick={() => handleNavigation('gallery')}>
              <History size={20} /> My Images
            </button>
            <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => handleNavigation('settings')}>
              <Settings size={20} /> Settings
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="credits-card">
            <div className="credits-header">
              <span>Pro Plan</span>
              <span className="badge">PRO</span>
            </div>
            <div className="progress-bar"><div className="fill" /></div>
            <p>120 fast generations left</p>
            <button className="upgrade-btn"><Zap size={14} /> Upgrade</button>
          </div>

          <div className="user-profile">
            <div className="avatar">J</div>
            <div className="user-details">
              <span className="name">John Doe</span>
              <span className="handle">@johndoe</span>
            </div>
            <MoreHorizontal size={16} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <h1 className="aesthetic-title">What will you create?</h1>

          <div className="prompt-container">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to see..."
              className="prompt-input"
              rows={1}
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
                  Aspect Ratio
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                    <option value="2:3">2:3</option>
                    <option value="1:1">1:1</option>
                    <option value="16:9">16:9</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
                <div className="tool-pill">Model v3.0</div>
              </div>

              <button className="generate-fab" onClick={generateImage} disabled={!prompt || loading}>
                {loading ? <div className="spinner" /> : <ArrowUp size={20} />}
              </button>
            </div>
          </div>
        </header>

        <div className="scrollable-area">
          {viewState === 'gallery' && activeTab === 'explore' && (
            <>
              <div className="category-tabs">
                {categories.map(cat => (
                  <span key={cat} className={`tab ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                    {cat}
                  </span>
                ))}
              </div>

              <div className="masonry-grid">
                {getDummyImages().map(img => (
                  <div key={img.id} className="pin-item" onClick={() => setPrompt(img.prompt)}>
                    <img src={img.url} alt="" />
                  </div>
                ))}
              </div>
            </>
          )}

          {viewState === 'empty' && (
            <div className="empty-state">
              <h2>{activeTab === 'gallery' ? 'No Images Yet' : 'Settings Coming Soon'}</h2>
              <p>Start creating to see results here.</p>
            </div>
          )}

          {viewState === 'result' && (
            <div className="result-modal">
              <div className="result-content">
                <button className="close-result" onClick={() => setViewState('gallery')}>
                  <X size={24} />
                </button>
                <div className="image-stage">
                  {loading ? <div className="pulse-loader" /> : <img src={image} alt="" className="gen-result" />}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
