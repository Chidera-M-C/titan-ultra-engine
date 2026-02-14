import React, { useState } from 'react';
import './App.css';

// --- APPWRITE & AUTH ---
import { useAuth } from './context/AuthContext.js'; // Assuming you have an AuthContext
import { saveAiImage } from './lib/imageService.js'; 

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
  const { user } = useAuth(); // Get the logged-in user
  
  // --- GLOBAL STATE ---
  const [activeTab, setActiveTab] = useState('explore');
  const [viewState, setViewState] = useState('gallery'); 
  
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('2:3');
  const [image, setImage] = useState(null);
  const [userGallery, setUserGallery] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- CORE GENERATION & STORAGE LOGIC ---
  const generateImage = async () => {
    if (!prompt || loading) return;

    setViewState('result');
    setLoading(true);
    setError(null);
    setImage(null);
    
    try {
      // 1. Fetch from your Vercel API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }) 
      });

      if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
      const data = await response.json();

      // 2. Check RunPod Response
      if (data.status === 'COMPLETED' && data.output?.image) {
        const base64Image = data.output.image; // This is the string
        setImage(base64Image);

        // 3. PERSISTENCE: Save to Appwrite Storage & Table
        if (user) {
          try {
            await saveAiImage(user.$id, base64Image, prompt);
            console.log("Saved to Appwrite successfully!");
          } catch (saveErr) {
            console.error("Database save failed, but image generated:", saveErr);
          }
        }

        // 4. Update local UI gallery
        setUserGallery(prev => [{ id: Date.now(), url: base64Image, prompt }, ...prev]);
        
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

  // ... (rest of your handlers and renderActiveView stay exactly the same)
  
  // --- HANDLERS ---
  const handleNavigation = (tab) => {
    setActiveTab(tab);
    if (tab === 'explore') {
      setViewState('gallery');
    } else if (tab === 'gallery') {
      setViewState(userGallery.length > 0 ? 'gallery' : 'empty');
    } else {
      setViewState('empty');
    }
  };

  const handleSelectPrompt = (selectedPrompt) => {
    setPrompt(selectedPrompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderActiveView = () => {
    if (viewState === 'empty') {
      return (
        <div className="empty-state">
           <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon</h2>
           <p>We're polishing this feature for you!</p>
        </div>
      );
    }

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
        <Sidebar activeTab={activeTab} onNavigate={handleNavigation} />
        <main className="main-content">
          <header className="top-header">
            <h1 className="aesthetic-title">What will you create?</h1>
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
            {renderActiveView()}
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
