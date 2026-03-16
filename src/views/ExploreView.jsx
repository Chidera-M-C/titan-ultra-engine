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

// Maps tab label to style id used in the images table
const CATEGORY_STYLE_MAP = {
  'Female Nude':    'female_nude_portrait',
  'Missionary':     'missionary_style',
  'Doggy Style':    'doggy_style',
  'Dressed/Naked':  'dressed_vs_naked',
  'Cowgirl':        'cowgirl_style',
  'Anal':           'anal_sex',
  'Oral':           'oral_sex',
  'Threesome':      'threesome_sex',
  'Cum on Face':    'cum_on_face',
  'Lesbian':        'lesbian_sex',
};

const CATEGORIES = ['All', ...Object.keys(CATEGORY_STYLE_MAP)];

export default function ExploreView({ promptRef, onSelectPrompt, onViewImage, onEditImage, imagesCache }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [images, setImages] = useState(imagesCache?.current?.length > 0 ? imagesCache.current : []);
  const [loading, setLoading] = useState(false);

  const loadImages = async () => {
    // Use cache for All category
    if (activeCategory === 'All' && imagesCache?.current?.length > 0) {
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

      // Filter by style id if not All
      if (activeCategory !== 'All') {
        const styleId = CATEGORY_STYLE_MAP[activeCategory];
        query = query.eq('style', styleId);
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

      // Cache only for All
      if (activeCategory === 'All' && imagesCache) {
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
