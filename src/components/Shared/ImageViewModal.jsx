import React from 'react';
import './ImageViewModal.css';

export default function ImageViewModal({ imageUrl, onClose }) {
  return (
    /* We keep your 'image-view-modal' class for styling.
       We add 'modal-overlay' ONLY so the guard in App.jsx says "Okay, this is allowed."
    */
    <div className="image-view-modal modal-overlay" onClick={onClose}>
      <div className="image-view-content" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl} 
          alt="Full view" 
          className="image-view-img"
        />
      </div>
      
      {/* We keep your 'image-view-close' class for styling.
          We add 'close-button' ONLY so the guard in App.jsx doesn't block the click.
      */}
      <button className="image-view-close close-button" onClick={onClose} data-tooltip="Close">
        ✕
      </button>
    </div>
  );
}
