import React, { useState } from 'react';
import CategoryTabs from '../components/Gallery/CategoryTabs';
import MasonryGrid from '../components/Gallery/MasonryGrid';

export default function ExploreView({ onSelectPrompt }) {
  const [activeCategory, setActiveCategory] = useState('Explore');
  const categories = ['Explore', 'Top', 'People', 'Nature', 'Poster', '3D Render'];

  // Preserved logic for dummy images
  const getDummyImages = () => {
    const categorySeeds = { 'Explore': 100, 'Top': 200, 'People': 300, 'Nature': 400, 'Poster': 500, '3D Render': 600 };
    const baseSeed = categorySeeds[activeCategory] || 100;
    return Array.from({ length: 24 }, (_, i) => ({
      id: `${activeCategory}-${i}`,
      url: `https://picsum.photos/seed/${baseSeed + i}/400/600`,
      prompt: `Amazing ${activeCategory.toLowerCase()} style artwork #${i + 1}`
    }));
  };

  return (
    <>
      <CategoryTabs 
        categories={categories} 
        activeCategory={activeCategory} 
        onSelectCategory={setActiveCategory} 
      />
      <MasonryGrid 
        images={getDummyImages()} 
        onImageClick={onSelectPrompt} 
        actionLabel="Remix"
      />
    </>
  );
}
