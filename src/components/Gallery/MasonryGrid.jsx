import './Gallery.css';
import React, { useState } from 'react';
import { Wand2, Download, Heart, RotateCcw } from 'lucide-react';

export default function MasonryGrid({ images, onImageClick, onSelectPrompt, onEditImage }) {
  return (
    <div className="masonry-grid">
      {images.map((img) => (
        <div
          key={img.id}
          className="gallery-card allow-visitor"
          onClick={() => onImageClick(img)}
        >
          <img 
            src={img.url} 
            alt="AI Art" 
            className="allow-visitor" 
            loading="lazy" 
          />
          <div className="gallery-overlay">
            <div className="overlay-actions">
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onSelectPrompt(img.prompt); }}>
                <RotateCcw size={18} />
              </button>
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); window.open(img.url, '_blank'); }}>
                <Download size={18} />
              </button>
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onEditImage(img); }}>
                <Wand2 size={18} />
              </button>
              <HeartButton />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HeartButton() {
  const [active, setActive] = useState(false);
  return (
    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setActive(!active); }}>
      <Heart size={18} fill={active ? "white" : "none"} />
    </button>
  );
}
