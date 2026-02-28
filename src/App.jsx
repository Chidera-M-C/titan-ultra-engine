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

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  // Global click handler for guest restrictions
  const handleGlobalClick = (e) => {
    if (user || authLoading) return;
    const allowed = e.target.closest('.auth-card') || e.target.closest('.auth-overlay') || e.target.closest('.auth-close') || e.target.closest('.allow-visitor') || e.target.closest('.mobile-menu-toggle') || e.target.closest('.sidebar') || e.target.closest('.login-modal') || e.target.closest('[data-allow]');
    if (allowed) return;
    const isMainContent = e.target.closest('.main-content') || e.target.closest('.scrollable-area') || e.target.closest('.top-header') || e.target.closest('.floating-prompt');
    if (isMainContent) {
      e.preventDefault();
      e.stopPropagation();
      setLoginModalOpen(true);
    }
  };

  // Sync Gallery from Supabase
  const loadGallery = async () => {
    if (!user) { setUserGallery([]); return; }
    try {
      const { data: images, error: imagesError } = await supabase.from('images').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (imagesError) throw imagesError;
      setUserGallery(images.map(doc => ({ id: doc.id, url: doc.image_url, prompt: doc.prompt })));
    } catch (err) {
      console.error("Gallery Sync error:", err);
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

  // Handle auto-collapse prompt on scroll
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

  // Real-time credit deduction
  const deductCreditsLive = async (amount) => {
    if (!user) return;
    const { data, error: fetchError } = await supabase.from('users').select('credits').eq('id', user.id).single();
    if (fetchError) throw fetchError;
    const safeBalance = Math.max(0, (data.credits ?? 0) - amount);
    const { error: updateError } = await supabase.from('users').update({ credits: safeBalance }).eq('id', user.id);
    if (updateError) throw updateError;
    setCredits(safeBalance);
  };

  // Initialize Payment with NowPayments
  const handleTopUpPurchase = async (pack) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
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
        throw new Error(data.error || "Failed to generate payment link");
      }
    } catch (err) {
      console.error("Payment Error:", err);
      alert("Error: " + err.message);
    }
  };

  // AI Generation Logic
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
      
      let completed = false;
      let attempts = 0;
      while (!completed && attempts < 150) {
        attempts++;
        const statusRes = await fetch('/api/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId })
        });
        const statusData = await statusRes.json();
        if (statusData.status === 'COMPLETED') {
          const base64Image = statusData.output?.image || statusData.output?.images?.[0] || statusData.output?.[0]?.image || statusData.output?.[0];
          setImage(base64Image);
          setLoading(false);
          completed = true;
          (async () => {
            try {
              await deductCreditsLive(2);
              const publicUrl = await saveAiImage(user.id, base64Image, prompt);
              setUserGallery(prev => [{ id: Date.now(), url: publicUrl, prompt }, ...prev]);
              setExploreRefreshKey(k => k + 1);
            } catch (err) { console.error('Post-gen save error:', err); }
          })();
        } else if (statusData.status === 'FAILED') throw new Error('Generation failed');
        else await delay(2000);
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    setViewState(tab === 'explore' || tab === 'gallery' ? 'gallery' : 'empty');
  };

  const renderActiveView = () => {
    if (viewState === 'empty') return <div className="empty-state"><h2>{activeTab} coming soon</h2></div>;
    switch (activeTab) {
      case 'explore': return <ExploreView key={exploreRefreshKey} prompt={prompt} onSelectPrompt={setPrompt} onViewImage={setViewingImageUrl} onEditImage={setEditingImage} />;
      case 'gallery': return <MyImagesView images={userGallery} prompt={prompt} onSelectPrompt={setPrompt} onViewImage={setViewingImageUrl} onEditImage={setEditingImage} />;
      default: return <ExploreView key={exploreRefreshKey} prompt={prompt} onSelectPrompt={setPrompt} onViewImage={setViewingImageUrl} onEditImage={setEditingImage} />;
    }
  };

  return (
    <div className="master-wrapper" onClickCapture={handleGlobalClick}>
      <div className="app-shell">
        <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>{isSidebarOpen ? <X size={22} /> : <Menu size={22} />}</button>
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
          {!promptCollapsed && <header className="top-header"><h1 className="aesthetic-title">What will you create?</h1><PromptBox prompt={prompt} setPrompt={setPrompt} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} onGenerate={generateImage} loading={loading} credits={credits} /></header>}
          {promptCollapsed && <div className="floating-prompt"><PromptBox prompt={prompt} setPrompt={setPrompt} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} onGenerate={generateImage} loading={loading} collapsed={true} credits={credits} /></div>}
          <div className="scrollable-area">{renderActiveView()}</div>
        </main>

        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
        <TopUpModal isOpen={topUpModalOpen} onClose={() => setTopUpModalOpen(false)} onSelect={handleTopUpPurchase} />
        
        {(viewState === 'result' || loading || image || error) && <ResultModal image={image} loading={loading} error={error} prompt={prompt} onClose={() => { setViewState('gallery'); setImage(null); setError(null); }} onRetry={generateImage} />}
      </div>
    </div>
  );
}
