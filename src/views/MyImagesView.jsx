import React, { useState } from 'react';
import { Wand2, Download, Heart } from 'lucide-react';
import EmptyState from '../components/Shared/EmptyState';

export default function MyImagesView({ images, onSelectPrompt, onViewImage }) {
  if (!images || images.length === 0) {
    return <EmptyState title="No images yet" description="Generate something first!" />;
  }

  const handleDownload = async (e, url, imageId) => {
    e.stopPropagation();
    
    try {
      let blob;
      
      if (url.startsWith('data:')) {
        // Convert base64 to blob
        const response = await fetch(url);
        blob = await response.blob();
      } else {
        // Fetch the image from URL
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) throw new Error('Failed to fetch image');
        blob = await response.blob();
      }
      
      // Create download link
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ai-generated-${imageId || Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab if download fails
      window.open(url, '_blank');
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
                  // Scroll to top so user sees the prompt loaded
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                aria-label="Load prompt"
                title="Load this prompt"
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
