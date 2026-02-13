import React, { useState } from 'react';
import CategoryTabs from '../components/Gallery/CategoryTabs';
import MasonryGrid from '../components/Gallery/MasonryGrid';

export default function ExploreView({ onSelectPrompt }) {
  const [activeCategory, setActiveCategory] = useState('Explore');
  const categories = ['Explore', 'Top', 'People', 'Nature', 'Poster', '3D Render'];

  const dimensions = [
    '400/600', '600/400', '500/500', '400/800', '800/400', '600/600', '450/750', '750/450',
  ];

  const getDummyImages = () => {
    const categorySeeds = { 'Explore': 100, 'Top': 200, 'People': 300, 'Nature': 400, 'Poster': 500, '3D Render': 600 };
    const baseSeed = categorySeeds[activeCategory] || 100;
    return Array.from({ length: 30 }, (_, i) => {
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
      <CategoryTabs 
        categories={categories} 
        activeCategory={activeCategory} 
        onSelectCategory={setActiveCategory} 
      />

      {/* Centered wrapper with tuned max-width for exactly 5 large columns + tight gaps */}
      <div className="gallery-centered-block">
        <MasonryGrid 
          images={getDummyImages()} 
          onImageClick={onSelectPrompt} 
          actionLabel="Remix"
        />
      </div>
    </>
  );
}
