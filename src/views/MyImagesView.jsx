import React, { useState } from 'react';
import { Wand2, Download, Heart } from 'lucide-react';
import EmptyState from '../components/Shared/EmptyState';

export default function MyImagesView({ images, onSelectPrompt, onViewImage, currentPrompt }) {
  if (!images || images.length === 0) {
    return <EmptyState title="No images yet" description="Generate something first!" />;
  }

  const handleDownload = (e, url, imageId) => {
    e.stopPropagation();
    console.log('Download clicked for:', url); // Debug log
    
    // Simple, direct download approach
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-generated-${imageId || Date.now()}.png`;
    link.target = '_blank'; // Helps with some browsers
    link.rel = 'noopener noreferrer';
    
    // For base64 images, this works directly
    // For Appwrite URLs, the browser will handle it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Download triggered'); // Debug log
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
              {/* Toggle Prompt Button */}
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (img.prompt === currentPrompt) {
                    onSelectPrompt(''); // Clear prompt
                  } else {
                    onSelectPrompt(img.prompt); // Load prompt
                  }
                }}
                aria-label="Toggle prompt"
                title="Load/clear this prompt"
              >
                <Wand2 size={18} color="#ffffff" />
              </button>

              {/* Download Button */}
              <button
                className="icon-btn"
                onClick={(e) => handleDownload(e, img.url, img.id)}
                aria-label="Download image"
                title="Download image"
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
      title={active ? 'Unlike' : 'Like'}
    >
      <Heart 
        size={18} 
        color="#ffffff" 
        fill={active ? '#ffffff' : 'none'} 
      />
    </button>
  );
}
