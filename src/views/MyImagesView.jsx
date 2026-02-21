import React from 'react';
import MasonryGrid from '../components/Gallery/MasonryGrid';
import EmptyState from '../components/Shared/EmptyState';

export default function MyImagesView({ images, prompt, onSelectPrompt, onViewImage, onEditImage }) {
  if (!images || images.length === 0) {
    return <EmptyState title="No images yet" description="Generate something first!" />;
  }

  return (
    <div className="gallery-grid">
      <MasonryGrid 
        images={images} 
        prompt={prompt} // Unified prop name
        onSelectPrompt={onSelectPrompt}
        onImageClick={onViewImage}
        onEditImage={onEditImage}
      />
    </div>
  );
}
