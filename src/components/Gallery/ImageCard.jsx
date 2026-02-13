import './Gallery.css';
import React from 'react';
export default function ImageCard({ url, prompt, onAction, actionLabel = "Remix" }) {
  return (
    <div className="pin-item" onClick={() => onAction(prompt)}>
      <img src={url} alt="Artwork" loading="lazy" />
      <div className="pin-overlay">
        <button className="use-btn">{actionLabel}</button>
      </div>
    </div>
  );
}
