import React from 'react';
import EmptyState from '../components/Shared/EmptyState'; // Ensure this path is correct
import { History } from 'lucide-react';

export default function MyImagesView({ images, onSelectPrompt }) {
  if (!images || images.length === 0) {
    return (
      <EmptyState 
        icon={History} 
        title="No images yet" 
        description="Your generated masterpieces will appear here." 
      />
    );
  }

  return (
    <div className="gallery-grid">
      {images.map((img) => (
        <div 
          key={img.id} 
          className="gallery-card"
          onClick={() => onSelectPrompt(img.prompt)}
        >
          <img src={img.url} alt="Generated" loading="lazy" />
          <div className="gallery-overlay">
            <p style={{ fontSize: '12px', color: '#fff' }}>Use Prompt</p>
          </div>
        </div>
      ))}
    </div>
  );
}
