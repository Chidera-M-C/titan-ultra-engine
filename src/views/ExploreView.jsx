import React, { useState } from 'react';
import CategoryTabs from '../components/Gallery/CategoryTabs';
import MasonryGrid from '../components/Gallery/MasonryGrid';

export default function ExploreView({ onSelectPrompt }) {
  const [activeCategory, setActiveCategory] = useState('Explore');
  const categories = ['Explore', 'Top', 'People', 'Nature', 'Poster', '3D Render'];

  // Varying aspect ratios for true masonry variety
  const dimensions = [
    '400/600',  // standard portrait
    '600/400',  // landscape
    '500/500',  // square
    '400/800',  // tall portrait
    '800/400',  // wide landscape
    '600/600',  // larger square
    '450/750',  // extra tall
    '750/450',  // extra wide
  ];

  const getDummyImages = () => {
    const categorySeeds = { 'Explore': 100, 'Top': 200, 'People': 300, 'Nature': 400, 'Poster': 500, '3D Render': 600 };
    const baseSeed = categorySeeds[activeCategory] || 100;
    return Array.from({ length: 30 }, (_, i) => {  // Increased to 30 for better testing
      const dim = dimensions[i % dimensions.length];
      const [width, height] = dim.split('/');
      return {
        id: `${activeCategory}-${i}`,
        url: `https://picsum.photos/seed/${baseSeed + i}/${width}/${height}`,
        prompt: `Amazing ${activeCategory.toLowerCase()} style artwork #${i + 1}`
      };
    });
  };

  return (
    <>
      {/* CategoryTabs stays full-width for sticky bar with solid background */}
      <CategoryTabs 
        categories={categories} 
        activeCategory={activeCategory} 
        onSelectCategory={setActiveCategory} 
      />

      {/* Wrapper centers the grid with equal side space + balanced gutters */}
      <div className="gallery-wrapper">
        <MasonryGrid 
          images={getDummyImages()} 
          onImageClick={onSelectPrompt} 
          actionLabel="Remix"
        />
      </div>
    </>
  );
}
