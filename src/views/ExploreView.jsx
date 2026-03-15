import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import CategoryTabs from '../components/Gallery/CategoryTabs';
import MasonryGrid from '../components/Gallery/MasonryGrid';

const shuffleArray = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function ExploreView({ promptRef, onSelectPrompt, onViewImage, onEditImage, imagesCache }) {
  const [activeCategory, setActiveCategory] = useState('Explore');
  const [images, setImages] = useState(imagesCache?.current?.length > 0 ? imagesCache.current : []);
  const [loading, setLoading] = useState(false);

  const categories = ['Explore', 'Top', 'People', 'Nature', 'Poster', '3D Render'];

  const loadImages = async () => {
    // Use cache if available for Explore category
    if (activeCategory === 'Explore' && imagesCache?.current?.length > 0) {
      setImages(imagesCache.current);
      return;
    }

    if (loading) return;
    setLoading(true);
    try {
      let query = supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });

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

      const shuffled = shuffleArray(fetchedImages);

      // Save to cache only for Explore category
      if (activeCategory === 'Explore' && imagesCache) {
        imagesCache.current = shuffled;
      }

      setImages(shuffled);
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
            Loading...
          </div>
        )}
      </div>
    </>
  );
}
