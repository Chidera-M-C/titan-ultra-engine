import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import CategoryTabs from '../components/Gallery/CategoryTabs';
import MasonryGrid from '../components/Gallery/MasonryGrid';
import { useAuth } from '../context/AuthContext';

const shuffleArray = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const CATEGORY_STYLE_MAP = {
  'Fine Art':      'fine_art_portrait',
  'Classic':       'classic_pose_style',
  'Candid':        'candid_lifestyle_style',
  'Studio/Street': 'studio_vs_street_lighting',
  'Action':        'dynamic_action_pose',
  'Editorial':     'high_fashion_editorial',
  'Minimalist':    'minimalist_composition',
  'Group':         'group_portrait_composition',
  'Close-up':      'macro_facial_detail',
  'Atmospheric':   'atmospheric_mood_lighting',
};

const CATEGORIES = ['All', ...Object.keys(CATEGORY_STYLE_MAP)];

export default function ExploreView({ promptRef, onSelectPrompt, onViewImage, onEditImage, onFetching, onReady }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const loadImages = useCallback(async () => {
    onFetching?.();
    setLoading(true);
    setImages([]); // ✅ clear stale images immediately on category switch
  
    try {
      let query = supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });
  
      if (activeCategory !== 'All') {
        const styleId = CATEGORY_STYLE_MAP[activeCategory];
        query = query.eq('style', styleId);
      }
  
      const { data, error } = await query;
      if (error) throw error;
  
      const { data: userLikes } = user
        ? await supabase.from('image_likes').select('image_id').eq('user_id', user.id)
        : { data: [] };
  
      const likedSet = new Set((userLikes || []).map(l => l.image_id));
  
      const fetchedImages = (data || []).map(doc => ({
        id: doc.id,
        url: doc.image_url,
        prompt: doc.prompt,
        userId: doc.user_id,
        createdAt: doc.created_at,
        likes: doc.likes || 0,
        liked: likedSet.has(doc.id),
      }));
  
      const shuffled = shuffleArray(fetchedImages);
  
      await Promise.all(
        shuffled.map(img => new Promise(resolve => {
          const i = new Image();
          i.onload = resolve;
          i.onerror = resolve;
          i.src = img.url;
        }))
      );
  
      setImages(shuffled);
  
      // ✅ wait one frame for React to render before lifting curtain
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          onReady?.();
        });
      });
  
    } catch (err) {
      console.error("Failed to fetch explore images:", err);
      onReady?.();
    } finally {
      setLoading(false);
    }
  }, [activeCategory, user]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  return (
    <>
      <CategoryTabs
        categories={CATEGORIES}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      <div className="gallery-centered-block">
        {images.length === 0 && !loading ? (
          <div className="empty-state">
            <h3>No images yet</h3>
            <p>Be the first to create something amazing!</p>
          </div>
        ) : (
          <MasonryGrid
            images={images}
            promptRef={promptRef}
            onImageClick={onViewImage}
            onSelectPrompt={onSelectPrompt}
            onEditImage={onEditImage}
          />
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading...
          </div>
        )}
      </div>
    </>
  );
}
