import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import TopUpModal from './components/Sidebar/TopUpModal';
import ExploreView from './views/ExploreView';
import CharacterView from './views/CharacterView';
import MyImagesView from './views/MyImagesView';
import StyleView from './views/StyleView';
import StyleGeneratorView from './views/StyleGeneratorView';

// Memoized outside component to prevent re-render cascade
const MemoExploreView = React.memo(ExploreView);

export default function App() {
  const { user, credits, setCredits, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('explore');
  const [viewState, setViewState] = useState('gallery');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
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
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [promptCollapsed, setPromptCollapsed] = useState(false);
  const [activeStyle, setActiveStyle] = useState(null);
  const [styleImage, setStyleImage] = useState(null);
  const [styleLoading, setStyleLoading] = useState(false);
  const [styleError, setStyleError] = useState(null);

  const delay = (ms) => new Promise(res => setTimeout(res, ms));
  const promptRef = useRef(prompt);
  useEffect(() => { promptRef.current = prompt; }, [prompt]);

  const handleGlobalClick = (e) => {
    if (user || authLoading) return;
    const allowed =
      e.target.closest('.auth-card') ||
      e.target.closest('.auth-overlay') ||
      e.target.closest('.auth-close') ||
      e.target.closest('.allow-visitor') ||
      e.target.closest('.mobile-menu-toggle') ||
      e.target.closest('.sidebar') ||
      e.target.closest('.login-modal') ||
      e.target.closest('[data-allow]') ||
      e.target.closest('.modal-overlay') ||
      e.target.closest('.modal-content');
    if (allowed) return;
    const isMainContent =
      e.target.closest('.main-content') ||
      e.target.closest('.scrollable-area') ||
      e.target.closest('.top-header') ||
      e.target.closest('.floating-prompt');
    if (isMainContent) {
      e.preventDefault();
      e.stopPropagation();
      setLoginModalOpen(true);
    }
  };

  const loadGallery = async () => {
    if (!user) { setUserGallery([]); return; }
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
      console.error("Supabase Sync error:", err);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      loadGallery();
    } else {
      setUserGallery([]);
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
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();
    if (fetchError) throw fetchError;
    const safeBalance = Math.max(0, (data.credits ?? 0) - amount);
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: safeBalance })
      .eq('id', user.id);
    if (updateError) throw updateError;
    setCredits(safeBalance);
  };

  const handleTopUpPurchase = async (pack) => {
    if (!user) { setLoginModalOpen(true); return; }
    try {
      const response = await fetch('/api/payment-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: pack.price,
          userId: user.id,
          credits: pack.credits
        })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Payment generation failed detail:", data);
        throw new Error(data.error || "Payment link generation failed");
      }
    } catch (err) {
      console.error("Payment Error:", err);
      alert("Error: " + err.message);
    }
  };

  const runGeneration = async ({ prompt, aspect_ratio, image: attachedImg, setLoadingFn, setErrorFn, setImageFn, styleId = null, negative_prompt = null }) => {
    const payload = { prompt, aspect_ratio };
    if (attachedImg)     payload.image           = attachedImg;
    if (negative_prompt) payload.negative_prompt = negative_prompt;
    if (styleId)         payload.style           = styleId;

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Server Error');
    const { jobId, endpointId } = await response.json();
    if (!jobId) throw new Error('Failed to start generation job');

    let completed = false, attempts = 0;
    while (!completed && attempts < 150) {
      attempts++;
      const statusRes = await fetch('/api/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, endpointId })
      });
      if (!statusRes.ok) throw new Error(`Status check failed: ${statusRes.status}`);
      const statusData = await statusRes.json();
      if (statusData.error) throw new Error(`RunPod error: ${statusData.error}`);

      if (statusData.status === 'COMPLETED') {
        const output = statusData.output;
        const base64Image = output?.image || output?.images?.[0] || output?.[0]?.image || output?.[0] || null;
        if (!base64Image) throw new Error('Image data not found');
        setImageFn(base64Image);
        setLoadingFn(false);
        completed = true;
        (async () => {
          try {
            await deductCreditsLive(2);
            const publicUrl = await saveAiImage(user.id, base64Image, prompt, styleId);
            setUserGallery(prev => [{ id: Date.now(), url: publicUrl, prompt }, ...prev]);
          } catch (err) { console.error('❌ Post-generation save failed:', err); }
        })();
      } else if (statusData.status === 'FAILED') {
        throw new Error('RunPod generation failed');
      } else {
        await delay(2000);
      }
    }
    if (!completed) throw new Error('The GPU is taking too long to wake up.');
  };

  const generateImage = async () => {
    if (!user) { setLoginModalOpen(true); return; }
    if (!prompt || loading) return;
    if (credits < 2) { setError("Insufficient credits."); setViewState('result'); return; }
    setViewState('result');
    setLoading(true);
    setError(null);
    setImage(null);
    try {
      await runGeneration({ prompt, aspect_ratio: aspectRatio, negative_prompt: negativePrompt, setLoadingFn: setLoading, setErrorFn: setError, setImageFn: setImage });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStyleGenerate = async (finalPrompt, aspectRatio, negativePrompt, attachedImage) => {
    if (!user) { setLoginModalOpen(true); return; }
    if (credits < 2) { setStyleError("Insufficient credits."); return; }
    setStyleLoading(true);
    setStyleError(null);
    setStyleImage(null);
    try {
      await runGeneration({ prompt: finalPrompt, aspect_ratio: aspectRatio, negative_prompt: negativePrompt, image: attachedImage, setLoadingFn: setStyleLoading, setErrorFn: setStyleError, setImageFn: setStyleImage, styleId: activeStyle.id });
    } catch (err) {
      setStyleError(err.message);
    } finally {
      setStyleLoading(false);
    }
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    if (tab === 'explore' || tab === 'gallery' || tab === 'style') setViewState('gallery');
    else setViewState('empty');
  };

  const handleSelectPrompt = useCallback((selectedPrompt) => {
    setPrompt(selectedPrompt);
    if (selectedPrompt) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  const handleViewImage = useCallback((img) => {
    setViewingImageUrl(img.url);
    setViewImageModalOpen(true);
  }, []);
  
  const handleEditImage = useCallback((img) => {
    if (!user) { setLoginModalOpen(true); return; }
    setEditingImage(img);
    setEditModalOpen(true);
  }, [user]);

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
        return <MemoExploreView
          promptRef={promptRef}
          onSelectPrompt={handleSelectPrompt}
          onViewImage={handleViewImage}
          onEditImage={handleEditImage}
        />;
      case 'character':
        return <CharacterView />;
      case 'gallery':
        return <MyImagesView
          images={userGallery}
          prompt={prompt}
          onSelectPrompt={handleSelectPrompt}
          onViewImage={handleViewImage}
          onEditImage={handleEditImage}
        />;
      case 'style':
        return activeStyle
          ? <StyleGeneratorView
              mood={activeStyle}
              onBack={() => { setActiveStyle(null); setStyleImage(null); setStyleError(null); }}
              onGenerate={handleStyleGenerate}
              loading={styleLoading}
              onViewImage={handleViewImage}
              onEditImage={handleEditImage}
              onSelectPrompt={handleSelectPrompt}
              prompt={prompt}
            />
          : <StyleView onSelectStyle={setActiveStyle} />;
      default:
        return <MemoExploreView
          promptRef={promptRef}
          onSelectPrompt={handleSelectPrompt}
          onViewImage={handleViewImage}
          onEditImage={handleEditImage}
        />;
    }
  };

  const promptBoxProps = {
    prompt,
    setPrompt,
    aspectRatio,
    setAspectRatio,
    onGenerate: generateImage,
    loading,
    negativePrompt,
    setNegativePrompt,
  };

  return (
    <div className="master-wrapper" onClickCapture={handleGlobalClick}>
      <div className="app-shell">
        <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        {isSidebarOpen && <div className="sidebar-mobile-overlay" onClick={() => setIsSidebarOpen(false)} />}

        <Sidebar
          activeTab={activeTab}
          onNavigate={handleNavigation}
          credits={credits}
          userId={user?.id}
          isOpen={isSidebarOpen}
          currentPrompt={prompt}
          onPromptLoad={setPrompt}
          onTopUpClick={() => setTopUpModalOpen(true)}
        />

        <main className="main-content">
          {!promptCollapsed && activeTab !== 'style' && activeTab !== 'character' && (
            <header className="top-header">
              <h1 className="aesthetic-title">What will you create?</h1>
              <PromptBox {...promptBoxProps} />
            </header>
          )}
          {promptCollapsed && activeTab !== 'style' && activeTab !== 'character' && (
            <div className="floating-prompt">
              <PromptBox {...promptBoxProps} collapsed={true} />
            </div>
          )}
          <div className="scrollable-area">{renderActiveView()}</div>
        </main>

        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

        <TopUpModal
          isOpen={topUpModalOpen}
          onClose={() => setTopUpModalOpen(false)}
          onSelect={handleTopUpPurchase}
          userId={user?.id}
          onCreditsUpdated={setCredits}
        />

        {(viewState === 'result' || loading || image || error || styleLoading || styleImage || styleError) && (
          <ResultModal
            image={styleImage || image}
            loading={styleLoading || loading}
            error={styleError || error}
            prompt={prompt}
            onClose={() => {
              setViewState('gallery');
              setImage(null);
              setError(null);
              setStyleImage(null);
              setStyleError(null);
            }}
            onRetry={activeStyle ? () => handleStyleGenerate(activeStyle.prompt, aspectRatio) : generateImage}
            onOpenEdit={handleEditImage}
            onViewFullScreen={handleViewImage}
          />
        )}
        {editModalOpen && <EditModal image={editingImage?.url} originalPrompt={editingImage?.prompt} onClose={() => setEditModalOpen(false)} />}
        {viewImageModalOpen && <ImageViewModal imageUrl={viewingImageUrl} onClose={() => setViewImageModalOpen(false)} />}
      </div>
    </div>
  );
}
