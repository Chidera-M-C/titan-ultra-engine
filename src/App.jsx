import React, { useState, useEffect } from 'react'; // Added useEffect
import './App.css';

// --- APPWRITE & AUTH ---
import { useAuth } from './context/AuthContext'; 
import { saveAiImage } from './lib/imageService.js'; 
import { db } from './lib/appwrite.js'; // Need this to fetch
import { Query } from 'appwrite';     // Need this for filtering

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

  // --- 1. PERSISTENCE LOGIC: Load images from Appwrite on startup ---
  useEffect(() => {
    const loadGallery = async () => {
      if (!user) {
        setUserGallery([]); // Clear gallery if logged out
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

    loadGallery();
  }, [user]); // Re-runs whenever the user logs in or out

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
        setImage(base64Image);

        if (user) {
          try {
            // This now calls the fixed imageService that handles storage + db
            await saveAiImage(user.$id, base64Image, prompt);
            
            // Optional: Re-fetch or manually add to top of gallery so it shows up
            setUserGallery(prev => [{ id: Date.now(), url: base64Image, prompt }, ...prev]);
          } catch (saveErr) {
            console.error("Database save failed:", saveErr);
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
        // Now using the persistent userGallery state!
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
