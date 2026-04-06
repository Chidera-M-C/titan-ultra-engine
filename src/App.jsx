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
import TextToVideoView from './views/TextToVideoView';
import ImageToVideoView from './views/ImageToVideoView';
import VideoStyleView from './views/VideoStyleView';
import VideoStyleGeneratorView from './views/VideoStyleGeneratorView';
import MyVideosView from './views/MyVideosView';
import { saveVideo } from './lib/videoService.js';
import VideoResultModal from './components/Shared/VideoResultModal';

const MemoExploreView = React.memo(ExploreView);

// ── Pull to refresh (mobile only, full reload) ────────────────────────────────
function usePullToRefresh() {
  const [pullY, setPullY]       = useState(0);
  const [pulling, setPulling]   = useState(false);
  const [releasing, setReleasing] = useState(false);
  const startYRef = useRef(null);
  const THRESHOLD = 72;

  useEffect(() => {
    if (window.innerWidth > 768) return;

    const scrollable = document.querySelector('.scrollable-area');
    if (!scrollable) return;

    const onTouchStart = (e) => {
      if (scrollable.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
        setPulling(false);
        setReleasing(false);
      }
    };

    const onTouchMove = (e) => {
      if (startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0 && scrollable.scrollTop === 0) {
        e.preventDefault();
        setPulling(true);
        setPullY(Math.min(delta * 0.45, THRESHOLD + 24));
      }
    };

    const onTouchEnd = () => {
      if (startYRef.current === null) return;
      if (pullY >= THRESHOLD) {
        setReleasing(true);
        setPullY(THRESHOLD);
        // brief pause so user sees the spinner, then reload
        setTimeout(() => window.location.reload(), 600);
      } else {
        setPulling(false);
        setPullY(0);
      }
      startYRef.current = null;
    };

    scrollable.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollable.addEventListener('touchmove',  onTouchMove,  { passive: false });
    scrollable.addEventListener('touchend',   onTouchEnd);

    return () => {
      scrollable.removeEventListener('touchstart', onTouchStart);
      scrollable.removeEventListener('touchmove',  onTouchMove);
      scrollable.removeEventListener('touchend',   onTouchEnd);
    };
  }, [pullY]);

  return { pullY, pulling, releasing };
}

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
  const [videoResult, setVideoResult]         = useState(null);
  const [videoLoading, setVideoLoading]       = useState(false);
  const [videoError, setVideoError]           = useState(null);
  const [activeVideoStyle, setActiveVideoStyle] = useState(null);
  const [userVideos, setUserVideos]           = useState([]);
  const [likedVideos, setLikedVideos]         = useState([]);
  const [showVideoResult, setShowVideoResult] = useState(false);
  const [selectedExploreStyle, setSelectedExploreStyle] = useState(null);

  const { pullY, pulling, releasing } = usePullToRefresh();
  const showPullIndicator = pulling || releasing;
  const THRESHOLD = 72;

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
  const loadGallery = useCallback(async () => {
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
        id:         doc.id,
        url:        doc.image_url,
        prompt:     doc.prompt,
        likes:      doc.likes || 0,
        liked:      likedSet.has(doc.id),
        category:   doc.style || doc.category || '',
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
          id:         doc.id,
          url:        doc.image_url,
          prompt:     doc.prompt,
          likes:      doc.likes || 0,
          liked:      true,
          category:   doc.style || doc.category || '',
          created_at: doc.created_at,
        })));
      } else {
        setLikedGallery([]);
      }
    } catch (err) {
      console.error('Supabase Sync error:', err);
    }
  }, [user]);

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
  
  // 3. ADD loadVideos function (after loadGallery):
  const loadVideos = useCallback(async () => {
    if (!user) { setUserVideos([]); setLikedVideos([]); return; }
    try {
      const { data: videos } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
   
      const { data: vLikes } = await supabase
        .from('video_likes')
        .select('video_id')
        .eq('user_id', user.id);
   
      const likedSet = new Set((vLikes || []).map(l => l.video_id));
   
      setUserVideos((videos || []).map(v => ({
        ...v,
        liked: likedSet.has(v.id),
      })));
   
      if (vLikes && vLikes.length > 0) {
        const likedIds = vLikes.map(l => l.video_id);
        const { data: likedVids } = await supabase
          .from('videos')
          .select('*')
          .in('id', likedIds)
          .order('created_at', { ascending: false });
        setLikedVideos((likedVids || []).map(v => ({ ...v, liked: true })));
      } else {
        setLikedVideos([]);
      }
    } catch (err) {
      console.error('loadVideos error:', err);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      loadGallery(); loadVideos();
    } else {
      setUserGallery([]);
      setLikedGallery([]);
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
            setUserGallery(prev => [{
              id:         Date.now(),
              url:        publicUrl,
              prompt,
              likes:      0,
              liked:      false,
              category:   styleId || '',
              created_at: new Date().toISOString(),
            }, ...prev]);
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
          name:      selectedCharacter.name,
          race:      selectedCharacter.race,
          body_type: selectedCharacter.body_type,
        }
      } : {};
      await runGeneration({
        prompt: characterContext + prompt,
        aspect_ratio: aspectRatio,
        negative_prompt: negativePrompt,
        setLoadingFn: setLoading,
        setErrorFn:   setError,
        setImageFn:   setImage,
        styleId: selectedCharacter?.face_embedding
          ? 'character'
          : (selectedExploreStyle?.id || null),
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
          name:      selectedCharacter.name,
          race:      selectedCharacter.race,
          body_type: selectedCharacter.body_type,
        }
      } : {};
      await runGeneration({
        prompt:          finalPrompt,
        aspect_ratio:    aspectRatio,
        negative_prompt: negativePrompt,
        image:           attachedImage,
        setLoadingFn:    setStyleLoading,
        setErrorFn:      setStyleError,
        setImageFn:      setStyleImage,
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
        setLoadingFn: setEditViewLoading,
        setErrorFn:   setEditViewError,
        setImageFn:   setEditViewImage,
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

  // 5. ADD handleVideoGenerate function (after handleFaceSwap):
  const handleVideoGenerate = async (params) => {
    if (!user) { setLoginModalOpen(true); return; }
    setVideoLoading(true);
    setShowVideoResult(true);
    setVideoError(null);
    setVideoResult(null);
   
    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
   
      if (!response.ok) throw new Error('Server error starting video generation');
      const { jobId, endpointId } = await response.json();
      if (!jobId) throw new Error('Failed to start video job');
   
      // Poll for completion
      let completed = false, attempts = 0;
      while (!completed && attempts < 150) {
        attempts++;
        const statusRes = await fetch('/api/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, endpointId }),
        });
        const statusData = await statusRes.json();
   
        if (statusData.status === 'COMPLETED') {
          const output = statusData.output;
          const base64Video = output?.video || output?.videos?.[0] || output?.[0]?.video || output?.[0] || null;
          if (!base64Video) throw new Error('Video data not found in response');
   
          setVideoResult(base64Video);
          setVideoLoading(false);
          completed = true;
   
          // Save in background
          (async () => {
            try {
              await deductCreditsLive(4); // videos cost more
              await saveVideo(user.id, base64Video, {
                prompt:         params.prompt,
                negativePrompt: params.negativePrompt,
                aspectRatio:    params.aspectRatio,
                style:          params.style,
                duration:       params.duration,
                motionStrength: params.motionStrength,
                startImageUrl:  params.startImage || null,
                endImageUrl:    params.endImage || null,
                characterId:    selectedCharacter?.id || null,
                generationType: params.type,
              });
              loadVideos(); // refresh my videos
            } catch (err) { console.error('Post-video save failed:', err); }
          })();
        } else if (statusData.status === 'FAILED') {
          throw new Error('Video generation failed');
        } else {
          await delay(3000); // videos take longer
        }
      }
      if (!completed) throw new Error('Video generation timed out.');
    } catch (err) {
      setVideoError(err.message);
      setVideoLoading(false);
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
    if (['explore', 'gallery', 'style', 'edit', 'character', 'faceswap', 'settings', 'text_to_video','image_to_video','video_styles','my_videos'].includes(tab)) {
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
    setViewingImageId(img.id || null);
    setViewingImageOwnerId(img.userId || null);
    setViewingImagePrompt(img.prompt || null);
    setViewingImageNegativePrompt(img.negativePrompt || null);
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
        
      case 'text_to_video':
        return <TextToVideoView
          onGenerate={handleVideoGenerate}
          loading={videoLoading}
          error={videoError}
          result={videoResult}
          selectedCharacter={selectedCharacter}
          onSelectCharacter={setSelectedCharacter}
          characters={userCharacters}
          onCharacterCreated={handleCharacterCreated}
        />;
       
      case 'image_to_video':
        return <ImageToVideoView
          onGenerate={handleVideoGenerate}
          loading={videoLoading}
          error={videoError}
          result={videoResult}
          selectedCharacter={selectedCharacter}
          onSelectCharacter={setSelectedCharacter}
          characters={userCharacters}
          onCharacterCreated={handleCharacterCreated}
          userImages={userGallery}
          likedImages={likedGallery}
        />;
       
      case 'video_styles':
        return activeVideoStyle
          ? <VideoStyleGeneratorView
              style={activeVideoStyle}
              onBack={() => { setActiveVideoStyle(null); setVideoResult(null); setVideoError(null); }}
              onGenerate={handleVideoGenerate}
              loading={videoLoading}
              error={videoError}
              result={videoResult}
              selectedCharacter={selectedCharacter}
              onSelectCharacter={setSelectedCharacter}
              characters={userCharacters}
              onCharacterCreated={handleCharacterCreated}
              userImages={userGallery}
              likedImages={likedGallery}
            />
          : <VideoStyleView onSelectStyle={setActiveVideoStyle} />;
       
      case 'my_videos':
        return <MyVideosView
          videos={userVideos}
          likedVideos={likedVideos}
        />;

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
    onGenerate:         generateImage,
    loading,
    negativePrompt,
    setNegativePrompt,
    onOpenSidebar:      () => setIsSidebarOpen(true),
    selectedCharacter,
    onSelectCharacter:  setSelectedCharacter,
    characters:         userCharacters,
    onCharacterCreated: handleCharacterCreated,
    selectedStyle:      selectedExploreStyle,
    onSelectStyle:      setSelectedExploreStyle,
  };

  // pull progress 0→1
  const pullProgress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div className="master-wrapper" onClickCapture={handleGlobalClick}>

      {/* ── Pull to refresh indicator — fixed to very top of screen, mobile only ── */}
      {showPullIndicator && (
        <div style={{
          position:       'fixed',
          top:            0,
          left:           0,
          right:          0,
          height:         `${Math.max(pullY, releasing ? THRESHOLD : 0)}px`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          zIndex:         99999,
          pointerEvents:  'none',
          background:     'linear-gradient(to bottom, rgba(124,58,237,0.08), transparent)',
          transition:     releasing ? 'height 0.25s ease' : 'none',
          overflow:       'hidden',
        }}>
          <div style={{
            width:        28,
            height:       28,
            border:       '2.5px solid rgba(168,85,247,0.25)',
            borderTop:    '2.5px solid #a855f7',
            borderRadius: '50%',
            opacity:      pullProgress,
            animation:    releasing ? 'spin 0.6s linear infinite' : 'none',
            transform:    releasing ? undefined : `rotate(${pullProgress * 300}deg)`,
            transition:   releasing ? 'none' : 'opacity 0.1s',
          }} />
        </div>
      )}

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
          {activeTab !== 'style' && 
           activeTab !== 'character' && 
           activeTab !== 'edit' && 
           activeTab !== 'faceswap' && 
           activeTab !== 'gallery' && 
           activeTab !== 'settings' && 
           activeTab !== 'text_to_video' && 
           activeTab !== 'image_to_video' && 
           activeTab !== 'video_styles' && 
           activeTab !== 'my_videos' && (
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

          <div
            className="scrollable-area"
            style={{
              position:  'relative',
              transform: showPullIndicator ? `translateY(${pullY * 0.3}px)` : 'translateY(0)',
              transition: releasing ? 'transform 0.25s ease' : 'none',
            }}
          >
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
              opacity:    activeTab === 'explore' ? (isGalleryReady ? 1 : 0) : 1,
              transition: 'opacity 0.4s ease',
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
                image:          editingImage?.url,
                prompt:         newPrompt,
                negativePrompt: '',
                poseStrength:   0.6,
                cannyStrength:  0.4,
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

        {showVideoResult && (
          <VideoResultModal
            videoUrl={videoResult}
            loading={videoLoading}
            error={videoError}
            onClose={() => {
              setShowVideoResult(false);
              setVideoResult(null);
              setVideoError(null);
            }}
            onRetry={() => {
              // videoResult modal has no retry params stored, just close
              setVideoError(null);
            }}
          />
        )}

        <InstallPrompt />
      </div>
    </div>
  );
}
