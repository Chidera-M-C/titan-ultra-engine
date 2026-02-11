import React, { useState } from 'react';
import './App.css';

// --- COMPONENTS ---
import Sidebar from './components/Sidebar/Sidebar';
import PromptBox from './components/PromptSection/PromptBox';
import ResultModal from './components/Shared/ResultModal';

// --- VIEWS ---
import ExploreView from './views/ExploreView';
import CharacterView from './views/CharacterView';
import MyImagesView from './views/MyImagesView';
import StyleView from './views/StyleView';

export default function App() {
  // --- GLOBAL STATE ---
  const [activeTab, setActiveTab] = useState('explore');
  const [viewState, setViewState] = useState('gallery'); // gallery, result, or empty
  
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('2:3');
  const [image, setImage] = useState(null);
  const [userGallery, setUserGallery] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- CORE RUNPOD LOGIC ---
  const generateImage = async () => {
    if (!prompt || loading) return;

    setViewState('result');
    setLoading(true);
    setError(null);
    setImage(null);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }) 
      });

      if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
      const data = await response.json();

      if (data.status === 'COMPLETED' && data.output?.image) {
        const newImg = data.output.image;
        setImage(newImg);
        // Add to history
        setUserGallery(prev => [{ id: Date.now(), url: newImg, prompt }, ...prev]);
      } else {
        throw new Error(data.error || "GPU Generation failed. Please try again.");
      }
    } catch (err) {
      console.error("RunPod Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleNavigation = (tab) => {
    setActiveTab(tab);
    
    // Logic to decide initial view state for each tab
    if (tab === 'explore') {
      setViewState('gallery');
    } else if (tab === 'gallery') {
      setViewState(userGallery.length > 0 ? 'gallery' : 'empty');
    } else {
      // Character and Style default to empty/dev state for now
      setViewState('empty');
    }
  };

  const handleSelectPrompt = (selectedPrompt) => {
    setPrompt(selectedPrompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- DYNAMIC VIEW ENGINE ---
  const renderActiveView = () => {
    // If the viewState is 'empty', show a generic empty state for any tab
    if (viewState === 'empty') {
      return (
        <div className="empty-state">
           <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon</h2>
           <p>We're polishing this feature for you!</p>
        </div>
      );
    }

    // Switch between the specific View files
    switch (activeTab) {
      case 'explore':
        return <ExploreView onSelectPrompt={handleSelectPrompt} />;
      case 'character':
        return <CharacterView />;
      case 'gallery':
        return <MyImagesView images={userGallery} onSelectPrompt={handleSelectPrompt} />;
      case 'style':
        return <StyleView />;
      default:
        return <ExploreView onSelectPrompt={handleSelectPrompt} />;
    }
  };

  return (
    <div className="master-wrapper">
      <div className="app-shell">
        
        {/* Sidebar Component */}
        <Sidebar activeTab={activeTab} onNavigate={handleNavigation} />

        <main className="main-content">
          <header className="top-header">
            <h1 className="aesthetic-title">What will you create?</h1>
            
            {/* Prompt Section Component */}
            <PromptBox 
              prompt={prompt}
              setPrompt={setPrompt}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              onGenerate={generateImage}
              loading={loading}
            />
          </header>

          <div className="scrollable-area">
            {/* Dynamically Rendered Page Content */}
            {renderActiveView()}

            {/* Modal Layer */}
            {viewState === 'result' && (
              <ResultModal 
                image={image} 
                loading={loading} 
                error={error} 
                onClose={() => setViewState('gallery')}
                onRetry={generateImage}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
