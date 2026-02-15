import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { PulseLoader } from './Loader';
import './ResultModal.css';

export default function ResultModal({ image, loading, error, onClose, onRetry }) {
  return (
    <div className="result-modal">
      <div className="result-content">
        
        {/* Header with status */}
        <div className="result-header">
          <div className="status-text">
            <span className={`status-dot ${loading ? 'generating' : ''}`}></span>
            {loading ? 'Image generating' : error ? 'Generation failed' : 'Generation ready'}
          </div>
          <button className="close-result" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Image area */}
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
      </div>
    </div>
  );
}
