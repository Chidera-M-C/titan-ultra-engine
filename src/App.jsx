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
import TopUpModal from './components/Sidebar/TopUpModal';
import AccountDetailModal from './components/Shared/AccountDetailModal'; // NEW
import ExploreView from './views/ExploreView';
import CharacterView from './views/CharacterView';
import MyImagesView from './views/MyImagesView';
import StyleView from './views/StyleView';

export default function App() {
  const { user, credits, setCredits, loading: authLoading } = useAuth();
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
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [promptCollapsed, setPromptCollapsed] = useState(false);
  const [exploreRefreshKey, setExploreRefreshKey] = useState(0);

  // Bank transfer state — NEW
  const [bankTransferPack, setBankTransferPack] = useState(null);
  const [bankTransferOpen, setBankTransferOpen] = useState(false);

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

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
      e.target.closest('[data-allow]');

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

  // Bank transfer handler — NEW
  const handleBankTransfer = (pack) => {
    setBankTransferPack(pack);
    setBankTransferOpen(true);
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

        if (!statusRes.ok) throw new Error(`Status check failed: ${statusRes.status}`);
        const statusData = await statusRes.json();
        if (statusData.error) throw new Error(`RunPod error: ${statusData.error}`);

        if (statusData.status === 'COMPLETED') {
          const output = statusData.output;
          const base64Image = output?.image || output?.images?.[0] || output?.[0]?.image || output?.[0] || null;
          if (!base64Image) throw new Error('Image data not found');

          setImage(base64Image);
          setLoading(false);
          completed = true;

          (async () => {
            try {
              await deductCreditsLive(2);
              const publicUrl = await saveAiImage(user.id, base64Image, prompt);
              setUserGallery(prev => [{ id: Date.now(), url: publicUrl, prompt }, ...prev]);
              setExploreRefreshKey(k => k + 1);
            } catch (err) {
              console.error('❌ Post-generation save failed:', err);
            }
          })();

        } else if (statusData.status === 'FAILED') {
          throw new Error('RunPod generation failed');
        } else {
          await delay(2000);
        }
      }
      if (!completed) throw new Error('The GPU is taking too long to wake up.');
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
        return <ExploreView key={exploreRefreshKey} prompt={prompt} onSelectPrompt={handleSelectPrompt} onViewImage={handleViewImage} onEditImage={handleEditImage} />;
      case 'character': return <CharacterView />;
      case 'gallery':
        return <MyImagesView images={userGallery} prompt={prompt} onSelectPrompt={handleSelectPrompt} onViewImage={handleViewImage} onEditImage={handleEditImage} />;
      case 'style': return <StyleView />;
      default:
        return <ExploreView key={exploreRefreshKey} prompt={prompt} onSelectPrompt={handleSelectPrompt} onViewImage={handleViewImage} onEditImage={handleEditImage} />;
    }
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
          {!promptCollapsed && (
            <header className="top-header">
              <h1 className="aesthetic-title">What will you create?</h1>
              <PromptBox prompt={prompt} setPrompt={setPrompt} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} onGenerate={generateImage} loading={loading} credits={credits} />
            </header>
          )}

          {promptCollapsed && (
            <div className="floating-prompt">
              <PromptBox prompt={prompt} setPrompt={setPrompt} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} onGenerate={generateImage} loading={loading} collapsed={true} credits={credits} />
            </div>
          )}

          <div className="scrollable-area">{renderActiveView()}</div>
        </main>

        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

        {/* Crypto payment modal */}
        <TopUpModal
          isOpen={topUpModalOpen}
          onClose={() => setTopUpModalOpen(false)}
          onSelect={handleTopUpPurchase}
          onBankTransfer={handleBankTransfer}  {/* NEW */}
        />

        {/* Bank transfer modal — NEW */}
        <AccountDetailModal
          isOpen={bankTransferOpen}
          onClose={() => setBankTransferOpen(false)}
          selectedPack={bankTransferPack}
        />

        {(viewState === 'result' || loading || image || error) && (
          <ResultModal
            image={image}
            loading={loading}
            error={error}
            prompt={prompt}
            onClose={() => { setViewState('gallery'); setImage(null); setError(null); }}
            onRetry={generateImage}
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
