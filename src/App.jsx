import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { Menu, X, Bell } from 'lucide-react';
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
  const [editViewImage, setEditViewImage] = useState(null);
  const [editViewLoading, setEditViewLoading] = useState(false);
  const [editViewError, setEditViewError] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [userCharacters, setUserCharacters] = useState([]);
  const [isGalleryReady, setIsGalleryReady] = useState(false);
  const [exploreKey, setExploreKey] = useState(0);
  const [faceswapResult, setFaceswapResult] = useState(null);
  const [faceswapLoading, setFaceswapLoading] = useState(false);
  const [faceswapError, setFaceswapError] = useState(null);
  const [likedGallery, setLikedGallery] = useState([]);

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const notificationRef = useRef(null);

  const delay = (ms) => new Promise(res => setTimeout(res, ms));
  const promptRef = useRef(prompt);
  useEffect(() => { promptRef.current = prompt; }, [prompt]);

  // Load user characters
  useEffect(() => {
    if (!user) { setUserCharacters([]); return; }
    supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setUserCharacters(data || []));
  }, [user]);

  // Load gallery
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

  // Scroll collapse
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

  // ── NOTIFICATION LOGIC ────────────────────────────────────────────────
  useEffect(() => {
    if (!user || authLoading) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    };

    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new, ...prev]);
            if (!payload.new.read) setUnreadCount(c => c + 1);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id ? payload.new : n)
            );
            setUnreadCount(prev.filter(n => !n.read).length);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, authLoading]);

  const markAsRead = async (id) => {
    if (!id) return;
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global click guard
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

  // Credits & Payment (unchanged)
  const deductCreditsLive = async (amount) => { /* your original code */ };
  const handleTopUpPurchase = async (pack) => { /* your original code */ };

  // Core generation functions (unchanged)
  const runGeneration = async ({ prompt, aspect_ratio, image: attachedImg, setLoadingFn, setErrorFn, setImageFn, styleId = null, negative_prompt = null, face_embedding = null, character = null }) => { /* your original code */ };

  const generateImage = async () => { /* your original code */ };
  const handleStyleGenerate = async (finalPrompt, aspectRatio, negativePrompt, attachedImage) => { /* your original code */ };
  const handleEditViewGenerate = async ({ image, prompt, negativePrompt, poseStrength, cannyStrength }) => { /* your original code */ };
  const handleFaceSwap = async ({ targetImage, sourceImage }) => { /* your original code */ };

  // Navigation & handlers
  const handleNavigation = (tab) => { /* your original code */ };
  const handleSelectPrompt = useCallback((selectedPrompt) => { /* your original code */ }, []);
  const handleViewImage = useCallback((img) => { /* your original code */ }, []);
  const handleEditImage = useCallback((img) => { /* your original code */ }, [user]);
  const handleCharacterCreated = (newChar) => { /* your original code */ };

  const renderActiveView = () => { /* your original full renderActiveView */ };

  const promptBoxProps = { /* your original promptBoxProps */ };

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
            <header className={`top-header ${promptCollapsed ? 'collapsed' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
              <div style={{ flex: 1 }}>
                <h1 className="aesthetic-title">What will you create?</h1>
              </div>

              <PromptBox {...promptBoxProps} collapsed={promptCollapsed} />

              {/* NOTIFICATION BELL - top right on Explore only */}
              <div ref={notificationRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
                  title="Notifications"
                >
                  <Bell size={24} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -2, right: -2,
                      background: '#e63939', color: '#fff', fontSize: '10px',
                      fontWeight: '700', minWidth: '18px', height: '18px',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotificationsDropdown && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '340px',
                    background: '#1f1f1f', border: '1px solid #333', borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 9999, overflow: 'hidden'
                  }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: 0 }}>Notifications</h4>
                      {unreadCount > 0 && <button onClick={markAllAsRead} style={{ fontSize: '13px', color: '#00d4ff' }}>Mark all read</button>}
                    </div>
                    <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>No notifications yet</div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => { if (!notif.read) markAsRead(notif.id); setShowNotificationsDropdown(false); }}
                            style={{
                              padding: '14px 20px', borderBottom: '1px solid #222', cursor: 'pointer',
                              background: notif.read ? 'transparent' : '#2a2a2a'
                            }}
                          >
                            <div style={{ fontWeight: notif.read ? 400 : 600 }}>{notif.title || notif.type.toUpperCase()}</div>
                            <div style={{ fontSize: '14px', color: '#ccc', marginTop: '4px' }}>{notif.message}</div>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                              {new Date(notif.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </header>
          )}

          <div className="scrollable-area" style={{ position: 'relative' }}>
            {activeTab === 'explore' && !isGalleryReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #0f0f0f)', zIndex: 10 }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            )}
            <div style={{ opacity: activeTab === 'explore' ? (isGalleryReady ? 1 : 0) : 1, transition: 'opacity 0.4s ease' }}>
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
              setImage(null); setError(null);
              setStyleImage(null); setStyleError(null);
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
        {viewImageModalOpen && <ImageViewModal imageUrl={viewingImageUrl} onClose={() => setViewImageModalOpen(false)} />}
        <InstallPrompt />
      </div>
    </div>
  );
}
