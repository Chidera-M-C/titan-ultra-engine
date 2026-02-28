import React, { useState } from 'react';
import { Wand2, Download, Heart, RotateCcw } from 'lucide-react';
import EmptyState from '../components/Shared/EmptyState';

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

export default function MyImagesView({ images, onSelectPrompt, onViewImage, prompt, onEditImage }) {
  if (!images || images.length === 0) {
    return <EmptyState title="No images yet" description="Generate something first!" />;
  }

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
