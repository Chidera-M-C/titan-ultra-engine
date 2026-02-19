import './Gallery.css';
import React from 'react';
import { Wand2, Download, RotateCcw } from 'lucide-react';

export default function MasonryGrid({ images, onImageClick, onSelectPrompt, onEditImage }) {
  return (
    <div className="masonry-grid">
      {images.map((img) => (
        <div key={img.id} className="gallery-card" onClick={() => onImageClick(img)}>
          <img src={img.url} alt="AI Art" loading="lazy" />
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
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
