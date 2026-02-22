import React, { useState, useEffect } from 'react';
import './App.css';
import { Menu, X } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { saveAiImage } from './lib/imageService.js';
import { db } from './lib/appwrite.js';
import { Query } from 'appwrite';
import Sidebar from './components/Sidebar/Sidebar';
import PromptBox from './components/PromptSection/PromptBox';
import ResultModal from './components/Shared/ResultModal';
import EditModal from './components/Shared/EditModal';
import ImageViewModal from './components/Shared/ImageViewModal';
import LoginModal from './components/LoginModal';
import ExploreView from './views/ExploreView';
import CharacterView from './views/CharacterView';
import MyImagesView from './views/MyImagesView';
import StyleView from './views/StyleView';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('explore');
  const [viewState, setViewState] = useState('gallery');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [image, setImage] = useState(null);
  const [userGallery, setUserGallery] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [credits, setCredits] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [promptCollapsed, setPromptCollapsed] = useState(false);

  // Helper for polling delay
  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const handleGlobalClick = (e) => {
    if (user || authLoading) return;
    const isModalInteraction = e.target.closest('.login-modal-card') ||
                               e.target.closest('.modal-overlay') ||
                               e.target.closest('.close-button');
    const isAllowedImage = e.target.closest('.allow-visitor');
    const isToggleInteraction = e.target.closest('.mobile-menu-toggle');
    if (!isModalInteraction && !isAllowedImage && !isToggleInteraction) {
      e.preventDefault();
      e.stopPropagation();
      setLoginModalOpen(true);
    }
  };

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
          const newWallet = await db.createDocument('main_db', 'users', user.$id, { credits: 10 });
          setCredits(newWallet.credits);
        }
      }
      const response = await db.listDocuments('main_db', 'images', [
        Query.equal('userId', user.$id),
        Query.orderDesc('$createdAt')
      ]);
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

  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.querySelector('.scrollable-area');
      if (scrollable) setPromptCollapsed(scrollable.scrollTop > 100);
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
      await db.updateDocument('main_db', 'users', user.$id, { credits: newBalance });
    } catch (err) {
      console.error("Database sync failed, reverting UI:", err);
      setCredits(prev => prev + amount);
      setError("Server sync failed. Your credits have been restored.");
    }
  };

  const generateImage = async () => {
    if (!user) { setLoginModalOpen(true); return; }
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
      // 1. START THE JOB
      const startResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!startResponse.ok) throw new Error('Failed to initiate generation');
      const startData = await startResponse.json();
      const jobId = startData.jobId;

      if (!jobId) throw new Error('No Job ID received from server');

      // 2. POLL FOR RESULTS
      let completed = false;
      let attempts = 0;
      const maxAttempts = 45; // ~90 seconds total timeout

      while (!completed && attempts < maxAttempts) {
        attempts++;
        
        const statusResponse = await fetch('/api/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId })
        });

        if (!statusResponse.ok) throw new Error('Status check failed');
        const statusData = await statusResponse.json();

        if (statusData.status === 'COMPLETED') {
          const base64Image = statusData.output.image;
          setImage(base64Image);
          
          // Only deduct credits and save when actually finished
          await deductCreditsLive(2);
          try {
            await saveAiImage(user.$id, base64Image, prompt);
            setUserGallery(prev => [{ id: Date.now(), url: base64Image, prompt }, ...prev]);
          } catch (saveErr) {
            console.error("Database save failed:", saveErr);
          }
          completed = true;
        } else if (statusData.status === 'FAILED') {
          throw new Error(statusData.error || 'GPU generation failed');
        } else {
          // Still in queue or processing, wait 2 seconds before checking again
          await delay(2000);
        }
      }

      if (!completed) throw new Error('Generation timed out. Please try again.');

    } catch (err) {
      console.error("Generation error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    if (tab === 'explore' || tab === 'gallery') setViewState('gallery');
    else setViewState('empty');
  };

  const handleSelectPrompt = (selectedPrompt) => {
    // If selecting the same prompt, toggle it off (unload)
    if (selectedPrompt === prompt) {
      setPrompt('');
    } else {
      setPrompt(selectedPrompt);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleViewImage = (img) => {
    setViewingImageUrl(img.url);
    setViewImageModalOpen(true);
  };

  const handleEditImage = (img) => {
    if (!user) { setLoginModalOpen(true); return; }
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
        return <ExploreView prompt={prompt} onSelectPrompt={handleSelectPrompt} onViewImage={handleViewImage} onEditImage={handleEditImage} />;
      case 'character':
        return <CharacterView />;
      case 'gallery':
        return <MyImagesView images={userGallery} prompt={prompt} onSelectPrompt={handleSelectPrompt} onViewImage={handleViewImage} onEditImage={handleEditImage} />;
      case 'style':
        return <StyleView />;
      default:
        return <ExploreView prompt={prompt} onSelectPrompt={handleSelectPrompt} onViewImage={handleViewImage} onEditImage={handleEditImage} />;
    }
  };

  return (
    <div className="master-wrapper" onClickCapture={handleGlobalClick}>
      <div className="app-shell">

        <button
          className="mobile-menu-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle Menu"
        >
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {isSidebarOpen && (
          <div className="sidebar-mobile-overlay" onClick={() => setIsSidebarOpen(false)} />
        )}

        <Sidebar
          activeTab={activeTab}
          onNavigate={handleNavigation}
          credits={credits}
          userId={user?.$id}
          isOpen={isSidebarOpen}
          prompt={prompt}
          onSelectPrompt={handleSelectPrompt}
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

        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

        {(viewState === 'result' || loading || image || error) && (
          <ResultModal
            image={image}
            loading={loading}
            error={error}
            prompt={prompt}
            onClose={() => { setViewState('gallery'); setImage(null); setError(null); }}
            onRetry={generateImage}
            onOpenEdit={(img) => { setEditingImage(img); setEditModalOpen(true); }}
            onViewFullScreen={(imageUrl) => { setViewingImageUrl(imageUrl); setViewImageModalOpen(true); }}
          />
        )}

        {editModalOpen && (
          <EditModal image={editingImage?.url} originalPrompt={editingImage?.prompt} onClose={() => setEditModalOpen(false)} />
        )}

        {viewImageModalOpen && (
          <ImageViewModal imageUrl={viewingImageUrl} onClose={() => setViewImageModalOpen(false)} />
        )}
      </div>
    </div>
  );
}
