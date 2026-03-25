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
import EditView from './views/EditView';
import FaceSwapView from './views/FaceSwapView';
import InstallPrompt from './components/InstallPrompt';
import SettingsView from './views/SettingsView';
import NotificationBell from './components/Notifications/NotificationBell';

const MemoExploreView = React.memo(ExploreView);

export default function App() {
  const { user, credits, setCredits, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab]         = useState('explore');
  const [viewState, setViewState]         = useState('gallery');
  const [prompt, setPrompt]               = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio]     = useState('9:16');
  const [image, setImage]                 = useState(null);
  const [userGallery, setUserGallery]     = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingImage, setEditingImage]   = useState(null);
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl]       = useState(null);
  const [loginModalOpen, setLoginModalOpen]         = useState(false);
  const [topUpModalOpen, setTopUpModalOpen]         = useState(false);
  const [promptCollapsed, setPromptCollapsed]       = useState(false);
  const [activeStyle, setActiveStyle]     = useState(null);
  const [styleImage, setStyleImage]       = useState(null);
  const [styleLoading, setStyleLoading]   = useState(false);
  const [styleError, setStyleError]       = useState(null);
  const [editViewImage, setEditViewImage] = useState(null);
  const [editViewLoading, setEditViewLoading] = useState(false);
  const [editViewError, setEditViewError]     = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [userCharacters, setUserCharacters]       = useState([]);
  const [isGalleryReady, setIsGalleryReady] = useState(false);
  const [exploreKey, setExploreKey]         = useState(0);
  const [faceswapResult, setFaceswapResult] = useState(null);
  const [faceswapLoading, setFaceswapLoading] = useState(false);
  const [faceswapError, setFaceswapError]     = useState(null);
  const [likedGallery, setLikedGallery] = useState([]);

  const delay = (ms) => new Promise(res => setTimeout(res, ms));
  const promptRef = useRef(prompt);
  useEffect(() => { promptRef.current = prompt; }, [prompt]);

  // ── Load user characters ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setUserCharacters([]); return; }
    supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setUserCharacters(data || []));
  }, [user]);

  // ── 1. UPDATE loadGallery to include category and liked images ────────────
  const loadGallery = async () => {
    if (!user) { setUserGallery([]); setLikedGallery([]); return; }
    try {
      const { data: images, error: imagesError } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (imagesError) throw imagesError;
   
      const { data: userLikes } = await supabase
        .from('image_likes')
        .select('image_id')
        .eq('user_id', user.id);
   
      const likedSet = new Set((userLikes || []).map(l => l.image_id));
   
      setUserGallery((images || []).map(doc => ({
        id: doc.id,
        url: doc.image_url,
        prompt: doc.prompt,
        likes: doc.likes || 0,
        liked: likedSet.has(doc.id),
        category: doc.category || '',
      })));
   
      // Fetch full liked images (from any user, liked by current user)
      if (userLikes && userLikes.length > 0) {
        const likedIds = userLikes.map(l => l.image_id);
        const { data: likedImagesData } = await supabase
          .from('images')
          .select('*')
          .in('id', likedIds)
          .order('created_at', { ascending: false });
   
        setLikedGallery((likedImagesData || []).map(doc => ({
          id: doc.id,
          url: doc.image_url,
          prompt: doc.prompt,
          likes: doc.likes || 0,
          liked: true,
          category: doc.category || '',
        })));
      } else {
        setLikedGallery([]);
      }
    } catch (err) {
      console.error('Supabase Sync error:', err);
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

  // ── Scroll collapse ───────────────────────────────────────────────────
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

  // ── Global click guard (unauthenticated users) ────────────────────────
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

  // ── Credits ───────────────────────────────────────────────────────────
  const deductCreditsLive = async (amount) => {
    if (!user) return;
    const { data, error: fetchError } = await supabase
      .from('users').select('credits').eq('id', user.id).single();
    if (fetchError) throw fetchError;
    const safeBalance = Math.max(0, (data.credits ?? 0) - amount);
    const { error: updateError } = await supabase
      .from('users').update({ credits: safeBalance }).eq('id', user.id);
    if (updateError) throw updateError;
    setCredits(safeBalance);
  };

  // ── Payment ───────────────────────────────────────────────────────────
  const handleTopUpPurchase = async (pack) => {
    if (!user) { setLoginModalOpen(true); return; }
    try {
      const response = await fetch('/api/payment-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: pack.price, userId: user.id, credits: pack.credits })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text}`);
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Payment link generation failed');
      }
    } catch (err) {
      console.error('Payment Error:', err);
      alert('Error: ' + err.message);
    }
  };

  // ── Core generation ───────────────────────────────────────────────────
  const runGeneration = async ({
    prompt, aspect_ratio, image: attachedImg,
    setLoadingFn, setErrorFn, setImageFn,
    styleId = null, negative_prompt = null,
    face_embedding = null, character = null
  }) => {
    const payload = { prompt, aspect_ratio };
    if (attachedImg)     payload.image           = attachedImg;
    if (negative_prompt) payload.negative_prompt = negative_prompt;
    if (styleId)         payload.style           = styleId;
    if (face_embedding)  payload.face_embedding  = face_embedding;
    if (character)       payload.character       = character;

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
            setUserGallery(prev => [{ id: Date.now(), url: publicUrl, prompt, likes: 0, liked: false, category: styleId || '' }, ...prev]);
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

  // ── Generate (explore) ────────────────────────────────────────────────
  const generateImage = async () => {
    if (!user) { setLoginModalOpen(true); return; }
    if (!prompt || loading) return;
    if (credits < 2) { setError('Insufficient credits.'); setViewState('result'); return; }
    setViewState('result');
    setLoading(true);
    setError(null);
    setImage(null);
    try {
      const characterContext = selectedCharacter
        ? `${selectedCharacter.name}, ${selectedCharacter.race} woman, ${selectedCharacter.body_type?.replace(/_/g, ' ')}, same face same person, `
        : '';
      const characterPayload = selectedCharacter?.face_embedding ? {
        face_embedding: selectedCharacter.face_embedding,
        character: {
          name: selectedCharacter.name,
          race: selectedCharacter.race,
          body_type: selectedCharacter.body_type,
        }
      } : {};
      await runGeneration({
        prompt: characterContext + prompt,
        aspect_ratio: aspectRatio,
        negative_prompt: negativePrompt,
        setLoadingFn: setLoading,
        setErrorFn: setError,
        setImageFn: setImage,
        styleId: selectedCharacter?.face_embedding ? 'character' : null,
        ...characterPayload,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Generate (style) ──────────────────────────────────────────────────
  const handleStyleGenerate = async (finalPrompt, aspectRatio, negativePrompt, attachedImage) => {
    if (!user) { setLoginModalOpen(true); return; }
    if (credits < 2) { setStyleError('Insufficient credits.'); return; }
    setStyleLoading(true);
    setStyleError(null);
    setStyleImage(null);
    try {
      const characterPayload = selectedCharacter?.face_embedding ? {
        face_embedding: selectedCharacter.face_embedding,
        character: {
          name: selectedCharacter.name,
          race: selectedCharacter.race,
          body_type: selectedCharacter.body_type,
        }
      } : {};
      await runGeneration({
        prompt: finalPrompt,
        aspect_ratio: aspectRatio,
        negative_prompt: negativePrompt,
        image: attachedImage,
        setLoadingFn: setStyleLoading,
        setErrorFn: setStyleError,
        setImageFn: setStyleImage,
        styleId: selectedCharacter?.face_embedding ? 'character' : activeStyle.id,
        ...characterPayload,
      });
    } catch (err) {
      setStyleError(err.message);
    } finally {
      setStyleLoading(false);
    }
  };

  // ── Generate (edit) ───────────────────────────────────────────────────
  const handleEditViewGenerate = async ({ image, prompt, negativePrompt, poseStrength, cannyStrength }) => {
    if (!user) { setLoginModalOpen(true); return; }
    if (credits < 2) { setEditViewError('Insufficient credits.'); return; }
    setEditViewLoading(true);
    setEditViewError(null);
    setEditViewImage(null);
    try {
      await runGeneration({
        prompt, aspect_ratio: '9:16', image,
        negative_prompt: negativePrompt,
        setLoadingFn: setEditViewLoading, setErrorFn: setEditViewError, setImageFn: setEditViewImage,
        styleId: 'edit',
      });
    } catch (err) {
      setEditViewError(err.message);
    } finally {
      setEditViewLoading(false);
    }
  };

  // ── Face swap ─────────────────────────────────────────────────────────
  const handleFaceSwap = async ({ targetImage, sourceImage }) => {
    if (!user) { setLoginModalOpen(true); return; }
    setFaceswapLoading(true);
    setFaceswapError(null);
    setFaceswapResult(null);
    try {
      const response = await fetch('/api/faceswap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetImage, sourceImage })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setFaceswapResult(data.image);
    } catch (err) {
      setFaceswapError(err.message);
    } finally {
      setFaceswapLoading(false);
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────
  const handleNavigation = (tab) => {
    if (activeTab === 'explore' && tab !== 'explore') {
      setIsGalleryReady(false);
      setExploreKey(k => k + 1);
    }
    setActiveTab(tab);
    setIsSidebarOpen(false);
    setPromptCollapsed(false);
    if (['explore', 'gallery', 'style', 'edit', 'character', 'faceswap', 'settings'].includes(tab)) {
      setViewState('gallery');
    } else {
      setViewState('empty');
    }
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
    setEditViewImage(null);
    setEditViewError(null);
    setEditModalOpen(true);
  }, [user]);

  // ── Character created callback ────────────────────────────────────────
  const handleCharacterCreated = (newChar) => {
    setUserCharacters(prev => {
      const exists = prev.find(c => c.id === newChar.id);
      if (exists) return prev.map(c => c.id === newChar.id ? newChar : c);
      return [newChar, ...prev];
    });
  };

  // ── Render views ──────────────────────────────────────────────────────
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
          key={exploreKey}
          promptRef={promptRef}
          onSelectPrompt={handleSelectPrompt}
          onViewImage={handleViewImage}
          onEditImage={handleEditImage}
          onFetching={() => setIsGalleryReady(false)}
          onReady={() => setIsGalleryReady(true)}
        />;
      case 'character':
        return <CharacterView
          onSelectCharacter={setSelectedCharacter}
          selectedCharacter={selectedCharacter}
          onCharacterCreated={handleCharacterCreated}
        />;
      case 'gallery':
        return <MyImagesView
          images={userGallery}
          likedImages={likedGallery}
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
              selectedCharacter={selectedCharacter}
              onSelectCharacter={setSelectedCharacter}
              characters={userCharacters}
              onCharacterCreated={handleCharacterCreated}
            />
          : <StyleView onSelectStyle={setActiveStyle} />;
      case 'edit':
        return <EditView
          onGenerate={handleEditViewGenerate}
          loading={editViewLoading}
          image={editViewImage}
          error={editViewError}
          onViewImage={handleViewImage}
          credits={credits}
        />;
      case 'faceswap':
        return <FaceSwapView
          onSwap={handleFaceSwap}
          loading={faceswapLoading}
          result={faceswapResult}
          error={faceswapError}
        />;
      case 'settings':
        return <SettingsView />;
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
    onOpenSidebar: () => setIsSidebarOpen(true),
    selectedCharacter,
    onSelectCharacter: setSelectedCharacter,
    characters: userCharacters,
    onCharacterCreated: handleCharacterCreated,  // ← add this
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
          onNegativePromptLoad={setNegativePrompt}
          currentNegativePrompt={negativePrompt}
          onTopUpClick={() => setTopUpModalOpen(true)}
        />

        <main className="main-content">
          {activeTab !== 'style' && activeTab !== 'character' && activeTab !== 'edit' && activeTab !== 'faceswap' && activeTab !== 'gallery' && activeTab !== 'settings' && (
            <header className={`top-header ${promptCollapsed ? 'collapsed' : ''}`}>
              <h1 className="aesthetic-title">What will you create?</h1>
              <NotificationBell />   {/* 👈 add this */}
              <PromptBox {...promptBoxProps} collapsed={promptCollapsed} />
            </header>
          )}
          <div className="scrollable-area" style={{ position: 'relative' }}>
            {activeTab === 'explore' && !isGalleryReady && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg, #0f0f0f)', zIndex: 10
              }}>
                <div style={{
                  width: 40, height: 40,
                  border: '3px solid rgba(255,255,255,0.1)',
                  borderTop: '3px solid white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
              </div>
            )}
            <div style={{
              opacity: activeTab === 'explore' ? (isGalleryReady ? 1 : 0) : 1,
              transition: 'opacity 0.4s ease'
            }}>
              {renderActiveView()}
            </div>
          </div>
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

        {editModalOpen && (
          <EditModal
            image={editingImage?.url}
            originalPrompt={editingImage?.prompt}
            resultImage={editViewImage}
            loading={editViewLoading}
            error={editViewError}
            onClose={() => {
              setEditModalOpen(false);
              setEditViewImage(null);
              setEditViewError(null);
            }}
            onRetry={(newPrompt) => {
              handleEditViewGenerate({
                image: editingImage?.url,
                prompt: newPrompt,
                negativePrompt: '',
                poseStrength: 0.6,
                cannyStrength: 0.4,
              });
            }}
          />
        )}

        {viewImageModalOpen && (
          <ImageViewModal imageUrl={viewingImageUrl} onClose={() => setViewImageModalOpen(false)} />
        )}

        <InstallPrompt />
      </div>
    </div>
  );
}
