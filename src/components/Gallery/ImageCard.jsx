import './Gallery.css';
import React from 'react';

export default function ImageCard({ url, prompt, onAction, actionLabel = "Remix" }) {
  return (
    <div className="pin-item" onClick={onAction}>
      <img src={url} alt={prompt || "Artwork"} loading="lazy" />
      <div className="pin-overlay">
        <button className="use-btn" onClick={(e) => {
          e.stopPropagation(); // Prevents double-clicking the parent
          onAction();
        }}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
