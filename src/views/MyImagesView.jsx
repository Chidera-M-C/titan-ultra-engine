import React, { useState } from 'react';
import { History, Download, Heart, Wand2 } from 'lucide-react';
import EmptyState from '../components/Shared/EmptyState';

export default function MyImagesView({ images, onSelectPrompt, onViewImage }) {
  if (!images || images.length === 0) {
    return <EmptyState icon={History} title="No images yet" description="Generate something first!" />;
  }

  return (
    <div className="gallery-grid">
      {images.map((img) => (
        <div key={img.id} className="gallery-card" onClick={() => onViewImage(img)}>
          <img src={img.url} alt="AI" />
          
          <div className="gallery-overlay">
            <div className="overlay-actions">
              {/* Load Prompt */}
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onSelectPrompt(img.prompt); }}>
                <Wand2 size={18} />
              </button>

              {/* Download */}
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); window.open(img.url, '_blank'); }}>
                <Download size={18} />
              </button>

              {/* Heart Toggle */}
              <HeartButton />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Separate component for the heart so it doesn't re-render the whole list
function HeartButton() {
  const [active, setActive] = useState(false);
  return (
    <button 
      className={`icon-btn ${active ? 'active-heart' : ''}`} 
      onClick={(e) => { e.stopPropagation(); setActive(!active); }}
    >
      <Heart size={18} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
