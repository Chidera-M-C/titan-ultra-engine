import './Gallery.css';
import React, { useState, useMemo } from 'react';
import { Wand2, Download, Heart, RotateCcw } from 'lucide-react';

const downloadImage = async (e, url, imageId) => {
  e.stopPropagation();
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `ai-generated-${imageId || Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error('Download failed:', err);
  }
};

export default function MasonryGrid({ images, prompt, onImageClick, onSelectPrompt, onEditImage }) {

  // Shuffle images randomly every time the images prop changes
  const shuffledImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    
    // Proper Fisher-Yates shuffle (true random)
    const shuffled = [...images];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [images]);

  return (
    <div className="masonry-grid">
      {shuffledImages.map((img) => (
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
                onClick={(e) => downloadImage(e, img.url, img.id)}
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
