import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { PulseLoader } from './Loader';
import './EditModal.css';

export default function EditModal({ image, loading, error, onClose, onRetry }) {
  const [isMinimized, setIsMinimized] = useState(false);

  // Only allow closing when NOT loading
  const handleClose = (e) => {
    e.stopPropagation();
    if (!loading) {
      onClose();
    }
  };

  const toggleMinimize = (e) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  return (
    <div className={`edit-modal ${isMinimized ? 'minimized' : ''}`}>
      <div className="edit-content">
        
        {/* Header with status - clickable to expand/collapse */}
        <div className="edit-header" onClick={toggleMinimize}>
          <div className="edit-status-text">
            <span className={`edit-status-dot ${loading ? 'generating' : ''}`}></span>
            {loading ? 'Image editing' : error ? 'Edit failed' : 'Edit complete'}
          </div>
          <div className="edit-header-actions">
            {/* Minimize/Expand button */}
            <button 
              className="edit-minimize-btn"
              onClick={toggleMinimize} 
              data-tooltip={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? '▲' : '−'}
            </button>
            
            {/* Close button - only show when NOT loading */}
            {!loading && (
              <button className="edit-close-btn" onClick={handleClose} data-tooltip="Close">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Image area - hidden when minimized */}
        {!isMinimized && (
          <div className="edit-image-stage">
            {/* LOADING STATE */}
            {loading && (
              <div className="edit-loading-wrapper">
                <PulseLoader />
                <p className="edit-loading-label">Editing your image...</p>
              </div>
            )}

            {/* ERROR STATE */}
            {error && !loading && (
              <div className="edit-error-wrapper">
                <AlertCircle size={32} color="#ff4444" />
                <p className="edit-error-title">Edit Failed</p>
                <p className="edit-error-message">{error}</p>
                <button className="edit-retry-btn" onClick={onRetry}>
                  Try Again
                </button>
              </div>
            )}

            {/* SUCCESS STATE */}
            {image && !loading && (
              <img src={image} alt="Edited result" className="edit-gen-result" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
