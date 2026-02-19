import React from 'react';
import './ImageViewModal.css';

export default function ImageViewModal({ imageUrl, onClose }) {
  return (
    /* We add modal-overlay so they can click the background to close */
    <div className="image-view-modal modal-overlay" onClick={onClose}>
      <div className="image-view-content" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl} 
          alt="Full view" 
          className="image-view-img"
        />
      </div>
      
      /* We add close-button so the guard allows the 'X' click */
      <button className="image-view-close close-button" onClick={onClose} data-tooltip="Close">
        ✕
      </button>
    </div>
  );
}
