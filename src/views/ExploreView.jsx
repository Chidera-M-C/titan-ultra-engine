import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js'; // Use Supabase now
import CategoryTabs from '../components/Gallery/CategoryTabs';
import MasonryGrid from '../components/Gallery/MasonryGrid';

export default function ExploreView({ promptRef, onSelectPrompt, onViewImage, onEditImage }) {
  const [activeCategory, setActiveCategory] = useState('Explore');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Add this shuffle helper
  const shuffleArray = (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  const categories = ['Explore', 'Top', 'People', 'Nature', 'Poster', '3D Render'];

  const loadImages = async (isLoadMore = false) => {
  if (loading) return;
  setLoading(true);
  try {
    const limit = 20;
    const offset = isLoadMore ? images.length : 0;
    let query = supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (activeCategory !== 'Explore') {
      query = query.eq('category', activeCategory);
    }
    const { data, error } = await query;
    if (error) throw error;
    const fetchedImages = data.map(doc => ({
      id: doc.id,
      url: doc.image_url,
      prompt: doc.prompt,
      userId: doc.user_id,
      createdAt: doc.created_at
    }));
    if (isLoadMore) {
      setImages(prev => [...prev, ...fetchedImages]);
    } else {
      setImages(shuffleArray(fetchedImages));
    }
    setHasMore(fetchedImages.length === limit);
  } catch (err) {
    console.error("Failed to fetch explore images from Supabase:", err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadImages();
  }, [activeCategory]);

  return (
    <>
      <CategoryTabs 
        categories={categories} 
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
            Loading more...
          </div>
        )}
      </div>
    </>
  );
}
