import React, { useState } from 'react';
import { Wand2, Download, Heart } from 'lucide-react';
import EmptyState from '../components/Shared/EmptyState';

export default function MyImagesView({ images, onSelectPrompt, onViewImage }) {
  if (!images || images.length === 0) {
    return <EmptyState title="No images yet" description="Generate something first!" />;
  }

  const handleDownload = (e, url, imageId) => {
    e.stopPropagation();
    const filename = `ai-generated-${imageId || Date.now()}.png`;
    
    const triggerDownload = (downloadUrl) => {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    if (url.startsWith('data:')) {
      triggerDownload(url);
    } else {
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Fetch failed');
          return res.blob();
        })
        .then(blob => {
          const objectUrl = URL.createObjectURL(blob);
          triggerDownload(objectUrl);
          setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
        })
        .catch(() => {
          window.open(url, '_blank');
        });
    }
  };

  return (
    <div className="gallery-grid">
      {images.map((img) => (
        <div
          key={img.id}
          className="gallery-card"
          onClick={() => onViewImage(img)}
        >
          <img src={img.url} alt="Generated AI image" loading="lazy" />
          <div className="gallery-overlay">
            <div className="overlay-actions">
              {/* Load Prompt Button */}
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPrompt(img.prompt);
                }}
                aria-label="Load prompt"
              >
                <Wand2 size={18} color="#ffffff" />
              </button>

              {/* Download Button */}
              <button
                className="icon-btn"
                onClick={(e) => handleDownload(e, img.url, img.id)}
                aria-label="Download image"
              >
                <Download size={18} color="#ffffff" />
              </button>

              {/* Heart Button */}
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
    <button
      className={`icon-btn ${active ? 'active-heart' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setActive(!active);
      }}
      aria-label={active ? 'Unlike' : 'Like'}
    >
      <Heart 
        size={18} 
        color="#ffffff" 
        fill={active ? '#ffffff' : 'none'} 
      />
    </button>
  );
}
