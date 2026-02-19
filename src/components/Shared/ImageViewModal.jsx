import React from 'react';
import './ImageViewModal.css';

export default function ImageViewModal({ imageUrl, onClose }) {
  return (
    <div className="image-view-modal modal-overlay" onClick={onClose}>
      <div className="image-view-content" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl} 
          alt="Full view" 
          className="image-view-img"
        />
      </div>
      <button className="image-view-close close-button" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
