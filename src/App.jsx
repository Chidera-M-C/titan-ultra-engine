// Updated src/App.jsx (full file with only the necessary changes)
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

  // --- EDIT MODAL STATE ---
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);

  // --- IMAGE VIEW MODAL STATE ---
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState(null);

  // --- PROMPT COLLAPSE STATE ---
  const [promptCollapsed, setPromptCollapsed] = useState(false);

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

  // --- SCROLL DETECTION FOR PROMPT COLLAPSE ---
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
            await saveAiImage(user.$id, base64Image, prompt);
            setUserGallery(prev => [{
              id: Date.now(),
              url: base64Image,
              prompt
            }, ...prev]);
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
        return (
          <ExploreView 
            onSelectPrompt={handleSelectPrompt}
            onViewImage={handleViewImage}
            onEditImage={handleEditImage}
          />
        );
      case 'character':
        return <CharacterView />;
      case 'gallery':
        return (
          <MyImagesView
            images={userGallery}
            onSelectPrompt={handleSelectPrompt}
            onViewImage={handleViewImage}
            currentPrompt={prompt}
            onEditImage={handleEditImage}
          />
        );
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

          {/* Only show full header when NOT collapsed */}
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
              />
            </header>
          )}

          {/* Floating collapsed prompt - floats over content */}
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
        
        {/* Generation Modal - floats everywhere */}
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

        {/* Edit Modal */}
        {editModalOpen && (
          <EditModal
            image={editingImage?.url}
            originalPrompt={editingImage?.prompt}
            loading={false}
            error={null}
            onClose={() => setEditModalOpen(false)}
            onRetry={(editPrompt) => {
              console.log('Edit with prompt:', editPrompt);
              console.log('Original image:', editingImage);
            }}
          />
        )}

        {/* Image View Modal - Full screen */}
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
