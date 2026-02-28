import React, { useState, useEffect } from 'react';
import './App.css';
import { Menu, X, Loader2 } from 'lucide-react'; // Added Loader icon
import { useAuth } from './context/AuthContext';
import { saveAiImage } from './lib/imageService.js';
import { supabase } from './lib/supabase.js';
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
  const { user, credits, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState('explore');
  const [viewState, setViewState] = useState('gallery');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [image, setImage] = useState(null);
  const [userGallery, setUserGallery] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [promptCollapsed, setPromptCollapsed] = useState(false);

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const loadGallery = async () => {
    if (!user) return;
    try {
      const { data: images, error: imagesError } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (imagesError) throw imagesError;
      setUserGallery(images.map(doc => ({
        id: doc.id,
        url: doc.image_url,
        prompt: doc.prompt
      })));
    } catch (err) {
      console.error("Gallery Load Error:", err);
    }
  };

  // Guarded useEffect: Only loads data when Auth is actually ready
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      loadGallery();
    } else {
      // Small delay so guest users aren't smacked with a login box instantly
      const timer = setTimeout(() => setLoginModalOpen(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]);

  // SCROLL LOGIC
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

  const handleGlobalClick = (e) => {
    if (user || authLoading) return;
    const isAuthElement = e.target.closest('.auth-card') || e.target.closest('.auth-overlay') || e.target.closest('.auth-close');
    const isNavElement = e.target.closest('.mobile-menu-toggle') || e.target.closest('.sidebar');
    
    if (!isAuthElement && !isNavElement && e.target.closest('.main-content')) {
      e.preventDefault();
      e.stopPropagation();
      setLoginModalOpen(true);
    }
  };

  const deductCreditsLive = async (amount) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ credits: Math.max(0, credits - amount) })
        .eq('id', user.id);
      if (error) throw error;
    } catch (err) {
      console.error("Credit Update Failed:", err);
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
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const { jobId } = await response.json();
      
      let completed = false;
      let attempts = 0;
      while (!completed && attempts < 100) {
        attempts++;
        const statusRes = await fetch('/api/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId })
        });
        const statusData = await statusRes.json();
        
        if (statusData.status === 'COMPLETED') {
          const base64Image = statusData.output.image;
          setImage(base64Image);
          await deductCreditsLive(2);
          const publicUrl = await saveAiImage(user.id, base64Image, prompt);
          setUserGallery(prev => [{ id: Date.now(), url: publicUrl, prompt }, ...prev]);
          completed = true;
        } else if (statusData.status === 'FAILED') {
          throw new Error('Generation failed');
        } else {
          await delay(2000);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'explore': return <ExploreView prompt={prompt} onSelectPrompt={setPrompt} onViewImage={handleViewImage} onEditImage={handleEditImage} />;
      case 'gallery': return <MyImagesView images={userGallery} prompt={prompt} onSelectPrompt={setPrompt} onViewImage={handleViewImage} onEditImage={handleEditImage} />;
      default: return <div className="empty-state"><h2>{activeTab} coming soon</h2></div>;
    }
  };

  const handleViewImage = (img) => { setViewingImageUrl(img.url); setViewImageModalOpen(true); };
  const handleEditImage = (img) => { setEditingImage(img); setEditModalOpen(true); };

  // 1. FULL SCREEN LOADING GUARD
  if (authLoading) {
    return (
      <div className="initial-load-screen">
        <Loader2 className="animate-spin" size={48} color="#8b5cf6" />
        <p>Restoring your session...</p>
      </div>
    );
  }

  return (
    <div className="click-wrapper" onClickCapture={handleGlobalClick}>
      <div className="master-wrapper">
        <div className="app-shell">
          <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {isSidebarOpen && <div className="sidebar-mobile-overlay" onClick={() => setIsSidebarOpen(false)} />}

          <Sidebar
            activeTab={activeTab}
            onNavigate={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }}
            credits={credits}
            userId={user?.id}
            isOpen={isSidebarOpen}
            currentPrompt={prompt}
            onPromptLoad={setPrompt}
          />

          <main className="main-content">
            {!promptCollapsed && (
              <header className="top-header">
                <h1 className="aesthetic-title">What will you create?</h1>
                <PromptBox prompt={prompt} setPrompt={setPrompt} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} onGenerate={generateImage} loading={loading} credits={credits} />
              </header>
            )}

            {promptCollapsed && (
              <div className="floating-prompt">
                <PromptBox prompt={prompt} setPrompt={setPrompt} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} onGenerate={generateImage} loading={loading} collapsed={true} />
              </div>
            )}

            <div className="scrollable-area">
              {renderActiveView()}
            </div>
          </main>
        </div>
      </div>

      {/* MODALS RENDERED OUTSIDE APP-SHELL */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      
      {(viewState === 'result' || loading || image || error) && (
        <ResultModal image={image} loading={loading} error={error} prompt={prompt} onClose={() => { setViewState('gallery'); setImage(null); }} onRetry={generateImage} onOpenEdit={handleEditImage} onViewFullScreen={handleViewImage} />
      )}

      {editModalOpen && <EditModal image={editingImage?.url} originalPrompt={editingImage?.prompt} onClose={() => setEditModalOpen(false)} />}
      {viewImageModalOpen && <ImageViewModal imageUrl={viewingImageUrl} onClose={() => setViewImageModalOpen(false)} />}
    </div>
  );
}
