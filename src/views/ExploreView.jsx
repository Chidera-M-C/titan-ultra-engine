import React, { useState, useEffect } from 'react';
import { db } from '../lib/appwrite.js';
import { Query } from 'appwrite';
import CategoryTabs from '../components/Gallery/CategoryTabs';
import MasonryGrid from '../components/Gallery/MasonryGrid';

export default function ExploreView({ onSelectPrompt, onViewImage, onEditImage }) {
  const [activeCategory, setActiveCategory] = useState('Explore');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const categories = ['Explore', 'Top', 'People', 'Nature', 'Poster', '3D Render'];

  // Fetch images from Appwrite
  const loadImages = async (isLoadMore = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const limit = 20;
      const offset = isLoadMore ? images.length : 0;

      // Fetch all users' images, ordered by most recent
      const response = await db.listDocuments(
        'main_db',
        'images',
        [
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
          Query.offset(offset)
        ]
      );

      const fetchedImages = response.documents.map(doc => ({
        id: doc.$id,
        url: doc.imageUrl,
        prompt: doc.prompt,
        userId: doc.userId,
        createdAt: doc.$createdAt
      }));

      if (isLoadMore) {
        setImages(prev => [...prev, ...fetchedImages]);
      } else {
        setImages(fetchedImages);
      }

      // Check if there are more images to load
      setHasMore(fetchedImages.length === limit);
      
    } catch (err) {
      console.error("Failed to fetch explore images:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load images on mount and when category changes
  useEffect(() => {
    loadImages();
  }, [activeCategory]);

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.querySelector('.scrollable-area');
      if (!scrollable) return;

      const scrollTop = scrollable.scrollTop;
      const scrollHeight = scrollable.scrollHeight;
      const clientHeight = scrollable.clientHeight;

      // Load more when user scrolls near bottom (200px before end)
      if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !loading) {
        loadImages(true);
      }
    };

    const scrollable = document.querySelector('.scrollable-area');
    if (scrollable) {
      scrollable.addEventListener('scroll', handleScroll);
      return () => scrollable.removeEventListener('scroll', handleScroll);
    }
  }, [images, hasMore, loading]);

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
