import React from 'react';
import './ImageViewModal.css';

export default function ImageViewModal({ imageUrl, onClose }) {
  return (
    /* Added modal-overlay so App.jsx allows clicking the background to close */
    <div className="image-view-modal modal-overlay" onClick={onClose}>
      <div className="image-view-content" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl} 
          alt="Full view" 
          className="image-view-img"
        />
      </div>
      
      {/* Added close-button so App.jsx allows clicking the X to close */}
      <button className="image-view-close close-button" onClick={onClose} data-tooltip="Close">
        ✕
      </button>
    </div>
  );
}
