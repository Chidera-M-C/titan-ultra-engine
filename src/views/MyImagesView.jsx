import React from 'react';
import MasonryGrid from '../components/Gallery/MasonryGrid';
import EmptyState from '../components/Shared/EmptyState';
import { History } from 'lucide-react';

export default function MyImagesView({ images, onSelectPrompt }) {
  if (images.length === 0) {
    return (
      <EmptyState 
        icon={History} 
        title="No images yet" 
        description="Your generated masterpieces will appear here." 
      />
    );
  }

  return (
    <MasonryGrid 
      images={images} 
      onImageClick={onSelectPrompt} 
      actionLabel="Reuse Prompt"
    />
  );
}
