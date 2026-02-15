import React, { useState } from 'react';
import { Wand2, Download, Heart, Edit } from 'lucide-react';
import EmptyState from '../components/Shared/EmptyState';

export default function MyImagesView({ images, onSelectPrompt, onViewImage, currentPrompt }) {
  if (!images || images.length === 0) {
    return <EmptyState title="No images yet" description="Generate something first!" />;
  }

  const handleDownload = (e, url, imageId) => {
    e.stopPropagation();
    
    // Convert Appwrite view URL to download URL
    let downloadUrl = url;
    if (url.includes('appwrite.io') && url.includes('/view?')) {
      downloadUrl = url.replace('/view?', '/download?');
    }
    
    // Create direct download link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `ai-generated-${imageId || Date.now()}.png`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

              {/* Edit Button - NEW */}
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  // This will open the edit modal (we'll connect this later)
                  console.log('Edit clicked for image:', img.id);
                }}
                aria-label="Edit image"
                title="Edit image"
              >
                <Edit size={18} color="#ffffff" />
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
