import React from 'react';
import ImageCard from './ImageCard';
import './Gallery.css';

export default function MasonryGrid({ images, onImageClick, actionLabel }) {
  return (
    <div className="masonry-grid">
      {images.map((img) => (
        <ImageCard 
          key={img.id}
          url={img.url}
          prompt={img.prompt}
          onAction={() => onImageClick(img)}
          actionLabel={actionLabel}
        />
      ))}
    </div>
  );
}
