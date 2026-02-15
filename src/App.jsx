import React, { useState, useEffect } from 'react';
import './App.css';
// --- APPWRITE & AUTH ---
import { useAuth } from './context/AuthContext';
import { saveAiImage } from './lib/imageService.js';
import { db } from './lib/appwrite.js';
import { Query } from 'appwrite';
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
  const { user } = useAuth();
 
  // --- GLOBAL STATE ---
  const [activeTab, setActiveTab] = useState('explore');
  const [viewState, setViewState] = useState('gallery');
 
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('2:3');
  const [image, setImage] = useState(null);
  const [userGallery, setUserGallery] = useState([]);
 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- 1. PERSISTENCE LOGIC ---
  const loadGallery = async () => {
    if (!user) {
      setUserGallery([]);
      return;
    }
    try {
      const response = await db.listDocuments(
        'main_db',
        'images',
        [Query.equal('userId', user.$id), Query.orderDesc('$createdAt')]
      );
      const fetchedImages = response.documents.map(doc => ({
        id: doc.$id,
        url: doc.imageUrl,
        prompt: doc.prompt
      }));
      setUserGallery(fetchedImages);
    } catch (err) {
      console.error("Failed to fetch gallery history:", err);
    }
  };

  useEffect(() => {
    loadGallery();
  }, [user]);

  // --- 2. CORE GENERATION & STORAGE LOGIC ---
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
        const base64Image = data.output.image;
        setImage(base64Image); // Show in modal immediately

        if (user) {
          try {
            // FIX: Don't expect a URL return if saveAiImage returns true/void
            await saveAiImage(user.$id, base64Image, prompt);
            
            // Add to local gallery immediately using the base64 string
            // (So the user sees it without waiting for a re-fetch)
            setUserGallery(prev => [{
              id: Date.now(), 
              url: base64Image,
              prompt
            }, ...prev]);

            // Optional: Background refresh to get the real permanent URL
            loadGallery();
          } catch (saveErr) {
            console.error("Database save failed:", saveErr);
            setError("Image generated but failed to save to history.");
          }
        }
       
      } else {
        throw new Error(data.error || "GPU Generation failed.");
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
    if (tab === 'explore' || tab === 'gallery') {
      setViewState('gallery');
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
