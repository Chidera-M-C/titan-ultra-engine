import React, { useState, useEffect } from 'react';
import './App.css';
import { Menu, X } from 'lucide-react';
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
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        const { data: newProfile } = await supabase
          .from('users')
          .insert([{ id: user.id, credits: 10 }])
          .select()
          .single();
        setCredits(newProfile?.credits || 10);
      } else {
        setCredits(profile?.credits || 0);
      }

      const { data: images, error: imagesError } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (imagesError) throw imagesError;

      const fetchedImages = images.map(doc => ({
        id: doc.id,
        url: doc.image_url,
        prompt: doc.prompt
      }));
      setUserGallery(fetchedImages);
    } catch (err) {
      console.error("Supabase Sync error:", err);
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
      const { error } = await supabase
        .from('users')
        .update({ credits: newBalance })
        .eq('id', user.id);
      
      if (error) throw error;
    } catch (err) {
      console.error("Supabase update failed, reverting UI:", err);
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
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (!response.ok) throw new Error('Server Error');
      const startData = await response.json();
      const jobId = startData.jobId;

      if (!jobId) throw new Error('Failed to start generation job');

      let completed = false;
      let attempts = 0;
      const maxAttempts = 150; 

      while (!completed && attempts < maxAttempts) {
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
          try {
            const publicUrl = await saveAiImage(user.id, base64Image, prompt);
            setUserGallery(prev => [{ id: Date.now(), url: publicUrl, prompt }, ...prev]);
          } catch (saveErr) {
            console.error("Supabase storage save failed:", saveErr);
          }
          completed = true;
        } else if (statusData.status === 'FAILED') {
          throw new Error('RunPod generation failed: ' + (statusData.error || 'Unknown Error'));
        } else {
          await delay(2000); 
        }
      }

      if (!completed) {
        throw new Error('The GPU is taking too long to wake up. Please try hitting retry in a few seconds.');
      }

    } catch (err) {
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
    setPrompt(selectedPrompt);
    if (selectedPrompt) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePromptLoad = (val) => {
    setPrompt(val);
    if (val) window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <>
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
            userId={user?.id}
            isOpen={isSidebarOpen}
            currentPrompt={prompt}
            onPromptLoad={handlePromptLoad}
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

      {/* LoginModal rendered OUTSIDE app-shell to avoid container constraints */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </>
  );
}
