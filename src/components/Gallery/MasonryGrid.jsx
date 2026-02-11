import './Gallery.css';
import React from 'react';
import ImageCard from './ImageCard';

export default function MasonryGrid({ images, onImageClick, actionLabel }) {
  return (
    <div className="masonry-grid">
      {images.map((img) => (
        <ImageCard 
          key={img.id}
          url={img.url}
          prompt={img.prompt}
          onAction={onImageClick}
          actionLabel={actionLabel}
        />
      ))}
    </div>
  );
}
