import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { PulseLoader } from './Loader';
import ActionButtons from './ActionButtons';
import './ResultModal.css';

export default function ResultModal({ image, loading, error, onClose, onRetry, prompt, onOpenEdit, onViewFullScreen }) {
  const [isMinimized, setIsMinimized] = useState(false);

  const handleClose = (e) => {
    e.stopPropagation();
    if (!loading) onClose();
  };

  const toggleMinimize = (e) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const handleDownload = async () => {
    try {
      // Works for both base64 and external URLs
      const response = await fetch(image);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `ai-generated-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      // Fallback for base64
      const link = document.createElement('a');
      link.href = image;
      link.download = `ai-generated-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={`result-modal ${isMinimized ? 'minimized' : ''}`}>
      <div className="result-content">

        <div className="result-header" onClick={toggleMinimize}>
          <div className="status-text">
            <span className={`status-dot ${loading ? 'generating' : ''}`}></span>
            {loading ? 'Image generating' : error ? 'Generation failed' : 'Generation complete'}
          </div>
          <div className="header-actions">
            <button
              className={`minimize-btn ${isMinimized ? 'expand' : ''}`}
              onClick={toggleMinimize}
              data-tooltip={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? '▲' : '−'}
            </button>
            {!loading && (
              <button className="close-result" onClick={handleClose} data-tooltip="Close">
                ✕
              </button>
            )}
          </div>
        </div>

        {!isMinimized && (
          <div className="image-stage">
            {loading && (
              <div className="loading-wrapper">
                <PulseLoader />
                <p className="loading-label">Creating your image...</p>
              </div>
            )}

            {error && !loading && (
              <div className="error-wrapper">
                <AlertCircle size={32} color="#ff4444" />
                <p className="error-title">Generation Failed</p>
                <p className="error-message">{error}</p>
                <button className="retry-btn" onClick={onRetry}>Try Again</button>
              </div>
            )}

            {image && !loading && !error && (
              <>
                <img
                  src={image}
                  alt="Generated result"
                  className="gen-result"
                  onClick={() => {
                    if (onViewFullScreen) {
                      // Pass as object so App.jsx handleViewImage can read .url
                      onViewFullScreen({ url: image });
                    }
                  }}
                  style={{ cursor: 'zoom-in' }}
                />
                <div className="result-action-overlay">
                  <ActionButtons
                    image={image}
                    onDownload={handleDownload}
                    onEdit={() => {
                      if (onOpenEdit) onOpenEdit({ url: image, prompt });
                    }}
                    compact={true}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
