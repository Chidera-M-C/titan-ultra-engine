import './Gallery.css';
import React, { useState } from 'react';
import { Wand2, Download, Heart, RotateCcw } from 'lucide-react';

export default function MasonryGrid({ images, prompt, onImageClick, onSelectPrompt, onEditImage }) {
  
  const handleDownload = (e, url, imageId) => {
    e.stopPropagation();
    let downloadUrl = url;
    if (url.includes('appwrite.io') && url.includes('/view?')) {
      downloadUrl = url.replace('/view?', '/download?');
    }
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `ai-generated-${imageId || Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="masonry-grid">
      {images.map((img) => (
        <div
          key={img.id}
          className="gallery-card"
          onClick={() => onImageClick(img)}
        >
          <img 
            src={img.url} 
            alt="Generated AI image" 
            loading="lazy" 
            className="allow-visitor" 
          />
          <div className="gallery-overlay">
            <div className="overlay-actions">
              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  // Better comparison that handles empty strings
                  const currentPrompt = prompt || '';
                  const imagePrompt = img.prompt || '';
                  
                  if (currentPrompt.trim() === imagePrompt.trim() && currentPrompt !== '') {
                    onSelectPrompt('');
                  } else {
                    onSelectPrompt(img.prompt);
                  }
                }}
                data-tooltip={
                  (prompt || '').trim() === (img.prompt || '').trim() && prompt ? "Unload prompt" : "Load prompt"
                }
              >
                <RotateCcw size={18} color="#ffffff" />
              </button>

              <button
                className="icon-btn"
                onClick={(e) => handleDownload(e, img.url, img.id)}
                data-tooltip="Download image"
              >
                <Download size={18} color="#ffffff" />
              </button>

              <button
                className="icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditImage(img);
                }}
                data-tooltip="Edit image"
              >
                <Wand2 size={18} color="#ffffff" />
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
    <button
      className={`icon-btn ${active ? 'active-heart' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setActive(!active);
      }}
      data-tooltip={active ? 'Unlike' : 'Like'}
    >
      <Heart 
        size={18} 
        color={active ? '#ff4b4b' : '#ffffff'} 
        fill={active ? '#ff4b4b' : 'none'} 
      />
    </button>
  );
}
