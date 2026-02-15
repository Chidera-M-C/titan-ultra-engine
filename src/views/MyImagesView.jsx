import React, { useState } from 'react';
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
              {/* Load Prompt – Magic Wand with Sparkles (explicit white stroke) */}
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPrompt(img.prompt);
                }}
                aria-label="Load prompt"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 4V2"/>
                  <path d="M15 16v-2"/>
                  <path d="M8 9h2"/>
                  <path d="M20 9h2"/>
                  <path d="M8 21h2"/>
                  <path d="M20 21h2"/>
                  <path d="M10 9h.01"/>
                  <path d="M10 21h.01"/>
                  <path d="m21.8 3.1-1.1-1a1.8 1.8 0 0 0-2.6 0l-1.3 1.3a4.4 4.4 0 0 0-5.6 5.6l-1.3 1.3a1.8 1.8 0 0 0 0 2.6l1.1 1.1"/>
                  <path d="m16.1 8.8 1.1 1.1a1.8 1.8 0 0 0 2.6 0l1.3-1.3a4.4 4.4 0 0 0-5.6-5.6l-1.3 1.3a1.8 1.8 0 0 0 0 2.6Z"/>
                </svg>
              </button>

              {/* Download (explicit white stroke) */}
              <button
                className="icon-btn"
                onClick={(e) => handleDownload(e, img.url, img.id)}
                aria-label="Download image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
              </button>

              {/* Heart Toggle (explicit white stroke/fill) */}
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
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={active ? '#ffffff' : 'none'} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3.47.81-4.5 2.1C10.97 3.81 9.26 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
      </svg>
    </button>
  );
}
