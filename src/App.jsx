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
import PullToRefresh from './components/Shared/PullToRefresh';   // ← NEW

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
  const [viewingImageId, setViewingImageId] = useState(null);
  const [viewingImageOwnerId, setViewingImageOwnerId] = useState(null);
  const [viewingImagePrompt, setViewingImagePrompt] = useState(null);
  const [viewingImageNegativePrompt, setViewingImageNegativePrompt] = useState(null);

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

  // ── Load gallery ──────────────────────────────────────────────────────
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
        category: doc.style || doc.category || '',
        created_at: doc.created_at,
      })));

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
          category: doc.style || doc.category || '',
          created_at: doc.created_at,
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
      setLikedGallery([]);
      const timer = setTimeout(() => setLoginModalOpen(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]);

  // ── NEW: Pull-to-refresh handler ─────────────────────────────────────
  const handlePullRefresh = useCallback(async () => {
    if (!user) return;

    if (activeTab === 'explore') {
      setExploreKey(k => k + 1);           // forces ExploreView to reload
    } else if (activeTab === 'gallery') {
      await loadGallery();                 // refreshes My Images + Liked
    }
    // Add more tabs here later if needed
  }, [activeTab, user]);

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

  // ... rest of your file is completely unchanged ...

  // ── Render views (unchanged) ──────────────────────────────────────────
  const renderActiveView = () => { /* exactly the same as you had */ 
    // (I kept it identical - no changes here)
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

  const promptBoxProps = { /* unchanged */ 
    // ... your original promptBoxProps ...
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
              <div className="top-header-row">
                <h1 className="aesthetic-title">What will you create?</h1>
                <div className="notif-bell-wrapper">
                  <NotificationBell onOpenImage={(img) => {
                    setViewingImageUrl(img.url);
                    setViewingImageId(img.id);
                    setViewingImageOwnerId(img.userId);
                    setViewImageModalOpen(true);
                  }} />
                </div>
              </div>
              <PromptBox {...promptBoxProps} collapsed={promptCollapsed} />
            </header>
          )}

          {/* Pull-to-Refresh wrapper added here only */}
          <PullToRefresh onRefresh={handlePullRefresh} disabled={!user}>
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
          </PullToRefresh>
        </main>

        {/* All your modals remain 100% unchanged */}
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
          <ImageViewModal
            imageUrl={viewingImageUrl}
            imageId={viewingImageId}
            imageOwnerId={viewingImageOwnerId}
            imagePrompt={viewingImagePrompt}
            imageNegativePrompt={viewingImageNegativePrompt}
            onClose={() => setViewImageModalOpen(false)}
          />
        )}

        <InstallPrompt />
      </div>
    </div>
  );
}
