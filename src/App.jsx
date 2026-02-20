import React, { useState, useEffect } from 'react';
import './App.css';
// --- ICONS ---
import { Menu, X } from 'lucide-react';
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
import LoginModal from './components/LoginModal'; 
// --- VIEWS ---
import ExploreView from './views/ExploreView';
import CharacterView from './views/CharacterView';
import MyImagesView from './views/MyImagesView';
import StyleView from './views/StyleView';

export default function App() {
  const { user, loading: authLoading } = useAuth();

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

  // --- MOBILE STATE ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- MODAL STATES ---
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // --- PROMPT COLLAPSE STATE ---
  const [promptCollapsed, setPromptCollapsed] = useState(false);

  // --- GLOBAL CLICK PROTECTION ---
  const handleGlobalClick = (e) => {
    if (user || authLoading) return;

    const isModalInteraction = e.target.closest('.login-modal-card') || 
                               e.target.closest('.modal-overlay') || 
                               e.target.closest('.close-button');
                               
    const isAllowedImage = e.target.closest('.allow-visitor');
    
    // ALLOW the mobile toggle even if not logged in
    const isToggleInteraction = e.target.closest('.mobile-menu-toggle');

    if (!isModalInteraction && !isAllowedImage && !isToggleInteraction) {
      e.preventDefault();
      e.stopPropagation();
      setLoginModalOpen(true);
    }
  };

  // --- 1. PERSISTENCE & WALLET LOGIC ---
  const loadGallery = async () => {
    if (!user) {
      setUserGallery([]);
      return;
    }
    try {
      try {
        const userDoc = await db.getDocument('main_db', 'users', user.$id);
        setCredits(userDoc.credits || 0);
      } catch (err) {
        if (err.code === 404) {
          const newWallet = await db.createDocument('main_db', 'users', user.$id, {
            credits: 10 
          });
          setCredits(newWallet.credits);
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
    
    if (!authLoading && !user) {
      const timer = setTimeout(() => setLoginModalOpen(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]);

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

  const deductCreditsLive = async (amount) => {
    if (!user) return;
    const newBalance = Math.max(0, credits - amount);
    setCredits(newBalance);

    try {
      await db.updateDocument('main_db', 'users', user.$id, {
        credits: newBalance
      });
    } catch (err) {
      console.error("Database sync failed, reverting UI:", err);
      setCredits(prev => prev + amount);
      setError("Server sync failed. Your credits have been restored.");
    }
  };

  // --- 2. CORE GENERATION LOGIC ---
  const generateImage = async () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    if (!prompt || loading) return;

    if (credits < 2) {
      setError("Insufficient credits.");
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
      
      if (!response.ok) throw new Error(`Server Error`);
      const data = await response.json();

      if (data.status === 'COMPLETED' && data.output?.image) {
        const base64Image = data.output.image;
        setImage(base64Image);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleNavigation = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Close sidebar on navigate (Mobile)
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
    if (!user) {
        setLoginModalOpen(true);
        return;
    }
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
    <div className="master-wrapper" onClickCapture={handleGlobalClick}>
      <div className="app-shell">
        
        {/* MOBILE TOGGLE BUTTON */}
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle Menu"
        >
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* MOBILE OVERLAY */}
        {isSidebarOpen && (
          <div 
            className="sidebar-mobile-overlay" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <Sidebar 
          activeTab={activeTab} 
          onNavigate={handleNavigation} 
          credits={credits} 
          userId={user?.$id}
          isOpen={isSidebarOpen}
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

        <LoginModal 
           isOpen={loginModalOpen} 
           onClose={() => setLoginModalOpen(false)} 
        />

        {/* --- MODALS --- */}
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
