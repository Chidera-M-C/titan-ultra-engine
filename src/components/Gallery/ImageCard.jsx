import React from 'react';

export default function ImageCard({ url, prompt, onAction, actionLabel }) {
  return (
    <div className="image-card" onClick={onAction}>
      <img src={url} alt={prompt} loading="lazy" />
      <div className="image-overlay">
        <div className="overlay-content">
          <p className="overlay-prompt">{prompt}</p>
          {actionLabel && <button className="overlay-btn">{actionLabel}</button>}
        </div>
      </div>
    </div>
  );
}
