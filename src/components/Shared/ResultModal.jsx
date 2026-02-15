import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { PulseLoader } from './Loader';
import './ResultModal.css';

export default function ResultModal({ image, loading, error, onClose, onRetry }) {
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
    <div className={`result-modal ${isMinimized ? 'minimized' : ''}`}>
      <div className="result-content">
        
        {/* Header with status - clickable to expand/collapse */}
        <div className="result-header" onClick={toggleMinimize}>
          <div className="status-text">
            <span className={`status-dot ${loading ? 'generating' : ''}`}></span>
            {loading ? 'Image generating' : error ? 'Generation failed' : 'Generation complete'}
          </div>
          <div className="header-actions">
            {/* Minimize/Expand button - CSS icon */}
            <button 
              className={`minimize-btn ${isMinimized ? 'expand' : ''}`}
              onClick={toggleMinimize} 
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? '▲' : '−'}
            </button>
            
            {/* Close button - CSS icon - only show when NOT loading */}
            {!loading && (
              <button className="close-result" onClick={handleClose} title="Close">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Image area - hidden when minimized */}
        {!isMinimized && (
          <div className="image-stage">
            {/* LOADING STATE */}
            {loading && (
              <div className="loading-wrapper">
                <PulseLoader />
                <p className="loading-label">Creating your image...</p>
              </div>
            )}

            {/* ERROR STATE */}
            {error && !loading && (
              <div className="error-wrapper">
                <AlertCircle size={32} color="#ff4444" />
                <p className="error-title">Generation Failed</p>
                <p className="error-message">{error}</p>
                <button className="retry-btn" onClick={onRetry}>
                  Try Again
                </button>
              </div>
            )}

            {/* SUCCESS STATE */}
            {image && !loading && (
              <img src={image} alt="Generated result" className="gen-result" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
