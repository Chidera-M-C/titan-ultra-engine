// Updated src/views/MyImagesView.jsx (full file)
import React, { useState } from 'react';
import { Wand2, Download, Heart } from 'lucide-react';
import EmptyState from '../components/Shared/EmptyState';

export default function MyImagesView({ images, onSelectPrompt, onViewImage, currentPrompt }) {
  if (!images || images.length === 0) {
    return <EmptyState title="No images yet" description="Generate something first!" />;
  }

  const handleDownload = async (e, url, imageId) => {
    e.stopPropagation();

    try {
      // Simplified fetch – no mode/credentials (works reliably for both base64 and public Appwrite URLs)
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ai-generated-${imageId || Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Download failed:', error);
      // No fallback to window.open – prevents unwanted tab
      // If it truly fails (rare with public files/base64), it just does nothing silently
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
              {/* Toggle Prompt Button – first click loads, second click clears */}
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

              {/* Download Button – forces real download, no tab */}
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
