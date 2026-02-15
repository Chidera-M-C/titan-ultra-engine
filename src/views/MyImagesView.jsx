import React, { useState } from 'react';
import EmptyState from '../components/Shared/EmptyState';
import { History, Download, Heart, Wand2 } from 'lucide-react'; // Import icons

export default function MyImagesView({ images, onSelectPrompt, onViewImage }) {
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
        <ImageCard 
          key={img.id} 
          img={img} 
          onSelectPrompt={onSelectPrompt} 
          onViewImage={onViewImage} 
        />
      ))}
    </div>
  );
}

// Sub-component to handle individual card state (like the heart toggle)
function ImageCard({ img, onSelectPrompt, onViewImage }) {
  const [isFavorite, setIsFavorite] = useState(false); // Local toggle state

  const handleDownload = async (e) => {
    e.stopPropagation(); // Stop the card from opening
    try {
      const response = await fetch(img.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  return (
    <div 
      className="gallery-card"
      onClick={() => onViewImage(img)} // Clicking card opens view modal
    >
      <img src={img.url} alt="Generated" loading="lazy" />
      
      {/* Overlay Action Bar */}
      <div className="gallery-overlay">
        <div className="overlay-actions">
          
          {/* 1. Load Prompt Button */}
          <button 
            className="icon-btn" 
            title="Reuse Prompt"
            onClick={(e) => {
              e.stopPropagation();
              onSelectPrompt(img.prompt);
            }}
          >
            <Wand2 size={18} />
          </button>

          {/* 2. Download Button */}
          <button 
            className="icon-btn" 
            title="Download"
            onClick={handleDownload}
          >
            <Download size={18} />
          </button>

          {/* 3. Heart Button (Toggle) */}
          <button 
            className={`icon-btn ${isFavorite ? 'active-heart' : ''}`} 
            title="Favorite"
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorite(!isFavorite);
            }}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          </button>

        </div>
      </div>
    </div>
  );
}
