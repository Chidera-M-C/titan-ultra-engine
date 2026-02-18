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
import EditModal from './components/Shared/EditModal';
import ImageViewModal from './components/Shared/ImageViewModal';
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
  const [credits, setCredits] = useState(0);

  // --- MODAL STATES ---
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState(null);

  // --- PROMPT COLLAPSE STATE ---
  const [promptCollapsed, setPromptCollapsed] = useState(false);

  // --- 1. PERSISTENCE & WALLET LOGIC ---
  const loadGallery = async () => {
    if (!user) {
      setUserGallery([]);
      return;
    }
    try {
      // --- WALLET INITIALIZATION WITH FREE CREDITS ---
      try {
        const userDoc = await db.getDocument('main_db', 'users', user.$id);
        setCredits(userDoc.credits || 0);
      } catch (err) {
        if (err.code === 404) {
          // GIVE 10 FREE CREDITS TO NEW USERS
          const newWallet = await db.createDocument('main_db', 'users', user.$id, {
            credits: 10 
          });
          setCredits(newWallet.credits);
          console.log("🎁 New user detected: 10 free credits granted.");
        }
      }

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
      console.error("Sync error:", err);
    }
  };

  useEffect(() => {
    loadGallery();
  }, [user]);

  // --- SCROLL DETECTION ---
  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.querySelector('.scrollable-area');
      if (scrollable) {
        const scrollTop = scrollable.scrollTop;
        setPromptCollapsed(scrollTop > 100);
      }
    };

    const scrollable = document.querySelector('.scrollable-area');
    if (scrollable) {
      scrollable.addEventListener('scroll', handleScroll);
      return () => scrollable.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // --- IMPROVED LIVE DEDUCTION HELPER ---
  const deductCreditsLive = async (amount) => {
    if (!user) return;
    
    // 1. Calculate new balance
    const newBalance = Math.max(0, credits - amount);
    
    // 2. OPTIMISTIC UPDATE: Update UI immediately so it feels 'Live'
    setCredits(newBalance);

    try {
      // 3. Sync with Database in the background
      await db.updateDocument('main_db', 'users', user.$id, {
        credits: newBalance
      });
    } catch (err) {
      console.error("Database sync failed, reverting UI:", err);
      // Revert UI state if the database update fails
      setCredits(prev => prev + amount);
      setError("Server sync failed. Your credits have been restored.");
    }
  };

  // --- 2. CORE GENERATION LOGIC ---
  const generateImage = async () => {
    if (!prompt || loading) return;

    // Credit Gate (Requires 2 credits)
    if (credits < 2) {
      setError("Insufficient credits. You need 2 credits per image.");
      setViewState('result');
      return;
    }

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
          // LIVE DEDUCTION: Happening as soon as image is confirmed
          await deductCreditsLive(2);

          try {
            await saveAiImage(user.$id, base64Image, prompt);
            setUserGallery(prev => [{
              id: Date.now(),
              url: base64Image,
              prompt
            }, ...prev]);
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
    if (tab === 'explore' || tab === 'gallery') {
      setViewState('gallery');
    } else {
      setViewState('empty');
    }
  };

  const handleSelectPrompt = (selectedPrompt) => {
    setPrompt(selectedPrompt);
    if (selectedPrompt) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleViewImage = (img) => {
    setViewingImageUrl(img.url);
    setViewImageModalOpen(true);
  };

  const handleEditImage = (img) => {
    setEditingImage(img);
    setEditModalOpen(true);
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
        return <ExploreView onSelectPrompt={handleSelectPrompt} onViewImage={handleViewImage} onEditImage={handleEditImage} />;
      case 'character':
        return <CharacterView />;
      case 'gallery':
        return <MyImagesView images={userGallery} onSelectPrompt={handleSelectPrompt} onViewImage={handleViewImage} currentPrompt={prompt} onEditImage={handleEditImage} />;
      case 'style':
        return <StyleView />;
      default:
        return <ExploreView onSelectPrompt={handleSelectPrompt} />;
    }
  };

  return (
    <div className="master-wrapper">
      <div className="app-shell">
        <Sidebar 
          activeTab={activeTab} 
          onNavigate={handleNavigation} 
          credits={credits} 
          userId={user?.$id}
        />
        <main className="main-content">
          {!promptCollapsed && (
            <header className="top-header">
              <h1 className="aesthetic-title">What will you create?</h1>
              <PromptBox
                prompt={prompt}
                setPrompt={setPrompt}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                onGenerate={generateImage}
                loading={loading}
                collapsed={false}
                credits={credits} 
              />
            </header>
          )}

          {promptCollapsed && (
            <div className="floating-prompt">
              <PromptBox
                prompt={prompt}
                setPrompt={setPrompt}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                onGenerate={generateImage}
                loading={loading}
                collapsed={true}
              />
            </div>
          )}

          <div className="scrollable-area">
            {renderActiveView()}
          </div>
        </main>

        {(viewState === 'result' || loading || image || error) && (
          <ResultModal
            image={image}
            loading={loading}
            error={error}
            prompt={prompt}
            onClose={() => {
              setViewState('gallery');
              setImage(null);
              setError(null);
            }}
            onRetry={generateImage}
            onOpenEdit={(img) => {
              setEditingImage(img);
              setEditModalOpen(true);
            }}
            onViewFullScreen={(imageUrl) => {
              setViewingImageUrl(imageUrl);
              setViewImageModalOpen(true);
            }}
          />
        )}

        {editModalOpen && (
          <EditModal
            image={editingImage?.url}
            originalPrompt={editingImage?.prompt}
            onClose={() => setEditModalOpen(false)}
          />
        )}

        {viewImageModalOpen && (
          <ImageViewModal
            imageUrl={viewingImageUrl}
            onClose={() => setViewImageModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
